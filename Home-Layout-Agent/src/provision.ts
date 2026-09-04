import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import {
  createZooworkClient,
  type AgentRecord,
  type ModelInfo,
  type SkillRecord,
  type ZooworkClient,
} from '@zoowork-ai/sdk';
import { createHomeLayoutAgentResource } from './agent-definition.js';
import { projectRoot, runtimeStatePath } from './paths.js';

export const HOME_LAYOUT_SKILLS = [
  'room-map-parser',
  'home-model-maintainer',
  'furniture-layout-planner',
  'layout-validator',
  'floorplan-renderer',
  'material-stylizer',
] as const;

const LEGACY_HOME_LAYOUT_SKILLS = new Set([
  'home-layout-intake',
  'layout-diagnosis',
  'layout-visualization',
]);

export interface ProvisionedAgentState {
  agent_id: string;
  model_id: string;
  skill_ids: Record<(typeof HOME_LAYOUT_SKILLS)[number], string>;
  provisioned_at: string;
}

export function createClientFromEnvironment(): ZooworkClient {
  return createZooworkClient();
}

export async function listAvailableModels(client: ZooworkClient): Promise<ModelInfo[]> {
  return client.listModels();
}

function requireRemoteWriteGuard(): void {
  if (process.env.ZOOWORK_ALLOW_REMOTE_WRITE !== 'true') {
    throw new Error(
      'Remote provisioning is disabled. Set ZOOWORK_ALLOW_REMOTE_WRITE=true only for an explicitly approved private provisioning run.',
    );
  }
}

export async function syncPersonalSkillVersion(
  client: ZooworkClient,
  skillName: (typeof HOME_LAYOUT_SKILLS)[number],
): Promise<SkillRecord> {
  requireRemoteWriteGuard();
  if (!HOME_LAYOUT_SKILLS.includes(skillName)) throw new Error(`Unsupported Home Layout skill: ${skillName}`);
  const existing = (await client.listSkills({ scope: 'personal', q: skillName })).find(
    (skill) => skill.name === skillName && skill.scope === 'personal',
  );
  if (!existing) throw new Error(`Personal skill ${skillName} does not exist; run provision first`);
  const archivePath = resolve(projectRoot, 'dist', 'skills', `${skillName}.zip`);
  const archive = new Uint8Array(readFileSync(archivePath));
  const digest = createHash('sha256').update(archive).digest('hex').slice(0, 20);
  return client.uploadSkillVersion(existing.skill_id, archive, {
    fileName: `${skillName}.zip`,
    idempotencyKey: `see-my-home:${skillName}:${digest}`,
  });
}

async function resolveAgent(client: ZooworkClient, modelId: string): Promise<AgentRecord> {
  const matches = await client.listAgents({
    labels: {
      application: 'see-my-home',
      agent_key: 'home-layout',
    },
  });

  if (matches.length > 1) {
    throw new Error('More than one Home Layout Agent matches the stable labels; resolve manually');
  }
  if (matches[0]) return matches[0];

  return client.createAgent(
    { resource: createHomeLayoutAgentResource(modelId) },
    'see-my-home:home-layout-agent:v2',
  );
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

async function reconcileAgentDefinition(
  client: ZooworkClient,
  agent: AgentRecord,
  modelId: string,
): Promise<AgentRecord> {
  // createAgent returns a flat receipt; only the read projection has declared.
  if (!agent.declared) return agent;

  const desired = createHomeLayoutAgentResource(modelId);
  const updates: Record<string, unknown> = {};
  const declaredModel =
    typeof agent.declared.model === 'object' && agent.declared.model !== null
      ? (agent.declared.model as Record<string, unknown>)
      : {};
  if (agent.declared.name !== desired.name) updates.name = desired.name;
  if (declaredModel.primary !== modelId) {
    updates.model = { ...declaredModel, primary: modelId };
  }
  if (stableJson(agent.declared.persona) !== stableJson(desired.persona)) {
    updates.persona = desired.persona;
  }
  if (stableJson(agent.declared.labels) !== stableJson(desired.labels)) {
    updates.labels = desired.labels;
  }
  if (stableJson(agent.declared.sandbox) !== stableJson(desired.sandbox)) {
    updates.sandbox = desired.sandbox;
  }
  if (stableJson(agent.declared.tool_policy) !== stableJson(desired.tool_policy)) {
    updates.tool_policy = desired.tool_policy;
  }

  return Object.keys(updates).length === 0
    ? agent
    : client.updateAgent(agent.agent_id, updates);
}

async function ensureAgentRunning(client: ZooworkClient, agent: AgentRecord): Promise<AgentRecord> {
  if (agent.status?.desired_state !== 'running') {
    await client.startAgent(agent.agent_id);
  }
  return client.waitUntilRunning(agent.agent_id);
}

async function resolvePersonalSkill(
  client: ZooworkClient,
  skillName: (typeof HOME_LAYOUT_SKILLS)[number],
): Promise<SkillRecord> {
  const existing = (await client.listSkills({ scope: 'personal', q: skillName })).find(
    (skill) => skill.name === skillName && skill.scope === 'personal',
  );
  if (existing) return existing;

  const archivePath = resolve(projectRoot, 'dist', 'skills', `${skillName}.zip`);
  const archive = new Uint8Array(readFileSync(archivePath));
  return client.uploadSkill(archive, {
    scope: 'personal',
    fileName: `${skillName}.zip`,
    idempotencyKey: `see-my-home:${skillName}:v1`,
  });
}

async function ensureSkillAttached(
  client: ZooworkClient,
  agentId: string,
  skill: SkillRecord,
): Promise<void> {
  const attached = await client.listAgentSkills(agentId, { verbose: true });
  if (!attached.some((item) => item.skill_id === skill.skill_id)) {
    await client.putAgentSkill(agentId, skill.skill_id, {
      enabled: true,
      versionPin: null,
    });
  }

  const verified = (await client.listAgentSkills(agentId, { verbose: true })).find(
    (item) => item.skill_id === skill.skill_id,
  );
  if (!verified || verified.eligible !== true) {
    throw new Error(`Skill ${skill.name ?? skill.skill_id} is not attached and eligible`);
  }
}

export async function provisionPrivateAgent(
  client: ZooworkClient,
  modelId: string,
): Promise<ProvisionedAgentState> {
  requireRemoteWriteGuard();
  if (!modelId.trim()) {
    throw new Error('ZOOWORK_MODEL_ID is required and must come from listModels()');
  }

  const models = await client.listModels();
  if (!models.some((model) => model.model === modelId)) {
    throw new Error(`ZOOWORK_MODEL_ID ${modelId} is not present in listModels()`);
  }

  const resolved = await resolveAgent(client, modelId);
  const agent = await reconcileAgentDefinition(client, resolved, modelId);
  await ensureAgentRunning(client, agent);

  const skillIds = {} as ProvisionedAgentState['skill_ids'];
  for (const skillName of HOME_LAYOUT_SKILLS) {
    const skill = await resolvePersonalSkill(client, skillName);
    await ensureSkillAttached(client, agent.agent_id, skill);
    skillIds[skillName] = skill.skill_id;
  }
  const attached = await client.listAgentSkills(agent.agent_id, { verbose: true });
  for (const skill of attached) {
    if (skill.scope === 'personal' && skill.skill_id && skill.name && LEGACY_HOME_LAYOUT_SKILLS.has(skill.name)) {
      await client.deleteAgentSkill(agent.agent_id, skill.skill_id);
    }
  }

  const state: ProvisionedAgentState = {
    agent_id: agent.agent_id,
    model_id: modelId,
    skill_ids: skillIds,
    provisioned_at: new Date().toISOString(),
  };
  mkdirSync(dirname(runtimeStatePath), { recursive: true });
  writeFileSync(runtimeStatePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  return state;
}
