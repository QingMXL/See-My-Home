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
  const categoryColor = placement.kind === 'sink' ? '#1976a3'
    : placement.kind === 'vanity' ? '#9a6a2f'
      : placement.kind === 'cooktop' ? '#b04a45'
        : placement.kind === 'tv' ? '#72518a'
          : placement.kind === 'sofa' ? '#3e7f6a'
            : placement.kind === 'bed' ? '#526f9d'
              : '#455a64';
  const outline = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#ffffff" fill-opacity="0.78" stroke="${categoryColor}" stroke-width="3"/>`;
  const frontEdge = placement.front_edge === 'top'
    ? `<line x1="${x}" y1="${y}" x2="${(box.x + box.width).toFixed(1)}" y2="${y}" stroke="${categoryColor}" stroke-width="5"/>`
    : placement.front_edge === 'right'
      ? `<line x1="${(box.x + box.width).toFixed(1)}" y1="${y}" x2="${(box.x + box.width).toFixed(1)}" y2="${(box.y + box.height).toFixed(1)}" stroke="${categoryColor}" stroke-width="5"/>`
      : placement.front_edge === 'bottom'
        ? `<line x1="${x}" y1="${(box.y + box.height).toFixed(1)}" x2="${(box.x + box.width).toFixed(1)}" y2="${(box.y + box.height).toFixed(1)}" stroke="${categoryColor}" stroke-width="5"/>`
        : placement.front_edge === 'left'
          ? `<line x1="${x}" y1="${y}" x2="${x}" y2="${(box.y + box.height).toFixed(1)}" stroke="${categoryColor}" stroke-width="5"/>`
          : '';
  if (placement.kind === 'bed') {
    return `<g ${common}>${outline}<rect x="${(box.x + box.width * 0.1).toFixed(1)}" y="${(box.y + box.height * 0.07).toFixed(1)}" width="${(box.width * 0.34).toFixed(1)}" height="${(box.height * 0.18).toFixed(1)}" rx="4" fill="none" stroke="${categoryColor}" stroke-width="2"/><rect x="${(box.x + box.width * 0.56).toFixed(1)}" y="${(box.y + box.height * 0.07).toFixed(1)}" width="${(box.width * 0.34).toFixed(1)}" height="${(box.height * 0.18).toFixed(1)}" rx="4" fill="none" stroke="${categoryColor}" stroke-width="2"/><line x1="${(box.x + box.width * 0.08).toFixed(1)}" y1="${(box.y + box.height * 0.3).toFixed(1)}" x2="${(box.x + box.width * 0.92).toFixed(1)}" y2="${(box.y + box.height * 0.3).toFixed(1)}" stroke="${categoryColor}" stroke-width="1.5"/></g>`;
  }
  if (placement.kind === 'sofa') {
    return `<g ${common}>${outline}<line x1="${(box.x + box.width * 0.12).toFixed(1)}" y1="${(box.y + box.height * 0.32).toFixed(1)}" x2="${(box.x + box.width * 0.88).toFixed(1)}" y2="${(box.y + box.height * 0.32).toFixed(1)}" stroke="${categoryColor}" stroke-width="2"/><line x1="${(box.x + box.width / 2).toFixed(1)}" y1="${(box.y + box.height * 0.32).toFixed(1)}" x2="${(box.x + box.width / 2).toFixed(1)}" y2="${(box.y + box.height * 0.9).toFixed(1)}" stroke="${categoryColor}" stroke-width="1.8"/>${frontEdge}</g>`;
  }
  if (placement.kind === 'tv') {
    return `<g ${common}>${outline}<rect x="${(box.x + box.width * 0.08).toFixed(1)}" y="${(box.y + box.height * 0.16).toFixed(1)}" width="${(box.width * 0.84).toFixed(1)}" height="${(box.height * 0.48).toFixed(1)}" rx="2" fill="none" stroke="${categoryColor}" stroke-width="2.5"/><line x1="${(box.x + box.width * 0.38).toFixed(1)}" y1="${(box.y + box.height * 0.78).toFixed(1)}" x2="${(box.x + box.width * 0.62).toFixed(1)}" y2="${(box.y + box.height * 0.78).toFixed(1)}" stroke="${categoryColor}" stroke-width="2"/>${frontEdge}</g>`;
  }
  if (placement.kind === 'toilet') {
    return `<g ${common}>${outline}<rect x="${(box.x + box.width * 0.2).toFixed(1)}" y="${(box.y + box.height * 0.08).toFixed(1)}" width="${(box.width * 0.6).toFixed(1)}" height="${(box.height * 0.22).toFixed(1)}" rx="2" fill="none" stroke="#607d8b" stroke-width="1.5"/><ellipse cx="${(box.x + box.width / 2).toFixed(1)}" cy="${(box.y + box.height * 0.62).toFixed(1)}" rx="${(box.width * 0.28).toFixed(1)}" ry="${(box.height * 0.25).toFixed(1)}" fill="none" stroke="#607d8b" stroke-width="1.5"/></g>`;
  }
  if (placement.kind === 'vanity' || placement.kind === 'sink') {
    if (placement.kind === 'sink') {
      return `<g ${common}>${outline}<ellipse cx="${(box.x + box.width / 2).toFixed(1)}" cy="${(box.y + box.height * 0.56).toFixed(1)}" rx="${(box.width * 0.3).toFixed(1)}" ry="${(box.height * 0.28).toFixed(1)}" fill="none" stroke="${categoryColor}" stroke-width="2.5"/><path d="M ${(box.x + box.width * 0.5).toFixed(1)} ${(box.y + box.height * 0.18).toFixed(1)} q ${(box.width * 0.14).toFixed(1)} 0 ${(box.width * 0.14).toFixed(1)} ${(box.height * 0.18).toFixed(1)}" fill="none" stroke="${categoryColor}" stroke-width="2"/></g>`;
    }
    return `<g ${common}>${outline}<line x1="${(box.x + box.width * 0.08).toFixed(1)}" y1="${(box.y + box.height * 0.22).toFixed(1)}" x2="${(box.x + box.width * 0.92).toFixed(1)}" y2="${(box.y + box.height * 0.22).toFixed(1)}" stroke="${categoryColor}" stroke-width="2"/><ellipse cx="${(box.x + box.width / 2).toFixed(1)}" cy="${(box.y + box.height * 0.58).toFixed(1)}" rx="${(box.width * 0.2).toFixed(1)}" ry="${(box.height * 0.22).toFixed(1)}" fill="none" stroke="${categoryColor}" stroke-width="2"/><line x1="${(box.x + box.width * 0.18).toFixed(1)}" y1="${(box.y + box.height * 0.86).toFixed(1)}" x2="${(box.x + box.width * 0.82).toFixed(1)}" y2="${(box.y + box.height * 0.86).toFixed(1)}" stroke="${categoryColor}" stroke-width="2"/></g>`;
  }
  if (placement.kind === 'shower' || placement.kind === 'bathtub') {
    return `<g ${common}>${outline}<line x1="${x}" y1="${y}" x2="${(box.x + box.width).toFixed(1)}" y2="${(box.y + box.height).toFixed(1)}" stroke="#7aa6b5" stroke-width="1.2"/><line x1="${(box.x + box.width).toFixed(1)}" y1="${y}" x2="${x}" y2="${(box.y + box.height).toFixed(1)}" stroke="#7aa6b5" stroke-width="1.2"/></g>`;
  }
  if (placement.kind === 'cooktop') {
    const circles = ([[0.3, 0.32], [0.7, 0.32], [0.3, 0.68], [0.7, 0.68]] as Array<[number, number]>).map(([cx, cy]) => `<circle cx="${(box.x + box.width * cx).toFixed(1)}" cy="${(box.y + box.height * cy).toFixed(1)}" r="${Math.max(2, Math.min(box.width, box.height) * 0.12).toFixed(1)}" fill="none" stroke="#607d8b" stroke-width="1.2"/>`).join('');
    return `<g ${common}>${outline}${circles}</g>`;
  }
  if (placement.kind === 'refrigerator') {
    return `<g ${common}>${outline}<line x1="${(box.x + box.width / 2).toFixed(1)}" y1="${(box.y + box.height * 0.08).toFixed(1)}" x2="${(box.x + box.width / 2).toFixed(1)}" y2="${(box.y + box.height * 0.92).toFixed(1)}" stroke="${categoryColor}" stroke-width="2"/><line x1="${(box.x + box.width * 0.18).toFixed(1)}" y1="${(box.y + box.height * 0.18).toFixed(1)}" x2="${(box.x + box.width * 0.18).toFixed(1)}" y2="${(box.y + box.height * 0.42).toFixed(1)}" stroke="${categoryColor}" stroke-width="2"/></g>`;
  }
  if (placement.kind === 'counter') {
    return `<g ${common}>${outline}<line x1="${(box.x + box.width * 0.08).toFixed(1)}" y1="${(box.y + box.height * 0.25).toFixed(1)}" x2="${(box.x + box.width * 0.92).toFixed(1)}" y2="${(box.y + box.height * 0.25).toFixed(1)}" stroke="${categoryColor}" stroke-width="2"/><line x1="${(box.x + box.width * 0.08).toFixed(1)}" y1="${(box.y + box.height * 0.75).toFixed(1)}" x2="${(box.x + box.width * 0.92).toFixed(1)}" y2="${(box.y + box.height * 0.75).toFixed(1)}" stroke="${categoryColor}" stroke-width="2"/></g>`;
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
  const materialColors: Record<string, string> = { warm_wood: '#d8c39a', resilient_entry: '#9fb8ad', ceramic_tile: '#a9bcc8', exterior_tile: '#c4b4a1' };
  const materialZones = input.plan.material_zones.map((zone) => `<polygon data-material-zone="${escapeXml(zone.id)}" data-finish-family="${zone.finish_family}" points="${points(zone.polygon, width, height)}" clip-path="url(#clip-${escapeXml(zone.space_ref)})" fill="${materialColors[zone.finish_family] ?? '#b8b8b8'}" fill-opacity="0.08" stroke="${materialColors[zone.finish_family] ?? '#888888'}" stroke-opacity="0.9" stroke-width="2.5" stroke-dasharray="3 5"/>`).join('');
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
  const placementMap = new Map(input.plan.placements.map((placement) => [placement.id, placement]));
  const viewAxes = input.plan.placements.flatMap((placement) => {
    const target = placement.faces_ref ? placementMap.get(placement.faces_ref) : undefined;
    if (!target || placement.kind !== 'sofa') return [];
    return [`<line data-view-axis="${escapeXml(placement.id)}" x1="${(placement.x * width).toFixed(1)}" y1="${(placement.y * height).toFixed(1)}" x2="${(target.x * width).toFixed(1)}" y2="${(target.y * height).toFixed(1)}" stroke="#8a4f9e" stroke-opacity="0.8" stroke-width="3" stroke-dasharray="10 7" marker-end="url(#view-arrow)"/>`];
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${roomClips}<marker id="view-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8a4f9e"/></marker></defs><g data-control-layer="material-zones">${materialZones}</g><g data-control-layer="functional-zones">${zones}</g><g data-control-layer="keepouts">${keepouts}</g><g data-control-layer="openings">${openings}</g><g data-control-layer="view-axes">${viewAxes}</g><g data-control-layer="placements">${placements}</g></svg>`;
}
