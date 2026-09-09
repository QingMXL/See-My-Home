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
