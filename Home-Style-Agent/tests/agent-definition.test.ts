import assert from 'node:assert/strict';
import test from 'node:test';
import { createHomeStyleAgentResource } from '../src/agent-definition.js';

test('creates a session-scoped Home Style Agent resource', () => {
  const resource = createHomeStyleAgentResource('model_test');

  assert.equal(resource.name, 'Home Style Agent');
  assert.deepEqual(resource.model, { primary: 'model_test' });
  assert.deepEqual(resource.sandbox, { scope: 'session' });
  assert.equal(resource.labels?.agent_key, 'home-style');
  assert.equal(resource.tool_policy, undefined);

  const persona = resource.persona?.docs?.[0]?.content ?? '';
  assert.match(persona, /columns/i);
  assert.match(persona, /windows/i);
  assert.match(persona, /camera/i);
  assert.match(persona, /selected style knowledge/i);
  assert.match(persona, /\/skills\/designer\/SKILL\.md/);
  assert.match(persona, /image_generation_cli\.py/);
  assert.match(persona, /artifact_publish/);
});

test('requires an exact ZooWork model id', () => {
  assert.throws(() => createHomeStyleAgentResource('   '), /modelId is required/);
});
