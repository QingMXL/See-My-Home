import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLayoutRenderPlan, calibratePlanScale } from '../src/layout-planning.js';
import type { RoomMapOpening } from '../src/contracts.js';

function door(overrides: Partial<RoomMapOpening> = {}): RoomMapOpening {
  return {
    id: 'opening_entry_001',
    kind: 'door',
    position: [0.15, 0.1],
    segment: [[0.1, 0.1], [0.2, 0.1]],
    boundary_ref: 'boundary_exterior_001',
    door_type: 'entry',
    swing: null,
    connects_space_ids: ['space_entry_001'],
    confidence: 0.9,
    ...overrides,
  };
}

function bounds(polygon: number[][]) {
  const xs = polygon.map(([x = 0]) => x);
  const ys = polygon.map(([, y = 0]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

function overlaps(left: ReturnType<typeof bounds>, right: ReturnType<typeof bounds>): boolean {
  return left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
}

test('calibrates both normalized axes from one 850 mm door reference', () => {
  const scale = calibratePlanScale([door()], 2);
  assert.equal(scale.status, 'estimated');
  assert.equal(scale.reference_length_mm, 850);
  assert.equal(Math.round(0.1 * scale.millimeters_per_source_x_unit), 850);
  assert.equal(scale.millimeters_per_source_x_unit, scale.millimeters_per_source_y_unit * 2);
});

test('uses physical furniture dimensions and keeps entry storage outside the door zone', () => {
  const opening = door({ position: [0, 0.5], segment: [[0, 0.45], [0, 0.55]] });
  const plan = buildLayoutRenderPlan({
    openings: [opening],
    rooms: [
      { id: 'space_entry_001', label: 'Entry', functionCode: 'entry', polygon: [[0, 0], [0.3, 0], [0.3, 1], [0, 1]] },
      { id: 'space_living_001', label: 'Living', functionCode: 'living_room', polygon: [[0.32, 0], [1, 0], [1, 0.5], [0.32, 0.5]] },
      { id: 'space_bedroom_001', label: 'Bedroom', functionCode: 'primary_bedroom', polygon: [[0.32, 0.52], [1, 0.52], [1, 1], [0.32, 1]] },
    ],
  });

  const sofa = plan.placements.find((placement) => placement.kind === 'sofa');
  const bed = plan.placements.find((placement) => placement.kind === 'bed');
  const entryStorage = plan.placements.find((placement) => placement.space_ref === 'space_entry_001');
  const entryKeepout = plan.keepout_zones.find((zone) => zone.opening_ref === opening.id);
  assert.equal(sofa?.width_mm, 2200);
  assert.equal(bed?.width_mm, 1800);
  assert.ok(entryStorage);
  assert.ok(entryKeepout);
  const storageBounds = bounds([
    [entryStorage!.x - entryStorage!.width / 2, entryStorage!.y - entryStorage!.height / 2],
    [entryStorage!.x + entryStorage!.width / 2, entryStorage!.y + entryStorage!.height / 2],
  ]);
  assert.equal(overlaps(storageBounds, bounds(entryKeepout!.polygon)), false);
});

test('uses a consistent median door span instead of one outlier for plan scale', () => {
  const scale = calibratePlanScale([
    door({ id: 'door_a', segment: [[0.1, 0.1], [0.15, 0.1]], confidence: 0.8 }),
    door({ id: 'door_b', segment: [[0.2, 0.1], [0.252, 0.1]], confidence: 0.9 }),
    door({ id: 'door_outlier', segment: [[0.3, 0.1], [0.43, 0.1]], confidence: 0.99 }),
  ], 1);

  assert.equal(scale.status, 'estimated');
  assert.ok(scale.millimeters_per_source_x_unit > 15_000);
  assert.ok(scale.millimeters_per_source_x_unit < 18_000);
});

test('creates one wet and one dry bathroom zone with one primary fixture in each role', () => {
  const bathroomDoor = door({
    id: 'door_bathroom',
    door_type: 'interior',
    position: [0.2, 0],
    segment: [[0.175, 0], [0.225, 0]],
    connects_space_ids: ['space_bathroom'],
  });
  const plan = buildLayoutRenderPlan({
    openings: [bathroomDoor],
    rooms: [{ id: 'space_bathroom', label: 'Bathroom', functionCode: 'bathroom', polygon: [[0, 0], [0.4, 0], [0.4, 0.5], [0, 0.5]] }],
  });

  assert.equal(plan.functional_zones.filter((zone) => zone.space_ref === 'space_bathroom').length, 2);
  assert.equal(plan.placements.filter((placement) => placement.kind === 'toilet').length, 1);
  assert.equal(plan.placements.filter((placement) => placement.kind === 'vanity').length, 1);
  assert.equal(plan.placements.filter((placement) => placement.kind === 'shower').length, 1);
  assert.equal(plan.placements.find((placement) => placement.kind === 'shower')?.zone_ref, 'zone_space_bathroom_wet');
  assert.ok(plan.keepout_zones.some((zone) => zone.reason === 'circulation_path' && zone.space_refs.includes('space_bathroom')));
});

test('omits entry storage when a narrow arrival corridor cannot keep 900 mm clear', () => {
  const entryDoor = door({ position: [0.06, 0], segment: [[0.035, 0], [0.085, 0]], connects_space_ids: ['space_entry'] });
  const plan = buildLayoutRenderPlan({
    openings: [entryDoor],
    rooms: [{ id: 'space_entry', label: 'Entry', functionCode: 'entry', polygon: [[0, 0], [0.12, 0], [0.12, 0.5], [0, 0.5]] }],
  });

  assert.equal(plan.placements.some((placement) => placement.kind === 'storage'), false);
  assert.ok(plan.qa.issues.some((issue) => issue.includes('900 mm continuous arrival path')));
});
