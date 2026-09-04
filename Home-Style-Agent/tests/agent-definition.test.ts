import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomeStyleAgentResource, HOME_STYLE_TOOL_POLICY } from '../src/agent-definition.js';

test('creates a session-scoped Home Style Agent resource', () => {
  const resource = createHomeStyleAgentResource('model_test');

  assert.equal(resource.name, 'Home Style Agent');
  assert.deepEqual(resource.model, { primary: 'model_test' });
  assert.deepEqual(resource.sandbox, { scope: 'session' });
  assert.equal(resource.labels?.agent_key, 'home-style');
  assert.deepEqual(resource.tool_policy, HOME_STYLE_TOOL_POLICY);

  const persona = resource.persona?.docs?.[0]?.content ?? '';
  assert.match(persona, /columns/i);
  assert.match(persona, /windows/i);
  assert.match(persona, /camera/i);
  assert.match(persona, /selected style knowledge/i);
});

test('requires an exact ZooWork model id', () => {
  assert.throws(() => createHomeStyleAgentResource('   '), /modelId is required/);
});
