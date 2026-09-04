import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AgentResource } from '@zoowork-ai/sdk';
import { projectRoot } from './paths.js';

const PERSONA_FILES = [
  { source: 'IDENTITY.md', name: 'IDENTITY.md' },
  { source: 'SOUL.md', name: 'SOUL.md' },
  { source: 'AGENTS.md', name: 'AGENTS.md' },
  { source: 'TOOLS.md', name: 'TOOLS.md' },
  { source: 'USER.md', name: 'USER.md' },
  // MEMORY.md is a ZooWork-reserved target. Keep the policy content in a normal persona doc.
  { source: 'MEMORY.md', name: 'HOME_MODEL_STATE.md' },
] as const;

// Keep the platform visual tools while excluding shell, history, database, and
// subagent tools that can turn a single visual request into an unbounded loop.
export const HOME_LAYOUT_TOOL_POLICY = {
  allow: ['image', 'image_generate', 'sessions_yield', 'media_materialize', 'artifact_publish'],
} as const;

export function loadPersonaDocs(): NonNullable<AgentResource['persona']>['docs'] {
  return PERSONA_FILES.map(({ source, name }) => ({
    name,
    content: readFileSync(resolve(projectRoot, 'agent', source), 'utf8'),
  }));
}

export function createHomeLayoutAgentResource(modelId: string): AgentResource {
  if (!modelId.trim()) {
    throw new Error('modelId is required; resolve it with listModels() instead of guessing');
  }

  return {
    name: 'Home Layout Agent',
    model: {
      primary: modelId,
    },
    persona: {
      docs: loadPersonaDocs(),
    },
    labels: {
      application: 'see-my-home',
      agent_key: 'home-layout',
      runtime_contract: 'home-layout-v2',
    },
    tool_policy: HOME_LAYOUT_TOOL_POLICY,
    sandbox: {
      scope: 'session',
    },
  };
}
