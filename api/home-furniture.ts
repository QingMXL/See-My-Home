import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { ZooworkError } from '@zoowork-ai/sdk';
import type {
  FurnitureDesignControls,
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
  privateBlobUrl,
  requestPath,
  requireString,
  sendJson,
  temporaryBlobReadUrl,
} from './_lib/common.js';

export const config = { maxDuration: 300 };

const tableTypes = new Set<TableType>([
  'dining_table', 'coffee_table', 'console_table', 'side_table', 'desk',
  'bedside_table', 'nesting_tables', 'bar_table', 'other_table',
]);
const topShapes = new Set<TopShape>(['rectangular', 'round', 'oval', 'square', 'freeform']);

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

function sourcePriority(hasSketch: boolean, hasInspiration: boolean): FurnitureTurnRequest['source_priority'] {
  if (hasSketch && hasInspiration) return { sketch: 0.8, inspiration: 0.2 };
  if (hasSketch) return { sketch: 1, inspiration: 0 };
  if (hasInspiration) return { sketch: 0, inspiration: 1 };
  return { sketch: 0, inspiration: 0 };
}

async function generate(request: VercelRequest, response: VercelResponse, refine: boolean): Promise<void> {
  const body = objectBody(request.body);
  const base = (refine ? objectBody(body.base_input) : body) as FurnitureApiInput;
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

  const sketchRef = sketchBlobUrl ? await temporaryBlobReadUrl(sketchBlobUrl) : undefined;
  const inspirationRef = inspirationBlobUrl ? await temporaryBlobReadUrl(inspirationBlobUrl) : undefined;
  const zoo = runtime();
  await zoo.ensureRunning();
  const conversation = await zoo.createConversation(projectId, newId(`furniture_${refine ? 'refine' : 'generate'}_${projectId}`));
  const turn: FurnitureTurnRequest = {
    contract_version: 'home-furniture-v1',
    request_id: newId('req'),
    project_id: projectId,
    locale,
    table_type: tableType,
    ...(sketchRef ? { sketch_asset_ref: sketchRef } : {}),
    ...(inspirationRef ? { inspiration_asset_ref: inspirationRef } : {}),
    ...(description ? { description } : {}),
    source_priority: sourcePriority(Boolean(sketchRef), Boolean(inspirationRef)),
    design_controls: parseControls(input),
  };

  const result = await zoo.runFurnitureTurn(conversation, turn);
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
      ...turn.design_controls,
    },
  });
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
    if (request.method !== 'POST') { sendJson(response, 405, { error: 'Method not allowed' }); return; }
    if (path === 'upload') { await uploadToken(request, response); return; }
    if (path === 'events/agent.generate') { await generate(request, response, false); return; }
    if (path === 'events/agent.refine') { await generate(request, response, true); return; }
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
