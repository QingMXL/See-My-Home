import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertStyleAgentResponse,
  assertStyleTurnRequest,
  ContractValidationError,
  parseStyleAgentResponse,
} from '../src/validation.js';

const validRequest = {
  contract_version: 'home-style-v1',
  request_id: 'req_1',
  home_id: 'home_1',
  source_asset_ref: 'https://example.com/source.png',
  room_type: 'living_room',
  style_id: 'modern_east',
  style_profile: 'quiet-poise',
  renovation_scope: 'finishes_and_furnishing',
  user_preferences: ['warmer textiles'],
  known_immutable_elements: ['windows', 'columns'],
};

const validCompletedResponse = {
  contract_version: 'home-style-v1',
  request_id: 'req_1',
  status: 'completed',
  style_id: 'modern_east',
  knowledge_version: '0.1-research',
  artifact_id: 'art_1',
  qa: {
    structure_preserved: true,
    camera_preserved: true,
    style_passed: true,
    publishable: true,
  },
};

test('accepts a valid Modern East request', () => {
  assert.doesNotThrow(() => assertStyleTurnRequest(validRequest));
});

test('rejects an unsupported style id', () => {
  assert.throws(
    () => assertStyleTurnRequest({ ...validRequest, style_id: 'japandi' }),
    ContractValidationError,
  );
});

test('accepts a completed response only when its artifact and every QA gate are present', () => {
  assert.doesNotThrow(() => assertStyleAgentResponse(validCompletedResponse));

  const { artifact_id: _artifactId, ...withoutArtifact } = validCompletedResponse;
  assert.throws(() => assertStyleAgentResponse(withoutArtifact), ContractValidationError);
  assert.throws(
    () => assertStyleAgentResponse({
      ...validCompletedResponse,
      qa: { ...validCompletedResponse.qa, structure_preserved: false },
    }),
    ContractValidationError,
  );
});

test('requires a failed response to be non-publishable', () => {
  assert.doesNotThrow(() => assertStyleAgentResponse({
    ...validCompletedResponse,
    status: 'failed',
    qa: { ...validCompletedResponse.qa, publishable: false },
  }));
  assert.throws(
    () => assertStyleAgentResponse({ ...validCompletedResponse, status: 'failed' }),
    ContractValidationError,
  );
});

test('extracts the response object from a fenced assistant message', () => {
  const parsed = parseStyleAgentResponse(`Result follows:\n\`\`\`json\n${JSON.stringify(validCompletedResponse)}\n\`\`\``);
  assert.deepEqual(parsed, validCompletedResponse);
});
