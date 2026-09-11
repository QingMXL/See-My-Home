import sharp from 'sharp';

const DESIGNER_LONG_EDGE = 1536;
const MAX_SUPPORTED_ASPECT = 3;

export type RasterOrientation = 'landscape' | 'portrait' | 'square';

export interface SourceRaster {
  width_px: number;
  height_px: number;
  aspect_ratio: string;
  orientation: RasterOrientation;
  designer_size: string;
  designer_request_size: string;
  designer_request_aspect_ratio: string;
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function multipleOf16(value: number): number {
  return Math.max(16, Math.round(value / 16) * 16);
}

export function planSourceRaster(width: number, height: number): SourceRaster {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('Source image dimensions are invalid');
  }
  const ratio = width / height;
  if (ratio > MAX_SUPPORTED_ASPECT || ratio < 1 / MAX_SUPPORTED_ASPECT) {
    throw new Error('Source image aspect ratio must be between 1:3 and 3:1');
  }
  const divisor = gcd(width, height);
  const orientation: RasterOrientation = width === height ? 'square' : width > height ? 'landscape' : 'portrait';
  const targetWidth = orientation === 'portrait'
    ? multipleOf16(DESIGNER_LONG_EDGE * ratio)
    : DESIGNER_LONG_EDGE;
  const targetHeight = orientation === 'landscape'
    ? multipleOf16(DESIGNER_LONG_EDGE / ratio)
    : DESIGNER_LONG_EDGE;
  return {
    width_px: width,
    height_px: height,
    aspect_ratio: `${width / divisor}:${height / divisor}`,
    orientation,
    designer_size: `${targetWidth}x${targetHeight}`,
    designer_request_size: `${targetHeight}x${targetWidth}`,
    designer_request_aspect_ratio: `${height / divisor}:${width / divisor}`,
  };
}

export async function inspectSourceRaster(bytes: Buffer): Promise<SourceRaster> {
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Source image dimensions could not be read');
  const rotated = metadata.orientation !== undefined && metadata.orientation >= 5 && metadata.orientation <= 8;
  return planSourceRaster(
    rotated ? metadata.height : metadata.width,
    rotated ? metadata.width : metadata.height,
  );
}

export async function inspectSourceRasterUrl(url: string): Promise<SourceRaster> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Source image could not be read (${response.status})`);
  return inspectSourceRaster(Buffer.from(await response.arrayBuffer()));
}
