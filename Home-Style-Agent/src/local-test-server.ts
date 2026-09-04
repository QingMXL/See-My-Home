import { createHash, randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { createZooworkClient, ZooworkError } from '@zoowork-ai/sdk';
import type {
  ConversationHandle,
  ModernEastProfile,
  RenovationScope,
  StyleRoomType,
  StyleTurnRequest,
  SupportedLocale,
} from './contracts.js';
import { projectRoot } from './paths.js';
import { HomeStyleRuntime, HomeStyleTurnTimeoutError, MODERN_EAST_KNOWLEDGE_VERSION } from './runtime.js';

const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath)) loadEnvFile(envPath);

const agentId = process.env.ZOOWORK_STYLE_AGENT_ID?.trim() ?? '';
if (!agentId) throw new Error('ZOOWORK_STYLE_AGENT_ID is missing from .env');
const port = Number.parseInt(process.env.HOME_STYLE_TEST_PORT ?? '4318', 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('HOME_STYLE_TEST_PORT must be from 1 to 65535');

const runtime = HomeStyleRuntime.fromEnvironment({ agentId });
const uploadDirectory = resolve(projectRoot, '.runtime', 'uploads');
const maxUploadBytes = 15 * 1024 * 1024;

interface UploadedAsset {
  assetId: string;
  projectId: string;
  accessToken: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  sha256: string;
  path: string;
}

interface ProjectState {
  projectId: string;
  asset: UploadedAsset;
  conversation: ConversationHandle;
  roomType: StyleRoomType;
  profile: ModernEastProfile;
  renovationScope: RenovationScope;
  preferences: string[];
  artifactIds: Set<string>;
}

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
  if (!size) throw new Error('Uploaded file is empty');
  return Buffer.concat(chunks);
}

function parseMime(value: string | undefined): UploadedAsset['mimeType'] {
  const mime = value?.split(';', 1)[0]?.trim().toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp') return mime;
  throw new Error('Only JPG, PNG, and WebP room photos are supported');
}

function signatureMatches(bytes: Buffer, mime: UploadedAsset['mimeType']): boolean {
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === 'image/jpeg') return bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes.length > 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

function decodeFileName(value: string | undefined): string {
  if (!value) throw new Error('X-Upload-File-Name is required');
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { throw new Error('X-Upload-File-Name is invalid'); }
  decoded = decoded.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!decoded || decoded.length > 255) throw new Error('File name must contain 1 to 255 characters');
  return decoded;
}

async function receiveUpload(request: IncomingMessage): Promise<UploadedAsset> {
  const fileName = decodeFileName(request.headers['x-upload-file-name'] as string | undefined);
  const mimeType = parseMime(request.headers['content-type']);
  const bytes = await readBinary(request);
  if (!signatureMatches(bytes, mimeType)) throw new Error('File bytes do not match the declared MIME type');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const assetId = `asset_${sha256.slice(0, 20)}_${randomBytes(4).toString('hex')}`;
  const projectId = newId('style');
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  mkdirSync(uploadDirectory, { recursive: true, mode: 0o700 });
  const path = resolve(uploadDirectory, `${assetId}.${extension}`);
  writeFileSync(path, bytes, { flag: 'wx', mode: 0o600 });
  const asset = {
    assetId,
    projectId,
    accessToken: randomBytes(24).toString('hex'),
    fileName,
    mimeType,
    sizeBytes: bytes.byteLength,
    sha256,
    path,
  } satisfies UploadedAsset;
  assets.set(assetId, asset);
  return asset;
}

function publicBaseUrl(): string {
  const value = process.env.HOME_STYLE_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (!value?.startsWith('https://')) {
    throw new Error('HOME_STYLE_PUBLIC_BASE_URL must be an HTTPS URL reachable by the hosted ZooWork Agent');
  }
  return value;
}

function sourceUrl(asset: UploadedAsset): string {
  return `${publicBaseUrl()}/api/site/style/source/${encodeURIComponent(asset.assetId)}/${asset.accessToken}`;
}

const roomTypes = new Set<StyleRoomType>(['living_room', 'primary_bedroom', 'kitchen', 'dining_room', 'bathroom', 'home_office', 'other']);
const profiles = new Set<ModernEastProfile>(['quiet-poise', 'urban-elegance', 'sculptural-luxe', 'warm-residence']);
const scopes = new Set<RenovationScope>(['soft_furnishing_only', 'finishes_and_furnishing', 'limited_hard_finish']);

function stringArray(value: unknown, maxItems: number): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Expected an array of at most ${maxItems} strings`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

async function createState(input: Record<string, unknown>): Promise<ProjectState> {
  const projectId = requireString(input.project_id, 'project_id');
  const asset = assets.get(requireString(input.asset_id, 'asset_id'));
  if (!asset || asset.projectId !== projectId) throw new Error('asset_id does not belong to project_id');
  const existing = projects.get(projectId);
  if (existing) return existing;
  const roomType = input.room_type as StyleRoomType;
  if (!roomTypes.has(roomType)) throw new Error('room_type is unsupported');
  const profile = (input.style_profile ?? 'quiet-poise') as ModernEastProfile;
  if (!profiles.has(profile)) throw new Error('style_profile is unsupported');
  const renovationScope = (input.renovation_scope ?? 'finishes_and_furnishing') as RenovationScope;
  if (!scopes.has(renovationScope)) throw new Error('renovation_scope is unsupported');
  const conversation = await runtime.createConversation(projectId, newId(`style_${projectId}`));
  const state: ProjectState = {
    projectId,
    asset,
    conversation,
    roomType,
    profile,
    renovationScope,
    preferences: stringArray(input.preferences, 12),
    artifactIds: new Set(),
  };
  projects.set(projectId, state);
  return state;
}

function locale(value: unknown): SupportedLocale {
  if (value === 'en-US' || value === 'zh-CN') return value;
  throw new Error('locale must be en-US or zh-CN');
}

function imageMime(contentType: string | null, fileName: string | null): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  const mime = contentType?.split(';', 1)[0]?.trim().toLowerCase();
  if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/webp') return mime;
  const lower = fileName?.toLowerCase() ?? '';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return null;
}

async function runGeneration(state: ProjectState, selectedLocale: SupportedLocale) {
  const request: StyleTurnRequest = {
    contract_version: 'home-style-v1',
    request_id: newId('req'),
    home_id: state.projectId,
    source_asset_ref: sourceUrl(state.asset),
    room_type: state.roomType,
    style_id: 'modern_east',
    style_profile: state.profile,
    renovation_scope: state.renovationScope,
    user_preferences: state.preferences,
    known_immutable_elements: [
      'room envelope', 'walls', 'columns', 'beams', 'doors', 'windows', 'openings',
      'ceiling geometry', 'fixed service locations', 'camera position', 'lens perspective', 'crop',
    ],
  };
  const result = await runtime.runStyleTurn(state.conversation, request);
  if (result.cursor) state.conversation.cursor = result.cursor;
  for (const artifact of result.artifacts) {
    state.artifactIds.add(artifact.artifactId);
    artifacts.set(artifact.artifactId, { contentType: artifact.contentType });
  }
  const ready = result.artifacts.find((artifact) => artifact.status === 'ready' && imageMime(artifact.contentType, artifact.fileName));
  const passedQa = result.response.qa.structure_preserved
    && result.response.qa.camera_preserved
    && result.response.qa.style_passed
    && result.response.qa.publishable;
  if (result.response.status !== 'completed' || !passedQa || !ready) {
    const reason = result.response.warnings?.join(' ') || 'The result did not pass structural and style QA.';
    throw new Error(reason);
  }
  return {
    session_id: state.conversation.sessionId,
    request_id: request.request_id,
    project_id: state.projectId,
    style_id: 'modern_east',
    style_profile: state.profile,
    knowledge_version: MODERN_EAST_KNOWLEDGE_VERSION,
    response: result.response,
    generated_image: {
      asset_id: ready.artifactId,
      url: `/api/home-style/artifacts/${encodeURIComponent(ready.artifactId)}`,
      mime_type: imageMime(ready.contentType, ready.fileName),
      size_bytes: ready.size ?? 0,
      provider_model: 'zoowork:imageGenerationModel',
    },
  };
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
    if (request.method === 'GET' && url.pathname === '/api/health') {
      const agent = await createZooworkClient().getAgent(agentId);
      json(response, 200, { ok: true, agent_id: agentId, desired_state: agent.status?.desired_state, projects: projects.size });
      return;
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/site/style/source/')) {
      const [rawId, token] = url.pathname.slice('/api/site/style/source/'.length).split('/');
      const asset = assets.get(decodeURIComponent(rawId ?? ''));
      if (!asset || token !== asset.accessToken) { json(response, 404, { error: 'Source asset not found' }); return; }
      const bytes = readFileSync(asset.path);
      response.writeHead(200, {
        'Content-Type': asset.mimeType,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, max-age=900',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(bytes);
      return;
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/site/style/artifacts/')) {
      const artifactId = decodeURIComponent(url.pathname.slice('/api/site/style/artifacts/'.length));
      const known = artifacts.get(artifactId);
      if (!known) { json(response, 404, { error: 'Artifact not found' }); return; }
      const signedUrl = await runtime.resolveArtifactUrl(artifactId);
      const upstream = await fetch(signedUrl);
      if (!upstream.ok) throw new Error(`ZooWork artifact download failed (${upstream.status})`);
      const bytes = Buffer.from(await upstream.arrayBuffer());
      response.writeHead(200, {
        'Content-Type': upstream.headers.get('content-type') ?? known.contentType ?? 'application/octet-stream',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(bytes);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/site/style/upload') {
      if (!isLocalSite(request)) { json(response, 403, { error: 'Upload only accepts the local See My Home UI' }); return; }
      const asset = await receiveUpload(request);
      json(response, 201, {
        project_id: asset.projectId,
        asset_id: asset.assetId,
        file_name: asset.fileName,
        mime_type: asset.mimeType,
        size_bytes: asset.sizeBytes,
        sha256: asset.sha256,
        storage: 'application_backend',
        image_processing_status: 'uploaded',
      });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/site/style/events/agent.generate') {
      if (!isLocalSite(request)) { json(response, 403, { error: 'Generate only accepts the local See My Home UI' }); return; }
      const raw = await readJson(request);
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Body must be an object');
      const input = raw as Record<string, unknown>;
      if (input.style_id !== 'modern_east') throw new Error('Only modern_east is currently deployed');
      const state = await createState(input);
      json(response, 200, { ...(await runGeneration(state, locale(input.locale))), request_context: input });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/site/style/events/agent.refine') {
      if (!isLocalSite(request)) { json(response, 403, { error: 'Refine only accepts the local See My Home UI' }); return; }
      const raw = await readJson(request);
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Body must be an object');
      const input = raw as Record<string, unknown>;
      const baseInput = typeof input.base_input === 'object' && input.base_input !== null && !Array.isArray(input.base_input)
        ? input.base_input as Record<string, unknown>
        : null;
      const projectId = requireString(input.project_id ?? baseInput?.project_id, 'project_id');
      const state = projects.get(projectId);
      if (!state) throw new Error('Generate the initial style result before refining it');
      const refinement = requireString(input.refinement, 'refinement');
      state.preferences = [...state.preferences, refinement].slice(-12);
      json(response, 200, { ...(await runGeneration(state, locale(input.locale))), request_context: baseInput ?? { project_id: projectId } });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/site/style/reset') {
      if (!isLocalSite(request)) { json(response, 403, { error: 'Reset only accepts the local See My Home UI' }); return; }
      const raw = await readJson(request) as { project_id?: unknown };
      projects.delete(requireString(raw.project_id, 'project_id'));
      json(response, 200, { reset: true });
      return;
    }
    json(response, 404, { error: 'Not found' });
  } catch (error) {
    process.stderr.write(`[home-style] ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    const status = error instanceof HomeStyleTurnTimeoutError ? 504
      : error instanceof ZooworkError && error.status >= 500 ? 502
        : error instanceof Error && error.message.includes('HOME_STYLE_PUBLIC_BASE_URL') ? 503 : 400;
    json(response, status, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Home Style local Runtime: http://127.0.0.1:${port}\n`);
});
void runtime.ensureRunning().catch((error: unknown) => {
  process.stderr.write(`[home-style] ZooWork readiness check did not complete: ${error instanceof Error ? error.message : String(error)}\n`);
});
