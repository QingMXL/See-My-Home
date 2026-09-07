import sharp from 'sharp';
import type { FurnitureDesignSpec } from '../../Home-Furniture-Agent/src/contracts.js';

const MAX_DRAWING_WIDTH = 2400;

export interface DrawingDimensionItem {
  label: string;
  value: string;
}

function dimensionText(dimensions: Partial<FurnitureDesignSpec['dimensions_mm']>): string {
  const values = [
    dimensions.width ? `W ${dimensions.width}` : '',
    dimensions.depth ? `D ${dimensions.depth}` : '',
    dimensions.height ? `H ${dimensions.height}` : '',
  ].filter(Boolean);
  return `${values.join(' · ')} mm`;
}

export function drawingDimensionItems(spec: FurnitureDesignSpec): DrawingDimensionItem[] {
  const details: DrawingDimensionItem[] = [
    { label: 'TOP', value: `T ${spec.top.thickness_mm} mm` },
  ];
  if (spec.base.inset_mm) details.push({ label: 'BASE', value: `INSET ${spec.base.inset_mm} mm` });
  for (const component of spec.components) {
    if (!component.dimensions_mm || Object.values(component.dimensions_mm).every((value) => !value)) continue;
    details.push({ label: component.role.toUpperCase(), value: dimensionText(component.dimensions_mm) });
    if (details.length >= 6) break;
  }
  return details;
}

function lineWithArrows(x1: number, x2: number, y: number, label: string, fine = false): string {
  const middle = (x1 + x2) / 2;
  const arrow = Math.max(8, Math.round((x2 - x1) * 0.025));
  return [
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="dimension"/>`,
    `<path d="M ${x1} ${y} l ${arrow} ${-arrow * 0.55} M ${x1} ${y} l ${arrow} ${arrow * 0.55} M ${x2} ${y} l ${-arrow} ${-arrow * 0.55} M ${x2} ${y} l ${-arrow} ${arrow * 0.55}" class="dimension"/>`,
    `<rect x="${middle - label.length * 7.5}" y="${y - 25}" width="${label.length * 15}" height="32" fill="#fff"/>`,
    `<text x="${middle}" y="${y - 7}" class="value${fine ? ' value--fine' : ''}" text-anchor="middle">${label}</text>`,
  ].join('');
}

function verticalLineWithArrows(x: number, y1: number, y2: number, label: string): string {
  const middle = (y1 + y2) / 2;
  const arrow = Math.max(8, Math.round((y2 - y1) * 0.025));
  return [
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="dimension"/>`,
    `<path d="M ${x} ${y1} l ${-arrow * 0.55} ${arrow} M ${x} ${y1} l ${arrow * 0.55} ${arrow} M ${x} ${y2} l ${-arrow * 0.55} ${-arrow} M ${x} ${y2} l ${arrow * 0.55} ${-arrow}" class="dimension"/>`,
    `<g transform="translate(${x - 10} ${middle}) rotate(-90)"><rect x="${-label.length * 7.5}" y="-24" width="${label.length * 15}" height="31" fill="#fff"/><text x="0" y="-3" class="value" text-anchor="middle">${label}</text></g>`,
  ].join('');
}

export function buildDimensionAnnotationSvg(input: {
  width: number;
  sourceHeight: number;
  topMargin: number;
  bottomMargin: number;
  spec: FurnitureDesignSpec;
}): string {
  const { width, sourceHeight, topMargin, bottomMargin, spec } = input;
  const fullHeight = sourceHeight + topMargin + bottomMargin;
  const column = width / 3;
  const sourceTop = topMargin;
  const sourceBottom = topMargin + sourceHeight;
  const titleY = Math.round(topMargin * 0.5);
  const firstRail = sourceBottom + Math.round(bottomMargin * 0.28);
  const inset = column * 0.09;
  const verticalTop = sourceTop + sourceHeight * 0.12;
  const verticalBottom = sourceTop + sourceHeight * 0.88;
  const details = drawingDimensionItems(spec);
  const detailText = details.map((item, index) => {
    const x = column * ((index % 3) + 0.5);
    const row = Math.floor(index / 3);
    const y = sourceBottom + Math.round(bottomMargin * (row === 0 ? 0.73 : 0.9));
    return `<text x="${x}" y="${y}" class="detail" text-anchor="middle">${item.label} ${item.value}</text>`;
  }).join('');

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${fullHeight}" viewBox="0 0 ${width} ${fullHeight}">
    <style>
      .dimension { fill: none; stroke: #000; stroke-width: ${Math.max(2, Math.round(width / 1000))}; }
      .view { fill: #000; font: 700 ${Math.max(22, Math.round(width / 70))}px Arial, Helvetica, sans-serif; letter-spacing: 0.12em; }
      .value { fill: #000; font: 600 ${Math.max(20, Math.round(width / 78))}px Arial, Helvetica, sans-serif; }
      .value--fine { font-size: ${Math.max(17, Math.round(width / 92))}px; }
      .detail { fill: #000; font: 500 ${Math.max(17, Math.round(width / 95))}px Arial, Helvetica, sans-serif; }
    </style>
    <rect width="${width}" height="${fullHeight}" fill="none"/>
    <text x="${column * 0.5}" y="${titleY}" class="view" text-anchor="middle">FRONT</text>
    <text x="${column * 1.5}" y="${titleY}" class="view" text-anchor="middle">SIDE</text>
    <text x="${column * 2.5}" y="${titleY}" class="view" text-anchor="middle">TOP</text>
    ${lineWithArrows(inset, column - inset, firstRail, `W ${spec.dimensions_mm.width} mm`)}
    ${verticalLineWithArrows(column - inset * 0.45, verticalTop, verticalBottom, `H ${spec.dimensions_mm.height} mm`)}
    ${lineWithArrows(column + inset, column * 2 - inset, firstRail, `D ${spec.dimensions_mm.depth} mm`)}
    ${verticalLineWithArrows(column * 2 - inset * 0.45, verticalTop, verticalBottom, `H ${spec.dimensions_mm.height} mm`)}
    ${lineWithArrows(column * 2 + inset, width - inset, firstRail, `W ${spec.dimensions_mm.width} mm`)}
    ${verticalLineWithArrows(width - inset * 0.45, verticalTop, verticalBottom, `D ${spec.dimensions_mm.depth} mm`)}
    <line x1="${inset}" y1="${sourceBottom + Math.round(bottomMargin * 0.64)}" x2="${width - inset}" y2="${sourceBottom + Math.round(bottomMargin * 0.64)}" class="dimension"/>
    ${detailText}
  </svg>`;
}

export async function createDimensionedOrthographicPng(input: {
  source: Buffer;
  spec: FurnitureDesignSpec;
}): Promise<Buffer> {
  const normalized = sharp(input.source, { failOn: 'error' })
    .rotate()
    .resize({ width: MAX_DRAWING_WIDTH, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .greyscale()
    .threshold(215)
    .png();
  const { data, info } = await normalized.toBuffer({ resolveWithObject: true });
  if (!info.width || !info.height) throw new Error('ZooWork orthographic image has no readable dimensions');
  const topMargin = Math.max(72, Math.round(info.height * 0.08));
  const bottomMargin = Math.max(260, Math.round(info.height * 0.25));
  const svg = buildDimensionAnnotationSvg({
    width: info.width,
    sourceHeight: info.height,
    topMargin,
    bottomMargin,
    spec: input.spec,
  });
  return sharp(data)
    .extend({ top: topMargin, bottom: bottomMargin, background: '#ffffff' })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();
}
