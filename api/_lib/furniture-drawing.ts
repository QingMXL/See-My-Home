import sharp, { type OverlayOptions } from 'sharp';
import type { FurnitureDesignSpec, OrthographicView } from '../../Home-Furniture-Agent/src/contracts.js';

const SHEET_WIDTH = 2400;
const SHEET_HEIGHT = 1000;
const PANEL_WIDTH = SHEET_WIDTH / 3;
const DRAWING_TOP = 105;
const DRAWING_HEIGHT = 650;
const MAX_VIEW_WIDTH = 620;
const MAX_VIEW_HEIGHT = 570;
const VIEW_ORDER: OrthographicView[] = ['front', 'side', 'top'];

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

const GLYPHS: Record<string, string[]> = {
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
  '0': ['111', '101', '101', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '010', '010', '111'],
  '2': ['111', '001', '001', '111', '100', '100', '111'],
  '3': ['111', '001', '001', '111', '001', '001', '111'],
  '4': ['101', '101', '101', '111', '001', '001', '001'],
  '5': ['111', '100', '100', '111', '001', '001', '111'],
  '6': ['111', '100', '100', '111', '101', '101', '111'],
  '7': ['111', '001', '001', '010', '010', '010', '010'],
  '8': ['111', '101', '101', '111', '101', '101', '111'],
  '9': ['111', '101', '101', '111', '001', '001', '111'],
  A: ['010', '101', '101', '111', '101', '101', '101'],
  D: ['110', '101', '101', '101', '101', '101', '110'],
  E: ['111', '100', '100', '110', '100', '100', '111'],
  F: ['111', '100', '100', '110', '100', '100', '100'],
  H: ['101', '101', '101', '111', '101', '101', '101'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['1001', '1101', '1101', '1011', '1011', '1001', '1001'],
  O: ['111', '101', '101', '101', '101', '101', '111'],
  P: ['110', '101', '101', '110', '100', '100', '100'],
  R: ['110', '101', '101', '110', '101', '101', '101'],
  S: ['111', '100', '100', '111', '001', '001', '111'],
  T: ['111', '010', '010', '010', '010', '010', '010'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
};

function vectorLabel(text: string, x: number, y: number, cell: number, anchor: 'start' | 'middle' = 'start', rotate = 0): string {
  const glyphs = [...text.toUpperCase()].map((character) => GLYPHS[character] ?? GLYPHS[' ']!);
  const advances = glyphs.map((glyph) => (glyph[0]?.length ?? 3) + 1);
  const totalCells = advances.reduce((sum, advance) => sum + advance, 0) - 1;
  const offset = anchor === 'middle' ? -totalCells * cell / 2 : 0;
  let cursor = offset;
  const pixels: string[] = [];
  glyphs.forEach((glyph, glyphIndex) => {
    glyph.forEach((row, rowIndex) => {
      [...row].forEach((pixel, columnIndex) => {
        if (pixel === '1') pixels.push(`<rect x="${cursor + columnIndex * cell}" y="${rowIndex * cell}" width="${cell}" height="${cell}"/>`);
      });
    });
    cursor += advances[glyphIndex]! * cell;
  });
  return `<g data-label="${text}" transform="translate(${x} ${y}) rotate(${rotate})" fill="#111">${pixels.join('')}</g>`;
}

export function orthographicTargetRatios(spec: FurnitureDesignSpec): [number, number, number] {
  const { width, depth, height } = spec.dimensions_mm;
  return [width / height, depth / height, width / depth];
}

async function prepareView(source: Buffer, view: OrthographicView): Promise<PreparedView> {
  const monochrome = await sharp(source, { failOn: 'error' })
    .rotate()
    .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .greyscale()
    .threshold(242)
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

function fittedFrame(view: PreparedView, index: number): OrthographicViewFrame {
  const scale = Math.min(MAX_VIEW_WIDTH / view.width, MAX_VIEW_HEIGHT / view.height);
  const width = Math.max(48, Math.round(view.width * scale));
  const height = Math.max(48, Math.round(view.height * scale));
  return {
    left: Math.round(index * PANEL_WIDTH + (PANEL_WIDTH - width) / 2),
    top: Math.round(DRAWING_TOP + (DRAWING_HEIGHT - height) / 2),
    width,
    height,
  };
}

function horizontalDimension(frame: OrthographicViewFrame, label: string): string {
  const x1 = frame.left;
  const x2 = frame.left + frame.width;
  const y = Math.min(SHEET_HEIGHT - 70, frame.top + frame.height + 48);
  const middle = (x1 + x2) / 2;
  const arrow = 10;
  return [
    `<path d="M ${x1} ${frame.top + frame.height + 7} V ${y - 9} M ${x2} ${frame.top + frame.height + 7} V ${y - 9}" class="dim"/>`,
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="dim"/>`,
    `<path d="M ${x1} ${y} l ${arrow} -6 M ${x1} ${y} l ${arrow} 6 M ${x2} ${y} l -${arrow} -6 M ${x2} ${y} l -${arrow} 6" class="dim"/>`,
    vectorLabel(label, middle, y + 17, 3, 'middle'),
  ].join('');
}

function verticalDimension(frame: OrthographicViewFrame, panelRight: number, label: string): string {
  const y1 = frame.top;
  const y2 = frame.top + frame.height;
  const x = Math.min(panelRight - 28, frame.left + frame.width + 44);
  const middle = (y1 + y2) / 2;
  const arrow = 10;
  return [
    `<path d="M ${frame.left + frame.width + 7} ${y1} H ${x - 9} M ${frame.left + frame.width + 7} ${y2} H ${x - 9}" class="dim"/>`,
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="dim"/>`,
    `<path d="M ${x} ${y1} l -6 ${arrow} M ${x} ${y1} l 6 ${arrow} M ${x} ${y2} l -6 -${arrow} M ${x} ${y2} l 6 -${arrow}" class="dim"/>`,
    vectorLabel(label, x - 17, middle, 3, 'middle', -90),
  ].join('');
}

export function buildDimensionAnnotationSvg(input: {
  frames: OrthographicViewFrame[];
  spec: FurnitureDesignSpec;
}): string {
  const { frames, spec } = input;
  const { width, depth, height } = spec.dimensions_mm;
  const titles = ['FRONT', 'SIDE', 'TOP'];
  const horizontal = [`W ${width} MM`, `D ${depth} MM`, `W ${width} MM`];
  const vertical = [`H ${height} MM`, `H ${height} MM`, `D ${depth} MM`];
  const labels = titles.map((title, index) => vectorLabel(title, index * PANEL_WIDTH + PANEL_WIDTH / 2, 42, 5, 'middle')).join('');
  const dimensions = frames.map((frame, index) => [
    horizontalDimension(frame, horizontal[index]!),
    verticalDimension(frame, (index + 1) * PANEL_WIDTH, vertical[index]!),
  ].join('')).join('');
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_WIDTH}" height="${SHEET_HEIGHT}" viewBox="0 0 ${SHEET_WIDTH} ${SHEET_HEIGHT}">
    <style>.dim { fill: none; stroke: #111; stroke-width: 3; stroke-linecap: square; }</style>
    <!-- FRONT SIDE TOP W ${width} MM D ${depth} MM H ${height} MM -->
    <line x1="${PANEL_WIDTH}" y1="28" x2="${PANEL_WIDTH}" y2="${SHEET_HEIGHT - 28}" stroke="#dedede" stroke-width="2"/>
    <line x1="${PANEL_WIDTH * 2}" y1="28" x2="${PANEL_WIDTH * 2}" y2="${SHEET_HEIGHT - 28}" stroke="#dedede" stroke-width="2"/>
    ${labels}${dimensions}
  </svg>`;
}

export async function createDimensionedOrthographicPng(input: {
  sources: OrthographicImageSources;
  spec: FurnitureDesignSpec;
}): Promise<Buffer> {
  const prepared = await Promise.all(VIEW_ORDER.map((view) => prepareView(input.sources[view], view)));
  const frames = prepared.map(fittedFrame);
  const composites: OverlayOptions[] = await Promise.all(prepared.map(async (view, index) => ({
    input: await sharp(view.data)
      .resize({ width: frames[index]!.width, height: frames[index]!.height, fit: 'inside' })
      .png()
      .toBuffer(),
    left: frames[index]!.left,
    top: frames[index]!.top,
  })));
  const annotations = buildDimensionAnnotationSvg({ frames, spec: input.spec });
  return sharp({
    create: { width: SHEET_WIDTH, height: SHEET_HEIGHT, channels: 3, background: '#ffffff' },
  })
    .composite([...composites, { input: Buffer.from(annotations) }])
    .png()
    .toBuffer();
}
