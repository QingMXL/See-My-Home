import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLayoutControlOverlaySvg } from '../src/layout-control.js';
import { buildLayoutRenderPlan } from '../src/layout-planning.js';
import type { RoomMapOpening } from '../src/contracts.js';

test('renders a label-free control overlay with openings, paths, zones, and furniture footprints', () => {
  const opening: RoomMapOpening = {
    id: 'door_bathroom', kind: 'door', position: [0.2, 0], segment: [[0.175, 0], [0.225, 0]],
    boundary_ref: 'wall_top', door_type: 'interior', swing: null,
    connects_space_ids: ['space_bathroom'], confidence: 0.9,
  };
  const rooms = [{ id: 'space_bathroom', label: 'Bathroom', functionCode: 'bathroom' as const, polygon: [[0, 0], [0.4, 0], [0.4, 0.5], [0, 0.5]] }];
  const plan = buildLayoutRenderPlan({ rooms, openings: [opening] });
  const svg = renderLayoutControlOverlaySvg({ width: 1200, height: 900, plan, rooms, openings: [opening] });

  assert.match(svg, /data-control-layer="openings"/);
  assert.match(svg, /data-keepout-kind="circulation_path"/);
  assert.match(svg, /data-zone-kind="bathroom_wet"/);
  assert.match(svg, /data-kind="toilet"/);
  assert.doesNotMatch(svg, /<text\b/i);
});
