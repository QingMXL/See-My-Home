import type { RoomMapOpening } from './contracts.js';
import type { LayoutPlacement, LayoutRenderPlan, PlanningRoom } from './layout-planning.js';

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character] ?? character);
}

function points(polygon: number[][], width: number, height: number): string {
  return polygon.map(([x = 0, y = 0]) => `${(x * width).toFixed(1)},${(y * height).toFixed(1)}`).join(' ');
}

function placementBox(placement: LayoutPlacement, width: number, height: number) {
  const boxWidth = placement.width * width;
  const boxHeight = placement.height * height;
  return {
    x: placement.x * width - boxWidth / 2,
    y: placement.y * height - boxHeight / 2,
    width: boxWidth,
    height: boxHeight,
  };
}

function placementGlyph(placement: LayoutPlacement, width: number, height: number): string {
  const box = placementBox(placement, width, height);
  const id = escapeXml(placement.id);
  const x = box.x.toFixed(1);
  const y = box.y.toFixed(1);
  const w = box.width.toFixed(1);
  const h = box.height.toFixed(1);
  const common = `data-placement-id="${id}" data-kind="${placement.kind}"`;
  const outline = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#ffffff" fill-opacity="0.72" stroke="#37474f" stroke-width="2"/>`;
  if (placement.kind === 'bed') {
    return `<g ${common}>${outline}<rect x="${(box.x + box.width * 0.1).toFixed(1)}" y="${(box.y + box.height * 0.07).toFixed(1)}" width="${(box.width * 0.34).toFixed(1)}" height="${(box.height * 0.18).toFixed(1)}" rx="4" fill="none" stroke="#607d8b" stroke-width="1.5"/><rect x="${(box.x + box.width * 0.56).toFixed(1)}" y="${(box.y + box.height * 0.07).toFixed(1)}" width="${(box.width * 0.34).toFixed(1)}" height="${(box.height * 0.18).toFixed(1)}" rx="4" fill="none" stroke="#607d8b" stroke-width="1.5"/></g>`;
  }
  if (placement.kind === 'sofa') {
    return `<g ${common}>${outline}<line x1="${(box.x + box.width * 0.12).toFixed(1)}" y1="${(box.y + box.height * 0.32).toFixed(1)}" x2="${(box.x + box.width * 0.88).toFixed(1)}" y2="${(box.y + box.height * 0.32).toFixed(1)}" stroke="#607d8b" stroke-width="1.5"/><line x1="${(box.x + box.width / 2).toFixed(1)}" y1="${(box.y + box.height * 0.32).toFixed(1)}" x2="${(box.x + box.width / 2).toFixed(1)}" y2="${(box.y + box.height * 0.9).toFixed(1)}" stroke="#607d8b" stroke-width="1.2"/></g>`;
  }
  if (placement.kind === 'toilet') {
    return `<g ${common}>${outline}<rect x="${(box.x + box.width * 0.2).toFixed(1)}" y="${(box.y + box.height * 0.08).toFixed(1)}" width="${(box.width * 0.6).toFixed(1)}" height="${(box.height * 0.22).toFixed(1)}" rx="2" fill="none" stroke="#607d8b" stroke-width="1.5"/><ellipse cx="${(box.x + box.width / 2).toFixed(1)}" cy="${(box.y + box.height * 0.62).toFixed(1)}" rx="${(box.width * 0.28).toFixed(1)}" ry="${(box.height * 0.25).toFixed(1)}" fill="none" stroke="#607d8b" stroke-width="1.5"/></g>`;
  }
  if (placement.kind === 'vanity' || placement.kind === 'sink') {
    return `<g ${common}>${outline}<ellipse cx="${(box.x + box.width / 2).toFixed(1)}" cy="${(box.y + box.height / 2).toFixed(1)}" rx="${(box.width * 0.22).toFixed(1)}" ry="${(box.height * 0.25).toFixed(1)}" fill="none" stroke="#607d8b" stroke-width="1.5"/></g>`;
  }
  if (placement.kind === 'shower' || placement.kind === 'bathtub') {
    return `<g ${common}>${outline}<line x1="${x}" y1="${y}" x2="${(box.x + box.width).toFixed(1)}" y2="${(box.y + box.height).toFixed(1)}" stroke="#7aa6b5" stroke-width="1.2"/><line x1="${(box.x + box.width).toFixed(1)}" y1="${y}" x2="${x}" y2="${(box.y + box.height).toFixed(1)}" stroke="#7aa6b5" stroke-width="1.2"/></g>`;
  }
  if (placement.kind === 'cooktop') {
    const circles = ([[0.3, 0.32], [0.7, 0.32], [0.3, 0.68], [0.7, 0.68]] as Array<[number, number]>).map(([cx, cy]) => `<circle cx="${(box.x + box.width * cx).toFixed(1)}" cy="${(box.y + box.height * cy).toFixed(1)}" r="${Math.max(2, Math.min(box.width, box.height) * 0.12).toFixed(1)}" fill="none" stroke="#607d8b" stroke-width="1.2"/>`).join('');
    return `<g ${common}>${outline}${circles}</g>`;
  }
  return `<g ${common}>${outline}</g>`;
}

export function renderLayoutControlOverlaySvg(input: {
  width: number;
  height: number;
  plan: LayoutRenderPlan;
  rooms: PlanningRoom[];
  openings: RoomMapOpening[];
}): string {
  const width = Math.max(1, Math.round(input.width));
  const height = Math.max(1, Math.round(input.height));
  const roomClips = input.rooms.map((room) => `<clipPath id="clip-${escapeXml(room.id)}"><polygon points="${points(room.polygon, width, height)}"/></clipPath>`).join('');
  const zones = input.plan.functional_zones.map((zone) => `<polygon data-zone-kind="${zone.kind}" points="${points(zone.polygon, width, height)}" clip-path="url(#clip-${escapeXml(zone.space_ref)})" fill="${zone.kind === 'bathroom_wet' ? '#83c6dc' : '#e8dfce'}" fill-opacity="${zone.kind === 'bathroom_wet' ? '0.22' : '0.10'}" stroke="${zone.kind === 'bathroom_wet' ? '#4f9fb9' : '#b5aa93'}" stroke-width="1.5" stroke-dasharray="7 5"/>`).join('');
  const keepouts = input.plan.keepout_zones.map((zone) => `<polygon data-keepout-kind="${zone.reason}" points="${points(zone.polygon, width, height)}" fill="${zone.reason === 'circulation_path' ? '#76b994' : '#d5b76a'}" fill-opacity="${zone.reason === 'circulation_path' ? '0.13' : '0.10'}" stroke="${zone.reason === 'circulation_path' ? '#438566' : '#a48740'}" stroke-opacity="0.65" stroke-width="1.5" stroke-dasharray="7 6"/>`).join('');
  const openings = input.openings.flatMap((opening) => {
    const segment = opening.segment;
    if (!segment) return [];
    const color = opening.kind === 'window' ? '#6b8ac9' : '#1596b8';
    const strokeWidth = opening.kind === 'window' ? 3 : 5;
    return [`<line data-opening-kind="${opening.kind}" x1="${(segment[0][0] * width).toFixed(1)}" y1="${(segment[0][1] * height).toFixed(1)}" x2="${(segment[1][0] * width).toFixed(1)}" y2="${(segment[1][1] * height).toFixed(1)}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`];
  }).join('');
  const placements = input.plan.placements.map((placement) => placementGlyph(placement, width, height)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${roomClips}</defs><g data-control-layer="functional-zones">${zones}</g><g data-control-layer="keepouts">${keepouts}</g><g data-control-layer="openings">${openings}</g><g data-control-layer="placements">${placements}</g></svg>`;
}
