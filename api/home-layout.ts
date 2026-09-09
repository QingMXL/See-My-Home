import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { put } from '@vercel/blob';
import { ZooworkError } from '@zoowork-ai/sdk';
import { createHmac, timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import type {
  AgentArtifact,
  EvidenceSource,
  HomeAgentResponse,
  HomeModel,
  HomeTurnRequest,
  RoomFunctionCode,
  RoomMapBoundary,
  RoomMapOpening,
  SupportedLocale,
  UiAgentEvent,
} from '../Home-Layout-Agent/src/contracts.js';
import { HomeLayoutRuntime, HomeLayoutTurnTimeoutError } from '../Home-Layout-Agent/src/runtime.js';
import {
  buildLayoutRenderPlan,
  layoutPlanPrompt,
  type LayoutPlacementKind,
  type LayoutRenderPlan,
} from '../Home-Layout-Agent/src/layout-planning.js';
import { renderLayoutControlOverlaySvg } from '../Home-Layout-Agent/src/layout-control.js';
import { assertHomeModel } from '../Home-Layout-Agent/src/validation.js';
import {
  newId,
  objectBody,
  parseLocale,
  persistGeneratedImage,
  privateBlobUrl,
  requestPath,
  requireString,
  sendJson,
  temporaryBlobReadUrl,
} from './_lib/common.js';

export const config = { maxDuration: 300 };

type Polygon = number[][];

interface ConfirmedRoom {
  id: string;
  label: string;
  currentUse: string;
  targetUse: string | null;
  polygon: Polygon;
  functionCode: Exclude<RoomFunctionCode, 'unknown'>;
}

interface ExcludedRegion {
  id: string;
  label: string;
  reason: 'lightwell' | 'double_height' | 'void' | 'shaft' | 'outside_envelope' | 'user_excluded' | 'other';
  polygon: Polygon;
}

interface GenerateInput extends Record<string, unknown> {
  home_id?: unknown;
  locale?: unknown;
  user_message?: unknown;
  rooms?: unknown;
  excluded_regions?: unknown;
  lifestyle_tags?: unknown;
  special_considerations?: unknown;
  source_kind?: unknown;
  file_name?: unknown;
  asset_id?: unknown;
  analysis?: unknown;
}

interface LayoutJob {
  version: 1;
  sessionId: string;
  postedSeq: number;
  requestId: string;
  homeId: string;
  type: 'agent.generate' | 'agent.refine';
  repairAttempt: number;
  controlImageUsed: boolean;
  expiresAt: number;
}

const roomCodes = new Set<RoomFunctionCode>([
  'living_room', 'family_room', 'dining_room', 'kitchen', 'primary_bedroom', 'guest_bedroom',
  'kids_room', 'nursery', 'home_office', 'walk_in_closet', 'bathroom', 'powder_room',
  'laundry_room', 'pantry', 'mudroom', 'entry', 'balcony', 'den', 'storage', 'garage',
  'home_theater', 'fitness_room', 'game_room', 'other', 'unknown',
]);

function runtime(): HomeLayoutRuntime {
  const agentId = process.env.ZOOWORK_AGENT_ID?.trim();
  if (!agentId) throw new Error('ZOOWORK_AGENT_ID is not configured on Vercel');
  return HomeLayoutRuntime.fromEnvironment({ agentId, turnTimeoutMs: 760_000 });
}

function jobSecret(): string {
  const value = process.env.ZOOWORK_API_KEY?.trim();
  if (!value) throw new Error('ZOOWORK_API_KEY is not configured on Vercel');
  return value;
}

function signJob(job: LayoutJob): string {
  const payload = Buffer.from(JSON.stringify(job), 'utf8').toString('base64url');
  const signature = createHmac('sha256', jobSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyJob(value: unknown): LayoutJob | null {
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
  if (
    job.version !== 1
    || typeof job.sessionId !== 'string'
    || typeof job.postedSeq !== 'number'
    || !Number.isSafeInteger(job.postedSeq)
    || job.postedSeq < 0
    || typeof job.requestId !== 'string'
    || typeof job.homeId !== 'string'
    || (job.type !== 'agent.generate' && job.type !== 'agent.refine')
    || typeof job.repairAttempt !== 'number'
    || !Number.isSafeInteger(job.repairAttempt)
    || job.repairAttempt < 0
    || typeof job.controlImageUsed !== 'boolean'
    || typeof job.expiresAt !== 'number'
    || job.expiresAt < Date.now()
  ) throw new Error('job_token is invalid or expired');
  return job as unknown as LayoutJob;
}

function safeFileName(value: string): string {
  const cleaned = value.replace(/[\\/\u0000-\u001f\u007f]/g, '-').trim();
  if (!cleaned || cleaned.length > 180) throw new Error('Invalid upload filename');
  return cleaned;
}

async function uploadToken(request: VercelRequest, response: VercelResponse): Promise<void> {
  const result = await handleUpload({
    request,
    body: objectBody(request.body) as unknown as HandleUploadBody,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const payload = objectBody(JSON.parse(clientPayload ?? '{}'));
      const projectId = requireString(payload.project_id, 'project_id');
      const expected = `uploads/layout/${encodeURIComponent(projectId)}/`;
      if (!pathname.startsWith(expected)) throw new Error('Upload pathname does not match project_id');
      return {
        allowedContentTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        maximumSizeInBytes: 15 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ kind: 'layout', project_id: projectId }),
      };
    },
  });
  sendJson(response, 200, result);
}

function polygon(value: unknown, field: string): Polygon {
  if (!Array.isArray(value) || value.length < 3 || value.some((point) =>
    !Array.isArray(point) || point.length !== 2 || point.some((coordinate) =>
      typeof coordinate !== 'number' || !Number.isFinite(coordinate) || coordinate < 0 || coordinate > 1))) {
    throw new Error(`${field} must be a normalized polygon with at least three points`);
  }
  return value as Polygon;
}

function confirmedInput(input: GenerateInput): {
  homeId: string;
  locale: SupportedLocale;
  rooms: ConfirmedRoom[];
  excluded: ExcludedRegion[];
  tags: string[];
  considerations: string;
  sourceUrl: string | null;
  fileName: string;
  boundaries: RoomMapBoundary[];
  openings: RoomMapOpening[];
  questions: HomeAgentResponse['questions'];
  warnings: string[];
  sourceAspectRatio: number;
} {
  const homeId = requireString(input.home_id, 'home_id');
  const locale = parseLocale(input.locale);
  if (!Array.isArray(input.rooms) || input.rooms.length === 0) throw new Error('rooms must contain confirmed rooms');
  const rooms = input.rooms.map((candidate, index): ConfirmedRoom => {
    const room = objectBody(candidate);
    if (room.function_confirmed !== true) throw new Error(`rooms[${index}].function_confirmed must be true`);
    if (room.boundary_confirmed !== true) throw new Error(`rooms[${index}].boundary_confirmed must be true`);
    const code = requireString(room.function_code, `rooms[${index}].function_code`) as RoomFunctionCode;
    if (!roomCodes.has(code) || code === 'unknown') throw new Error(`rooms[${index}] needs a confirmed function`);
    const source = objectBody(room.source_geometry);
    if (source.kind !== 'polygon') throw new Error(`rooms[${index}].source_geometry.kind must be polygon`);
    const label = requireString(room.label, `rooms[${index}].label`);
    return {
      id: requireString(room.id, `rooms[${index}].id`),
      label,
      currentUse: typeof room.current_use === 'string' && room.current_use.trim() ? room.current_use.trim() : label,
      targetUse: typeof room.target_use === 'string' && room.target_use.trim() ? room.target_use.trim() : null,
      polygon: polygon(source.coordinates, `rooms[${index}].source_geometry.coordinates`),
      functionCode: code as Exclude<RoomFunctionCode, 'unknown'>,
    };
  });
  const excluded = Array.isArray(input.excluded_regions) ? input.excluded_regions.map((candidate, index): ExcludedRegion => {
    const region = objectBody(candidate);
    const source = objectBody(region.source_geometry);
    const reason = requireString(region.reason, `excluded_regions[${index}].reason`) as ExcludedRegion['reason'];
    if (!['lightwell', 'double_height', 'void', 'shaft', 'outside_envelope', 'user_excluded', 'other'].includes(reason)) {
      throw new Error(`excluded_regions[${index}].reason is invalid`);
    }
    return {
      id: requireString(region.id, `excluded_regions[${index}].id`),
      label: requireString(region.label, `excluded_regions[${index}].label`),
      reason,
      polygon: polygon(source.coordinates, `excluded_regions[${index}].source_geometry.coordinates`),
    };
  }) : [];
  if (!Array.isArray(input.lifestyle_tags) || input.lifestyle_tags.some((tag) => typeof tag !== 'string')) {
    throw new Error('lifestyle_tags must be an array of strings');
  }
  const sourceUrl = input.source_kind === 'uploaded_analyzed' ? privateBlobUrl(input.asset_id, 'layout', homeId) : null;
  const analysis = typeof input.analysis === 'object' && input.analysis !== null && !Array.isArray(input.analysis)
    ? input.analysis as Record<string, unknown>
    : {};
  return {
    homeId,
    locale,
    rooms,
    excluded,
    tags: (input.lifestyle_tags as string[]).map((tag) => tag.trim()).filter(Boolean).slice(0, 20),
    considerations: typeof input.special_considerations === 'string' ? input.special_considerations.trim().slice(0, 2_000) : '',
    sourceUrl,
    fileName: typeof input.file_name === 'string' && input.file_name.trim() ? input.file_name.trim() : 'Floor plan',
    boundaries: Array.isArray(analysis.boundaries) ? analysis.boundaries as RoomMapBoundary[] : [],
    openings: Array.isArray(analysis.openings) ? analysis.openings as RoomMapOpening[] : [],
    questions: Array.isArray(analysis.questions) ? analysis.questions as HomeAgentResponse['questions'] : [],
    warnings: Array.isArray(analysis.warnings) ? analysis.warnings.filter((item): item is string => typeof item === 'string') : [],
    sourceAspectRatio: typeof analysis.source_aspect_ratio === 'number' && Number.isFinite(analysis.source_aspect_ratio) && analysis.source_aspect_ratio > 0
      ? Math.max(0.25, Math.min(4, analysis.source_aspect_ratio))
      : 1,
  };
}

async function readSourceAspectRatio(sourceUrl: string): Promise<number> {
  try {
    const source = await fetch(sourceUrl, { signal: AbortSignal.timeout(5_000) });
    if (!source.ok) return 1;
    const metadata = await sharp(Buffer.from(await source.arrayBuffer()), { pages: 1 }).metadata();
    return metadata.width && metadata.height
      ? Math.max(0.25, Math.min(4, metadata.width / metadata.height))
      : 1;
  } catch {
    return 1;
  }
}

async function createLayoutControlImage(input: {
  sourceUrl: string;
  homeId: string;
  requestId: string;
  plan: LayoutRenderPlan;
  rooms: ConfirmedRoom[];
  openings: RoomMapOpening[];
}): Promise<{ assetRef: string; width: number; height: number }> {
  const upstream = await fetch(input.sourceUrl, { signal: AbortSignal.timeout(15_000) });
  if (!upstream.ok) throw new Error(`Source plan download failed while building control image (${upstream.status})`);
  const sourceBytes = Buffer.from(await upstream.arrayBuffer());
  if (sourceBytes.byteLength === 0) throw new Error('Source plan is empty');
  const normalized = await sharp(sourceBytes, { pages: 1 })
    .rotate()
    .resize({ width: 2_200, height: 2_200, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });
  const overlay = renderLayoutControlOverlaySvg({
    width: normalized.info.width,
    height: normalized.info.height,
    plan: input.plan,
    rooms: input.rooms,
    openings: input.openings,
  });
  const controlBytes = await sharp(normalized.data)
    .composite([{ input: Buffer.from(overlay, 'utf8'), blend: 'over' }])
    .png({ compressionLevel: 8 })
    .toBuffer();
  const blob = await put(
    `controls/layout/${encodeURIComponent(input.homeId)}/${encodeURIComponent(input.requestId)}.png`,
    controlBytes,
    { access: 'private', addRandomSuffix: true, contentType: 'image/png', cacheControlMaxAge: 86_400 },
  );
  return {
    assetRef: await temporaryBlobReadUrl(blob.url),
    width: normalized.info.width,
    height: normalized.info.height,
  };
}

function architecturalType(code: ConfirmedRoom['functionCode']): string {
  if (['living_room', 'family_room', 'den', 'home_theater', 'game_room'].includes(code)) return 'living_room';
  if (code === 'kitchen') return 'kitchen';
  if (code === 'dining_room') return 'dining';
  if (code.includes('bedroom') || code === 'kids_room' || code === 'nursery') return 'bedroom';
  if (code === 'bathroom' || code === 'powder_room') return 'bathroom';
  if (code === 'entry' || code === 'mudroom') return 'entry';
  if (code === 'balcony') return 'balcony';
  if (code === 'walk_in_closet' || code === 'storage' || code === 'pantry') return 'storage';
  if (code === 'laundry_room' || code === 'garage') return 'utility';
  if (code === 'home_office') return 'work_area';
  return 'other';
}

function roomProgram(code: ConfirmedRoom['functionCode']): { baseline: string[]; counts: Array<{ object: string; min_count: number; max_count: number }>; conditional: Array<{ object: string; condition: string }> } {
  const conditional: Array<{ object: string; condition: string }> = [];
  switch (code) {
    case 'living_room': case 'family_room': return { baseline: ['ambient_lighting'], counts: [{ object: 'sofa', min_count: 1, max_count: 1 }, { object: 'television_or_media_wall', min_count: 1, max_count: 1 }], conditional: [{ object: 'coffee_table', condition: 'Only when circulation remains comfortable.' }] };
    case 'kitchen': return { baseline: ['kitchen_cabinetry'], counts: [{ object: 'sink', min_count: 1, max_count: 1 }, { object: 'cooktop', min_count: 1, max_count: 1 }, { object: 'refrigerator', min_count: 1, max_count: 1 }], conditional: [{ object: 'kitchen_island', condition: 'Only when safe circulation remains on all working sides.' }] };
    case 'dining_room': return { baseline: ['dining_table', 'dining_seating', 'dining_lighting'], counts: [{ object: 'dining_table', min_count: 1, max_count: 1 }], conditional };
    case 'primary_bedroom': case 'guest_bedroom': case 'kids_room': case 'nursery': return { baseline: ['bedside_access', 'clothing_storage'], counts: [{ object: 'bed', min_count: 1, max_count: 1 }], conditional };
    case 'bathroom': return { baseline: [], counts: [{ object: 'toilet', min_count: 1, max_count: 1 }, { object: 'sink_or_vanity', min_count: 1, max_count: 1 }, { object: 'shower_or_tub_zone', min_count: 1, max_count: 1 }], conditional: [{ object: 'bathtub', condition: 'Only when visible geometry and user preference support it.' }] };
    case 'powder_room': return { baseline: [], counts: [{ object: 'toilet', min_count: 1, max_count: 1 }, { object: 'sink_or_vanity', min_count: 1, max_count: 1 }], conditional };
    case 'walk_in_closet': return { baseline: ['wardrobe_storage', 'shelving'], counts: [], conditional };
    case 'home_office': return { baseline: ['desk_or_computer_work_surface', 'task_chair', 'bookshelf_or_file_storage'], counts: [{ object: 'desk_or_computer_work_surface', min_count: 1, max_count: 1 }], conditional };
    case 'entry': return { baseline: ['entry_drop_zone'], counts: [], conditional: [{ object: 'shoe_and_coat_storage', condition: 'Only when entry circulation stays clear.' }] };
    case 'balcony': return { baseline: ['weather_appropriate_floor_finish'], counts: [], conditional: [{ object: 'outdoor_seating', condition: 'Only when balcony depth supports safe access.' }] };
    default: return { baseline: [], counts: [], conditional };
  }
}

function plannedObjectKind(kind: LayoutPlacementKind): 'furniture' | 'fixture' | 'cabinetry' | 'appliance' | 'other' {
  if (['sofa', 'coffee_table', 'dining_table', 'bed', 'desk', 'bookshelf', 'outdoor_seating'].includes(kind)) return 'furniture';
  if (['toilet', 'vanity', 'shower', 'bathtub', 'sink'].includes(kind)) return 'fixture';
  if (['wardrobe', 'counter', 'storage', 'tv'].includes(kind)) return 'cabinetry';
  if (['cooktop', 'refrigerator', 'washer'].includes(kind)) return 'appliance';
  return 'other';
}

function placementPolygon(placement: LayoutRenderPlan['placements'][number]): number[][] {
  return [
    [placement.x - placement.width / 2, placement.y - placement.height / 2],
    [placement.x + placement.width / 2, placement.y - placement.height / 2],
    [placement.x + placement.width / 2, placement.y + placement.height / 2],
    [placement.x - placement.width / 2, placement.y + placement.height / 2],
  ].map(([x, y]) => [Math.max(0, Math.min(1, x ?? 0)), Math.max(0, Math.min(1, y ?? 0))]);
}

function metricPlacementPolygon(placement: LayoutRenderPlan['placements'][number], plan: LayoutRenderPlan): number[][] {
  return placementPolygon(placement).map(([x = 0, y = 0]) => [
    Math.round(x * plan.scale.millimeters_per_source_x_unit),
    Math.round((1 - y) * plan.scale.millimeters_per_source_y_unit),
  ]);
}

function buildHomeModel(
  value: ReturnType<typeof confirmedInput>,
  plan: LayoutRenderPlan,
  controlImage?: { assetRef: string; width: number; height: number } | null,
): HomeModel {
  const timestamp = new Date().toISOString();
  const sourceId = 'src_floor_plan_001';
  const confirmationId = 'src_confirmation_001';
  const floorId = 'floor_main_001';
  const model: HomeModel = {
    schema_version: '2.0', home_id: value.homeId, model_revision: 1, status: 'confirmed_enough', locale: value.locale,
    measurement_policy: { system: 'metric', linear_storage: 'mm', area_storage: 'm2', us_listing_area_display: 'sq_ft_secondary' },
    coordinate_system: { type: 'local_plan_2d', unit: 'mm', origin: 'floor_envelope_bottom_left', x_axis: 'right', y_axis: 'up', north_angle_deg: null },
    scale: {
      status: plan.scale.status,
      millimeters_per_source_unit: plan.scale.millimeters_per_source_unit,
      source_ref: plan.scale.reference_entity_ref ? sourceId : null,
      basis: plan.scale.basis,
      reference_entity_ref: plan.scale.reference_entity_ref,
      reference_length_mm: plan.scale.reference_length_mm,
      millimeters_per_source_x_unit: plan.scale.millimeters_per_source_x_unit,
      millimeters_per_source_y_unit: plan.scale.millimeters_per_source_y_unit,
      source_aspect_ratio: plan.scale.source_aspect_ratio,
      confidence: plan.scale.confidence,
    },
    sources: [
      { id: sourceId, kind: 'floor_plan', label: value.fileName, asset_ref: value.sourceUrl, provider_model: 'zoowork:imageModel', received_at: timestamp },
      ...(controlImage ? [{
        id: 'src_layout_control_001',
        kind: 'vision_model_output',
        label: 'Deterministic source-locked furniture and circulation control image',
        asset_ref: controlImage.assetRef,
        provider_model: 'see-my-home:control-renderer-v1',
        received_at: timestamp,
      }] : []),
      { id: confirmationId, kind: 'user_correction', label: 'User-confirmed room functions and boundaries', asset_ref: null, provider_model: null, received_at: timestamp },
    ],
    floors: [{ id: floorId, label: 'Main floor', level_index: 0, state: 'user_confirmed', confidence: 1, source_refs: [sourceId, confirmationId] }],
    spaces: value.rooms.map((room) => ({ id: room.id, floor_ref: floorId, label: room.label, architectural_type: architecturalType(room.functionCode), actual_uses: [room.currentUse], geometry: { metric: null, source_geometries: [{ source_ref: sourceId, coordinate_space: 'image_normalized_0_1', kind: 'polygon', coordinates: room.polygon, confidence: 1 }] }, area_m2: null, state: 'user_confirmed', confidence: 1, source_refs: [sourceId, confirmationId] })),
    excluded_regions: value.excluded.map((region) => ({ id: region.id, label: region.label, reason: region.reason, geometry: { metric: null, source_geometries: [{ source_ref: sourceId, coordinate_space: 'image_normalized_0_1', kind: 'polygon', coordinates: region.polygon, confidence: 1 }] }, state: 'user_confirmed', confidence: 1, source_refs: [sourceId, confirmationId] })),
    room_programs: value.rooms.map((room) => { const program = roomProgram(room.functionCode); return { space_ref: room.id, function_code: room.functionCode, baseline_objects: program.baseline, conditional_objects: program.conditional, default_object_counts: program.counts, user_overrides: { include_objects: [], exclude_objects: [], replace_objects: [] }, status: 'system_default', source_refs: [confirmationId] }; }),
    boundaries: value.boundaries.map((boundary) => ({ id: boundary.id, kind: boundary.kind === 'exterior' ? 'exterior_edge' : boundary.kind, between_refs: boundary.separates_space_ids, geometry: { metric: null, source_geometries: [{ source_ref: sourceId, coordinate_space: 'image_normalized_0_1', kind: 'polyline', coordinates: boundary.path, confidence: boundary.confidence }] }, structural_status: 'unknown', state: 'user_confirmed', confidence: boundary.confidence, source_refs: [sourceId, confirmationId] })),
    openings: value.openings.map((opening) => {
      const sourceCoordinates = opening.segment ?? [opening.position];
      const widthMm = opening.segment ? Math.round(Math.hypot(
        (opening.segment[1][0] - opening.segment[0][0]) * plan.scale.millimeters_per_source_x_unit,
        (opening.segment[1][1] - opening.segment[0][1]) * plan.scale.millimeters_per_source_y_unit,
      )) : null;
      return {
        id: opening.id, kind: opening.kind, connects_refs: opening.connects_space_ids,
        geometry: { metric: null, source_geometries: [{ source_ref: sourceId, coordinate_space: 'image_normalized_0_1', kind: opening.segment ? 'polyline' : 'point', coordinates: sourceCoordinates, confidence: opening.confidence }] },
        width_mm: widthMm,
        swing_or_orientation: opening.swing ? `${opening.swing.direction}:${opening.swing.opens_into_space_id ?? 'unknown'}` : opening.door_type,
        state: 'inferred', confidence: opening.confidence, source_refs: [sourceId],
      };
    }),
    objects: plan.placements.map((placement) => ({
      id: placement.id,
      kind: plannedObjectKind(placement.kind),
      label: `${placement.kind} ${placement.width_mm}x${placement.depth_mm} mm`,
      space_ref: placement.space_ref,
      geometry: {
        metric: plan.scale.status === 'unknown' ? null : {
          kind: 'polygon', floor_ref: floorId, coordinate_space: 'local_plan_2d', unit: 'mm',
          coordinates: metricPlacementPolygon(placement, plan), precision: 'estimated',
        },
        source_geometries: [{ source_ref: sourceId, coordinate_space: 'image_normalized_0_1', kind: 'polygon', coordinates: placementPolygon(placement), confidence: 0.82 }],
      },
      retention: 'replaceable', fixed: 'no', state: 'inferred', confidence: 0.82,
      source_refs: [sourceId, confirmationId],
    })), relationships: plan.placements.flatMap((placement) => placement.kind === 'sofa' && placement.faces_ref ? [{
      id: `relationship_${placement.id}_visible_to_${placement.faces_ref}`,
      type: 'visible_to' as const,
      from_ref: placement.id,
      to_ref: placement.faces_ref,
      state: 'inferred' as const,
      confidence: 0.9,
      source_refs: [sourceId, confirmationId],
    }] : []),
    living_patterns: [
      ...value.tags.map((tag, index) => ({ id: `pattern_priority_${index + 1}`, statement: tag, space_refs: [], frequency: 'unknown', priority: 'high', state: 'user_confirmed', confidence: 1, source_refs: [confirmationId] })),
      ...(value.considerations ? [{ id: 'pattern_special_considerations', statement: value.considerations, space_refs: [], frequency: 'unknown', priority: 'high', state: 'user_confirmed', confidence: 1, source_refs: [confirmationId] }] : []),
      ...value.rooms.flatMap((room, index) => room.targetUse ? [{ id: `pattern_target_${index + 1}`, statement: `${room.label} target use: ${room.targetUse}`, space_refs: [room.id], frequency: 'daily', priority: 'high', state: 'user_confirmed', confidence: 1, source_refs: [confirmationId] }] : []),
    ],
    constraints: [
      ...value.excluded.map((region, index) => ({ id: `constraint_excluded_${index + 1}`, category: 'physical', statement: `${region.label} is excluded from furnishing and room programming (${region.reason}).`, strength: 'hard', status: 'active', state: 'user_confirmed', confidence: 1, source_refs: [sourceId, confirmationId] })),
      ...plan.keepout_zones.map((zone, index) => ({ id: `constraint_keepout_${index + 1}`, category: 'physical', statement: `${zone.opening_ref ?? zone.id} has a ${zone.reason} keep-out zone of ${zone.clearance_mm} mm in ${zone.space_refs.join(', ') || 'adjacent spaces'}; no furniture, fixtures, appliances, or cabinetry may overlap it.`, strength: 'hard', status: 'active', state: 'inferred', confidence: plan.scale.confidence, source_refs: [sourceId] })),
      ...plan.functional_zones.map((zone, index) => ({ id: `constraint_functional_zone_${index + 1}`, category: 'physical', statement: `${zone.space_ref} uses ${zone.kind}; the single shower or tub remains in the wet zone and the single toilet plus vanity remain in the dry zone.`, strength: 'hard', status: 'active', state: 'inferred', confidence: plan.scale.confidence, source_refs: [sourceId] })),
    ],
    problems: [], opportunities: [],
    open_questions: value.questions.map((question) => ({ ...question, status: 'open' })),
    change_log: [{ revision: 1, timestamp, summary: 'Committed user-confirmed room functions, polygons, openings, and excluded regions.', changed_ids: [...value.rooms.map((room) => room.id), ...value.excluded.map((region) => region.id)], source_refs: [sourceId, confirmationId] }],
  };
  assertHomeModel(model);
  return model;
}

function statementSource(message: string, suffix: string): EvidenceSource {
  return { source_id: `src_user_${suffix}`, kind: 'user_statement', label: 'User project brief', facts: [{ id: `fact_user_${suffix}`, subject_ref: 'home_subject', predicate: 'user_statement', value: message, epistemic_state: 'user_confirmed', confidence: 1 }] };
}

async function analyze(request: VercelRequest, response: VercelResponse): Promise<void> {
  const input = objectBody(request.body);
  const projectId = requireString(input.project_id, 'project_id');
  const locale = parseLocale(input.locale);
  const blobUrl = privateBlobUrl(input.asset_id, 'layout', projectId);
  const sourceUrl = await temporaryBlobReadUrl(blobUrl);
  const sourceAspectRatioPromise = readSourceAspectRatio(sourceUrl);
  const brief = typeof input.project_brief === 'string' && input.project_brief.trim()
    ? input.project_brief.trim()
    : locale === 'zh-CN' ? '请识别每个房间、精确边界、门窗以及需要排除的采光井、挑空、架空和管井。' : 'Identify every room, its exact boundary, openings, and any light wells, voids, double-height or service-shaft regions that should be excluded.';
  const requestId = newId('req');
  const zoo = runtime();
  await zoo.ensureRunning();
  const conversation = await zoo.createConversation(projectId, newId(`layout_analysis_${projectId}`));
  const turn: HomeTurnRequest = {
    schema_version: '1.0', request_id: requestId, home_id: projectId, operation: 'intake', locale,
    user_message: brief,
    evidence: [{ source_id: `src_visual_${requestId}`, kind: 'floor_plan', label: decodeURIComponent(new URL(sourceUrl).pathname.split('/').at(-1) ?? 'Floor plan'), asset_ref: sourceUrl, facts: [] }, statementSource(brief, requestId)],
  };
  const [result, sourceAspectRatio] = await Promise.all([
    zoo.runRoomMapTurn(conversation, turn, { type: 'project.create', project_id: projectId }),
    sourceAspectRatioPromise,
  ]);
  sendJson(response, 200, {
    project_id: projectId, session_id: conversation.sessionId, event: 'project.create', asset_id: sourceUrl,
    image_processing_status: 'analyzed_by_agent', provider_model: 'zoowork:imageModel', summary: result.response.summary,
    rooms: result.response.spaces.filter((space) => space.planning_status !== 'excluded'),
    excluded_regions: result.response.spaces.filter((space) => space.planning_status === 'excluded'),
    boundaries: result.response.boundaries, openings: result.response.openings, questions: result.response.questions,
    extracted_text: [], warnings: result.response.warnings, source_aspect_ratio: sourceAspectRatio,
  });
}

function visualizationRequest(
  value: ReturnType<typeof confirmedInput>,
  plan: LayoutRenderPlan,
  message: string,
  type: 'agent.generate' | 'agent.refine',
  requestId = newId('req'),
  hasControlImage = false,
): HomeTurnRequest {
  const controlPolicy = hasControlImage
    ? 'Use sources[src_layout_control_001].asset_ref as the image_generate image reference. It is the original plan with deterministic opening, circulation, wet/dry-zone, material-boundary, view-axis, and furniture-footprint guides. Cyan segments mark immutable door gaps or open passages; thinner blue segments mark immutable windows. Convert each uniquely shaped furniture footprint into exactly one realistic top-down object. The purple dashed axis connects the single sofa to the single television/media target; keep that viewing relationship unobstructed. Confine every floor finish to its outlined material polygon. Then remove every colored guide, dashed line, tint, and control stroke from the final pixels. Cross-check sources[src_floor_plan_001] for immutable walls and openings.'
    : 'Use sources[src_floor_plan_001].asset_ref as the image_generate image reference and follow the normalized placement plan exactly.';
  const renderPolicy = `${controlPolicy} Preserve every confirmed polygon, wall, column, door, opening, and window from the source plan. Door gaps and open passages are immutable negative space: never close, move, redraw, cover, or place cabinetry across them. Keep excluded regions outside furnishing and finishes. Generate one new label-free colorized floor plan with realistic furniture, sanitary fixtures, appliances, flooring, and material textures. Use only Banana Pro and Image 2 through ZooWork; prefer Banana Pro for geometry-preserving image-to-image work and Image 2 as the clean-plan fallback. The authoritative placement manifest is the sole resolved object instance list. Room-program baseline and count names describe those same instances and must never create additional copies. Render every placement ID exactly once and do not invent unlisted primary furniture, fixtures, appliances, televisions, or sinks. Treat the television plus optional low console as one media target with exactly one screen. Keep each bed at its planned metric footprint and preserve its visual ratio to the 850 mm reference door. In every full bathroom render exactly one toilet and exactly one vanity in the dry zone plus exactly one shower or tub in the wet zone. In every kitchen render exactly one sink, one visibly recognizable cooktop, and one refrigerator along the planned work run. Assess only circulation, function, adjacency, privacy, daylight, storage demand, activity conflict, and underused space. Publish every readable raster even if it has quality warnings; only a missing, corrupt, empty, or unreadable image may remain unpublished. This is a ${type} turn.`;
  const userMessage = `${message.trim().slice(0, 1_800)}\n\n${renderPolicy}\n\n${layoutPlanPrompt(plan, value.rooms)}`.slice(0, 8_000);
  return {
    schema_version: '1.0', request_id: requestId, home_id: value.homeId, operation: 'visualize', locale: value.locale,
    user_message: userMessage,
    evidence: [],
    visualization_request: { mode: 'colorized_plan', selected_entity_refs: value.rooms.map((room) => room.id), style_direction: 'Source-referenced, geometry-locked, label-free colorized floor plan with realistic furniture and restrained material textures. Do not add text, labels, legends, dimensions, numbers, or pseudo-glyphs.' },
  };
}

async function generatedPayload(zoo: HomeLayoutRuntime, artifact: AgentArtifact | undefined, value: ReturnType<typeof confirmedInput>, requestId: string) {
  if (!artifact) return null;
  const signedUrl = await zoo.resolveArtifactUrl(artifact.artifactId);
  const stored = await persistGeneratedImage({ signedUrl, kind: 'layout', projectId: value.homeId, requestId, artifactId: artifact.artifactId, contentType: artifact.contentType, fileName: artifact.fileName, size: artifact.size });
  return { ...stored, provider_model: 'Banana Pro / Image 2 via ZooWork', note: null };
}

async function generate(request: VercelRequest, response: VercelResponse, type: 'agent.generate' | 'agent.refine'): Promise<void> {
  const body = objectBody(request.body);
  const job = verifyJob(body.job_token);
  const source = type === 'agent.refine'
    ? objectBody(body.base_input) as GenerateInput
    : (() => {
      const input = { ...body };
      delete input.job_token;
      return input as GenerateInput;
    })();
  if (type === 'agent.refine') {
    source.locale = body.locale;
    source.user_message = requireString(body.user_message, 'user_message');
  }
  const value = confirmedInput(source);
  if (job && (job.homeId !== value.homeId || job.type !== type)) throw new Error('job_token does not match this request');
  if (!job && value.sourceUrl) value.sourceUrl = await temporaryBlobReadUrl(value.sourceUrl);
  const plan = buildLayoutRenderPlan({ rooms: value.rooms, openings: value.openings, tags: value.tags, considerations: value.considerations, sourceAspectRatio: value.sourceAspectRatio });
  const defaultMessage = `Generate the layout. Priorities: ${value.tags.join(', ') || 'none specified'}. Special considerations: ${value.considerations || 'none specified'}.`;
  const message = typeof source.user_message === 'string' && source.user_message.trim() ? source.user_message.trim() : defaultMessage;
  const zoo = runtime();
  const requestId = job?.requestId ?? newId('req');
  let controlImage: { assetRef: string; width: number; height: number } | null = null;
  if (!job && value.sourceUrl) {
    try {
      controlImage = await createLayoutControlImage({
        sourceUrl: value.sourceUrl,
        homeId: value.homeId,
        requestId,
        plan,
        rooms: value.rooms,
        openings: value.openings,
      });
    } catch (error) {
      plan.qa.warnings.push(`Control image unavailable; generation will use the original source and structured plan only: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const model = buildHomeModel(value, plan, controlImage);
  const turn = visualizationRequest(value, plan, message, type, requestId, controlImage !== null);
  const event: UiAgentEvent = { type, project_id: value.homeId, mode: 'layout' };
  if (!job) {
    await zoo.ensureRunning();
    const conversation = await zoo.createConversation(value.homeId, newId(`layout_${type === 'agent.refine' ? 'refine' : 'generate'}_${value.homeId}`));
    const started = await zoo.startStructuredTurn(conversation, turn, model, event);
    sendJson(response, 202, {
      status: 'processing',
      job_token: signJob({
        version: 1,
        sessionId: conversation.sessionId,
        postedSeq: started.postedSeq,
        requestId,
        homeId: value.homeId,
        type,
        repairAttempt: started.repairAttempt,
        controlImageUsed: controlImage !== null,
        expiresAt: Date.now() + 30 * 60 * 1000,
      }),
      poll_after_ms: 3_000,
    });
    return;
  }

  const conversation = { agentId: zoo.agentId, sessionId: job.sessionId };
  const polled = await zoo.pollStructuredTurn(conversation, turn, model, job.postedSeq, job.repairAttempt);
  if (polled.status === 'processing') {
    sendJson(response, 202, {
      status: 'processing',
      job_token: signJob({ ...job, postedSeq: polled.postedSeq, repairAttempt: polled.repairAttempt }),
      poll_after_ms: 3_000,
    });
    return;
  }

  const result = polled.result;
  const imageArtifact = result.artifacts.find((artifact) => artifact.status === 'ready' && (artifact.contentType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(artifact.fileName ?? '')));
  const generatedImage = await generatedPayload(zoo, imageArtifact, value, turn.request_id);
  if (value.sourceUrl) value.sourceUrl = await temporaryBlobReadUrl(privateBlobUrl(source.asset_id, 'layout', value.homeId));
  const responseModel = buildHomeModel(value, plan);
  const intake: HomeAgentResponse = {
    schema_version: '1.0', request_id: turn.request_id, home_id: value.homeId, operation: 'correct', status: 'completed', locale: value.locale,
    message: type === 'agent.refine' ? 'The confirmed geometry and room functions were preserved for this refinement.' : 'The confirmed room map was committed to the Home Model.',
    home_model: responseModel, diagnosis: null, visualization_brief: null, questions: value.questions, warnings: value.warnings,
  };
  const spaceRefs = new Set(value.rooms.map((room) => room.id));
  const diagnosis = result.response.diagnosis;
  if (diagnosis && Array.isArray(diagnosis.assessment_items)) {
    diagnosis.assessment_items = diagnosis.assessment_items.filter((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
      const refs = (item as { affects_refs?: unknown }).affects_refs;
      return Array.isArray(refs) && refs.length > 0 && refs.every((ref) => typeof ref === 'string' && spaceRefs.has(ref));
    }).slice(0, 5);
  }
  if (!generatedImage) result.response.warnings.push('The Agent completed without a readable published raster artifact; the confirmed geometry fallback remains available.');
  sendJson(response, 200, {
    session_id: conversation.sessionId, image_processing_status: value.sourceUrl ? 'analyzed' : 'sample_geometry',
    intake, diagnosis: result.response, visualization: result.response, generated_image: generatedImage,
    render_plan: plan, event_trace: type === 'agent.refine' ? ['agent.refine'] : ['room_map.confirm', 'agent.generate'],
    render_trace: {
      structured_plan: plan.qa.status,
      control_image: job.controlImageUsed ? 'used' : 'unavailable',
      final_image: generatedImage ? 'published' : 'missing',
    },
    request_context: source,
  });
}

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const path = requestPath(request.query.path);
    if (request.method === 'GET' && path === 'health') {
      sendJson(response, 200, { ok: true, runtime: 'vercel', storage: 'vercel-blob', image_routes: ['Banana Pro', 'Image 2'], extra_image_provider_key_required: false });
      return;
    }
    if (request.method !== 'POST') { sendJson(response, 405, { error: 'Method not allowed' }); return; }
    if (path === 'upload') { await uploadToken(request, response); return; }
    if (path === 'events/project.create') { await analyze(request, response); return; }
    if (path === 'events/agent.generate') { await generate(request, response, 'agent.generate'); return; }
    if (path === 'events/agent.refine') { await generate(request, response, 'agent.refine'); return; }
    if (path === 'reset') { sendJson(response, 200, { reset: true }); return; }
    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    console.error('[home-layout]', error);
    const status = error instanceof HomeLayoutTurnTimeoutError ? 504 : error instanceof ZooworkError && error.status >= 500 ? 502 : 400;
    sendJson(response, status, { error: error instanceof Error ? error.message : String(error) });
  }
}
