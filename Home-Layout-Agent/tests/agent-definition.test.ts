import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomeLayoutAgentResource } from '../src/agent-definition.js';

test('builds a session-isolated AgentResource with persona docs', () => {
  const resource = createHomeLayoutAgentResource('model_from_list_models');
  assert.equal(resource.model?.primary, 'model_from_list_models');
  assert.equal(resource.sandbox?.scope, 'session');
  assert.ok((resource.persona?.docs.length ?? 0) >= 5);
  assert.ok(resource.persona?.docs.some((doc) => doc.name === 'HOME_MODEL_STATE.md'));
  assert.ok(!resource.persona?.docs.some((doc) => doc.name === 'MEMORY.md'));
  assert.equal(resource.labels?.agent_key, 'home-layout');
  assert.deepEqual(resource.tool_policy, {
    allow: ['image', 'image_generate', 'sessions_yield', 'media_materialize', 'artifact_publish'],
  });
  const toolsDoc = resource.persona?.docs.find((doc) => doc.name === 'TOOLS.md')?.content ?? '';
  assert.match(toolsDoc, /Banana Pro/);
  assert.match(toolsDoc, /Image 2/);
  assert.match(toolsDoc, /publish the raster artifact whenever it is a readable image file/);
});

test('refuses to guess an empty model id', () => {
  assert.throws(() => createHomeLayoutAgentResource(''), /listModels/);
});
