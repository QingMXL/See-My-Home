import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  buildDimensionAnnotationSvg,
  createDimensionedOrthographicPng,
  drawingDimensionItems,
  normalizeOrthographicPanels,
  orthographicTargetRatios,
} from '../../api/_lib/furniture-drawing.js';
import type { FurnitureDesignSpec } from '../src/contracts.js';

const spec: FurnitureDesignSpec = {
  dimensions_mm: { width: 1500, depth: 600, height: 1000 },
  top: { shape: 'rectangular', edge_profile: 'Soft Radius', thickness_mm: 36 },
  base: { style: 'Four Tapered Legs', support_count: 4, inset_mm: 70 },
  materials: [{ part: 'Top', material: 'Walnut', finish: 'Matte Clear Oil' }],
  components: [
    { id: 'top', name: 'Table top', role: 'top', quantity: 1, dimensions_mm: { width: 1500, depth: 600, height: 36 } },
    { id: 'drawer', name: 'Inset drawer', role: 'drawer', quantity: 2, dimensions_mm: { width: 620, depth: 410, height: 150 } },
  ],
  drawing_notes: ['Concept dimensions only.'],
};

test('builds a detailed dimension plan only from confirmed specification values', () => {
  assert.deepEqual(drawingDimensionItems(spec), [
    { label: 'TOP', value: 'T 36 mm' },
    { label: 'BASE', value: 'INSET 70 mm' },
    { label: 'TOP', value: 'W 1500 · D 600 · H 36 mm' },
    { label: 'DRAWER', value: 'W 620 · D 410 · H 150 mm' },
  ]);
  const svg = buildDimensionAnnotationSvg({ width: 1800, sourceHeight: 900, topMargin: 80, bottomMargin: 280, spec });
  for (const expected of ['FRONT', 'SIDE', 'TOP', 'W 1500 mm', 'D 600 mm', 'H 1000 mm', 'T 36 mm', 'INSET 70 mm', 'DRAWER']) {
    assert.match(svg, new RegExp(expected));
  }
});

test('exports one enlarged black-and-white PNG with the dimension overlay', async () => {
  const source = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="450">
      <rect width="900" height="450" fill="#f3efe5"/>
      <path d="M 80 120 H 250 V 340 M 380 120 H 520 V 340 M 650 120 H 830 V 300" fill="none" stroke="#555" stroke-width="5"/>
    </svg>
  `);
  const output = await createDimensionedOrthographicPng({ source, spec });
  assert.deepEqual([...output.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(output.byteLength > 1_000);
});

test('normalizes the three generated panels to the confirmed orthographic ratios', async () => {
  assert.deepEqual(orthographicTargetRatios(spec), [1.5, 0.6, 2.5]);
  const source = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
      <rect width="900" height="600" fill="#fff"/>
      <rect x="60" y="100" width="180" height="360" fill="#000"/>
      <rect x="390" y="160" width="120" height="260" fill="#000"/>
      <rect x="660" y="80" width="140" height="400" fill="#000"/>
    </svg>
  `);
  const normalized = await normalizeOrthographicPanels({ source, width: 900, height: 600, spec });
  const expected = orthographicTargetRatios(spec);
  for (let index = 0; index < 3; index += 1) {
    const panelBuffer = await sharp(normalized)
      .extract({ left: index * 300, top: 0, width: 300, height: 600 })
      .png()
      .toBuffer();
    const panel = await sharp(panelBuffer)
      .trim({ background: '#fff', threshold: 8 })
      .toBuffer({ resolveWithObject: true });
    assert.ok(Math.abs(panel.info.width / panel.info.height - expected[index]) < 0.03);
  }
});
