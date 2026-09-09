import type { RoomFunctionCode, RoomMapOpening } from './contracts.js';

export type LayoutPlacementKind =
  | 'sofa' | 'tv' | 'coffee_table' | 'dining_table' | 'bed' | 'wardrobe'
  | 'desk' | 'bookshelf' | 'counter' | 'sink' | 'cooktop' | 'refrigerator'
  | 'toilet' | 'vanity' | 'shower' | 'bathtub' | 'washer' | 'storage'
  | 'outdoor_seating';

export interface PlanningRoom {
  id: string;
  label: string;
  polygon: number[][];
  functionCode: Exclude<RoomFunctionCode, 'unknown'>;
}

export interface ScaleCalibration {
  status: 'unknown' | 'estimated' | 'confirmed';
  basis: 'door_reference' | 'printed_dimension' | 'user_measurement' | 'unknown';
  reference_entity_ref: string | null;
  reference_length_mm: number | null;
  millimeters_per_source_unit: number;
  millimeters_per_source_x_unit: number;
  millimeters_per_source_y_unit: number;
  source_aspect_ratio: number;
  confidence: number;
}

export interface LayoutPlacement {
  id: string;
  space_ref: string;
  kind: LayoutPlacementKind;
  x: number;
  y: number;
  width: number;
  height: number;
  width_mm: number;
  depth_mm: number;
  rotation_deg: number;
  clearance_mm: number;
  scale_status: ScaleCalibration['status'];
  zone_ref: string | null;
}

export interface LayoutKeepoutZone {
  id: string;
  reason: 'door_opening' | 'door_swing' | 'entry_landing' | 'open_passage' | 'circulation_path';
  opening_ref: string | null;
  space_refs: string[];
  polygon: number[][];
  clearance_mm: number;
}

export interface LayoutFunctionalZone {
  id: string;
  space_ref: string;
  kind: 'bathroom_dry' | 'bathroom_wet';
  polygon: number[][];
  basis_opening_ref: string | null;
}

export interface LayoutRenderPlan {
  schema_version: '1.2';
  geometry_revision: number;
  placement_revision: number;
  render_strategy: 'source_locked_control_overlay';
  scale: ScaleCalibration;
  keepout_zones: LayoutKeepoutZone[];
  functional_zones: LayoutFunctionalZone[];
  placements: LayoutPlacement[];
  qa: {
    status: 'passed' | 'needs_review';
    issues: string[];
    warnings: string[];
  };
}

interface FurnitureSpec {
  width: number;
  depth: number;
  minWidth: number;
  minDepth: number;
  clearance: number;
}

interface PlacementIntent {
  kind: LayoutPlacementKind;
  x: number;
  y: number;
  width?: number;
  depth?: number;
  clearance?: number;
  instance?: string;
  zoneKind?: LayoutFunctionalZone['kind'];
  preferredSource?: [number, number];
}

const DEFAULT_DOOR_WIDTH_MM = 850;
const DEFAULT_DOOR_SOURCE_SPAN = 0.065;

const FURNITURE_SPECS: Record<LayoutPlacementKind, FurnitureSpec> = {
  sofa: { width: 2200, depth: 900, minWidth: 1600, minDepth: 800, clearance: 600 },
  tv: { width: 1500, depth: 250, minWidth: 900, minDepth: 180, clearance: 450 },
  coffee_table: { width: 1100, depth: 600, minWidth: 700, minDepth: 450, clearance: 450 },
  dining_table: { width: 1600, depth: 900, minWidth: 1200, minDepth: 750, clearance: 850 },
  bed: { width: 1800, depth: 2000, minWidth: 1000, minDepth: 1900, clearance: 600 },
  wardrobe: { width: 1800, depth: 600, minWidth: 900, minDepth: 500, clearance: 700 },
  desk: { width: 1400, depth: 700, minWidth: 1000, minDepth: 550, clearance: 800 },
  bookshelf: { width: 1200, depth: 350, minWidth: 700, minDepth: 280, clearance: 600 },
  counter: { width: 3000, depth: 650, minWidth: 1800, minDepth: 600, clearance: 1000 },
  sink: { width: 800, depth: 500, minWidth: 600, minDepth: 450, clearance: 750 },
  cooktop: { width: 760, depth: 520, minWidth: 600, minDepth: 480, clearance: 750 },
  refrigerator: { width: 900, depth: 760, minWidth: 760, minDepth: 700, clearance: 900 },
  toilet: { width: 700, depth: 1200, minWidth: 650, minDepth: 1100, clearance: 600 },
  vanity: { width: 1000, depth: 550, minWidth: 600, minDepth: 480, clearance: 700 },
  shower: { width: 1000, depth: 1000, minWidth: 900, minDepth: 900, clearance: 650 },
  bathtub: { width: 1700, depth: 800, minWidth: 1500, minDepth: 750, clearance: 650 },
  washer: { width: 700, depth: 750, minWidth: 620, minDepth: 650, clearance: 800 },
  storage: { width: 1400, depth: 500, minWidth: 700, minDepth: 250, clearance: 700 },
  outdoor_seating: { width: 1600, depth: 800, minWidth: 1000, minDepth: 650, clearance: 700 },
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function validPoint(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length === 2
    && value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 1);
}

function openingSegment(opening: RoomMapOpening): [[number, number], [number, number]] | null {
  return Array.isArray(opening.segment)
    && opening.segment.length === 2
    && validPoint(opening.segment[0])
    && validPoint(opening.segment[1])
    ? [opening.segment[0], opening.segment[1]]
    : null;
}

export function calibratePlanScale(
  openings: RoomMapOpening[],
  sourceAspectRatio = 1,
): ScaleCalibration {
  const aspectRatio = Number.isFinite(sourceAspectRatio) && sourceAspectRatio > 0
    ? clamp(sourceAspectRatio, 0.25, 4)
    : 1;
  const candidates = openings.flatMap((opening) => {
    const segment = opening.kind === 'door' ? openingSegment(opening) : null;
    if (!segment || opening.door_type === 'sliding' || opening.door_type === 'double') return [];
    const dx = (segment[1][0] - segment[0][0]) * aspectRatio;
    const dy = segment[1][1] - segment[0][1];
    const length = Math.hypot(dx, dy);
    return length >= 0.005 && length <= 0.25 ? [{ opening, length }] : [];
  });
  if (candidates.length > 0) {
    const sortedLengths = candidates.map((item) => item.length).sort((left, right) => left - right);
    const middle = Math.floor(sortedLengths.length / 2);
    const median = sortedLengths.length % 2 === 0
      ? ((sortedLengths[middle - 1] ?? 0) + (sortedLengths[middle] ?? 0)) / 2
      : (sortedLengths[middle] ?? 0);
    const consistent = candidates.filter((item) => item.length >= median * 0.7 && item.length <= median * 1.3);
    const sourceLengthInImageHeightUnits = consistent.reduce((sum, item) => sum + item.length, 0) / consistent.length;
    const reference = [...consistent].sort((left, right) => right.opening.confidence - left.opening.confidence)[0]?.opening;
    if (reference && sourceLengthInImageHeightUnits >= 0.005) {
      const millimetersPerYUnit = DEFAULT_DOOR_WIDTH_MM / sourceLengthInImageHeightUnits;
      const millimetersPerXUnit = millimetersPerYUnit * aspectRatio;
      return {
        status: 'estimated',
        basis: 'door_reference',
        reference_entity_ref: reference.id,
        reference_length_mm: DEFAULT_DOOR_WIDTH_MM,
        millimeters_per_source_unit: Math.sqrt(millimetersPerXUnit * millimetersPerYUnit),
        millimeters_per_source_x_unit: millimetersPerXUnit,
        millimeters_per_source_y_unit: millimetersPerYUnit,
        source_aspect_ratio: aspectRatio,
        confidence: clamp(
          (consistent.reduce((sum, item) => sum + item.opening.confidence, 0) / consistent.length)
            * (consistent.length >= 2 ? 0.88 : 0.78),
          0,
          0.88,
        ),
      };
    }
  }

  const fallback = DEFAULT_DOOR_WIDTH_MM / DEFAULT_DOOR_SOURCE_SPAN;
  return {
    status: 'unknown',
    basis: 'unknown',
    reference_entity_ref: null,
    reference_length_mm: null,
    millimeters_per_source_unit: fallback,
    millimeters_per_source_x_unit: fallback,
    millimeters_per_source_y_unit: fallback,
    source_aspect_ratio: aspectRatio,
    confidence: 0,
  };
}

function axisAlignedPolygon(left: number, top: number, right: number, bottom: number): number[][] {
  const polygon: Array<[number, number]> = [
    [clamp(left, 0, 1), clamp(top, 0, 1)],
    [clamp(right, 0, 1), clamp(top, 0, 1)],
    [clamp(right, 0, 1), clamp(bottom, 0, 1)],
    [clamp(left, 0, 1), clamp(bottom, 0, 1)],
  ];
  return polygon;
}

function polygonBounds(polygon: number[][]): { left: number; top: number; right: number; bottom: number } {
  const xs = polygon.map((point) => point[0] ?? 0);
  const ys = polygon.map((point) => point[1] ?? 0);
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}

function polygonCenter(polygon: number[][]): [number, number] {
  const bounds = polygonBounds(polygon);
  const average: [number, number] = [
    polygon.reduce((sum, point) => sum + (point[0] ?? 0), 0) / polygon.length,
    polygon.reduce((sum, point) => sum + (point[1] ?? 0), 0) / polygon.length,
  ];
  return pointInPolygon(average, polygon)
    ? average
    : [(bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2];
}

function openingCenter(opening: RoomMapOpening): [number, number] | null {
  const segment = openingSegment(opening);
  if (segment) return [(segment[0][0] + segment[1][0]) / 2, (segment[0][1] + segment[1][1]) / 2];
  return validPoint(opening.position) ? opening.position : null;
}

function physicalDistance(from: [number, number], to: [number, number], scale: ScaleCalibration): number {
  return Math.hypot(
    (to[0] - from[0]) * scale.millimeters_per_source_x_unit,
    (to[1] - from[1]) * scale.millimeters_per_source_y_unit,
  );
}

function pointToward(
  from: [number, number],
  to: [number, number],
  maximumDistanceMm: number,
  scale: ScaleCalibration,
): [number, number] {
  const distance = physicalDistance(from, to, scale);
  if (distance <= maximumDistanceMm || distance === 0) return to;
  const ratio = maximumDistanceMm / distance;
  return [from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio];
}

function rayToRoomEdge(from: [number, number], toward: [number, number], polygon: number[][]): [number, number] {
  const bounds = polygonBounds(polygon);
  const dx = toward[0] - from[0];
  const dy = toward[1] - from[1];
  const candidates = [
    dx > 0 ? (bounds.right - from[0]) / dx : dx < 0 ? (bounds.left - from[0]) / dx : Number.POSITIVE_INFINITY,
    dy > 0 ? (bounds.bottom - from[1]) / dy : dy < 0 ? (bounds.top - from[1]) / dy : Number.POSITIVE_INFINITY,
  ].filter((value) => Number.isFinite(value) && value > 0);
  const multiplier = Math.max(1, Math.min(...candidates) * 0.96);
  return [from[0] + dx * multiplier, from[1] + dy * multiplier];
}

function corridorPolygon(
  from: [number, number],
  to: [number, number],
  widthMm: number,
  scale: ScaleCalibration,
): number[][] {
  const fromMm = [from[0] * scale.millimeters_per_source_x_unit, from[1] * scale.millimeters_per_source_y_unit] as const;
  const toMm = [to[0] * scale.millimeters_per_source_x_unit, to[1] * scale.millimeters_per_source_y_unit] as const;
  const dx = toMm[0] - fromMm[0];
  const dy = toMm[1] - fromMm[1];
  const length = Math.hypot(dx, dy) || 1;
  const offsetX = (-dy / length) * widthMm / 2;
  const offsetY = (dx / length) * widthMm / 2;
  const polygon: Array<[number, number]> = [
    [(fromMm[0] + offsetX) / scale.millimeters_per_source_x_unit, (fromMm[1] + offsetY) / scale.millimeters_per_source_y_unit],
    [(toMm[0] + offsetX) / scale.millimeters_per_source_x_unit, (toMm[1] + offsetY) / scale.millimeters_per_source_y_unit],
    [(toMm[0] - offsetX) / scale.millimeters_per_source_x_unit, (toMm[1] - offsetY) / scale.millimeters_per_source_y_unit],
    [(fromMm[0] - offsetX) / scale.millimeters_per_source_x_unit, (fromMm[1] - offsetY) / scale.millimeters_per_source_y_unit],
  ];
  return polygon.map(([x, y]) => [clamp(x, 0, 1), clamp(y, 0, 1)]);
}

function buildOpeningKeepoutZones(openings: RoomMapOpening[], scale: ScaleCalibration): LayoutKeepoutZone[] {
  return openings.flatMap((opening): LayoutKeepoutZone[] => {
    if (opening.kind === 'window' || opening.kind === 'unknown') return [];
    const segment = openingSegment(opening);
    const center = segment
      ? [(segment[0][0] + segment[1][0]) / 2, (segment[0][1] + segment[1][1]) / 2] as [number, number]
      : opening.position;
    if (!validPoint(center)) return [];
    const isEntry = opening.door_type === 'entry';
    const clearanceMm = isEntry ? 1200 : 900;
    const dxMm = segment ? Math.abs(segment[1][0] - segment[0][0]) * scale.millimeters_per_source_x_unit : 0;
    const dyMm = segment ? Math.abs(segment[1][1] - segment[0][1]) * scale.millimeters_per_source_y_unit : 0;
    const parallelPaddingMm = 150;
    const xClearanceMm = segment && dxMm >= dyMm ? parallelPaddingMm : clearanceMm;
    const yClearanceMm = segment && dxMm < dyMm ? parallelPaddingMm : clearanceMm;
    const xClearance = xClearanceMm / scale.millimeters_per_source_x_unit;
    const yClearance = yClearanceMm / scale.millimeters_per_source_y_unit;
    const segmentBounds = segment ? polygonBounds(segment) : {
      left: center[0], top: center[1], right: center[0], bottom: center[1],
    };
    const zones: LayoutKeepoutZone[] = [{
      id: `keepout_${opening.id}`,
      reason: isEntry ? 'entry_landing' : opening.kind === 'open_passage' ? 'open_passage' : 'door_opening',
      opening_ref: opening.id,
      space_refs: opening.connects_space_ids,
      polygon: axisAlignedPolygon(
        segmentBounds.left - xClearance,
        segmentBounds.top - yClearance,
        segmentBounds.right + xClearance,
        segmentBounds.bottom + yClearance,
      ),
      clearance_mm: clearanceMm,
    }];
    const hinge = opening.swing?.hinge_position;
    if (validPoint(hinge) && opening.swing?.direction !== 'sliding') {
      const swingRadiusMm = opening.kind === 'door' ? DEFAULT_DOOR_WIDTH_MM : clearanceMm;
      const xRadius = swingRadiusMm / scale.millimeters_per_source_x_unit;
      const yRadius = swingRadiusMm / scale.millimeters_per_source_y_unit;
      zones.push({
        id: `keepout_${opening.id}_swing`,
        reason: 'door_swing',
        opening_ref: opening.id,
        space_refs: opening.connects_space_ids,
        polygon: axisAlignedPolygon(hinge[0] - xRadius, hinge[1] - yRadius, hinge[0] + xRadius, hinge[1] + yRadius),
        clearance_mm: swingRadiusMm,
      });
    }
    return zones;
  });
}

function buildCirculationKeepoutZones(
  rooms: PlanningRoom[],
  openings: RoomMapOpening[],
  scale: ScaleCalibration,
): LayoutKeepoutZone[] {
  const zones: LayoutKeepoutZone[] = [];
  for (const room of rooms) {
    const roomOpenings = openings
      .filter((opening) => opening.kind !== 'window' && opening.kind !== 'unknown'
        && opening.connects_space_ids.includes(room.id))
      .map((opening) => ({ opening, center: openingCenter(opening) }))
      .filter((item): item is { opening: RoomMapOpening; center: [number, number] } => item.center !== null);
    if (roomOpenings.length === 0) continue;
    const entry = roomOpenings.find((item) => item.opening.door_type === 'entry') ?? roomOpenings[0];
    if (!entry) continue;
    const center = polygonCenter(room.polygon);
    const targets = roomOpenings.length > 1
      ? roomOpenings.filter((item) => item.opening.id !== entry.opening.id)
      : [{
        opening: entry.opening,
        center: room.functionCode === 'entry' || room.functionCode === 'mudroom'
          ? rayToRoomEdge(entry.center, center, room.polygon)
          : pointToward(entry.center, center, 1_200, scale),
      }];
    for (const [index, target] of targets.entries()) {
      if (physicalDistance(entry.center, target.center, scale) < 150) continue;
      zones.push({
        id: `keepout_circulation_${room.id}_${index + 1}`,
        reason: 'circulation_path',
        opening_ref: entry.opening.id,
        space_refs: [room.id],
        polygon: corridorPolygon(entry.center, target.center, 900, scale),
        clearance_mm: 900,
      });
    }
  }
  return zones;
}

function pointInPolygon(point: number[], polygon: number[][]): boolean {
  const [x = 0, y = 0] = point;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [xi = 0, yi = 0] = polygon[index] ?? [];
    const [xj = 0, yj = 0] = polygon[previous] ?? [];
    const intersects = ((yi > y) !== (yj > y))
      && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function rectangleFor(x: number, y: number, width: number, height: number): number[][] {
  return axisAlignedPolygon(x - width / 2, y - height / 2, x + width / 2, y + height / 2);
}

function polygonContainsRectangle(polygon: number[][], rectangle: number[][]): boolean {
  return rectangle.every((point) => pointInPolygon(point, polygon));
}

function orientation(a: number[], b: number[], c: number[]): number {
  return ((b[0] ?? 0) - (a[0] ?? 0)) * ((c[1] ?? 0) - (a[1] ?? 0))
    - ((b[1] ?? 0) - (a[1] ?? 0)) * ((c[0] ?? 0) - (a[0] ?? 0));
}

function segmentsIntersect(a: number[], b: number[], c: number[], d: number[]): boolean {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
    && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
}

function polygonsOverlap(left: number[][], right: number[][]): boolean {
  const a = polygonBounds(left);
  const b = polygonBounds(right);
  if (!(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top)) return false;
  if (left.some((point) => pointInPolygon(point, right)) || right.some((point) => pointInPolygon(point, left))) return true;
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const leftStart = left[leftIndex] ?? [];
    const leftEnd = left[(leftIndex + 1) % left.length] ?? [];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      if (segmentsIntersect(leftStart, leftEnd, right[rightIndex] ?? [], right[(rightIndex + 1) % right.length] ?? [])) return true;
    }
  }
  return false;
}

function overlapsAllowed(left: LayoutPlacementKind, right: LayoutPlacementKind): boolean {
  const pair = new Set([left, right]);
  return pair.has('counter') && (pair.has('sink') || pair.has('cooktop'));
}

function nearestOpeningSide(
  bounds: ReturnType<typeof polygonBounds>,
  position: [number, number],
): 'top' | 'right' | 'bottom' | 'left' {
  const distances = [
    ['top', Math.abs(position[1] - bounds.top)],
    ['right', Math.abs(bounds.right - position[0])],
    ['bottom', Math.abs(bounds.bottom - position[1])],
    ['left', Math.abs(position[0] - bounds.left)],
  ] as const;
  return [...distances].sort((left, right) => left[1] - right[1])[0]?.[0] ?? 'top';
}

function buildBathroomZones(
  rooms: PlanningRoom[],
  openings: RoomMapOpening[],
  scale: ScaleCalibration,
): LayoutFunctionalZone[] {
  return rooms.flatMap((room): LayoutFunctionalZone[] => {
    if (room.functionCode !== 'bathroom') return [];
    const bounds = polygonBounds(room.polygon);
    const relevant = openings
      .filter((opening) => opening.kind !== 'window' && opening.kind !== 'unknown'
        && opening.connects_space_ids.includes(room.id))
      .map((opening) => ({ opening, center: openingCenter(opening) }))
      .filter((item): item is { opening: RoomMapOpening; center: [number, number] } => item.center !== null)
      .sort((left, right) => right.opening.confidence - left.opening.confidence)[0];
    const doorPosition = relevant?.center ?? [(bounds.left + bounds.right) / 2, bounds.top] as [number, number];
    const side = nearestOpeningSide(bounds, doorPosition);
    const roomWidth = bounds.right - bounds.left;
    const roomHeight = bounds.bottom - bounds.top;
    const wetDepthX = clamp(1_200 / scale.millimeters_per_source_x_unit, roomWidth * 0.32, roomWidth * 0.46);
    const wetDepthY = clamp(1_200 / scale.millimeters_per_source_y_unit, roomHeight * 0.32, roomHeight * 0.46);
    let dry: number[][];
    let wet: number[][];
    if (side === 'top') {
      wet = axisAlignedPolygon(bounds.left, bounds.bottom - wetDepthY, bounds.right, bounds.bottom);
      dry = axisAlignedPolygon(bounds.left, bounds.top, bounds.right, bounds.bottom - wetDepthY);
    } else if (side === 'bottom') {
      wet = axisAlignedPolygon(bounds.left, bounds.top, bounds.right, bounds.top + wetDepthY);
      dry = axisAlignedPolygon(bounds.left, bounds.top + wetDepthY, bounds.right, bounds.bottom);
    } else if (side === 'left') {
      wet = axisAlignedPolygon(bounds.right - wetDepthX, bounds.top, bounds.right, bounds.bottom);
      dry = axisAlignedPolygon(bounds.left, bounds.top, bounds.right - wetDepthX, bounds.bottom);
    } else {
      wet = axisAlignedPolygon(bounds.left, bounds.top, bounds.left + wetDepthX, bounds.bottom);
      dry = axisAlignedPolygon(bounds.left + wetDepthX, bounds.top, bounds.right, bounds.bottom);
    }
    return [
      { id: `zone_${room.id}_dry`, space_ref: room.id, kind: 'bathroom_dry', polygon: dry, basis_opening_ref: relevant?.opening.id ?? null },
      { id: `zone_${room.id}_wet`, space_ref: room.id, kind: 'bathroom_wet', polygon: wet, basis_opening_ref: relevant?.opening.id ?? null },
    ];
  });
}

function bathroomIntents(room: PlanningRoom, zones: LayoutFunctionalZone[]): PlacementIntent[] {
  const wet = zones.find((zone) => zone.space_ref === room.id && zone.kind === 'bathroom_wet');
  const dry = zones.find((zone) => zone.space_ref === room.id && zone.kind === 'bathroom_dry');
  if (!wet || !dry) return [];
  const wetBounds = polygonBounds(wet.polygon);
  const dryBounds = polygonBounds(dry.polygon);
  const horizontalSplit = (wetBounds.right - wetBounds.left) >= (wetBounds.bottom - wetBounds.top);
  const vanity: [number, number] = horizontalSplit
    ? [dryBounds.left + (dryBounds.right - dryBounds.left) * 0.28, (dryBounds.top + dryBounds.bottom) / 2]
    : [(dryBounds.left + dryBounds.right) / 2, dryBounds.top + (dryBounds.bottom - dryBounds.top) * 0.28];
  const toilet: [number, number] = horizontalSplit
    ? [dryBounds.left + (dryBounds.right - dryBounds.left) * 0.72, (dryBounds.top + dryBounds.bottom) / 2]
    : [(dryBounds.left + dryBounds.right) / 2, dryBounds.top + (dryBounds.bottom - dryBounds.top) * 0.72];
  return [
    { kind: 'vanity', x: 0.5, y: 0.5, zoneKind: 'bathroom_dry', preferredSource: vanity },
    { kind: 'toilet', x: 0.5, y: 0.5, zoneKind: 'bathroom_dry', preferredSource: toilet },
    { kind: 'shower', x: 0.5, y: 0.5, zoneKind: 'bathroom_wet', preferredSource: [(wetBounds.left + wetBounds.right) / 2, (wetBounds.top + wetBounds.bottom) / 2] },
  ];
}

function roomIntents(room: PlanningRoom, tags: string[], considerations: string, zones: LayoutFunctionalZone[]): PlacementIntent[] {
  const twinBeds = room.functionCode === 'primary_bedroom'
    && (tags.includes('Twin Beds in Primary Bedroom') || /(?:twin\s+beds?|two\s+beds?|双床|两张床)/i.test(considerations));
  switch (room.functionCode) {
    case 'living_room': case 'family_room': case 'den':
      return [
        { kind: 'sofa', x: 0.28, y: 0.58 },
        { kind: 'tv', x: 0.82, y: 0.58 },
        { kind: 'coffee_table', x: 0.53, y: 0.58 },
      ];
    case 'dining_room': return [{ kind: 'dining_table', x: 0.5, y: 0.5 }];
    case 'kitchen': return [
      { kind: 'counter', x: 0.5, y: 0.16 },
      { kind: 'sink', x: 0.4, y: 0.16 },
      { kind: 'cooktop', x: 0.68, y: 0.16 },
      { kind: 'refrigerator', x: 0.14, y: 0.3 },
    ];
    case 'primary_bedroom':
      return twinBeds ? [
        { kind: 'bed', x: 0.3, y: 0.48, width: 1000, depth: 2000, instance: 'left' },
        { kind: 'bed', x: 0.7, y: 0.48, width: 1000, depth: 2000, instance: 'right' },
        { kind: 'wardrobe', x: 0.84, y: 0.5 },
      ] : [
        { kind: 'bed', x: 0.48, y: 0.48, width: 1800, depth: 2000 },
        { kind: 'wardrobe', x: 0.84, y: 0.5 },
      ];
    case 'guest_bedroom': return [
      { kind: 'bed', x: 0.44, y: 0.48, width: 1600, depth: 2000 },
      { kind: 'wardrobe', x: 0.84, y: 0.45 },
    ];
    case 'kids_room': case 'nursery': return [
      { kind: 'bed', x: 0.42, y: 0.48, width: 1000, depth: 2000 },
      { kind: 'wardrobe', x: 0.84, y: 0.45 },
    ];
    case 'home_office': return [{ kind: 'desk', x: 0.5, y: 0.22 }, { kind: 'bookshelf', x: 0.86, y: 0.58 }];
    case 'walk_in_closet': return [
      { kind: 'wardrobe', x: 0.14, y: 0.5, instance: 'left' },
      { kind: 'wardrobe', x: 0.86, y: 0.5, instance: 'right' },
    ];
    case 'bathroom': return bathroomIntents(room, zones);
    case 'powder_room': return [{ kind: 'vanity', x: 0.28, y: 0.22 }, { kind: 'toilet', x: 0.62, y: 0.68 }];
    case 'laundry_room': return [{ kind: 'washer', x: 0.25, y: 0.25 }, { kind: 'storage', x: 0.72, y: 0.2 }];
    case 'pantry': case 'storage':
      return [{ kind: 'storage', x: 0.14, y: 0.5 }];
    case 'entry': case 'mudroom':
      return [{ kind: 'storage', x: 0.12, y: 0.5, width: 900, depth: 300, clearance: 900 }];
    case 'balcony': return [{ kind: 'outdoor_seating', x: 0.5, y: 0.5 }];
    default: return [];
  }
}

function placementCandidates(
  bounds: ReturnType<typeof polygonBounds>,
  preferredX: number,
  preferredY: number,
  preferredSource?: [number, number],
): Array<[number, number]> {
  const candidates: Array<[number, number]> = [
    ...(preferredSource ? [preferredSource] : []),
    [bounds.left + (bounds.right - bounds.left) * preferredX, bounds.top + (bounds.bottom - bounds.top) * preferredY],
    [bounds.left + (bounds.right - bounds.left) * (1 - preferredX), bounds.top + (bounds.bottom - bounds.top) * preferredY],
    [bounds.left + (bounds.right - bounds.left) * preferredX, bounds.top + (bounds.bottom - bounds.top) * (1 - preferredY)],
    [bounds.left + (bounds.right - bounds.left) * (1 - preferredX), bounds.top + (bounds.bottom - bounds.top) * (1 - preferredY)],
    [(bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2],
  ];
  for (const y of [0.2, 0.35, 0.5, 0.65, 0.8]) {
    for (const x of [0.18, 0.32, 0.5, 0.68, 0.82]) {
      candidates.push([
        bounds.left + (bounds.right - bounds.left) * x,
        bounds.top + (bounds.bottom - bounds.top) * y,
      ]);
    }
  }
  return candidates;
}

function placeIntent(
  room: PlanningRoom,
  intent: PlacementIntent,
  scale: ScaleCalibration,
  keepouts: LayoutKeepoutZone[],
  functionalZones: LayoutFunctionalZone[],
  existing: LayoutPlacement[],
): LayoutPlacement | null {
  const bounds = polygonBounds(room.polygon);
  const roomWidthMm = (bounds.right - bounds.left) * scale.millimeters_per_source_x_unit;
  const roomHeightMm = (bounds.bottom - bounds.top) * scale.millimeters_per_source_y_unit;
  const spec = FURNITURE_SPECS[intent.kind];
  const requestedWidth = intent.width ?? spec.width;
  const requestedDepth = intent.depth ?? spec.depth;
  const maxWidth = Math.max(spec.minWidth, roomWidthMm - 500);
  const maxDepth = Math.max(spec.minDepth, roomHeightMm - 500);
  const widthMm = clamp(Math.min(requestedWidth, maxWidth), spec.minWidth, requestedWidth);
  const depthMm = clamp(Math.min(requestedDepth, maxDepth), spec.minDepth, requestedDepth);
  const width = widthMm / scale.millimeters_per_source_x_unit;
  const height = depthMm / scale.millimeters_per_source_y_unit;
  const roomKeepouts = keepouts.filter((zone) => zone.space_refs.length === 0 || zone.space_refs.includes(room.id));
  const functionalZone = intent.zoneKind
    ? functionalZones.find((zone) => zone.space_ref === room.id && zone.kind === intent.zoneKind)
    : undefined;
  const candidateBounds = functionalZone ? polygonBounds(functionalZone.polygon) : bounds;
  for (const [x, y] of placementCandidates(candidateBounds, intent.x, intent.y, intent.preferredSource)) {
    const rectangle = rectangleFor(x, y, width, height);
    if (!polygonContainsRectangle(room.polygon, rectangle)) continue;
    if (functionalZone && !polygonContainsRectangle(functionalZone.polygon, rectangle)) continue;
    if (roomKeepouts.some((zone) => polygonsOverlap(rectangle, zone.polygon))) continue;
    const collision = existing.some((placement) => placement.space_ref === room.id
      && !overlapsAllowed(intent.kind, placement.kind)
      && polygonsOverlap(rectangle, rectangleFor(placement.x, placement.y, placement.width, placement.height)));
    if (collision) continue;
    return {
      id: `placement_${room.id}_${intent.kind}${intent.instance ? `_${intent.instance}` : ''}`,
      space_ref: room.id,
      kind: intent.kind,
      x,
      y,
      width,
      height,
      width_mm: Math.round(widthMm),
      depth_mm: Math.round(depthMm),
      rotation_deg: 0,
      clearance_mm: intent.clearance ?? spec.clearance,
      scale_status: scale.status,
      zone_ref: functionalZone?.id ?? null,
    };
  }
  return null;
}

export function buildLayoutRenderPlan(input: {
  rooms: PlanningRoom[];
  openings: RoomMapOpening[];
  tags?: string[];
  considerations?: string;
  revision?: number;
  sourceAspectRatio?: number;
}): LayoutRenderPlan {
  const scale = calibratePlanScale(input.openings, input.sourceAspectRatio);
  const functionalZones = buildBathroomZones(input.rooms, input.openings, scale);
  const keepoutZones = [
    ...buildOpeningKeepoutZones(input.openings, scale),
    ...buildCirculationKeepoutZones(input.rooms, input.openings, scale),
  ];
  const placements: LayoutPlacement[] = [];
  const issues: string[] = [];
  const warnings: string[] = [];

  for (const room of input.rooms) {
    if (room.polygon.length < 3) {
      issues.push(`${room.id}: no confirmed polygon`);
      continue;
    }
    for (const intent of roomIntents(room, input.tags ?? [], input.considerations ?? '', functionalZones)) {
      const placement = placeIntent(room, intent, scale, keepoutZones, functionalZones, placements);
      if (placement) placements.push(placement);
      else if ((room.functionCode === 'entry' || room.functionCode === 'mudroom') && intent.kind === 'storage') {
        issues.push(`${room.id}: entry storage omitted because it cannot preserve the 900 mm continuous arrival path`);
      } else {
        issues.push(`${room.id}: ${intent.kind} has no collision-free placement at its minimum standard size`);
      }
    }
  }
  if (scale.status === 'unknown') {
    warnings.push('No reliable door segment was available; furniture uses a consistent relative door-unit fallback and metric dimensions are not certified.');
  } else {
    warnings.push(`Furniture scale is estimated from ${scale.reference_entity_ref} using an ${scale.reference_length_mm} mm reference door width.`);
  }

  return {
    schema_version: '1.2',
    geometry_revision: input.revision ?? 1,
    placement_revision: input.revision ?? 1,
    render_strategy: 'source_locked_control_overlay',
    scale,
    keepout_zones: keepoutZones,
    functional_zones: functionalZones,
    placements,
    qa: { status: issues.length === 0 ? 'passed' : 'needs_review', issues, warnings },
  };
}

export function layoutPlanPrompt(plan: LayoutRenderPlan, rooms: PlanningRoom[]): string {
  const labels = new Map(rooms.map((room) => [room.id, room.label]));
  const scaleLine = plan.scale.status === 'estimated'
    ? `Shared scale: ${plan.scale.reference_entity_ref} is treated as ${plan.scale.reference_length_mm} mm (estimated, not measured).`
    : 'Shared scale: relative door-unit fallback; preserve the supplied normalized footprints exactly.';
  const placements = plan.placements.map((placement) =>
    `${labels.get(placement.space_ref) ?? placement.space_ref}: exactly one planned ${placement.kind} instance ${placement.width_mm}x${placement.depth_mm} mm at normalized center ${placement.x.toFixed(3)},${placement.y.toFixed(3)}${placement.zone_ref ? ` within ${placement.zone_ref}` : ''}.`);
  const keepouts = plan.keepout_zones.map((zone) =>
    `${zone.opening_ref ?? zone.id}: ${zone.reason} for ${zone.space_refs.join(', ') || 'adjacent spaces'}, keep ${zone.clearance_mm} mm clear inside polygon ${zone.polygon.map((point) => point.map((coordinate) => coordinate.toFixed(3)).join(',')).join(' / ')}; no furniture, fixture, appliance, or cabinetry may overlap it.`);
  const zones = plan.functional_zones.map((zone) =>
    `${labels.get(zone.space_ref) ?? zone.space_ref}: ${zone.kind} is ${zone.polygon.map((point) => point.map((coordinate) => coordinate.toFixed(3)).join(',')).join(' / ')}; keep the shower or tub inside the wet zone and the vanity plus single toilet in the dry zone.`);
  return [
    'AUTHORITATIVE PRE-GENERATION PLACEMENT PLAN.',
    scaleLine,
    'Use the listed physical dimensions and normalized footprints as hard layout guidance. The control image is the pixel-level placement authority: convert each outlined footprint into exactly one realistic object and remove all guide colors and strokes. Do not enlarge a sofa or bed beyond its planned footprint; use a straight sofa unless an L-sectional is explicitly requested and fits. Never close, move, redraw, or cover a door gap. Never place cabinets, wardrobes, beds, sofas, tables, sanitary fixtures, or appliances in an opening or continuous-circulation keep-out zone.',
    ...placements,
    ...zones,
    ...keepouts,
    ...plan.qa.issues.map((issue) => `Planning warning: ${issue}. Do not fill the unresolved area by blocking an opening.`),
  ].join('\n').slice(0, 4_500);
}
