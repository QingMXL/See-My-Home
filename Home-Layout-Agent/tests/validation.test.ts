import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertAgentResponse,
  assertHomeModel,
  assertHomeTurnRequest,
  assertRoomMapResponse,
  ContractValidationError,
  parseAgentResponse, parseRoomMapResponse,
} from '../src/validation.js';
import { validHomeModel, validRequest, validResponse, validRoomMapResponse } from './fixtures.js';

test('accepts the canonical request, model, and response fixtures', () => {
  assert.doesNotThrow(() => assertHomeTurnRequest(validRequest()));
  assert.doesNotThrow(() => assertHomeModel(validHomeModel()));
  assert.doesNotThrow(() => assertAgentResponse(validResponse()));
  assert.doesNotThrow(() => assertRoomMapResponse(validRoomMapResponse()));
});

test('parses compact Room Map output and rejects out-of-range geometry', () => {
  assert.deepEqual(parseRoomMapResponse(JSON.stringify(validRoomMapResponse())), validRoomMapResponse());
  const invalid = validRoomMapResponse();
  invalid.spaces[0]!.polygon[0] = [1.2, 0.1];
  assert.throws(() => assertRoomMapResponse(invalid), ContractValidationError);
});

test('accepts balcony as a canonical room function', () => {
  const roomMap = validRoomMapResponse();
  roomMap.spaces[0]!.label = 'Balcony';
  roomMap.spaces[0]!.suggested_function = 'Balcony';
  roomMap.spaces[0]!.suggested_function_code = 'balcony';
  assert.doesNotThrow(() => assertRoomMapResponse(roomMap));
});

test('accepts an empty room map when the source image is unavailable', () => {
  const roomMap = validRoomMapResponse();
  roomMap.status = 'insufficient_input';
  roomMap.spaces = [];
  assert.doesNotThrow(() => assertRoomMapResponse(roomMap));
});

test('accepts entry and custom other room functions used by Step 2', () => {
  const roomMap = validRoomMapResponse();
  roomMap.spaces[0]!.label = 'Entry';
  roomMap.spaces[0]!.suggested_function = 'Entry';
  roomMap.spaces[0]!.suggested_function_code = 'entry';
  assert.doesNotThrow(() => assertRoomMapResponse(roomMap));

  const model = validHomeModel();
  (model.room_programs as unknown[]).push({
    space_ref: 'space_living_001',
    function_code: 'other',
    baseline_objects: [],
    conditional_objects: [],
    default_object_counts: [],
    user_overrides: { include_objects: [], exclude_objects: [], replace_objects: [] },
    status: 'system_default',
    source_refs: ['src_user_001'],
  });
  assert.doesNotThrow(() => assertHomeModel(model));
});

test('accepts overridable room defaults and rejects the retired hard-required shape', () => {
  const model = validHomeModel();
  (model.room_programs as unknown[]).push({
    space_ref: 'space_living_001',
    function_code: 'living_room',
    baseline_objects: ['sofa', 'television_or_media_wall'],
    conditional_objects: [{ object: 'coffee_table', condition: 'Include when circulation remains clear.' }],
    default_object_counts: [
      { object: 'sofa', min_count: 1, max_count: 1 },
      { object: 'television_or_media_wall', min_count: 1, max_count: 1 },
    ],
    user_overrides: { include_objects: [], exclude_objects: [], replace_objects: [] },
    status: 'system_default',
    source_refs: ['src_user_001'],
  });
  assert.doesNotThrow(() => assertHomeModel(model));

  const retired = validHomeModel();
  (retired.room_programs as unknown[]).push({
    space_ref: 'space_living_001',
    function_code: 'living_room',
    required_objects: ['sofa'],
    forbidden_objects: [],
    status: 'user_confirmed',
    source_refs: ['src_user_001'],
  });
  assert.throws(() => assertHomeModel(retired), ContractValidationError);
});

test('rejects imperial storage in the canonical Home Model', () => {
  const model = validHomeModel();
  const policy = model.measurement_policy as Record<string, unknown>;
  policy.linear_storage = 'ft';

  assert.throws(() => assertHomeModel(model), ContractValidationError);
});

test('requires visualization details for a visualization request', () => {
  const request = validRequest() as unknown as Record<string, unknown>;
  request.operation = 'visualize';

  assert.throws(() => assertHomeTurnRequest(request), ContractValidationError);
});

test('extracts and validates a JSON object even if a model adds a fence', () => {
  const raw = `\`\`\`json\n${JSON.stringify(validResponse())}\n\`\`\``;
  assert.deepEqual(parseAgentResponse(raw), validResponse());
});
