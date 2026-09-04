import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AgentResource } from '@zoowork-ai/sdk';
import { projectRoot } from './paths.js';

// These platform tool names are already exercised by the deployed Layout and Style
// Agents in this same project. The SDK intentionally types tool_policy as an open record.
export const HOME_FURNITURE_TOOL_POLICY = {
  allow: ['image', 'image_generate', 'sessions_yield', 'media_materialize', 'artifact_publish'],
} as const;

export function createHomeFurnitureAgentResource(modelId: string): AgentResource {
  if (!modelId.trim()) throw new Error('modelId is required; resolve it with listModels()');
  return {
    name: 'Home Furniture Agent',
    model: { primary: modelId },
    persona: {
      docs: [{
        name: 'AGENTS.md',
        content: readFileSync(resolve(projectRoot, 'agent', 'AGENTS.md'), 'utf8'),
      }],
    },
    labels: {
      application: 'see-my-home',
      agent_key: 'home-furniture',
      runtime_contract: 'home-furniture-v1',
    },
    tool_policy: HOME_FURNITURE_TOOL_POLICY,
    sandbox: { scope: 'session' },
  };
}
