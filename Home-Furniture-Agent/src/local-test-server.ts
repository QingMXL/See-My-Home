import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { createZooworkClient, ZooworkError } from '@zoowork-ai/sdk';
import type {
  FurnitureDesignControls,
  FurnitureTurnRequest,
  SupportedLocale,
  TableType,
  TopShape,
} from './contracts.js';
import { projectRoot } from './paths.js';
import { HomeFurnitureRuntime, HomeFurnitureTurnTimeoutError } from './runtime.js';

const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath)) loadEnvFile(envPath);

const agentId = process.env.ZOOWORK_FURNITURE_AGENT_ID?.trim() ?? '';
if (!agentId) throw new Error('ZOOWORK_FURNITURE_AGENT_ID is missing from .env');
const port = Number.parseInt(process.env.HOME_FURNITURE_TEST_PORT ?? '4319', 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('HOME_FURNITURE_TEST_PORT must be from 1 to 65535');

const runtime = HomeFurnitureRuntime.fromEnvironment({ agentId, turnTimeoutMs: 760_000 });
const uploadDirectory = resolve(projectRoot, '.runtime', 'uploads');
const maxUploadBytes = 15 * 1024 * 1024;

interface UploadedAsset {
  assetId: string;
  projectId: string;
  sourceKind: 'sketch' | 'inspiration';
  accessToken: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  sha256: string;
  path: string;
}

const assets = new Map<string, UploadedAsset>();
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

function optionalString(value: unknown, field: string, maxLength: number): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  return value.trim().slice(0, maxLength);
}

function isLocalSite(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  return typeof origin === 'string' && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > 2_000_000) throw new Error('JSON request exceeds 2 MB');
    chunks.push(bytes);
  }
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Body must be an object');
  return value as Record<string, unknown>;
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

function mimeType(value: string | undefined): UploadedAsset['mimeType'] {
  const mime = value?.split(';', 1)[0]?.trim().toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp') return mime;
  throw new Error('Only JPG, PNG, and WebP images are supported');
}

function signatureMatches(bytes: Buffer, mime: UploadedAsset['mimeType']): boolean {
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === 'image/jpeg') return bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes.length > 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

function headerValue(request: IncomingMessage, name: string): string {
  const value = request.headers[name];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

async function receiveUpload(request: IncomingMessage): Promise<UploadedAsset> {
  const projectId = headerValue(request, 'x-upload-project-id');
  const sourceKind = headerValue(request, 'x-upload-source-kind');
  if (sourceKind !== 'sketch' && sourceKind !== 'inspiration') throw new Error('X-Upload-Source-Kind is unsupported');
  let fileName: string;
  try { fileName = decodeURIComponent(headerValue(request, 'x-upload-file-name')); }
  catch { throw new Error('X-Upload-File-Name is invalid'); }
  fileName = fileName.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!fileName || fileName.length > 255) throw new Error('File name must contain 1 to 255 characters');
  const mime = mimeType(request.headers['content-type']);
  const bytes = await readBinary(request);
  if (!signatureMatches(bytes, mime)) throw new Error('File bytes do not match the declared MIME type');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const assetId = `asset_${sha256.slice(0, 20)}_${randomBytes(4).toString('hex')}`;
  const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  mkdirSync(uploadDirectory, { recursive: true, mode: 0o700 });
  const path = resolve(uploadDirectory, `${assetId}.${extension}`);
  writeFileSync(path, bytes, { flag: 'wx', mode: 0o600 });
  const asset: UploadedAsset = {
    assetId,
    projectId,
    sourceKind,
    accessToken: randomBytes(24).toString('hex'),
    fileName,
    mimeType: mime,
    sizeBytes: bytes.byteLength,
    sha256,
    path,
  };
  assets.set(assetId, asset);
  return asset;
}

function publicBaseUrl(): string {
  const value = process.env.HOME_FURNITURE_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (!value?.startsWith('https://')) throw new Error('HOME_FURNITURE_PUBLIC_BASE_URL must be a public HTTPS URL reachable by ZooWork when image inputs are used');
  return value;
}

function sourceUrl(asset: UploadedAsset): string {
  return `${publicBaseUrl()}/api/site/furniture/source/${encodeURIComponent(asset.assetId)}/${asset.accessToken}`;
}

const tableTypes = new Set<TableType>(['dining_table', 'coffee_table', 'console_table', 'side_table', 'desk', 'bedside_table', 'nesting_tables', 'bar_table', 'other_table']);
const topShapes = new Set<TopShape>(['rectangular', 'round', 'oval', 'square', 'freeform']);

function dimension(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${field} is invalid`);
  return value;
}

function controls(input: Record<string, unknown>): FurnitureDesignControls {
  const dimensions = input.dimensions_mm;
  if (typeof dimensions !== 'object' || dimensions === null || Array.isArray(dimensions)) throw new Error('dimensions_mm must be an object');
  const values = dimensions as Record<string, unknown>;
  const shape = requireString(input.top_shape, 'top_shape') as TopShape;
  if (!topShapes.has(shape)) throw new Error('top_shape is unsupported');
  return {
    dimensions_mm: {
      width: dimension(values.width, 'dimensions_mm.width', 250, 5000),
      depth: dimension(values.depth, 'dimensions_mm.depth', 200, 2000),
      height: dimension(values.height, 'dimensions_mm.height', 150, 1500),
    },
    primary_material: requireString(input.primary_material, 'primary_material').slice(0, 120),
    secondary_material: optionalString(input.secondary_material, 'secondary_material', 120),
    top_shape: shape,
    edge_profile: requireString(input.edge_profile, 'edge_profile').slice(0, 120),
    base_style: requireString(input.base_style, 'base_style').slice(0, 120),
    finish: requireString(input.finish, 'finish').slice(0, 120),
    storage: optionalString(input.storage, 'storage', 240),
    ...(optionalString(input.component_notes, 'component_notes', 1000) ? { component_notes: optionalString(input.component_notes, 'component_notes', 1000) } : {}),
  };
}

function selectedLocale(value: unknown): SupportedLocale {
  if (value === 'en-US' || value === 'zh-CN') return value;
  throw new Error('locale must be en-US or zh-CN');
}

function getAsset(value: unknown, projectId: string, kind: UploadedAsset['sourceKind']): UploadedAsset | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const asset = assets.get(requireString(value, `${kind}_asset_id`));
  if (!asset || asset.projectId !== projectId || asset.sourceKind !== kind) throw new Error(`${kind}_asset_id does not belong to this project`);
  return asset;
}

async function runGeneration(input: Record<string, unknown>) {
  const projectId = requireString(input.project_id, 'project_id');
  const tableType = requireString(input.table_type, 'table_type') as TableType;
  if (!tableTypes.has(tableType)) throw new Error('table_type is unsupported');
  const sketch = getAsset(input.sketch_asset_id, projectId, 'sketch');
  const inspiration = getAsset(input.inspiration_asset_id, projectId, 'inspiration');
  const description = optionalString(input.description, 'description', 4000);
  if (!sketch && !inspiration && !description) throw new Error('Provide a sketch, an inspiration image, or a written description');
  const conversation = await runtime.createConversation(projectId, newId(`furniture_${projectId}`));
  const request: FurnitureTurnRequest = {
    contract_version: 'home-furniture-v1',
    request_id: newId('req'),
    project_id: projectId,
    locale: selectedLocale(input.locale),
    table_type: tableType,
    ...(sketch ? { sketch_asset_ref: sourceUrl(sketch) } : {}),
    ...(inspiration ? { inspiration_asset_ref: sourceUrl(inspiration) } : {}),
    ...(description ? { description } : {}),
    source_priority: sketch && inspiration ? { sketch: 0.8, inspiration: 0.2 } : sketch ? { sketch: 1, inspiration: 0 } : inspiration ? { sketch: 0, inspiration: 1 } : { sketch: 0, inspiration: 0 },
    design_controls: controls(input),
  };
  const result = await runtime.runFurnitureTurn(conversation, request);
  const artifact = result.artifacts.find((candidate) => candidate.status === 'ready' && (candidate.contentType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(candidate.fileName ?? '')));
  if (!artifact) throw new Error(result.response.warnings.join(' ') || 'Furniture generation completed without a readable image artifact');
  artifacts.set(artifact.artifactId, { contentType: artifact.contentType });
  return {
    session_id: conversation.sessionId,
    request_id: request.request_id,
    project_id: projectId,
    table_type: tableType,
    source_priority: request.source_priority,
    response: result.response,
    generated_image: {
      asset_id: artifact.artifactId,
      url: `/api/home-furniture/artifacts/${encodeURIComponent(artifact.artifactId)}`,
      mime_type: artifact.contentType ?? 'image/png',
      size_bytes: artifact.size ?? 0,
      provider_model: 'ZooWork imageGenerationModel',
    },
    request_context: input,
  };
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
    if (request.method === 'GET' && url.pathname === '/api/health') {
      const agent = await createZooworkClient().getAgent(agentId);
      json(response, 200, { ok: true, agent_id: agentId, desired_state: agent.status?.desired_state, assets: assets.size });
      return;
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/site/furniture/source/')) {
      const [rawId, token] = url.pathname.slice('/api/site/furniture/source/'.length).split('/');
      const asset = assets.get(decodeURIComponent(rawId ?? ''));
      if (!asset || token !== asset.accessToken) { json(response, 404, { error: 'Source asset not found' }); return; }
      const bytes = readFileSync(asset.path);
      response.writeHead(200, { 'Content-Type': asset.mimeType, 'Content-Length': String(bytes.byteLength), 'Cache-Control': 'private, max-age=900', 'X-Content-Type-Options': 'nosniff' });
      response.end(bytes);
      return;
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/site/furniture/artifacts/')) {
      const artifactId = decodeURIComponent(url.pathname.slice('/api/site/furniture/artifacts/'.length));
      const known = artifacts.get(artifactId);
      if (!known) { json(response, 404, { error: 'Artifact not found' }); return; }
      const upstream = await fetch(await runtime.resolveArtifactUrl(artifactId));
      if (!upstream.ok) throw new Error(`ZooWork artifact download failed (${upstream.status})`);
      const bytes = Buffer.from(await upstream.arrayBuffer());
      response.writeHead(200, { 'Content-Type': upstream.headers.get('content-type') ?? known.contentType ?? 'application/octet-stream', 'Content-Length': String(bytes.byteLength), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(bytes);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/site/furniture/upload') {
      if (!isLocalSite(request)) { json(response, 403, { error: 'Upload only accepts the local See My Home UI' }); return; }
      const asset = await receiveUpload(request);
      json(response, 201, { project_id: asset.projectId, asset_id: asset.assetId, source_kind: asset.sourceKind, file_name: asset.fileName, mime_type: asset.mimeType, size_bytes: asset.sizeBytes, sha256: asset.sha256, storage: 'application_backend', image_processing_status: 'uploaded' });
      return;
    }
    if (request.method === 'POST' && (url.pathname === '/api/site/furniture/events/agent.generate' || url.pathname === '/api/site/furniture/events/agent.refine')) {
      if (!isLocalSite(request)) { json(response, 403, { error: 'Generation only accepts the local See My Home UI' }); return; }
      const body = await readJson(request);
      const base = url.pathname.endsWith('agent.refine')
        ? (typeof body.base_input === 'object' && body.base_input !== null && !Array.isArray(body.base_input) ? body.base_input as Record<string, unknown> : {})
        : body;
      const overrides = typeof body.controls === 'object' && body.controls !== null && !Array.isArray(body.controls) ? body.controls as Record<string, unknown> : {};
      const input = { ...base, ...overrides };
      if (body.locale !== undefined) input.locale = body.locale;
      if (body.description !== undefined) input.description = body.description;
      json(response, 200, await runGeneration(input));
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/site/furniture/reset') { json(response, 200, { reset: true }); return; }
    json(response, 404, { error: 'Not found' });
  } catch (error) {
    process.stderr.write(`[home-furniture] ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    const status = error instanceof HomeFurnitureTurnTimeoutError ? 504 : error instanceof ZooworkError && error.status >= 500 ? 502 : 400;
    json(response, status, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Home Furniture Runtime listening on http://127.0.0.1:${port}\n`);
});
