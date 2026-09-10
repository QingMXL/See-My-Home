import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AgentResource } from '@zoowork-ai/sdk';
import { projectRoot } from './paths.js';

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
    sandbox: { scope: 'session' },
  };
}
