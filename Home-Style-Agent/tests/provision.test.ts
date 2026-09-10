import assert from 'node:assert/strict';
import test from 'node:test';
import { skillVersionFromReceipt, styleAgentConfigUpdates } from '../src/provision.js';

test('reads the current official SkillVersionRecord version field', () => {
  assert.equal(skillVersionFromReceipt({ version: '3', state: 'ready' }), 3);
});

test('supports the latest_version field in the published SDK 0.5.2 declaration', () => {
  assert.equal(skillVersionFromReceipt({ latest_version: '2' }), 2);
});

test('rejects an invalid Skill version receipt', () => {
  assert.throws(() => skillVersionFromReceipt({ version: 0 }), /version is invalid/);
});

test('clears a guessed tool policy so attached Skills can read their files', () => {
  const updates = styleAgentConfigUpdates(
    {
      name: 'Home Style Agent',
      model: { primary: 'model_test' },
      tool_policy: { allow: ['image', 'image_generate'] },
    },
    {
      name: 'Home Style Agent',
      model: { primary: 'model_test' },
    },
  );

  assert.deepEqual(updates, { tool_policy: {} });
});
