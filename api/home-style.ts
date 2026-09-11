import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { ZooworkError } from '@zoowork-ai/sdk';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ModernEastProfile, RenovationScope, SourceRaster, StyleRoomType, StyleTurnRequest } from '../Home-Style-Agent/src/contracts.js';
import { HomeStyleRuntime, HomeStyleTurnTimeoutError, MODERN_EAST_KNOWLEDGE_VERSION } from '../Home-Style-Agent/src/runtime.js';
import { inspectSourceRasterUrl } from '../Home-Style-Agent/src/source-raster.js';
import { ContractValidationError } from '../Home-Style-Agent/src/validation.js';
import { newId, objectBody, parseLocale, persistGeneratedImage, privateBlobUrl, requestPath, requireString, sendJson, temporaryBlobReadUrl } from './_lib/common.js';
import { createStyleSourceAlias, deleteStyleSourceAliases, requestOrigin, serveStyleSourceAlias } from './_lib/style-source-proxy.js';

export const config = { maxDuration: 300 };

const roomTypes = new Set<StyleRoomType>(['living_room', 'primary_bedroom', 'kitchen', 'dining_room', 'bathroom', 'home_office', 'other']);
const profiles = new Set<ModernEastProfile>(['quiet-poise', 'urban-elegance', 'sculptural-luxe', 'warm-residence']);
const scopes = new Set<RenovationScope>(['soft_furnishing_only', 'finishes_and_furnishing', 'limited_hard_finish']);

interface StyleJob {
  version: 1;
  sessionId: string;
  postedSeq: number;
  requestId: string;
  projectId: string;
  type: 'agent.generate' | 'agent.refine';
  expiresAt: number;
  sourceRaster?: SourceRaster;
  sourceAssetRef?: string;
  styleReferenceAssetRef?: string;
  sourceAliasToken?: string;
  styleReferenceAliasToken?: string;
  completionRecoveryAttempts?: number;
}

function runtime(): HomeStyleRuntime {
  const agentId = process.env.ZOOWORK_STYLE_AGENT_ID?.trim();
  if (!agentId) throw new Error('ZOOWORK_STYLE_AGENT_ID is not configured on Vercel');
  return HomeStyleRuntime.fromEnvironment({ agentId, turnTimeoutMs: 760_000 });
}

function jobSecret(): string {
  const value = process.env.ZOOWORK_API_KEY?.trim();
  if (!value) throw new Error('ZOOWORK_API_KEY is not configured on Vercel');
  return value;
}

function signJob(job: StyleJob): string {
  const payload = Buffer.from(JSON.stringify(job), 'utf8').toString('base64url');
  const signature = createHmac('sha256', jobSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyJob(value: unknown): StyleJob | null {
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
  const sourceRaster = job.sourceRaster === undefined ? undefined : objectBody(job.sourceRaster);
  if (
    job.version !== 1
    || typeof job.sessionId !== 'string'
    || typeof job.postedSeq !== 'number'
    || !Number.isSafeInteger(job.postedSeq)
    || job.postedSeq < 0
    || typeof job.requestId !== 'string'
    || typeof job.projectId !== 'string'
    || (job.type !== 'agent.generate' && job.type !== 'agent.refine')
    || typeof job.expiresAt !== 'number'
    || job.expiresAt < Date.now()
    || (job.sourceAssetRef !== undefined && typeof job.sourceAssetRef !== 'string')
    || (job.styleReferenceAssetRef !== undefined && typeof job.styleReferenceAssetRef !== 'string')
    || (job.sourceAliasToken !== undefined && typeof job.sourceAliasToken !== 'string')
    || (job.styleReferenceAliasToken !== undefined && typeof job.styleReferenceAliasToken !== 'string')
    || (job.completionRecoveryAttempts !== undefined && (
      typeof job.completionRecoveryAttempts !== 'number'
      || !Number.isSafeInteger(job.completionRecoveryAttempts)
      || job.completionRecoveryAttempts < 0
      || job.completionRecoveryAttempts > 1
    ))
    || (sourceRaster !== undefined && (
      typeof sourceRaster.width_px !== 'number'
      || typeof sourceRaster.height_px !== 'number'
      || typeof sourceRaster.aspect_ratio !== 'string'
      || (sourceRaster.orientation !== 'landscape' && sourceRaster.orientation !== 'portrait' && sourceRaster.orientation !== 'square')
      || typeof sourceRaster.designer_size !== 'string'
      || typeof sourceRaster.designer_request_size !== 'string'
      || typeof sourceRaster.designer_request_aspect_ratio !== 'string'
    ))
  ) throw new Error('job_token is invalid or expired');
  return job as unknown as StyleJob;
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
  reference_asset_id?: unknown;
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
  const type = refine ? 'agent.refine' : 'agent.generate';
  const job = verifyJob(body.job_token);
  const input = (refine ? objectBody(body.base_input) : body) as StyleInput;
  const locale = parseLocale(refine ? body.locale : input.locale);
  const projectId = requireString(input.project_id, 'project_id');
  const blobUrl = privateBlobUrl(input.asset_id, 'style', projectId);
  const referenceBlobUrl = input.reference_asset_id === undefined
    ? undefined
    : privateBlobUrl(input.reference_asset_id, 'style', projectId);
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
  if (job && (job.projectId !== projectId || job.type !== type)) throw new Error('job_token does not match this request');
  const requestId = job?.requestId ?? newId('req');
  const sourceRaster = job?.sourceRaster ?? await inspectSourceRasterUrl(await temporaryBlobReadUrl(blobUrl));
  const expiresAt = job?.expiresAt ?? Date.now() + 30 * 60 * 1000;
  let sourceAssetRef = job?.sourceAssetRef;
  let styleReferenceAssetRef = job?.styleReferenceAssetRef;
  let sourceAliasToken = job?.sourceAliasToken;
  let styleReferenceAliasToken = job?.styleReferenceAliasToken;

  if (!job) {
    await zoo.ensureRunning();
    const origin = requestOrigin(request);
    try {
      const sourceAlias = await createStyleSourceAlias({
        origin, blobUrl, projectId, sourceKind: 'room', expiresAt,
      });
      sourceAssetRef = sourceAlias.url;
      sourceAliasToken = sourceAlias.token;
      if (referenceBlobUrl) {
        const referenceAlias = await createStyleSourceAlias({
          origin, blobUrl: referenceBlobUrl, projectId, sourceKind: 'reference', expiresAt,
        });
        styleReferenceAssetRef = referenceAlias.url;
        styleReferenceAliasToken = referenceAlias.token;
      }
    } catch (error) {
      await deleteStyleSourceAliases([sourceAliasToken, styleReferenceAliasToken]).catch(() => undefined);
      throw error;
    }
  }

  // Older in-flight job tokens may not include the proxy reference. New turns always do.
  sourceAssetRef ??= await temporaryBlobReadUrl(blobUrl);
  if (!styleReferenceAssetRef && referenceBlobUrl && job) {
    styleReferenceAssetRef = await temporaryBlobReadUrl(referenceBlobUrl);
  }
  const turn: StyleTurnRequest = {
    contract_version: 'home-style-v1', request_id: requestId, home_id: projectId,
    source_asset_ref: sourceAssetRef, source_raster: sourceRaster, room_type: roomType, style_id: 'modern_east', style_profile: profile,
    renovation_scope: scope, user_preferences: preferences.slice(-20),
    ...(styleReferenceAssetRef ? { style_reference_asset_ref: styleReferenceAssetRef } : {}),
    known_immutable_elements: ['room envelope', 'walls', 'columns', 'beams', 'doors', 'windows', 'openings', 'ceiling geometry', 'fixed service locations', 'camera position', 'lens perspective', 'crop'],
  };
  if (!job) {
    let conversation;
    let started;
    try {
      conversation = await zoo.createConversation(projectId, newId(`style_${refine ? 'refine' : 'generate'}_${projectId}`));
      started = await zoo.startStyleTurn(conversation, turn);
    } catch (error) {
      await deleteStyleSourceAliases([sourceAliasToken, styleReferenceAliasToken]).catch(() => undefined);
      throw error;
    }
    sendJson(response, 202, {
      status: 'processing',
      job_token: signJob({
        version: 1,
        sessionId: conversation.sessionId,
        postedSeq: started.postedSeq,
        requestId,
        projectId,
        type,
        expiresAt,
        sourceRaster,
        sourceAssetRef,
        styleReferenceAssetRef,
        sourceAliasToken,
        styleReferenceAliasToken,
      }),
      poll_after_ms: 3_000,
    });
    return;
  }

  const conversation = { agentId: zoo.agentId, sessionId: job.sessionId };
  let polled;
  try {
    polled = await zoo.pollStyleTurn(conversation, turn, job.postedSeq);
  } catch (error) {
    const recoveryAttempts = job.completionRecoveryAttempts ?? 0;
    if (error instanceof ContractValidationError && recoveryAttempts < 1) {
      const recovery = await zoo.startCompletionRecovery(conversation, turn);
      sendJson(response, 202, {
        status: 'processing',
        job_token: signJob({
          ...job,
          postedSeq: recovery.postedSeq,
          completionRecoveryAttempts: recoveryAttempts + 1,
        }),
        poll_after_ms: 3_000,
      });
      return;
    }
    if (error instanceof ContractValidationError) {
      await deleteStyleSourceAliases([job.sourceAliasToken, job.styleReferenceAliasToken]).catch(() => undefined);
    }
    throw error;
  }
  if (polled.status === 'processing') {
    sendJson(response, 202, {
      status: 'processing',
      job_token: signJob({ ...job, postedSeq: polled.postedSeq }),
      poll_after_ms: 3_000,
    });
    return;
  }

  try {
    const result = polled.result;
    const artifact = result.artifacts.find((candidate) => candidate.status === 'ready' && (candidate.contentType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(candidate.fileName ?? '')));
    if (!artifact) throw new Error(result.response.warnings?.join(' ') || 'Home Style Agent completed without a readable published image artifact');
    const signedUrl = await zoo.resolveArtifactUrl(artifact.artifactId);
    const stored = await persistGeneratedImage({ signedUrl, kind: 'style', projectId, requestId: turn.request_id, artifactId: artifact.artifactId, contentType: artifact.contentType, fileName: artifact.fileName, size: artifact.size });
    sendJson(response, 200, {
      session_id: conversation.sessionId, request_id: turn.request_id, project_id: projectId,
      style_id: 'modern_east', style_profile: profile, knowledge_version: MODERN_EAST_KNOWLEDGE_VERSION,
      response: result.response,
      generated_image: { ...stored, provider_model: 'ZooWork Designer Skill' },
      request_context: {
        project_id: projectId, asset_id: blobUrl, locale, room_type: roomType, style_id: 'modern_east',
        style_profile: profile, renovation_scope: scope, preferences: preferences.slice(-20), source_raster: sourceRaster,
        ...(referenceBlobUrl ? { reference_asset_id: referenceBlobUrl } : {}),
      },
    });
  } finally {
    await deleteStyleSourceAliases([job.sourceAliasToken, job.styleReferenceAliasToken]).catch(() => undefined);
  }
}

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const path = requestPath(request.query.path);
    if (request.method === 'GET' && path.startsWith('source/')) {
      await serveStyleSourceAlias(path.slice('source/'.length), response);
      return;
    }
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
