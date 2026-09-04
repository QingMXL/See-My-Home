import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  createZooworkClient,
  type AgentRecord,
  type ModelInfo,
  type SkillRecord,
  type ZooworkClient,
} from '@zoowork-ai/sdk';
import { createHomeFurnitureAgentResource } from './agent-definition.js';
import { projectRoot, runtimeStatePath } from './paths.js';

export const HOME_FURNITURE_SKILLS = ['table-design-spec', 'table-concept-renderer'] as const;
export type HomeFurnitureSkillName = (typeof HOME_FURNITURE_SKILLS)[number];

export interface ProvisionedFurnitureAgentState {
  agent_id: string;
  model_id: string;
  skill_ids: Record<HomeFurnitureSkillName, string>;
  skill_versions: Record<HomeFurnitureSkillName, number>;
  provisioned_at: string;
}

export function createClientFromEnvironment(): ZooworkClient {
  return createZooworkClient();
}

export function listAvailableModels(client: ZooworkClient): Promise<ModelInfo[]> {
  return client.listModels();
}

function requireRemoteWriteGuard(): void {
  if (process.env.ZOOWORK_ALLOW_REMOTE_WRITE !== 'true') {
    throw new Error('Remote provisioning is disabled. Set ZOOWORK_ALLOW_REMOTE_WRITE=true only for one explicitly approved private provisioning run.');
  }
}

function archiveBytes(skillName: HomeFurnitureSkillName): Uint8Array {
  return new Uint8Array(readFileSync(resolve(projectRoot, 'dist', 'skills', `${skillName}.zip`)));
}

async function resolveOwnedSkill(client: ZooworkClient, skillName: HomeFurnitureSkillName): Promise<SkillRecord> {
  const matches = (await client.listSkills({ q: skillName }))
    .filter((skill) => skill.name === skillName && (skill.scope === 'org' || skill.scope === 'personal'));
  if (matches.length > 1) throw new Error(`More than one owned ${skillName} skill exists; resolve manually`);
  if (matches[0]) return matches[0];
  const bytes = archiveBytes(skillName);
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 20);
  return client.uploadSkill(bytes, {
    scope: 'org',
    fileName: `${skillName}.zip`,
    idempotencyKey: `see-my-home:${skillName}:${digest}`,
  });
}

async function resolveAgent(client: ZooworkClient, modelId: string): Promise<AgentRecord> {
  const explicitId = process.env.ZOOWORK_FURNITURE_AGENT_ID?.trim();
  if (explicitId) return client.getAgent(explicitId);
  const matches = await client.listAgents({ labels: { application: 'see-my-home', agent_key: 'home-furniture' } });
  if (matches.length > 1) throw new Error('More than one Home Furniture Agent matches the stable labels; resolve manually');
  if (matches[0]) return matches[0];
  return client.createAgent(
    { resource: createHomeFurnitureAgentResource(modelId) },
    'see-my-home:home-furniture-agent:v1',
  );
}

async function reconcileAgent(client: ZooworkClient, agent: AgentRecord, modelId: string): Promise<AgentRecord> {
  if (!agent.declared) return agent;
  const desired = createHomeFurnitureAgentResource(modelId);
  const updates: Record<string, unknown> = {};
  for (const key of ['name', 'model', 'persona', 'labels', 'tool_policy', 'sandbox'] as const) {
    if (JSON.stringify(agent.declared[key]) !== JSON.stringify(desired[key])) updates[key] = desired[key];
  }
  return Object.keys(updates).length ? client.updateAgent(agent.agent_id, updates) : agent;
}

async function ensureRunning(client: ZooworkClient, agent: AgentRecord): Promise<void> {
  if (agent.status?.desired_state !== 'running') await client.startAgent(agent.agent_id);
  await client.waitUntilRunning(agent.agent_id, { timeoutMs: 60_000 });
}

async function attachPinnedSkill(client: ZooworkClient, agentId: string, skill: SkillRecord): Promise<number> {
  const version = Number(skill.latest_version);
  if (!Number.isInteger(version) || version < 1) throw new Error(`Skill ${skill.name ?? skill.skill_id} latest_version is invalid`);
  await client.putAgentSkill(agentId, skill.skill_id, { enabled: true, versionPin: version });
  const verified = (await client.listAgentSkills(agentId, { verbose: true }))
    .find((item) => item.skill_id === skill.skill_id);
  if (!verified || verified.eligible !== true || Number(verified.version) !== version) {
    throw new Error(`Skill ${skill.name ?? skill.skill_id} is not attached, eligible, and pinned to v${version}`);
  }
  return version;
}

export async function provisionPrivateFurnitureAgent(
  client: ZooworkClient,
  modelId: string,
): Promise<ProvisionedFurnitureAgentState> {
  requireRemoteWriteGuard();
  if (!modelId.trim()) throw new Error('ZOOWORK_MODEL_ID is required and must come from listModels()');
  const models = await client.listModels();
  if (!models.some((model) => model.model === modelId)) {
    throw new Error(`ZOOWORK_MODEL_ID ${modelId} is not present in listModels()`);
  }

  const resolved = await resolveAgent(client, modelId);
  const agent = await reconcileAgent(client, resolved, modelId);
  await ensureRunning(client, agent);

  const skillIds = {} as ProvisionedFurnitureAgentState['skill_ids'];
  const skillVersions = {} as ProvisionedFurnitureAgentState['skill_versions'];
  for (const skillName of HOME_FURNITURE_SKILLS) {
    const skill = await resolveOwnedSkill(client, skillName);
    skillIds[skillName] = skill.skill_id;
    skillVersions[skillName] = await attachPinnedSkill(client, agent.agent_id, skill);
  }

  const state: ProvisionedFurnitureAgentState = {
    agent_id: agent.agent_id,
    model_id: modelId,
    skill_ids: skillIds,
    skill_versions: skillVersions,
    provisioned_at: new Date().toISOString(),
  };
  mkdirSync(dirname(runtimeStatePath), { recursive: true });
  writeFileSync(runtimeStatePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  return state;
}

export async function syncFurnitureSkills(client: ZooworkClient): Promise<SkillRecord[]> {
  requireRemoteWriteGuard();
  const agentId = process.env.ZOOWORK_FURNITURE_AGENT_ID?.trim();
  if (!agentId) throw new Error('ZOOWORK_FURNITURE_AGENT_ID is required to advance pinned Skill versions');
  const updated: SkillRecord[] = [];
  for (const skillName of HOME_FURNITURE_SKILLS) {
    const matches = (await client.listSkills({ q: skillName }))
      .filter((skill) => skill.name === skillName && (skill.scope === 'org' || skill.scope === 'personal'));
    if (matches.length !== 1 || !matches[0]) throw new Error(`Expected one owned ${skillName} skill, found ${matches.length}`);
    const bytes = archiveBytes(skillName);
    const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 20);
    const next = await client.uploadSkillVersion(matches[0].skill_id, bytes, {
      fileName: `${skillName}.zip`,
      idempotencyKey: `see-my-home:${skillName}:${digest}`,
    });
    await attachPinnedSkill(client, agentId, next);
    updated.push(next);
  }
  return updated;
}
