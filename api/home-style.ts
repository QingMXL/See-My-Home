import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { ZooworkError } from '@zoowork-ai/sdk';
import type { ModernEastProfile, RenovationScope, StyleRoomType, StyleTurnRequest } from '../Home-Style-Agent/src/contracts.js';
import { HomeStyleRuntime, HomeStyleTurnTimeoutError, MODERN_EAST_KNOWLEDGE_VERSION } from '../Home-Style-Agent/src/runtime.js';
import { newId, objectBody, parseLocale, persistGeneratedImage, privateBlobUrl, requestPath, requireString, sendJson, temporaryBlobReadUrl } from './_lib/common.js';

export const config = { maxDuration: 800 };

const roomTypes = new Set<StyleRoomType>(['living_room', 'primary_bedroom', 'kitchen', 'dining_room', 'bathroom', 'home_office', 'other']);
const profiles = new Set<ModernEastProfile>(['quiet-poise', 'urban-elegance', 'sculptural-luxe', 'warm-residence']);
const scopes = new Set<RenovationScope>(['soft_furnishing_only', 'finishes_and_furnishing', 'limited_hard_finish']);

function runtime(): HomeStyleRuntime {
  const agentId = process.env.ZOOWORK_STYLE_AGENT_ID?.trim();
  if (!agentId) throw new Error('ZOOWORK_STYLE_AGENT_ID is not configured on Vercel');
  return HomeStyleRuntime.fromEnvironment({ agentId, turnTimeoutMs: 760_000 });
}

async function uploadToken(request: VercelRequest, response: VercelResponse): Promise<void> {
  const result = await handleUpload({
    request,
    body: objectBody(request.body) as unknown as HandleUploadBody,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const payload = objectBody(JSON.parse(clientPayload ?? '{}'));
      const projectId = requireString(payload.project_id, 'project_id');
      const expected = `uploads/style/${encodeURIComponent(projectId)}/`;
      if (!pathname.startsWith(expected)) throw new Error('Upload pathname does not match project_id');
      return {
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maximumSizeInBytes: 15 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ kind: 'style', project_id: projectId }),
      };
    },
  });
  sendJson(response, 200, result);
}

interface StyleInput extends Record<string, unknown> {
  project_id?: unknown;
  asset_id?: unknown;
  locale?: unknown;
  room_type?: unknown;
  style_id?: unknown;
  style_profile?: unknown;
  renovation_scope?: unknown;
  preferences?: unknown;
}

function stringArray(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20 || value.some((item) => typeof item !== 'string')) {
    throw new Error('preferences must be an array of at most 20 strings');
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

async function generate(request: VercelRequest, response: VercelResponse, refine: boolean): Promise<void> {
  const body = objectBody(request.body);
  const input = (refine ? objectBody(body.base_input) : body) as StyleInput;
  const locale = parseLocale(refine ? body.locale : input.locale);
  const projectId = requireString(input.project_id, 'project_id');
  const blobUrl = privateBlobUrl(input.asset_id, 'style', projectId);
  const sourceUrl = await temporaryBlobReadUrl(blobUrl);
  const roomType = requireString(input.room_type, 'room_type') as StyleRoomType;
  if (!roomTypes.has(roomType)) throw new Error('room_type is unsupported');
  if (input.style_id !== 'modern_east') throw new Error('Only modern_east is currently deployed');
  const profile = (input.style_profile ?? 'quiet-poise') as ModernEastProfile;
  if (!profiles.has(profile)) throw new Error('style_profile is unsupported');
  const scope = (input.renovation_scope ?? 'finishes_and_furnishing') as RenovationScope;
  if (!scopes.has(scope)) throw new Error('renovation_scope is unsupported');
  const preferences = stringArray(input.preferences);
  if (refine) preferences.push(requireString(body.refinement, 'refinement'));
  const zoo = runtime();
  await zoo.ensureRunning();
  const conversation = await zoo.createConversation(projectId, newId(`style_${refine ? 'refine' : 'generate'}_${projectId}`));
  const turn: StyleTurnRequest = {
    contract_version: 'home-style-v1', request_id: newId('req'), home_id: projectId,
    source_asset_ref: sourceUrl, room_type: roomType, style_id: 'modern_east', style_profile: profile,
    renovation_scope: scope, user_preferences: preferences.slice(-20),
    known_immutable_elements: ['room envelope', 'walls', 'columns', 'beams', 'doors', 'windows', 'openings', 'ceiling geometry', 'fixed service locations', 'camera position', 'lens perspective', 'crop'],
  };
  const result = await zoo.runStyleTurn(conversation, turn);
  const artifact = result.artifacts.find((candidate) => candidate.status === 'ready' && (candidate.contentType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(candidate.fileName ?? '')));
  if (!artifact) throw new Error(result.response.warnings?.join(' ') || 'Home Style Agent completed without a readable published image artifact');
  const signedUrl = await zoo.resolveArtifactUrl(artifact.artifactId);
  const stored = await persistGeneratedImage({ signedUrl, kind: 'style', projectId, requestId: turn.request_id, artifactId: artifact.artifactId, contentType: artifact.contentType, fileName: artifact.fileName, size: artifact.size });
  sendJson(response, 200, {
    session_id: conversation.sessionId, request_id: turn.request_id, project_id: projectId,
    style_id: 'modern_east', style_profile: profile, knowledge_version: MODERN_EAST_KNOWLEDGE_VERSION,
    response: result.response,
    generated_image: { ...stored, provider_model: 'ZooWork imageGenerationModel' },
    request_context: {
      project_id: projectId, asset_id: blobUrl, locale, room_type: roomType, style_id: 'modern_east',
      style_profile: profile, renovation_scope: scope, preferences: preferences.slice(-20),
    },
  });
}

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const path = requestPath(request.query.path);
    if (request.method === 'GET' && path === 'health') {
      sendJson(response, 200, { ok: true, runtime: 'vercel', storage: 'vercel-blob', extra_image_provider_key_required: false });
      return;
    }
    if (request.method !== 'POST') { sendJson(response, 405, { error: 'Method not allowed' }); return; }
    if (path === 'upload') { await uploadToken(request, response); return; }
    if (path === 'events/agent.generate') { await generate(request, response, false); return; }
    if (path === 'events/agent.refine') { await generate(request, response, true); return; }
    if (path === 'reset') { sendJson(response, 200, { reset: true }); return; }
    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    console.error('[home-style]', error);
    const status = error instanceof HomeStyleTurnTimeoutError ? 504 : error instanceof ZooworkError && error.status >= 500 ? 502 : 400;
    sendJson(response, status, { error: error instanceof Error ? error.message : String(error) });
  }
}
