import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatArea,
  millimetersToDisplayLength,
  squareMetersToSquareFeet,
} from '../src/units.js';

test('uses metric as the primary display and square feet only as a secondary listing value', () => {
  assert.equal(formatArea(118.4, 'en-US', true), '118.4 m² (1,274 sq ft)');
  assert.equal(formatArea(118.4, 'en-US', false), '118.4 m²');
});

test('converts square meters accurately enough for US listing display', () => {
  assert.ok(Math.abs(squareMetersToSquareFeet(1) - 10.7639104167) < 1e-9);
});

test('shows small lengths in centimeters and room-scale lengths in meters', () => {
  assert.equal(millimetersToDisplayLength(850, 'en-US'), '85 cm');
  assert.equal(millimetersToDisplayLength(4250, 'en-US'), '4.25 m');
});
