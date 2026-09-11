import { del, get, put } from '@vercel/blob';
import { randomBytes } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { imageMime, objectBody, privateBlobUrl, requireString } from './common.js';

const ALIAS_PREFIX = 'runtime/style-source-aliases';
const ALIAS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const MAX_PROXY_IMAGE_BYTES = 15 * 1024 * 1024;

interface StyleSourceAliasManifest {
  version: 1;
  project_id: string;
  source_kind: 'room' | 'reference';
  blob_url: string;
  expires_at: number;
}

export interface StyleSourceAlias {
  token: string;
  url: string;
}

function aliasPath(token: string): string {
  if (!ALIAS_TOKEN_PATTERN.test(token)) throw new Error('Source image token is invalid');
  return `${ALIAS_PREFIX}/${token}.json`;
}

export function requestOrigin(request: VercelRequest): string {
  const forwardedHost = request.headers['x-forwarded-host'];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
    ?? request.headers.host;
  if (!host || /[\s/\\]/.test(host)) throw new Error('Request host is invalid');
  const forwardedProto = request.headers['x-forwarded-proto'];
  const requestedProto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const protocol = requestedProto === 'http' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
    ? 'http'
    : 'https';
  return `${protocol}://${host}`;
}

export async function createStyleSourceAlias(input: {
  origin: string;
  blobUrl: string;
  projectId: string;
  sourceKind: 'room' | 'reference';
  expiresAt: number;
}): Promise<StyleSourceAlias> {
  const token = randomBytes(16).toString('base64url');
  const manifest: StyleSourceAliasManifest = {
    version: 1,
    project_id: input.projectId,
    source_kind: input.sourceKind,
    blob_url: input.blobUrl,
    expires_at: input.expiresAt,
  };
  await put(aliasPath(token), JSON.stringify(manifest), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
  return { token, url: `${input.origin}/api/home-style/source/${token}` };
}

async function readBytes(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

export async function serveStyleSourceAlias(token: string, response: VercelResponse): Promise<void> {
  const path = aliasPath(token);
  const manifestResult = await get(path, { access: 'private', useCache: false });
  if (!manifestResult || manifestResult.statusCode !== 200) throw new Error('Source image token was not found');
  const manifestBytes = await readBytes(manifestResult.stream);
  const rawManifest = objectBody(JSON.parse(manifestBytes.toString('utf8')));
  const projectId = requireString(rawManifest.project_id, 'project_id');
  const expiresAt = rawManifest.expires_at;
  if (rawManifest.version !== 1 || typeof expiresAt !== 'number' || expiresAt < Date.now()) {
    await del(path).catch(() => undefined);
    throw new Error('Source image token is invalid or expired');
  }
  if (rawManifest.source_kind !== 'room' && rawManifest.source_kind !== 'reference') {
    throw new Error('Source image token is invalid');
  }
  const blobUrl = privateBlobUrl(rawManifest.blob_url, 'style', projectId);
  const imageResult = await get(blobUrl, { access: 'private', useCache: false });
  if (!imageResult || imageResult.statusCode !== 200) throw new Error('Source image is unavailable');
  if (imageResult.blob.size <= 0 || imageResult.blob.size > MAX_PROXY_IMAGE_BYTES) {
    throw new Error('Source image size is invalid');
  }
  const mime = imageMime(imageResult.blob.contentType, imageResult.blob.pathname);
  if (!mime) throw new Error('Source image is not a supported raster image');
  const bytes = await readBytes(imageResult.stream);
  if (bytes.byteLength !== imageResult.blob.size) throw new Error('Source image download was incomplete');
  response.setHeader('Content-Type', mime);
  response.setHeader('Content-Length', String(bytes.byteLength));
  response.setHeader('Content-Disposition', 'inline');
  response.status(200).send(bytes);
}

export async function deleteStyleSourceAliases(tokens: Array<string | undefined>): Promise<void> {
  const paths = tokens.filter((token): token is string => Boolean(token) && ALIAS_TOKEN_PATTERN.test(token as string)).map(aliasPath);
  if (paths.length > 0) await del(paths);
}
