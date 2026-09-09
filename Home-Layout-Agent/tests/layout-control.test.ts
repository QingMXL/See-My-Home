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
  assert.match(svg, /data-control-layer="material-zones"/);
  assert.match(svg, /data-finish-family="ceramic_tile"/);
  assert.match(svg, /data-kind="toilet"/);
  assert.doesNotMatch(svg, /<text\b/i);
});

test('renders distinct kitchen fixture glyphs and one sofa-to-TV view axis', () => {
  const rooms = [
    { id: 'space_living', label: 'Living', functionCode: 'living_room' as const, polygon: [[0, 0], [0.48, 0], [0.48, 0.4], [0, 0.4]] },
    { id: 'space_kitchen', label: 'Kitchen', functionCode: 'kitchen' as const, polygon: [[0.5, 0], [1, 0], [1, 0.4], [0.5, 0.4]] },
  ];
  const plan = buildLayoutRenderPlan({ rooms, openings: [] });
  const svg = renderLayoutControlOverlaySvg({ width: 1200, height: 900, plan, rooms, openings: [] });

  assert.equal((svg.match(/data-view-axis=/g) ?? []).length, 1);
  assert.equal((svg.match(/data-kind="sink"/g) ?? []).length, 1);
  assert.equal((svg.match(/data-kind="cooktop"/g) ?? []).length, 1);
  assert.equal((svg.match(/data-kind="tv"/g) ?? []).length, 1);
  assert.match(svg, /stroke="#1976a3"/);
  assert.match(svg, /stroke="#b04a45"/);
  assert.match(svg, /stroke="#72518a"/);
});
