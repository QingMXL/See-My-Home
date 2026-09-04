import { randomBytes } from 'node:crypto';
import { issueSignedToken, presignUrl, put } from '@vercel/blob';

export type Locale = 'en-US' | 'zh-CN';

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`;
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

export function parseLocale(value: unknown): Locale {
  if (value !== 'en-US' && value !== 'zh-CN') throw new Error('locale must be en-US or zh-CN');
  return value;
}

export function objectBody(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Body must be an object');
  }
  return value as Record<string, unknown>;
}

export function requestPath(value: unknown): string {
  if (Array.isArray(value)) return value.join('/');
  return typeof value === 'string' ? value.replace(/^\/+|\/+$/g, '') : '';
}

export function privateBlobUrl(value: unknown, kind: 'layout' | 'style', projectId: string): string {
  const raw = requireString(value, 'asset_id');
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('asset_id is not a valid Blob URL'); }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.blob.vercel-storage.com')) {
    throw new Error('asset_id must reference this application’s Vercel Blob storage');
  }
  const requiredPrefix = `/uploads/${kind}/${encodeURIComponent(projectId)}/`;
  if (!url.pathname.startsWith(requiredPrefix)) throw new Error('asset_id does not belong to project_id');
  return url.toString();
}

export async function temporaryBlobReadUrl(blobUrl: string, lifetimeMs = 60 * 60 * 1000): Promise<string> {
  const url = new URL(blobUrl);
  const pathname = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const validUntil = Date.now() + lifetimeMs;
  const signedToken = await issueSignedToken({ pathname, operations: ['get'], validUntil });
  const result = await presignUrl(signedToken, { operation: 'get', pathname, access: 'private', validUntil });
  return result.presignedUrl;
}

export function imageMime(contentType: string | null, fileName: string | null): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  const mime = contentType?.split(';', 1)[0]?.trim().toLowerCase();
  if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/webp') return mime;
  const lower = fileName?.toLowerCase() ?? '';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return null;
}

export async function persistGeneratedImage(input: {
  signedUrl: string;
  kind: 'layout' | 'style';
  projectId: string;
  requestId: string;
  artifactId: string;
  contentType: string | null;
  fileName: string | null;
  size: number | null;
}): Promise<{ asset_id: string; url: string; mime_type: 'image/png' | 'image/jpeg' | 'image/webp'; size_bytes: number }> {
  const upstream = await fetch(input.signedUrl);
  if (!upstream.ok) throw new Error(`ZooWork artifact download failed (${upstream.status})`);
  const bytes = Buffer.from(await upstream.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error('ZooWork generated an empty image artifact');
  const mime = imageMime(upstream.headers.get('content-type') ?? input.contentType, input.fileName);
  if (!mime) throw new Error('ZooWork artifact is not a supported raster image');
  const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const blob = await put(
    `results/${input.kind}/${encodeURIComponent(input.projectId)}/${encodeURIComponent(input.requestId)}.${extension}`,
    bytes,
    { access: 'private', addRandomSuffix: true, contentType: mime, cacheControlMaxAge: 31_536_000 },
  );
  return {
    asset_id: input.artifactId,
    url: await temporaryBlobReadUrl(blob.url),
    mime_type: mime,
    size_bytes: input.size && input.size > 0 ? input.size : bytes.byteLength,
  };
}

export function sendJson(response: { status: (code: number) => { json: (body: unknown) => unknown } }, status: number, body: unknown): void {
  response.status(status).json(body);
}
