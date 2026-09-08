import sharp, { type OverlayOptions } from 'sharp';
import type { FurnitureDesignSpec, OrthographicView } from '../../Home-Furniture-Agent/src/contracts.js';

export const ORTHOGRAPHIC_SHEET_WIDTH = 3840;
export const ORTHOGRAPHIC_SHEET_HEIGHT = 2160;

const VIEW_ORDER: OrthographicView[] = ['front', 'side', 'top'];
const VIEW_AREAS = [
  { left: 220, top: 280, width: 2300, height: 620 },
  { left: 2740, top: 280, width: 880, height: 620 },
  { left: 220, top: 1180, width: 2300, height: 720 },
] as const;

export type OrthographicImageSources = Record<OrthographicView, Buffer>;

export interface OrthographicViewFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PreparedView {
  data: Buffer;
  width: number;
  height: number;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function textLabel(
  value: string,
  x: number,
  y: number,
  className: 'view-title' | 'dimension-text' | 'unit-text',
  anchor: 'start' | 'middle' | 'end' = 'start',
): string {
  return `<text x="${x}" y="${y}" class="${className}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
}

export function orthographicTargetRatios(spec: FurnitureDesignSpec): [number, number, number] {
  const { width, depth, height } = spec.dimensions_mm;
  return [width / height, depth / height, width / depth];
}

async function prepareView(source: Buffer, view: OrthographicView): Promise<PreparedView> {
  const monochrome = await sharp(source, { failOn: 'error' })
    .rotate()
    .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .greyscale()
    .threshold(240)
    .png()
    .toBuffer();
  const trimmed = await sharp(monochrome)
    .trim({ background: '#ffffff', threshold: 2 })
    .png()
    .toBuffer({ resolveWithObject: true });
  if (trimmed.info.width < 64 || trimmed.info.height < 64) {
    throw new Error(`ZooWork ${view} orthographic image contains no complete readable object`);
  }
  const raw = await sharp(trimmed.data).greyscale().raw().toBuffer({ resolveWithObject: true });
  let darkPixels = 0;
  for (const value of raw.data) if (value < 128) darkPixels += 1;
  const coverage = darkPixels / Math.max(1, raw.info.width * raw.info.height);
  if (coverage < 0.002 || coverage > 0.55) {
    throw new Error(`ZooWork ${view} orthographic image failed line-art coverage validation`);
  }
  return { data: trimmed.data, width: trimmed.info.width, height: trimmed.info.height };
}

function drawingScale(spec: FurnitureDesignSpec): number {
  const { width, depth, height } = spec.dimensions_mm;
  const candidates = [
    VIEW_AREAS[0].width / width,
    VIEW_AREAS[0].height / height,
    VIEW_AREAS[1].width / depth,
    VIEW_AREAS[1].height / height,
    VIEW_AREAS[2].width / width,
    VIEW_AREAS[2].height / depth,
  ];
  return Math.max(0.12, Math.min(...candidates));
}

function targetFrames(spec: FurnitureDesignSpec): OrthographicViewFrame[] {
  const { width, depth, height } = spec.dimensions_mm;
  const scale = drawingScale(spec);
  const targetSizes = [
    { width: Math.round(width * scale), height: Math.round(height * scale) },
    { width: Math.round(depth * scale), height: Math.round(height * scale) },
    { width: Math.round(width * scale), height: Math.round(depth * scale) },
  ];

  return targetSizes.map((size, index) => {
    const area = VIEW_AREAS[index]!;
    return {
      left: Math.round(area.left + (area.width - size.width) / 2),
      top: index === 2
        ? Math.round(area.top + (area.height - size.height) / 2)
        : area.top + area.height - size.height,
      width: Math.max(64, size.width),
      height: Math.max(64, size.height),
    };
  });
}

function horizontalDimension(frame: OrthographicViewFrame, label: string): string {
  const x1 = frame.left;
  const x2 = frame.left + frame.width;
  const y = Math.max(110, frame.top - 92);
  const middle = (x1 + x2) / 2;
  const arrow = 18;
  return [
    `<path d="M ${x1} ${frame.top - 12} V ${y - 18} M ${x2} ${frame.top - 12} V ${y - 18}" class="extension-line"/>`,
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="dimension-line"/>`,
    `<path d="M ${x1} ${y} l ${arrow} -9 v 18 z M ${x2} ${y} l -${arrow} -9 v 18 z" class="arrowhead"/>`,
    textLabel(label, middle, y - 20, 'dimension-text', 'middle'),
  ].join('');
}

function verticalDimension(frame: OrthographicViewFrame, label: string): string {
  const y1 = frame.top;
  const y2 = frame.top + frame.height;
  const x = frame.left - 92;
  const middle = (y1 + y2) / 2;
  const arrow = 18;
  return [
    `<path d="M ${frame.left - 12} ${y1} H ${x + 18} M ${frame.left - 12} ${y2} H ${x + 18}" class="extension-line"/>`,
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="dimension-line"/>`,
    `<path d="M ${x} ${y1} l -9 ${arrow} h 18 z M ${x} ${y2} l -9 -${arrow} h 18 z" class="arrowhead"/>`,
    textLabel(label, x - 24, middle + 14, 'dimension-text', 'end'),
  ].join('');
}

function topThicknessDimension(frame: OrthographicViewFrame, spec: FurnitureDesignSpec): string {
  const thickness = Math.max(1, Math.round(spec.top.thickness_mm));
  const overallHeight = Math.max(1, spec.dimensions_mm.height);
  const drawnThickness = Math.max(18, Math.min(90, Math.round(frame.height * thickness / overallHeight)));
  const x = frame.left + frame.width + 80;
  const y1 = frame.top;
  const y2 = frame.top + drawnThickness;
  return [
    `<path d="M ${frame.left + frame.width + 12} ${y1} H ${x - 18} M ${frame.left + frame.width + 12} ${y2} H ${x - 18}" class="extension-line"/>`,
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="dimension-line"/>`,
    `<path d="M ${x} ${y1} l -7 14 h 14 z M ${x} ${y2} l -7 -14 h 14 z" class="arrowhead"/>`,
    textLabel(`${thickness} mm`, x + 22, (y1 + y2) / 2 + 13, 'dimension-text'),
  ].join('');
}

export function buildDimensionAnnotationSvg(input: {
  frames: OrthographicViewFrame[];
  spec: FurnitureDesignSpec;
}): string {
  const { frames, spec } = input;
  const [front, side, top] = frames;
  if (!front || !side || !top) throw new Error('Three orthographic frames are required');
  const { width, depth, height } = spec.dimensions_mm;
  const titles = [
    textLabel('FRONT ELEVATION', front.left + front.width / 2, front.top + front.height + 72, 'view-title', 'middle'),
    textLabel('SIDE ELEVATION', side.left + side.width / 2, side.top + side.height + 72, 'view-title', 'middle'),
    textLabel('TOP VIEW', top.left + top.width / 2, top.top + top.height + 72, 'view-title', 'middle'),
  ].join('');
  const dimensions = [
    horizontalDimension(front, `${width} mm`),
    verticalDimension(front, `${height} mm`),
    horizontalDimension(side, `${depth} mm`),
    verticalDimension(side, `${height} mm`),
    horizontalDimension(top, `${width} mm`),
    verticalDimension(top, `${depth} mm`),
    topThicknessDimension(side, spec),
  ].join('');

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${ORTHOGRAPHIC_SHEET_WIDTH}" height="${ORTHOGRAPHIC_SHEET_HEIGHT}" viewBox="0 0 ${ORTHOGRAPHIC_SHEET_WIDTH} ${ORTHOGRAPHIC_SHEET_HEIGHT}">
    <style>
      text { font-family: Arial, Helvetica, sans-serif; fill: #111; }
      .view-title { font-size: 42px; font-weight: 500; letter-spacing: 1.5px; }
      .dimension-text { font-size: 40px; font-weight: 400; }
      .unit-text { font-size: 34px; font-weight: 400; }
      .dimension-line, .extension-line { fill: none; stroke: #111; stroke-width: 3; stroke-linecap: square; }
      .extension-line { stroke-width: 2; }
      .arrowhead { fill: #111; stroke: none; }
    </style>
    <!-- FRONT ELEVATION SIDE ELEVATION TOP VIEW ${width} mm ${depth} mm ${height} mm ${spec.top.thickness_mm} mm -->
    <rect x="22" y="22" width="${ORTHOGRAPHIC_SHEET_WIDTH - 44}" height="${ORTHOGRAPHIC_SHEET_HEIGHT - 44}" fill="none" stroke="#111" stroke-width="2"/>
    ${titles}${dimensions}
    ${textLabel('Unit: mm', ORTHOGRAPHIC_SHEET_WIDTH - 100, ORTHOGRAPHIC_SHEET_HEIGHT - 70, 'unit-text', 'end')}
  </svg>`;
}

export async function createDimensionedOrthographicPng(input: {
  sources: OrthographicImageSources;
  spec: FurnitureDesignSpec;
}): Promise<Buffer> {
  const prepared = await Promise.all(VIEW_ORDER.map((view) => prepareView(input.sources[view], view)));
  const frames = targetFrames(input.spec);
  const composites: OverlayOptions[] = await Promise.all(prepared.map(async (view, index) => ({
    input: await sharp(view.data)
      .resize({ width: frames[index]!.width, height: frames[index]!.height, fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer(),
    left: frames[index]!.left,
    top: frames[index]!.top,
  })));
  const annotations = buildDimensionAnnotationSvg({ frames, spec: input.spec });
  return sharp({
    create: { width: ORTHOGRAPHIC_SHEET_WIDTH, height: ORTHOGRAPHIC_SHEET_HEIGHT, channels: 3, background: '#ffffff' },
  })
    .composite([...composites, { input: Buffer.from(annotations) }])
    .png()
    .toBuffer();
}
