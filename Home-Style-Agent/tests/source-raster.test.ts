import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { inspectSourceRaster, planSourceRaster } from '../src/source-raster.js';

test('plans a deterministic landscape canvas from the source pixels', () => {
  assert.deepEqual(planSourceRaster(678, 452), {
    width_px: 678,
    height_px: 452,
    aspect_ratio: '3:2',
    orientation: 'landscape',
    designer_size: '1536x1024',
  });
});

test('plans deterministic portrait and square canvases', () => {
  assert.equal(planSourceRaster(3024, 4032).designer_size, '1152x1536');
  assert.equal(planSourceRaster(1200, 1200).designer_size, '1536x1536');
});

test('reads raster pixels without relying on visual-model estimation', async () => {
  const bytes = await sharp({
    create: { width: 900, height: 600, channels: 3, background: '#eeeeee' },
  }).jpeg().toBuffer();
  assert.deepEqual(await inspectSourceRaster(bytes), {
    width_px: 900,
    height_px: 600,
    aspect_ratio: '3:2',
    orientation: 'landscape',
    designer_size: '1536x1024',
  });
});

test('rejects aspect ratios outside the Designer model limits', () => {
  assert.throws(() => planSourceRaster(4000, 1000), /between 1:3 and 3:1/);
});
