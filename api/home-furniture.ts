import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { del } from '@vercel/blob';
import { ZooworkError } from '@zoowork-ai/sdk';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  FurnitureControlKey,
  FurnitureDesignControls,
  FurnitureDesignSpec,
  FurnitureTurnRequest,
  TableType,
  TopShape,
} from '../Home-Furniture-Agent/src/contracts.js';
import {
  HomeFurnitureRuntime,
  HomeFurnitureTurnTimeoutError,
} from '../Home-Furniture-Agent/src/runtime.js';
import {
  newId,
  objectBody,
  parseLocale,
  persistGeneratedImage,
  persistGeneratedImageBytes,
  privateBlobUrl,
  privateResultBlobUrl,
  requestPath,
  requireString,
  sendJson,
  temporaryBlobReadUrl,
} from './_lib/common.js';
import { createDimensionedOrthographicPng } from './_lib/furniture-drawing.js';
import { assertFurnitureAgentResponse } from '../Home-Furniture-Agent/src/validation.js';

export const config = { maxDuration: 300 };

const tableTypes = new Set<TableType>([
  'dining_table', 'coffee_table', 'console_table', 'side_table', 'desk',
  'bedside_table', 'nesting_tables', 'bar_table', 'other_table',
]);
const topShapes = new Set<TopShape>(['rectangular', 'round', 'oval', 'square', 'freeform']);
const furnitureControlKeys = new Set<FurnitureControlKey>([
  'dimensions_mm', 'primary_material', 'secondary_material', 'top_shape', 'edge_profile',
  'base_style', 'finish', 'storage', 'component_notes',
]);

function runtime(): HomeFurnitureRuntime {
  const agentId = process.env.ZOOWORK_FURNITURE_AGENT_ID?.trim();
  if (!agentId) throw new Error('ZOOWORK_FURNITURE_AGENT_ID is not configured on Vercel');
  return HomeFurnitureRuntime.fromEnvironment({ agentId, turnTimeoutMs: 760_000 });
}

async function uploadToken(request: VercelRequest, response: VercelResponse): Promise<void> {
  const result = await handleUpload({
    request,
    body: objectBody(request.body) as unknown as HandleUploadBody,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const payload = objectBody(JSON.parse(clientPayload ?? '{}'));
      const projectId = requireString(payload.project_id, 'project_id');
      const sourceKind = requireString(payload.source_kind, 'source_kind');
      if (sourceKind !== 'sketch' && sourceKind !== 'inspiration') throw new Error('source_kind is unsupported');
      const expected = `uploads/furniture/${encodeURIComponent(projectId)}/${sourceKind}/`;
      if (!pathname.startsWith(expected)) throw new Error('Upload pathname does not match project_id and source_kind');
      return {
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maximumSizeInBytes: 15 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ kind: 'furniture', project_id: projectId, source_kind: sourceKind }),
      };
    },
  });
  sendJson(response, 200, result);
}

interface FurnitureApiInput extends Record<string, unknown> {
  project_id?: unknown;
  sketch_asset_id?: unknown;
  inspiration_asset_id?: unknown;
  locale?: unknown;
  table_type?: unknown;
  description?: unknown;
  dimensions_mm?: unknown;
  primary_material?: unknown;
  secondary_material?: unknown;
  top_shape?: unknown;
  edge_profile?: unknown;
  base_style?: unknown;
  finish?: unknown;
  storage?: unknown;
  component_notes?: unknown;
  source_priority?: unknown;
  locked_controls?: unknown;
}

interface FurnitureJob {
  version: 1;
  sessionId: string;
  postedSeq: number;
  requestId: string;
  projectId: string;
  type: 'agent.generate' | 'agent.refine' | 'agent.orthographic';
  expiresAt: number;
}

function jobSecret(): string {
  const value = process.env.ZOOWORK_API_KEY?.trim();
  if (!value) throw new Error('ZOOWORK_API_KEY is not configured on Vercel');
  return value;
}

function signJob(job: FurnitureJob): string {
  const payload = Buffer.from(JSON.stringify(job), 'utf8').toString('base64url');
  const signature = createHmac('sha256', jobSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyJob(value: unknown): FurnitureJob | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length < 20 || value.length > 4096) throw new Error('job_token is invalid');
  const parts = value.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('job_token is invalid');
  const expected = createHmac('sha256', jobSecret()).update(parts[0]).digest();
  let actual: Buffer;
  try { actual = Buffer.from(parts[1], 'base64url'); } catch { throw new Error('job_token is invalid'); }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('job_token is invalid');
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { throw new Error('job_token is invalid'); }
  const job = objectBody(parsed);
  if (
    job.version !== 1
    || typeof job.sessionId !== 'string'
    || typeof job.postedSeq !== 'number'
    || !Number.isSafeInteger(job.postedSeq)
    || job.postedSeq < 0
    || typeof job.requestId !== 'string'
    || typeof job.projectId !== 'string'
    || (job.type !== 'agent.generate' && job.type !== 'agent.refine' && job.type !== 'agent.orthographic')
    || typeof job.expiresAt !== 'number'
    || job.expiresAt < Date.now()
  ) throw new Error('job_token is invalid or expired');
  return job as unknown as FurnitureJob;
}

function optionalString(value: unknown, field: string, maxLength: number): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  return value.trim().slice(0, maxLength);
}

function integerDimension(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${field} must be an integer from ${min} to ${max} millimetres`);
  }
  return value;
}

function parseControls(input: FurnitureApiInput): FurnitureDesignControls {
  const dimensions = objectBody(input.dimensions_mm);
  const topShape = requireString(input.top_shape, 'top_shape') as TopShape;
  if (!topShapes.has(topShape)) throw new Error('top_shape is unsupported');
  return {
    dimensions_mm: {
      width: integerDimension(dimensions.width, 'dimensions_mm.width', 250, 5000),
      depth: integerDimension(dimensions.depth, 'dimensions_mm.depth', 200, 2000),
      height: integerDimension(dimensions.height, 'dimensions_mm.height', 150, 1500),
    },
    primary_material: requireString(input.primary_material, 'primary_material').slice(0, 120),
    secondary_material: optionalString(input.secondary_material, 'secondary_material', 120),
    top_shape: topShape,
    edge_profile: requireString(input.edge_profile, 'edge_profile').slice(0, 120),
    base_style: requireString(input.base_style, 'base_style').slice(0, 120),
    finish: requireString(input.finish, 'finish').slice(0, 120),
    storage: optionalString(input.storage, 'storage', 240),
    ...(optionalString(input.component_notes, 'component_notes', 1000)
      ? { component_notes: optionalString(input.component_notes, 'component_notes', 1000) }
      : {}),
  };
}

function parseLockedControls(value: unknown): FurnitureControlKey[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('locked_controls must be an array');
  const controls = value.map((candidate) => {
    if (typeof candidate !== 'string' || !furnitureControlKeys.has(candidate as FurnitureControlKey)) {
      throw new Error('locked_controls contains an unsupported control');
    }
    return candidate as FurnitureControlKey;
  });
  if (new Set(controls).size !== controls.length) throw new Error('locked_controls must not contain duplicates');
  return controls;
}

function sourcePriority(
  input: FurnitureApiInput,
  hasSketch: boolean,
  hasInspiration: boolean,
): FurnitureTurnRequest['source_priority'] {
  if (hasSketch && hasInspiration) {
    if (input.source_priority === undefined) return { sketch: 0.8, inspiration: 0.2 };
    const requested = objectBody(input.source_priority);
    const sketch = requested.sketch;
    const inspiration = requested.inspiration;
    if (
      typeof sketch !== 'number'
      || typeof inspiration !== 'number'
      || !Number.isFinite(sketch)
      || !Number.isFinite(inspiration)
      || sketch <= 0
      || inspiration <= 0
      || sketch >= 1
      || inspiration >= 1
      || Math.abs(sketch + inspiration - 1) > 0.0001
    ) throw new Error('source_priority must contain positive sketch and inspiration weights that add up to 1');
    return { sketch, inspiration };
  }
  if (hasSketch) return { sketch: 1, inspiration: 0 };
  if (hasInspiration) return { sketch: 0, inspiration: 1 };
  return { sketch: 0, inspiration: 0 };
}

async function generate(request: VercelRequest, response: VercelResponse, refine: boolean): Promise<void> {
  const body = objectBody(request.body);
  const type = refine ? 'agent.refine' : 'agent.generate';
  const job = verifyJob(body.job_token);
  const base = (refine ? objectBody(body.base_input) : (() => {
    const input = { ...body };
    delete input.job_token;
    return input;
  })()) as FurnitureApiInput;
  const overrides = refine ? objectBody(body.controls) : {};
  const input = { ...base, ...overrides } as FurnitureApiInput;
  if (refine && body.description !== undefined) input.description = body.description;

  const locale = parseLocale(refine ? body.locale : input.locale);
  const projectId = requireString(input.project_id, 'project_id');
  const tableType = requireString(input.table_type, 'table_type') as TableType;
  if (!tableTypes.has(tableType)) throw new Error('table_type is unsupported');
  const description = optionalString(input.description, 'description', 4000);

  const sketchBlobUrl = input.sketch_asset_id
    ? privateBlobUrl(input.sketch_asset_id, 'furniture', projectId)
    : null;
  const inspirationBlobUrl = input.inspiration_asset_id
    ? privateBlobUrl(input.inspiration_asset_id, 'furniture', projectId)
    : null;
  if (!sketchBlobUrl && !inspirationBlobUrl && !description) {
    throw new Error('Provide a sketch, an inspiration image, or a written description');
  }
  if (job && (job.projectId !== projectId || job.type !== type)) {
    throw new Error('job_token does not match this request');
  }

  const sketchRef = sketchBlobUrl ? await temporaryBlobReadUrl(sketchBlobUrl) : undefined;
  const inspirationRef = inspirationBlobUrl ? await temporaryBlobReadUrl(inspirationBlobUrl) : undefined;
  const zoo = runtime();
  const requestId = job?.requestId ?? newId('req');
  const turn: FurnitureTurnRequest = {
    contract_version: 'home-furniture-v1',
    output_mode: 'concept_render',
    request_id: requestId,
    project_id: projectId,
    locale,
    table_type: tableType,
    ...(sketchRef ? { sketch_asset_ref: sketchRef } : {}),
    ...(inspirationRef ? { inspiration_asset_ref: inspirationRef } : {}),
    ...(description ? { description } : {}),
    source_priority: sourcePriority(input, Boolean(sketchRef), Boolean(inspirationRef)),
    locked_controls: parseLockedControls(input.locked_controls),
    design_controls: parseControls(input),
  };

  if (!job) {
    await zoo.ensureRunning();
    const conversation = await zoo.createConversation(projectId, newId(`furniture_${refine ? 'refine' : 'generate'}_${projectId}`));
    const started = await zoo.startFurnitureTurn(conversation, turn);
    sendJson(response, 202, {
      status: 'processing',
      job_token: signJob({
        version: 1,
        sessionId: conversation.sessionId,
        postedSeq: started.postedSeq,
        requestId,
        projectId,
        type,
        expiresAt: Date.now() + 30 * 60 * 1000,
      }),
      poll_after_ms: 3_000,
    });
    return;
  }

  const conversation = { agentId: zoo.agentId, sessionId: job.sessionId };
  const polled = await zoo.pollFurnitureTurn(conversation, turn, job.postedSeq);
  if (polled.status === 'processing') {
    sendJson(response, 202, {
      status: 'processing',
      job_token: signJob(job),
      poll_after_ms: 3_000,
    });
    return;
  }

  const result = polled.result;
  const artifact = result.artifacts.find((candidate) => candidate.status === 'ready'
    && (candidate.contentType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(candidate.fileName ?? '')));
  if (!artifact) throw new Error(result.response.warnings.join(' ') || 'Home Furniture Agent completed without a readable published image artifact');
  const signedUrl = await zoo.resolveArtifactUrl(artifact.artifactId);
  const stored = await persistGeneratedImage({
    signedUrl,
    kind: 'furniture',
    projectId,
    requestId: turn.request_id,
    artifactId: artifact.artifactId,
    contentType: artifact.contentType,
    fileName: artifact.fileName,
    size: artifact.size,
  });

  sendJson(response, 200, {
    session_id: conversation.sessionId,
    request_id: turn.request_id,
    project_id: projectId,
    table_type: tableType,
    source_priority: turn.source_priority,
    response: result.response,
    generated_image: { ...stored, provider_model: 'ZooWork imageGenerationModel' },
    request_context: {
      project_id: projectId,
      sketch_asset_id: sketchBlobUrl,
      inspiration_asset_id: inspirationBlobUrl,
      locale,
      table_type: tableType,
      description,
      source_priority: turn.source_priority,
      locked_controls: turn.locked_controls,
      ...turn.design_controls,
    },
  });
}

function confirmedControls(spec: FurnitureDesignSpec): FurnitureDesignControls {
  const primary = spec.materials[0];
  const secondary = spec.materials[1];
  return {
    dimensions_mm: spec.dimensions_mm,
    primary_material: primary?.material ?? 'Confirmed material',
    secondary_material: secondary?.material ?? '',
    top_shape: spec.top.shape,
    edge_profile: spec.top.edge_profile,
    base_style: spec.base.style,
    finish: primary?.finish ?? 'Confirmed finish',
    storage: spec.components.filter((component) => component.role === 'drawer' || component.role === 'shelf').map((component) => `${component.quantity} ${component.name}`).join(', '),
    component_notes: spec.components.map((component) => `${component.quantity} × ${component.name}`).join('; '),
  };
}

async function orthographic(request: VercelRequest, response: VercelResponse): Promise<void> {
  const body = objectBody(request.body);
  const job = verifyJob(body.job_token);
  const projectId = requireString(body.project_id, 'project_id');
  const locale = parseLocale(body.locale);
  const baseResponse = body.design_response;
  assertFurnitureAgentResponse(baseResponse);
  if (baseResponse.status === 'failed') throw new Error('A failed furniture design cannot produce orthographic views');
  const tableType = baseResponse.table_type;
  const renderBlobUrl = privateResultBlobUrl(body.render_image_url, 'furniture', projectId);
  if (job && (job.projectId !== projectId || job.type !== 'agent.orthographic')) {
    throw new Error('job_token does not match this orthographic request');
  }

  const zoo = runtime();
  const requestId = job?.requestId ?? newId('ortho');
  const turn: FurnitureTurnRequest = {
    contract_version: 'home-furniture-v1',
    output_mode: 'orthographic_sheet',
    request_id: requestId,
    project_id: projectId,
    locale,
    table_type: tableType,
    render_asset_ref: await temporaryBlobReadUrl(renderBlobUrl),
    confirmed_design_spec: baseResponse.design_spec,
    description: baseResponse.design_summary,
    source_priority: { sketch: 0, inspiration: 0 },
    locked_controls: [],
    design_controls: confirmedControls(baseResponse.design_spec),
  };

  if (!job) {
    await zoo.ensureRunning();
    const conversation = await zoo.createConversation(projectId, newId(`furniture_orthographic_${projectId}`));
    const started = await zoo.startFurnitureTurn(conversation, turn);
    sendJson(response, 202, {
      status: 'processing',
      job_token: signJob({
        version: 1,
        sessionId: conversation.sessionId,
        postedSeq: started.postedSeq,
        requestId,
        projectId,
        type: 'agent.orthographic',
        expiresAt: Date.now() + 30 * 60 * 1000,
      }),
      poll_after_ms: 3_000,
    });
    return;
  }

  const conversation = { agentId: zoo.agentId, sessionId: job.sessionId };
  const polled = await zoo.pollFurnitureTurn(conversation, turn, job.postedSeq);
  if (polled.status === 'processing') {
    sendJson(response, 202, { status: 'processing', job_token: signJob(job), poll_after_ms: 3_000 });
    return;
  }

  const result = polled.result;
  const artifact = result.artifacts.find((candidate) => candidate.status === 'ready'
    && (candidate.contentType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(candidate.fileName ?? '')));
  if (!artifact) throw new Error(result.response.warnings.join(' ') || 'Home Furniture Agent completed without a readable orthographic image artifact');
  const signedUrl = await zoo.resolveArtifactUrl(artifact.artifactId);
  const upstream = await fetch(signedUrl);
  if (!upstream.ok) throw new Error(`ZooWork orthographic artifact download failed (${upstream.status})`);
  const dimensionedPng = await createDimensionedOrthographicPng({
    source: Buffer.from(await upstream.arrayBuffer()),
    spec: baseResponse.design_spec,
  });
  const stored = await persistGeneratedImageBytes({
    bytes: dimensionedPng,
    mime: 'image/png',
    kind: 'furniture',
    projectId,
    requestId: turn.request_id,
    artifactId: artifact.artifactId,
    reportedSize: dimensionedPng.byteLength,
  });

  sendJson(response, 200, {
    session_id: conversation.sessionId,
    request_id: turn.request_id,
    project_id: projectId,
    response: result.response,
    orthographic_image: { ...stored, provider_model: 'ZooWork imageGenerationModel + See My Home dimension renderer' },
  });
}

async function deleteUpload(request: VercelRequest, response: VercelResponse): Promise<void> {
  const body = objectBody(request.body);
  const projectId = requireString(body.project_id, 'project_id');
  const blobUrl = privateBlobUrl(body.asset_id, 'furniture', projectId);
  await del(blobUrl);
  sendJson(response, 200, { deleted: true });
}

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const path = requestPath(request.query.path);
    if (request.method === 'GET' && path === 'health') {
      sendJson(response, 200, { ok: true, runtime: 'vercel', storage: 'vercel-blob', contract: 'home-furniture-v1' });
      return;
    }
    if (request.method === 'DELETE' && path === 'upload') { await deleteUpload(request, response); return; }
    if (request.method !== 'POST') { sendJson(response, 405, { error: 'Method not allowed' }); return; }
    if (path === 'upload') { await uploadToken(request, response); return; }
    if (path === 'events/agent.generate') { await generate(request, response, false); return; }
    if (path === 'events/agent.refine') { await generate(request, response, true); return; }
    if (path === 'events/agent.orthographic') { await orthographic(request, response); return; }
    if (path === 'reset') { sendJson(response, 200, { reset: true }); return; }
    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    console.error('[home-furniture]', error);
    const status = error instanceof HomeFurnitureTurnTimeoutError
      ? 504
      : error instanceof ZooworkError && error.status >= 500
        ? 502
        : 400;
    sendJson(response, status, { error: error instanceof Error ? error.message : String(error) });
  }
}
