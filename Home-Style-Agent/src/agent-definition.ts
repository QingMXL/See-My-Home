import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AgentResource } from '@zoowork-ai/sdk';
import { projectRoot } from './paths.js';

// These tool names are reused from the already working Home Layout Agent in this
// same ZooWork deployment. They are deployment evidence, not guessed SDK fields.
export const HOME_STYLE_TOOL_POLICY = {
  allow: ['image', 'image_generate', 'sessions_yield', 'media_materialize', 'artifact_publish'],
} as const;

export function createHomeStyleAgentResource(modelId: string): AgentResource {
  if (!modelId.trim()) throw new Error('modelId is required; resolve it with listModels()');
  return {
    name: 'Home Style Agent',
    model: { primary: modelId },
    persona: {
      docs: [{
        name: 'AGENTS.md',
        content: readFileSync(resolve(projectRoot, 'agent', 'AGENTS.md'), 'utf8'),
      }],
    },
    labels: {
      application: 'see-my-home',
      agent_key: 'home-style',
      runtime_contract: 'home-style-v1',
    },
    tool_policy: HOME_STYLE_TOOL_POLICY,
    sandbox: { scope: 'session' },
  };
}
