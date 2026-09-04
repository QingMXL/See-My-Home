import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertFurnitureAgentResponse,
  assertFurnitureTurnRequest,
  assertResponseMatchesRequest,
  ContractValidationError,
  parseFurnitureAgentResponse,
} from '../src/validation.js';
import type { FurnitureAgentResponse, FurnitureTurnRequest } from '../src/contracts.js';

const validRequest: FurnitureTurnRequest = {
  contract_version: 'home-furniture-v1',
  request_id: 'req_1',
  project_id: 'furniture_1',
  locale: 'zh-CN',
  table_type: 'dining_table',
  sketch_asset_ref: 'https://example.com/sketch.png',
  inspiration_asset_ref: 'https://example.com/inspiration.jpg',
  description: 'A calm solid-wood dining table.',
  source_priority: { sketch: 0.8, inspiration: 0.2 },
  design_controls: {
    dimensions_mm: { width: 1800, depth: 900, height: 750 },
    primary_material: 'White oak',
    secondary_material: 'Blackened steel',
    top_shape: 'rectangular',
    edge_profile: 'Soft radius',
    base_style: 'Four tapered legs',
    finish: 'Matte clear oil',
    storage: 'None',
  },
};

const validResponse: FurnitureAgentResponse = {
  contract_version: 'home-furniture-v1',
  request_id: 'req_1',
  status: 'completed',
  table_type: 'dining_table',
  artifact_id: 'art_1',
  design_summary: 'A restrained oak dining table.',
  design_spec: {
    dimensions_mm: { width: 1800, depth: 900, height: 750 },
    top: { shape: 'rectangular', edge_profile: 'Soft radius', thickness_mm: 32 },
    base: { style: 'Four tapered legs', support_count: 4, inset_mm: 80 },
    materials: [{ part: 'Top', material: 'White oak', finish: 'Matte clear oil' }],
    components: [
      { id: 'top_1', name: 'Table top', role: 'top', quantity: 1 },
      { id: 'legs', name: 'Tapered legs', role: 'support', quantity: 4 },
    ],
    drawing_notes: ['Concept dimensions only.'],
  },
  questions: [],
  warnings: ['Engineering review required before fabrication.'],
  qa: {
    sketch_geometry_preserved: true,
    inspiration_language_applied: true,
    dimensions_consistent: true,
    function_plausible: true,
    publishable: true,
  },
};

test('accepts sketch-led, inspiration-led, and text-only table requests', () => {
  assert.doesNotThrow(() => assertFurnitureTurnRequest(validRequest));
  assert.doesNotThrow(() => assertFurnitureTurnRequest({
    ...validRequest,
    sketch_asset_ref: undefined,
    source_priority: { sketch: 0, inspiration: 1 },
  }));
  assert.doesNotThrow(() => assertFurnitureTurnRequest({
    ...validRequest,
    sketch_asset_ref: undefined,
    inspiration_asset_ref: undefined,
    source_priority: { sketch: 0, inspiration: 0 },
  }));
});

test('rejects unsupported furniture and inconsistent source priorities', () => {
  assert.throws(() => assertFurnitureTurnRequest({ ...validRequest, table_type: 'chair' }), ContractValidationError);
  assert.throws(() => assertFurnitureTurnRequest({ ...validRequest, source_priority: { sketch: 0.5, inspiration: 0.2 } }), ContractValidationError);
});

test('requires completed output to have a publishable artifact', () => {
  assert.doesNotThrow(() => assertFurnitureAgentResponse(validResponse));
  const { artifact_id: _artifactId, ...withoutArtifact } = validResponse;
  assert.throws(() => assertFurnitureAgentResponse(withoutArtifact), ContractValidationError);
  assert.throws(() => assertFurnitureAgentResponse({
    ...validResponse,
    qa: { ...validResponse.qa, dimensions_consistent: false },
  }), ContractValidationError);
});

test('enforces the same canonical dimensions in request and response', () => {
  assert.doesNotThrow(() => assertResponseMatchesRequest(validResponse, validRequest));
  assert.throws(() => assertResponseMatchesRequest({
    ...validResponse,
    design_spec: { ...validResponse.design_spec, dimensions_mm: { width: 1600, depth: 900, height: 750 } },
  }, validRequest), /dimensions/);
});

test('extracts a JSON response without trusting Markdown framing', () => {
  assert.deepEqual(parseFurnitureAgentResponse(`Result:\n\`\`\`json\n${JSON.stringify(validResponse)}\n\`\`\``), validResponse);
});
