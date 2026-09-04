import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomeFurnitureAgentResource, HOME_FURNITURE_TOOL_POLICY } from '../src/agent-definition.js';

test('creates a session-scoped Home Furniture Agent resource', () => {
  const resource = createHomeFurnitureAgentResource('model_test');
  assert.equal(resource.name, 'Home Furniture Agent');
  assert.deepEqual(resource.model, { primary: 'model_test' });
  assert.deepEqual(resource.sandbox, { scope: 'session' });
  assert.equal(resource.labels?.agent_key, 'home-furniture');
  assert.equal(resource.labels?.runtime_contract, 'home-furniture-v1');
  assert.deepEqual(resource.tool_policy, HOME_FURNITURE_TOOL_POLICY);
  const persona = resource.persona?.docs?.[0]?.content ?? '';
  assert.match(persona, /sketch is the primary form authority/i);
  assert.match(persona, /concept design/i);
  assert.match(persona, /front, side, and top line views/i);
});

test('requires a model id returned by ZooWork', () => {
  assert.throws(() => createHomeFurnitureAgentResource('  '), /modelId is required/);
});
