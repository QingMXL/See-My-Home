import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  buildDimensionAnnotationSvg,
  createDimensionedOrthographicPng,
  orthographicTargetRatios,
  type OrthographicViewFrame,
} from '../../api/_lib/furniture-drawing.js';
import type { FurnitureDesignSpec, OrthographicView } from '../src/contracts.js';

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

const frames: OrthographicViewFrame[] = [
  { left: 100, top: 200, width: 560, height: 360 },
  { left: 940, top: 180, width: 300, height: 400 },
  { left: 1700, top: 250, width: 520, height: 240 },
];

function viewSource(width: number, height: number, inset: number): Buffer {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#fff"/>
      <rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" fill="none" stroke="#111" stroke-width="6"/>
      <path d="M ${inset * 2} ${height / 2} H ${width - inset * 2}" stroke="#111" stroke-width="5"/>
    </svg>
  `);
}

test('builds engineering labels and dimensions with a real sans-serif font stack', () => {
  const svg = buildDimensionAnnotationSvg({ frames, spec });
  for (const expected of ['FRONT ELEVATION', 'SIDE ELEVATION', 'TOP VIEW', '1500 mm', '600 mm', '1000 mm', '36 mm', 'Unit: mm']) {
    assert.match(svg, new RegExp(expected));
  }
  assert.match(svg, /<text\b/);
  assert.match(svg, /font-family: Arial, Helvetica, sans-serif/);
  assert.match(svg, /class="extension-line"/);
});

test('exports one black-and-white PNG composed from three independent views', async () => {
  const sources = {
    front: viewSource(900, 520, 80),
    side: viewSource(520, 760, 70),
    top: viewSource(960, 420, 60),
  } satisfies Record<OrthographicView, Buffer>;
  const output = await createDimensionedOrthographicPng({ sources, spec });
  assert.deepEqual([...output.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 3840);
  assert.equal(metadata.height, 2160);
  assert.ok(output.byteLength > 5_000);
});

test('normalizes the three panels to one shared confirmed-dimension scale', async () => {
  assert.deepEqual(orthographicTargetRatios(spec), [1.5, 0.6, 2.5]);
  const sources = {
    front: viewSource(1000, 400, 40),
    side: viewSource(400, 800, 40),
    top: viewSource(900, 300, 40),
  } satisfies Record<OrthographicView, Buffer>;
  const output = await createDimensionedOrthographicPng({ sources, spec });
  const frontPanel = await sharp(output).extract({ left: 800, top: 250, width: 1100, height: 700 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const sidePanel = await sharp(output).extract({ left: 2850, top: 250, width: 650, height: 700 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const topPanel = await sharp(output).extract({ left: 800, top: 1250, width: 1100, height: 600 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  assert.ok(frontPanel.data.some((value) => value < 128));
  assert.ok(sidePanel.data.some((value) => value < 128));
  assert.ok(topPanel.data.some((value) => value < 128));
});

test('rejects an almost empty generated view before publishing the sheet', async () => {
  const empty = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" fill="#fff"/><line x1="250" y1="250" x2="252" y2="250" stroke="#000"/></svg>');
  await assert.rejects(() => createDimensionedOrthographicPng({
    sources: { front: empty, side: viewSource(500, 500, 50), top: viewSource(500, 500, 50) },
    spec,
  }), /front orthographic image/);
});
