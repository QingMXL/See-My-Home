import { createHash, randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { createZooworkClient, ZooworkError } from '@zoowork-ai/sdk';
import type {
  ConversationHandle,
  EvidenceSource,
  HomeAgentResponse,
  HomeModel,
  HomeTurnRequest,
  RoomMapResponse,
  RoomFunctionCode,
  SupportedLocale,
  UiAgentEvent,
} from './contracts.js';
import { projectRoot } from './paths.js';
import { HomeLayoutRuntime, HomeLayoutTurnTimeoutError } from './runtime.js';
import { assertHomeModel } from './validation.js';

const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath)) loadEnvFile(envPath);

const agentId = process.env.ZOOWORK_AGENT_ID?.trim() ?? '';
if (!agentId) throw new Error('ZOOWORK_AGENT_ID is missing from .env');
const port = Number.parseInt(process.env.HOME_LAYOUT_TEST_PORT ?? '4317', 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('HOME_LAYOUT_TEST_PORT must be from 1 to 65535');

const runtime = HomeLayoutRuntime.fromEnvironment({ agentId, turnTimeoutMs: 600_000 });
const htmlTemplate = readFileSync(resolve(projectRoot, 'local-test', 'index.html'), 'utf8');
const browserToken = randomBytes(24).toString('hex');
const uploadDirectory = resolve(projectRoot, '.runtime', 'uploads');
const maxUploadBytes = 15 * 1024 * 1024;
const locales = new Set<SupportedLocale>(['en-US', 'zh-CN']);

interface UploadedAsset {
  assetId: string;
  projectId: string;
  accessToken: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'application/pdf';
  sizeBytes: number;
  sha256: string;
  path: string;
}

interface ProjectState {
  projectId: string;
  conversation: ConversationHandle;
  homeModel: HomeModel | null;
  roomMap: RoomMapResponse | null;
  analyzedAssetId: string | null;
  analysisResult: Record<string, unknown> | null;
  analysisInFlight: Promise<Record<string, unknown>> | null;
  renderPlan: Record<string, unknown> | null;
}

interface GenerateInput {
  home_id?: unknown;
  locale?: unknown;
  rooms?: unknown;
  excluded_regions?: unknown;
  lifestyle_tags?: unknown;
  special_considerations?: unknown;
  user_message?: unknown;
}

interface ExcludedRegion {
  id: string;
  label: string;
  reason: 'lightwell' | 'double_height' | 'void' | 'shaft' | 'outside_envelope' | 'user_excluded' | 'other';
  polygon: number[][];
}

interface RefineInput {
  home_id?: unknown;
  locale?: unknown;
  user_message?: unknown;
}

type RuntimeTurnResult = Awaited<ReturnType<HomeLayoutRuntime['runStructuredTurn']>>;

interface GeneratedImagePayload {
  asset_id: string;
  url: string;
  mime_type: 'image/png' | 'image/jpeg' | 'image/webp';
  size_bytes: number;
  provider_model: string;
  note: string | null;
}

class GeneratedImageMissingError extends Error {}

const assets = new Map<string, UploadedAsset>();
const projects = new Map<string, ProjectState>();
const artifacts = new Map<string, { contentType: string | null }>();

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(`${JSON.stringify(value, null, 2)}\n`);
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

function parseLocale(value: unknown): SupportedLocale {
  if (!locales.has(value as SupportedLocale)) throw new Error('locale must be en-US or zh-CN');
  return value as SupportedLocale;
}

function isLocalSite(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  return typeof origin === 'string' && [
    'http://127.0.0.1:5173', 'http://localhost:5173',
    'http://127.0.0.1:5174', 'http://localhost:5174',
  ].includes(origin);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > 2_000_000) throw new Error('JSON request exceeds 2 MB');
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

async function readBinary(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > maxUploadBytes) throw new Error('Upload exceeds 15 MB');
    chunks.push(bytes);
  }
  if (size === 0) throw new Error('Uploaded file is empty');
  return Buffer.concat(chunks);
}

function mimeType(value: string | undefined): UploadedAsset['mimeType'] {
  const mime = value?.split(';', 1)[0]?.trim().toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'application/pdf') return mime;
  throw new Error('Only JPG, PNG, and PDF uploads are supported');
}

function signatureMatches(bytes: Buffer, mime: UploadedAsset['mimeType']): boolean {
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === 'image/jpeg') return bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
}

function fileName(value: string | undefined): string {
  if (!value) throw new Error('X-Upload-File-Name is required');
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { throw new Error('X-Upload-File-Name is invalid'); }
  decoded = decoded.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!decoded || decoded.length > 255) throw new Error('File name must contain 1 to 255 characters');
  return decoded;
}

async function receiveUpload(request: IncomingMessage): Promise<UploadedAsset> {
  const name = fileName(request.headers['x-upload-file-name'] as string | undefined);
  const mime = mimeType(request.headers['content-type']);
  const bytes = await readBinary(request);
  if (!signatureMatches(bytes, mime)) throw new Error('File bytes do not match the declared MIME type');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const assetId = `asset_${sha256.slice(0, 20)}_${randomBytes(4).toString('hex')}`;
  const projectId = newId('home');
  const extension = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'pdf';
  mkdirSync(uploadDirectory, { recursive: true, mode: 0o700 });
  const path = resolve(uploadDirectory, `${assetId}.${extension}`);
  writeFileSync(path, bytes, { flag: 'wx', mode: 0o600 });
  const asset = {
    assetId,
    projectId,
    accessToken: randomBytes(24).toString('hex'),
    fileName: name,
    mimeType: mime,
    sizeBytes: bytes.byteLength,
    sha256,
    path,
  } satisfies UploadedAsset;
  assets.set(assetId, asset);
  return asset;
}

function publicBaseUrl(): string {
  const value = process.env.HOME_LAYOUT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (!value?.startsWith('https://')) {
    throw new Error('HOME_LAYOUT_PUBLIC_BASE_URL must be an HTTPS URL reachable by the hosted ZooWork Agent. For local tests, use a temporary tunnel to port 4317.');
  }
  return value;
}

function sourceUrl(asset: UploadedAsset): string {
  return `${publicBaseUrl()}/api/site/layout/source/${encodeURIComponent(asset.assetId)}/${asset.accessToken}`;
}

async function stateFor(projectId: string): Promise<ProjectState> {
  const existing = projects.get(projectId);
  if (existing) return existing;
  const conversation = await runtime.createConversation(projectId, newId(`layout_${projectId}`));
  const state = {
    projectId,
    conversation,
    homeModel: null,
    roomMap: null,
    analyzedAssetId: null,
    analysisResult: null,
    analysisInFlight: null,
    renderPlan: null,
  } satisfies ProjectState;
  projects.set(projectId, state);
  return state;
}

function applyResult(state: ProjectState, result: Awaited<ReturnType<HomeLayoutRuntime['runStructuredTurn']>>): void {
  if (result.cursor) state.conversation.cursor = result.cursor;
  if (result.response.home_model) state.homeModel = result.response.home_model;
  for (const artifact of result.artifacts) artifacts.set(artifact.artifactId, { contentType: artifact.contentType });
}

function artifactImageMime(contentType: string | null, fileName: string | null): GeneratedImagePayload['mime_type'] | null {
  const normalized = contentType?.split(';', 1)[0]?.trim().toLowerCase();
  if (normalized === 'image/png' || normalized === 'image/jpeg' || normalized === 'image/webp') return normalized;
  const lowerName = fileName?.toLowerCase() ?? '';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  return null;
}

function requireGeneratedImage(result: RuntimeTurnResult, locale: SupportedLocale): GeneratedImagePayload {
  for (const artifact of result.artifacts) {
    if (artifact.status !== 'ready') continue;
    const mime = artifactImageMime(artifact.contentType, artifact.fileName);
    if (!mime) continue;
    return {
      asset_id: artifact.artifactId,
      url: `/api/home-layout/artifacts/${encodeURIComponent(artifact.artifactId)}`,
      mime_type: mime,
      size_bytes: artifact.size ?? 0,
      provider_model: 'zoowork:imageGenerationModel',
      note: null,
    };
  }
  const warnings = result.response.warnings.filter((warning) => warning.trim()).join(' ');
  throw new GeneratedImageMissingError(
    locale === 'zh-CN'
      ? `生成结果未通过图像质量检查，因此没有发布彩色布局图。请根据提示修改要求后重试。${warnings ? ` ${warnings}` : ''}`
      : `The generated result did not pass image quality review, so no colorized layout was published. Adjust the request using the warning and try again.${warnings ? ` ${warnings}` : ''}`,
  );
}

function statementSource(message: string, suffix: string): EvidenceSource {
  return {
    source_id: `src_user_${suffix}`,
    kind: 'user_statement',
    label: 'User project brief',
    facts: [{
      id: `fact_user_${suffix}`,
      subject_ref: 'home_subject',
      predicate: 'user_statement',
      value: message,
      epistemic_state: 'user_confirmed',
      confidence: 1,
    }],
  };
}

function createProjectTurn(value: unknown): { request: HomeTurnRequest; event: UiAgentEvent; asset: UploadedAsset } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Body must be an object');
  const input = value as { project_id?: unknown; asset_id?: unknown; locale?: unknown; project_brief?: unknown };
  const projectId = requireString(input.project_id, 'project_id');
  const asset = assets.get(requireString(input.asset_id, 'asset_id'));
  if (!asset) throw new Error('asset_id does not reference an uploaded file');
  if (asset.projectId !== projectId) throw new Error('project_id does not belong to this uploaded file');
  const selectedLocale = parseLocale(input.locale);
  const brief = typeof input.project_brief === 'string' && input.project_brief.trim()
    ? input.project_brief.trim()
    : selectedLocale === 'zh-CN'
      ? '请识别房间、边界、门窗、固定设施、主要家具、空间关系和明显不确定项。'
      : 'Identify rooms, boundaries, openings, fixed fixtures, major furniture, spatial relationships, and material uncertainties.';
  const suffix = newId('req');
  return {
    asset,
    event: { type: 'project.create', project_id: projectId },
    request: {
      schema_version: '1.0', request_id: suffix, home_id: projectId, operation: 'intake', locale: selectedLocale,
      user_message: brief,
      evidence: [{
        source_id: `src_visual_${suffix}`,
        kind: 'floor_plan',
        label: asset.fileName,
        asset_ref: sourceUrl(asset),
        facts: [],
      }, statementSource(brief, suffix)],
    },
  };
}

interface ConfirmedRoom {
  id: string;
  label: string;
  currentUse: string;
  targetUse: string | null;
  polygon: number[][];
  boundaryConfirmed: boolean;
  functionCode: Exclude<RoomFunctionCode, 'unknown'>;
  functionConfirmed: boolean;
}

type PlacementKind =
  | 'sofa' | 'tv' | 'coffee_table' | 'dining_table' | 'bed' | 'wardrobe'
  | 'desk' | 'bookshelf' | 'counter' | 'sink' | 'cooktop' | 'refrigerator'
  | 'toilet' | 'vanity' | 'shower' | 'bathtub' | 'washer' | 'storage'
  | 'outdoor_seating';

interface LayoutPlacement {
  id: string;
  space_ref: string;
  kind: PlacementKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation_deg: number;
}

function primaryBedroomTwinBedsRequested(tags: string[], considerations: string): boolean {
  return tags.includes('Twin Beds in Primary Bedroom')
    || /(?:twin\s+beds?|two\s+beds?|双床|两张床)/i.test(considerations);
}

function buildRenderPlan(
  rooms: ConfirmedRoom[],
  tags: string[] = [],
  considerations = '',
  revision = 1,
): Record<string, unknown> {
  const issues: string[] = [];
  const placements = rooms.flatMap((room): LayoutPlacement[] => {
    if (room.polygon.length < 3) {
      issues.push(`${room.id}: no confirmed polygon`);
      return [];
    }
    const xs = room.polygon.map((point) => point[0] ?? 0);
    const ys = room.polygon.map((point) => point[1] ?? 0);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const width = Math.max(...xs) - left;
    const height = Math.max(...ys) - top;
    if (width <= 0 || height <= 0) {
      issues.push(`${room.id}: invalid polygon extent`);
      return [];
    }
    const x = (ratio: number) => left + width * ratio;
    const y = (ratio: number) => top + height * ratio;
    const p = (kind: PlacementKind, px: number, py: number, pw: number, ph: number, rotation = 0, instance = ''): LayoutPlacement => ({
      id: `placement_${room.id}_${kind}${instance ? `_${instance}` : ''}`,
      space_ref: room.id,
      kind,
      x: x(px),
      y: y(py),
      width: Math.max(0.012, width * pw),
      height: Math.max(0.012, height * ph),
      rotation_deg: rotation,
    });

    switch (room.functionCode) {
      case 'living_room': case 'family_room': case 'den':
        return [p('sofa', 0.28, 0.55, 0.34, 0.22), p('tv', 0.82, 0.55, 0.06, 0.34), p('coffee_table', 0.53, 0.55, 0.18, 0.15)];
      case 'dining_room':
        return [p('dining_table', 0.5, 0.5, 0.42, 0.34)];
      case 'kitchen':
        return [p('counter', 0.5, 0.13, 0.76, 0.16), p('sink', 0.42, 0.13, 0.16, 0.12), p('cooktop', 0.68, 0.13, 0.14, 0.12), p('refrigerator', 0.14, 0.27, 0.16, 0.22)];
      case 'primary_bedroom': {
        if (primaryBedroomTwinBedsRequested(tags, considerations)) {
          return [
            p('bed', 0.3, 0.47, 0.28, 0.5, 0, 'left'),
            p('bed', 0.7, 0.47, 0.28, 0.5, 0, 'right'),
            p('wardrobe', 0.84, 0.5, 0.12, 0.62),
          ];
        }
        return [p('bed', 0.5, 0.47, 0.42, 0.5), p('wardrobe', 0.84, 0.5, 0.12, 0.62)];
      }
      case 'guest_bedroom': case 'kids_room': case 'nursery':
        return [p('bed', 0.42, 0.46, 0.38, 0.46), p('wardrobe', 0.84, 0.42, 0.12, 0.5)];
      case 'home_office':
        return [p('desk', 0.5, 0.22, 0.48, 0.18), p('bookshelf', 0.86, 0.55, 0.12, 0.62)];
      case 'walk_in_closet':
        return [p('wardrobe', 0.12, 0.5, 0.16, 0.72), p('wardrobe', 0.88, 0.5, 0.16, 0.72)];
      case 'bathroom':
        return [p('vanity', 0.25, 0.2, 0.3, 0.18), p('toilet', 0.23, 0.7, 0.18, 0.24), p('shower', 0.75, 0.65, 0.34, 0.42)];
      case 'powder_room':
        return [p('vanity', 0.28, 0.22, 0.32, 0.18), p('toilet', 0.6, 0.67, 0.2, 0.28)];
      case 'laundry_room':
        return [p('washer', 0.25, 0.25, 0.25, 0.28), p('storage', 0.72, 0.2, 0.38, 0.16)];
      case 'pantry': case 'storage': case 'entry':
        return [p('storage', 0.15, 0.5, 0.18, 0.72), p('storage', 0.85, 0.5, 0.18, 0.72)];
      case 'balcony':
        return [p('outdoor_seating', 0.5, 0.5, 0.5, 0.36)];
      default:
        return [];
    }
  });
  return {
    schema_version: '1.0',
    geometry_revision: revision,
    placement_revision: revision,
    render_strategy: 'source_locked_svg_overlay',
    placements,
    qa: { status: issues.length === 0 ? 'passed' : 'needs_review', issues },
  };
}

const roomFunctionCodes = new Set<RoomFunctionCode>([
  'living_room', 'family_room', 'dining_room', 'kitchen', 'primary_bedroom', 'guest_bedroom',
  'kids_room', 'nursery', 'home_office', 'walk_in_closet', 'bathroom', 'powder_room',
  'laundry_room', 'pantry', 'mudroom', 'entry', 'balcony', 'den', 'storage', 'garage', 'home_theater',
  'fitness_room', 'game_room', 'other', 'unknown',
]);

function roomFunctionCode(value: unknown, label: string): Exclude<RoomFunctionCode, 'unknown'> {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const aliases: Record<string, RoomFunctionCode> = {
    'living room': 'living_room', 客厅: 'living_room', 'family room': 'family_room', 起居室: 'family_room',
    dining: 'dining_room', 'dining room': 'dining_room', 餐厅: 'dining_room', kitchen: 'kitchen', 厨房: 'kitchen',
    'primary bedroom': 'primary_bedroom', 'master bedroom': 'primary_bedroom', 主卧: 'primary_bedroom', 主卧室: 'primary_bedroom',
    'guest bedroom': 'guest_bedroom', 次卧: 'guest_bedroom', 客卧: 'guest_bedroom', 卧室: 'guest_bedroom',
    "kids' room": 'kids_room', 'kids room': 'kids_room', 儿童房: 'kids_room', nursery: 'nursery', 婴儿房: 'nursery',
    'home office': 'home_office', office: 'home_office', 书房: 'home_office',
    'walk-in closet': 'walk_in_closet', 'walk in closet': 'walk_in_closet', 衣帽间: 'walk_in_closet',
    bathroom: 'bathroom', bath: 'bathroom', 卫生间: 'bathroom', 浴室: 'bathroom',
    'powder room': 'powder_room', 客卫: 'powder_room', laundry: 'laundry_room', 'laundry room': 'laundry_room', 洗衣房: 'laundry_room',
    pantry: 'pantry', 食品储藏室: 'pantry', mudroom: 'mudroom', 入户间: 'mudroom', entry: 'entry', foyer: 'entry', 玄关: 'entry', balcony: 'balcony', 阳台: 'balcony', 露台: 'balcony', den: 'den', 多功能室: 'den',
    storage: 'storage', 储藏室: 'storage', garage: 'garage', 车库: 'garage', 'home theater': 'home_theater', 影音室: 'home_theater',
    'fitness room': 'fitness_room', gym: 'fitness_room', 健身房: 'fitness_room', 'game room': 'game_room', 游戏室: 'game_room', other: 'other', 其他: 'other',
  };
  const code = (roomFunctionCodes.has(normalized as RoomFunctionCode) ? normalized : aliases[normalized || label.trim().toLowerCase()]) as RoomFunctionCode | undefined;
  if (!code || code === 'unknown') throw new Error(`Room function must be explicitly confirmed: ${label}`);
  return code;
}

function confirmedInput(input: GenerateInput): { locale: SupportedLocale; rooms: ConfirmedRoom[]; excludedRegions: ExcludedRegion[]; tags: string[]; considerations: string } {
  const selectedLocale = parseLocale(input.locale);
  if (!Array.isArray(input.rooms) || input.rooms.length === 0) throw new Error('rooms must contain confirmed labels');
  if (!Array.isArray(input.lifestyle_tags)) throw new Error('lifestyle_tags must be an array');
  const tags = input.lifestyle_tags.map((item, index) => requireString(item, `lifestyle_tags[${index}]`));
  const considerations = typeof input.special_considerations === 'string'
    ? input.special_considerations.trim().slice(0, 2_000)
    : '';
  const rooms = input.rooms.map((candidate, index) => {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) throw new Error(`rooms[${index}] must be an object`);
    const room = candidate as {
      id?: unknown;
      label?: unknown;
      current_use?: unknown;
      target_use?: unknown;
      boundary_confirmed?: unknown;
      function_code?: unknown;
      function_confirmed?: unknown;
      source_geometry?: unknown;
    };
    const id = requireString(room.id, `rooms[${index}].id`);
    const label = requireString(room.label, `rooms[${index}].label`);
    const source = room.source_geometry as { kind?: unknown; coordinates?: unknown } | undefined;
    const polygon = source?.kind === 'polygon' && Array.isArray(source.coordinates)
      ? source.coordinates as number[][]
      : [];
    const polygonIsValid = polygon.length >= 3
      && polygon.every((point) => Array.isArray(point) && point.length === 2
        && point.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 1));
    if (!polygonIsValid) throw new Error(`rooms[${index}].source_geometry must be a normalized polygon with at least three points`);
    const functionConfirmed = room.function_confirmed === true;
    if (!functionConfirmed) throw new Error(`rooms[${index}].function_confirmed must be true`);
    if (room.boundary_confirmed !== true) throw new Error(`rooms[${index}].boundary_confirmed must be true`);
    return {
      id,
      label,
      currentUse: typeof room.current_use === 'string' && room.current_use.trim() ? room.current_use.trim() : label,
      targetUse: typeof room.target_use === 'string' && room.target_use.trim() ? room.target_use.trim() : null,
      polygon,
      boundaryConfirmed: room.boundary_confirmed === true,
      functionCode: roomFunctionCode(room.function_code, label),
      functionConfirmed,
    } satisfies ConfirmedRoom;
  });
  const excludedRegions = Array.isArray(input.excluded_regions) ? input.excluded_regions.map((candidate, index) => {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) throw new Error(`excluded_regions[${index}] must be an object`);
    const region = candidate as { id?: unknown; label?: unknown; reason?: unknown; source_geometry?: unknown };
    const source = region.source_geometry as { kind?: unknown; coordinates?: unknown } | undefined;
    const polygon = source?.kind === 'polygon' && Array.isArray(source.coordinates)
      ? source.coordinates as number[][]
      : [];
    const polygonIsValid = polygon.length >= 3
      && polygon.every((point) => Array.isArray(point) && point.length === 2
        && point.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 1));
    if (!polygonIsValid) throw new Error(`excluded_regions[${index}].source_geometry must be a normalized polygon with at least three points`);
    const reason = region.reason;
    if (!['lightwell', 'double_height', 'void', 'shaft', 'outside_envelope', 'user_excluded', 'other'].includes(String(reason))) {
      throw new Error(`excluded_regions[${index}].reason is invalid`);
    }
    return {
      id: requireString(region.id, `excluded_regions[${index}].id`),
      label: requireString(region.label, `excluded_regions[${index}].label`),
      reason: reason as ExcludedRegion['reason'],
      polygon,
    };
  }) : [];
  return { locale: selectedLocale, rooms, excludedRegions, tags, considerations };
}

function architecturalType(code: Exclude<RoomFunctionCode, 'unknown'>): string {
  if (code === 'living_room' || code === 'family_room' || code === 'den' || code === 'home_theater' || code === 'game_room') return 'living_room';
  if (code === 'kitchen') return 'kitchen';
  if (code === 'dining_room') return 'dining';
  if (code.includes('bedroom') || code === 'kids_room' || code === 'nursery') return 'bedroom';
  if (code === 'bathroom' || code === 'powder_room') return 'bathroom';
  if (code === 'mudroom' || code === 'entry') return 'entry';
  if (code === 'balcony') return 'balcony';
  if (code === 'walk_in_closet' || code === 'storage' || code === 'pantry') return 'storage';
  if (code === 'laundry_room' || code === 'garage') return 'utility';
  if (code === 'home_office') return 'work_area';
  return 'other';
}

interface ConditionalRoomObject {
  object: string;
  condition: string;
}

interface DefaultRoomProgram {
  baseline: string[];
  conditional: ConditionalRoomObject[];
  counts: Array<{ object: string; minCount: number; maxCount: number }>;
}

function roomProgram(code: Exclude<RoomFunctionCode, 'unknown'>): DefaultRoomProgram {
  switch (code) {
    case 'living_room': case 'family_room': return {
      baseline: ['sofa', 'television_or_media_wall', 'media_console', 'ambient_lighting'],
      conditional: [{ object: 'coffee_table', condition: 'Include only when comfortable circulation remains around the seating group.' }],
      counts: [
        { object: 'sofa', minCount: 1, maxCount: 1 },
        { object: 'television_or_media_wall', minCount: 1, maxCount: 1 },
        { object: 'media_console', minCount: 0, maxCount: 1 },
      ],
    };
    case 'kitchen': return {
      baseline: ['sink', 'cooktop', 'refrigerator', 'kitchen_cabinetry'],
      conditional: [{ object: 'kitchen_island', condition: 'Include only when the visible room geometry supports safe circulation on all working sides.' }],
      counts: [
        { object: 'sink', minCount: 1, maxCount: 1 },
        { object: 'cooktop', minCount: 1, maxCount: 1 },
        { object: 'refrigerator', minCount: 1, maxCount: 1 },
      ],
    };
    case 'dining_room': return {
      baseline: ['dining_table', 'dining_seating', 'dining_lighting'],
      conditional: [],
      counts: [{ object: 'dining_table', minCount: 1, maxCount: 1 }],
    };
    case 'primary_bedroom': return {
      baseline: ['bed', 'bedside_access', 'clothing_storage'],
      conditional: [{ object: 'king_bed', condition: 'Prefer when the visible room geometry preserves comfortable access on both sides; otherwise use a queen bed.' }],
      counts: [{ object: 'bed', minCount: 1, maxCount: 1 }],
    };
    case 'guest_bedroom': case 'kids_room': case 'nursery': return {
      baseline: ['bed', 'bedside_access', 'clothing_storage'],
      conditional: [{ object: 'desk_or_play_surface', condition: 'Include when requested or when usable floor area remains.' }],
      counts: [{ object: 'bed', minCount: 1, maxCount: 1 }],
    };
    case 'bathroom': return {
      baseline: ['toilet', 'sink_or_vanity', 'shower_zone'],
      conditional: [{ object: 'bathtub', condition: 'Use a bathtub instead of or with a shower only when visible geometry and user preference support it.' }],
      counts: [
        { object: 'toilet', minCount: 1, maxCount: 1 },
        { object: 'sink_or_vanity', minCount: 1, maxCount: 1 },
        { object: 'shower_or_tub_zone', minCount: 1, maxCount: 1 },
      ],
    };
    case 'powder_room': return {
      baseline: ['toilet', 'sink_or_vanity'], conditional: [],
      counts: [
        { object: 'toilet', minCount: 1, maxCount: 1 },
        { object: 'sink_or_vanity', minCount: 1, maxCount: 1 },
      ],
    };
    case 'walk_in_closet': return {
      baseline: ['wardrobe_storage', 'shelving'],
      conditional: [{ object: 'closet_island_or_bench', condition: 'Include only when it does not restrict access to wardrobes.' }],
      counts: [],
    };
    case 'home_office': return {
      baseline: ['desk_or_computer_work_surface', 'task_chair', 'bookshelf_or_file_storage'],
      conditional: [],
      counts: [{ object: 'desk_or_computer_work_surface', minCount: 1, maxCount: 1 }],
    };
    case 'entry': return {
      baseline: ['entry_drop_zone'],
      conditional: [{ object: 'shoe_and_coat_storage', condition: 'Include when it does not obstruct the entry door or primary circulation path.' }],
      counts: [],
    };
    case 'balcony': return {
      baseline: ['weather_appropriate_floor_finish'],
      conditional: [
        { object: 'outdoor_seating', condition: 'Include when the balcony depth supports safe access.' },
        { object: 'planters', condition: 'Include when requested and when they do not block doors or drainage.' },
      ],
      counts: [],
    };
    default: return { baseline: [], conditional: [], counts: [] };
  }
}

function buildConfirmedHomeModel(input: GenerateInput, state: ProjectState): { model: HomeModel; locale: SupportedLocale; tags: string[]; considerations: string; rooms: ConfirmedRoom[] } {
  const confirmed = confirmedInput(input);
  const sourceId = 'src_floor_plan_001';
  const confirmationSourceId = 'src_confirmation_001';
  const floorId = 'floor_main_001';
  const asset = state.analyzedAssetId ? assets.get(state.analyzedAssetId) : undefined;
  const timestamp = new Date().toISOString();
  const model: HomeModel = {
    schema_version: '2.0', home_id: state.projectId, model_revision: 1,
    status: confirmed.rooms.every((room) => room.boundaryConfirmed) ? 'confirmed_enough' : 'needs_confirmation',
    locale: confirmed.locale,
    measurement_policy: { system: 'metric', linear_storage: 'mm', area_storage: 'm2', us_listing_area_display: 'sq_ft_secondary' },
    coordinate_system: { type: 'local_plan_2d', unit: 'mm', origin: 'floor_envelope_bottom_left', x_axis: 'right', y_axis: 'up', north_angle_deg: null },
    scale: { status: 'unknown', millimeters_per_source_unit: null, source_ref: null },
    sources: [
      { id: sourceId, kind: 'floor_plan', label: asset?.fileName ?? 'Sample floor plan', asset_ref: asset ? sourceUrl(asset) : null, provider_model: 'zoowork:imageModel', received_at: timestamp },
      { id: confirmationSourceId, kind: 'user_correction', label: 'User-confirmed room functions and boundaries', asset_ref: null, provider_model: null, received_at: timestamp },
    ],
    floors: [{ id: floorId, label: 'Main floor', level_index: 0, state: 'user_confirmed', confidence: 1, source_refs: [sourceId, confirmationSourceId] }],
    spaces: confirmed.rooms.map((room) => ({
      id: room.id, floor_ref: floorId, label: room.label, architectural_type: architecturalType(room.functionCode), actual_uses: [room.currentUse],
      geometry: { metric: null, source_geometries: room.polygon.length >= 3 ? [{ source_ref: sourceId, coordinate_space: 'image_normalized_0_1', kind: 'polygon', coordinates: room.polygon, confidence: 1 }] : [] },
      area_m2: null, state: 'user_confirmed', confidence: 1, source_refs: [sourceId, confirmationSourceId],
    })),
    excluded_regions: confirmed.excludedRegions.map((region) => ({
      id: region.id,
      label: region.label,
      reason: region.reason,
      geometry: {
        metric: null,
        source_geometries: [{
          source_ref: sourceId,
          coordinate_space: 'image_normalized_0_1',
          kind: 'polygon',
          coordinates: region.polygon,
          confidence: 1,
        }],
      },
      state: 'user_confirmed',
      confidence: 1,
      source_refs: [sourceId, confirmationSourceId],
    })),
    room_programs: confirmed.rooms.map((room) => {
      const program = roomProgram(room.functionCode);
      const twinBedsRequested = room.functionCode === 'primary_bedroom'
        && primaryBedroomTwinBedsRequested(confirmed.tags, confirmed.considerations);
      const defaultObjectCounts = program.counts.map((rule) => twinBedsRequested && rule.object === 'bed'
        ? { object: rule.object, min_count: 2, max_count: 2 }
        : { object: rule.object, min_count: rule.minCount, max_count: rule.maxCount });
      return {
        space_ref: room.id,
        function_code: room.functionCode,
        baseline_objects: program.baseline,
        conditional_objects: program.conditional,
        default_object_counts: defaultObjectCounts,
        user_overrides: {
          include_objects: [], exclude_objects: [],
          replace_objects: twinBedsRequested ? [{ from: 'one_bed', to: 'two_twin_beds' }] : [],
        },
        status: twinBedsRequested ? 'user_adjusted' : 'system_default',
        source_refs: [confirmationSourceId],
      };
    }),
    boundaries: (state.roomMap?.boundaries ?? []).map((boundary) => ({
      id: boundary.id, kind: boundary.kind === 'exterior' ? 'exterior_edge' : boundary.kind,
      between_refs: boundary.separates_space_ids,
      geometry: { metric: null, source_geometries: [{ source_ref: sourceId, coordinate_space: 'image_normalized_0_1', kind: 'polyline', coordinates: boundary.path, confidence: boundary.confidence }] },
      structural_status: 'unknown',
      state: boundary.separates_space_ids.every((id) => confirmed.rooms.find((room) => room.id === id)?.boundaryConfirmed) ? 'user_confirmed' : 'inferred',
      confidence: boundary.confidence, source_refs: [sourceId],
    })),
    openings: (state.roomMap?.openings ?? []).map((opening) => ({
      id: opening.id, kind: opening.kind, connects_refs: opening.connects_space_ids,
      geometry: { metric: null, source_geometries: [{ source_ref: sourceId, coordinate_space: 'image_normalized_0_1', kind: 'point', coordinates: [opening.position], confidence: opening.confidence }] },
      width_mm: null, swing_or_orientation: null, state: 'inferred', confidence: opening.confidence, source_refs: [sourceId],
    })),
    objects: [], relationships: [],
    living_patterns: [
      ...confirmed.tags.map((tag, index) => ({ id: `pattern_priority_${index + 1}`, statement: tag, space_refs: [], frequency: 'unknown', priority: 'high', state: 'user_confirmed', confidence: 1, source_refs: [confirmationSourceId] })),
      ...(confirmed.considerations ? [{ id: 'pattern_special_considerations', statement: confirmed.considerations, space_refs: [], frequency: 'unknown', priority: 'high', state: 'user_confirmed', confidence: 1, source_refs: [confirmationSourceId] }] : []),
      ...confirmed.rooms.flatMap((room, index) => room.targetUse ? [{ id: `pattern_target_${index + 1}`, statement: `${room.label} target use: ${room.targetUse}`, space_refs: [room.id], frequency: 'daily', priority: 'high', state: 'user_confirmed', confidence: 1, source_refs: [confirmationSourceId] }] : []),
    ],
    constraints: confirmed.excludedRegions.map((region, index) => ({
      id: `constraint_excluded_${index + 1}`,
      category: 'physical',
      statement: `${region.label} is excluded from furnishing, finish changes, and room programming (${region.reason}).`,
      strength: 'hard', status: 'active', state: 'user_confirmed', confidence: 1,
      source_refs: [sourceId, confirmationSourceId],
    })), problems: [], opportunities: [],
    open_questions: (state.roomMap?.questions ?? []).map((question) => ({ ...question, status: 'open' })),
    change_log: [{ revision: 1, timestamp, summary: 'Committed the user-confirmed room map and excluded regions before layout generation.', changed_ids: [...confirmed.rooms.map((room) => room.id), ...confirmed.excludedRegions.map((region) => region.id)], source_refs: [sourceId, confirmationSourceId] }],
  };
  assertHomeModel(model);
  return { model, locale: confirmed.locale, tags: confirmed.tags, considerations: confirmed.considerations, rooms: confirmed.rooms };
}

async function runVisualization(
  state: ProjectState,
  locale: SupportedLocale,
  userMessage: string,
  eventType: 'agent.generate' | 'agent.refine',
): Promise<{ request: HomeTurnRequest; result: Awaited<ReturnType<HomeLayoutRuntime['runStructuredTurn']>> }> {
  if (!state.homeModel || state.homeModel.status === 'needs_confirmation' || state.homeModel.status === 'draft') {
    throw new Error('All room functions and boundaries must be confirmed before generation');
  }
  const selectedRefs = Array.isArray(state.homeModel.spaces)
    ? state.homeModel.spaces.flatMap((space) => typeof space === 'object' && space !== null && typeof (space as { id?: unknown }).id === 'string' ? [(space as { id: string }).id] : [])
    : [];
  const event: UiAgentEvent = { type: eventType, project_id: state.projectId, mode: 'layout' };
  const request: HomeTurnRequest = {
    schema_version: '1.0', request_id: newId('req'), home_id: state.projectId, operation: 'visualize', locale,
    user_message: `${userMessage.trim()} Preserve every confirmed room function, polygon, wall, column, door, opening, and window. Keep excluded_regions completely outside furnishing, finishes, and room programming. Generate and publish one new label-free colorized floor-plan image with realistic furniture, fixtures, flooring, and material finishes inside the confirmed geometry. Use only the approved ZooWork image routes Banana Pro and Image 2: prefer Banana Pro for source-referenced geometry-preserving image-to-image work and Image 2 for clean-plan generation or pre-generation fallback. Set preferred_providers exactly to ["Banana Pro", "Image 2"], but use only model-selection arguments exposed by the current tool schema. Use the original source asset_ref as the visual reference when supported. Treat room_program baseline_objects as sensible first-draft defaults, use conditional_objects only when the visible space supports them, and let explicit user instructions override defaults. After applying those overrides, target every default_object_counts rule exactly and verify the count room by room, especially beds, toilets, sinks or vanities, shower or tub zones, kitchen sinks, cooktops, refrigerators, sofas, TVs or media walls, dining tables, and desks. Never replace a confirmed room with another function or add another room type's primary fixtures. Assess only circulation, functional relationships, adjacency, privacy, daylight, storage demand, activity conflict, or underused space. Mention only spaces present in the authoritative Home Model. Never report missing furniture, fixtures, appliances, typography, or render defects as design assessment items. After inspection, publish every readable generated raster even when quality warnings exist; only a missing, corrupt, empty, or technically unreadable file may remain unpublished.`,
    evidence: [],
    visualization_request: {
      mode: 'colorized_plan', selected_entity_refs: selectedRefs,
      style_direction: 'Source-referenced, geometry-locked colorized floor plan with realistic furniture and material textures. Keep the original plan footprint and all confirmed walls, columns, doors, openings, and windows unchanged. Add no text, labels, legends, numbers, or pseudo-glyphs; the application overlays localized room names.',
    },
  };
  const result = await runtime.runStructuredTurn(state.conversation, request, state.homeModel, event);
  applyResult(state, result);
  const spaceRefs = new Set((state.homeModel.spaces as Array<{ id?: unknown }> | undefined)
    ?.flatMap((space) => typeof space.id === 'string' ? [space.id] : []) ?? []);
  const diagnosis = result.response.diagnosis;
  const assessmentItems = diagnosis && Array.isArray(diagnosis.assessment_items)
    ? diagnosis.assessment_items.filter((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
      const refs = (item as { affects_refs?: unknown }).affects_refs;
      return Array.isArray(refs) && refs.length > 0 && refs.every((ref) => typeof ref === 'string' && spaceRefs.has(ref));
    })
    : undefined;
  if (diagnosis && assessmentItems) {
    result.response.diagnosis = { ...diagnosis, assessment_items: assessmentItems.slice(0, 5) };
  }
  return { request, result };
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
    if (request.method === 'GET' && url.pathname === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(htmlTemplate.replaceAll('__LOCAL_TEST_TOKEN__', browserToken));
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/health') {
      const agent = await createZooworkClient().getAgent(agentId);
      json(response, 200, {
        ok: true, agent_id: agentId, projects: projects.size, uploads: assets.size,
        extra_image_provider_key_required: false,
        public_asset_base_configured: Boolean(process.env.HOME_LAYOUT_PUBLIC_BASE_URL?.trim()),
        image_analysis_model: agent.declared?.imageModel ?? null,
        image_generation_model: agent.declared?.imageGenerationModel ?? null,
      });
      return;
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/site/layout/source/')) {
      const [rawId, accessToken] = url.pathname.slice('/api/site/layout/source/'.length).split('/');
      const asset = assets.get(decodeURIComponent(rawId ?? ''));
      if (!asset || accessToken !== asset.accessToken) { json(response, 404, { error: 'Source asset not found' }); return; }
      const bytes = readFileSync(asset.path);
      response.writeHead(200, {
        'Content-Type': asset.mimeType, 'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, max-age=900', 'X-Content-Type-Options': 'nosniff',
      });
      response.end(bytes);
      return;
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/site/layout/artifacts/')) {
      const artifactId = decodeURIComponent(url.pathname.slice('/api/site/layout/artifacts/'.length));
      const known = artifacts.get(artifactId);
      if (!known) { json(response, 404, { error: 'Artifact not found' }); return; }
      const signedUrl = await runtime.resolveArtifactUrl(artifactId);
      const upstream = await fetch(signedUrl);
      if (!upstream.ok) throw new Error(`ZooWork artifact download failed (${upstream.status})`);
      const bytes = Buffer.from(await upstream.arrayBuffer());
      response.writeHead(200, {
        'Content-Type': upstream.headers.get('content-type') ?? known.contentType ?? 'application/octet-stream',
        'Content-Length': String(bytes.byteLength), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      });
      response.end(bytes);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/site/layout/upload') {
      if (!isLocalSite(request)) { json(response, 403, { error: 'Upload only accepts the local See My Home UI' }); return; }
      const asset = await receiveUpload(request);
      json(response, 201, {
        project_id: asset.projectId, asset_id: asset.assetId, file_name: asset.fileName, mime_type: asset.mimeType,
        size_bytes: asset.sizeBytes, sha256: asset.sha256, storage: 'application_backend', image_processing_status: 'uploaded',
      });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/site/layout/events/project.create') {
      if (!isLocalSite(request)) { json(response, 403, { error: 'project.create only accepts the local UI' }); return; }
      const turn = createProjectTurn(await readJson(request));
      const state = await stateFor(turn.event.project_id);
      if (state.analyzedAssetId === turn.asset.assetId && state.analysisResult) {
        json(response, 200, state.analysisResult);
        return;
      }
      if (state.analyzedAssetId !== turn.asset.assetId || !state.analysisInFlight) {
        state.analyzedAssetId = turn.asset.assetId;
        state.analysisResult = null;
        state.analysisInFlight = (async () => {
          const result = await runtime.runRoomMapTurn(state.conversation, turn.request, turn.event);
          if (result.cursor) state.conversation.cursor = result.cursor;
          state.roomMap = result.response;
          const includedSpaces = result.response.spaces.filter((space) => space.planning_status !== 'excluded');
          const excludedRegions = result.response.spaces.filter((space) => space.planning_status === 'excluded');
          return {
            project_id: state.projectId, session_id: state.conversation.sessionId, event: 'project.create',
            asset_id: turn.asset.assetId, image_processing_status: 'analyzed_by_agent', provider_model: 'zoowork:imageModel',
            summary: result.response.summary, rooms: includedSpaces, excluded_regions: excludedRegions,
            boundaries: result.response.boundaries, openings: result.response.openings,
            questions: result.response.questions, extracted_text: [],
            warnings: result.response.warnings, tool_calls: result.toolCalls.map((call) => call.toolName).filter(Boolean),
          } satisfies Record<string, unknown>;
        })();
        void state.analysisInFlight.then((value) => {
          state.analysisResult = value;
          state.analysisInFlight = null;
        }, () => {
          state.analysisInFlight = null;
        });
      }
      const analysis = await state.analysisInFlight;
      if (!analysis) throw new Error('Home Layout Agent analysis did not produce a result');
      json(response, 200, analysis);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/site/layout/events/agent.generate') {
      if (!isLocalSite(request)) { json(response, 403, { error: 'agent.generate only accepts the local UI' }); return; }
      const raw = await readJson(request);
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Body must be an object');
      const input = raw as GenerateInput;
      const projectId = requireString(input.home_id, 'home_id');
      const state = projects.get(projectId) ?? await stateFor(projectId);
      if (state.analyzedAssetId && !state.roomMap) throw new Error('project.create must complete before agent.generate');
      const confirmation = buildConfirmedHomeModel(input, state);
      state.homeModel = confirmation.model;
      state.renderPlan = buildRenderPlan(confirmation.rooms, confirmation.tags, confirmation.considerations);
      const generation = await runVisualization(
        state,
        confirmation.locale,
        typeof input.user_message === 'string' && input.user_message.trim()
          ? input.user_message.trim()
          : `Generate the layout design. Living priorities: ${confirmation.tags.join(', ') || 'none specified'}. Special considerations: ${confirmation.considerations || 'none specified'}.`,
        'agent.generate',
      );
      const generatedImage = requireGeneratedImage(generation.result, confirmation.locale);
      const intake: HomeAgentResponse = {
        schema_version: '1.0', request_id: generation.request.request_id, home_id: projectId,
        operation: 'correct', status: 'completed', locale: confirmation.locale,
        message: state.roomMap?.summary ?? 'The confirmed room map was committed to the Home Model.',
        home_model: confirmation.model, diagnosis: null, visualization_brief: null,
        questions: state.roomMap?.questions ?? [], warnings: state.roomMap?.warnings ?? [],
      };
      json(response, 200, {
        session_id: state.conversation.sessionId, image_processing_status: 'analyzed',
        intake, diagnosis: generation.result.response, visualization: generation.result.response,
        generated_image: generatedImage, render_plan: state.renderPlan, event_trace: ['room_map.confirm', 'agent.generate'],
        tool_calls: generation.result.toolCalls.map((call) => call.toolName).filter(Boolean),
      });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/site/layout/events/agent.refine') {
      if (!isLocalSite(request)) { json(response, 403, { error: 'agent.refine only accepts the local UI' }); return; }
      const raw = await readJson(request);
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Body must be an object');
      const input = raw as RefineInput;
      const projectId = requireString(input.home_id, 'home_id');
      const state = projects.get(projectId);
      if (!state?.homeModel) throw new Error('Generate an initial confirmed layout before refining it');
      const locale = parseLocale(input.locale);
      const userMessage = requireString(input.user_message, 'user_message');
      const generation = await runVisualization(state, locale, userMessage, 'agent.refine');
      const generatedImage = requireGeneratedImage(generation.result, locale);
      const intake: HomeAgentResponse = {
        schema_version: '1.0', request_id: generation.request.request_id, home_id: projectId,
        operation: 'correct', status: 'completed', locale,
        message: locale === 'zh-CN' ? '已保留确认的空间功能和边界，并记录本次修改要求。' : 'The confirmed room functions and boundaries were preserved for this refinement.',
        home_model: state.homeModel, diagnosis: null, visualization_brief: null, questions: [], warnings: [],
      };
      json(response, 200, {
        session_id: state.conversation.sessionId, image_processing_status: 'analyzed',
        intake, diagnosis: generation.result.response, visualization: generation.result.response,
        generated_image: generatedImage, render_plan: state.renderPlan, event_trace: ['agent.refine'],
        tool_calls: generation.result.toolCalls.map((call) => call.toolName).filter(Boolean),
      });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/site/layout/reset') {
      if (!isLocalSite(request)) { json(response, 403, { error: 'reset only accepts the local UI' }); return; }
      const body = await readJson(request);
      const projectId = requireString((body as { home_id?: unknown }).home_id, 'home_id');
      projects.delete(projectId);
      json(response, 200, { reset: true, project_id: projectId });
      return;
    }
    json(response, 404, { error: 'Not found' });
  } catch (error) {
    process.stderr.write(`[local-test] ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    const status = error instanceof HomeLayoutTurnTimeoutError ? 504
      : error instanceof GeneratedImageMissingError ? 422
      : error instanceof ZooworkError && error.status >= 500 ? 502
        : error instanceof Error && error.message.includes('HOME_LAYOUT_PUBLIC_BASE_URL') ? 503 : 400;
    json(response, status, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Home Layout local Runtime: http://127.0.0.1:${port}\n`);
  process.stdout.write('Only ZOOWORK_API_KEY is used; visual analysis and colorized layout generation run through the Agent, with a source-locked local fallback.\n');
});
void runtime.ensureRunning().catch((error: unknown) => {
  process.stderr.write(`[local-test] ZooWork readiness check did not complete: ${error instanceof Error ? error.message : String(error)}\n`);
});
