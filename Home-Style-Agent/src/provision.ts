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
import { createHomeStyleAgentResource } from './agent-definition.js';
import { projectRoot, runtimeStatePath } from './paths.js';

export const HOME_STYLE_SKILL = 'modern-east-style' as const;

export interface ProvisionedStyleAgentState {
  agent_id: string;
  model_id: string;
  style_skill_id: string;
  style_skill_version: number;
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

function archiveBytes(): Uint8Array {
  return new Uint8Array(readFileSync(resolve(projectRoot, 'dist', 'skills', `${HOME_STYLE_SKILL}.zip`)));
}

async function resolveOwnedStyleSkill(client: ZooworkClient): Promise<SkillRecord> {
  const matches = (await client.listSkills({ q: HOME_STYLE_SKILL }))
    .filter((skill) => skill.name === HOME_STYLE_SKILL && (skill.scope === 'org' || skill.scope === 'personal'));
  if (matches.length > 1) throw new Error(`More than one owned ${HOME_STYLE_SKILL} skill exists; resolve manually`);
  if (matches[0]) return matches[0];
  const bytes = archiveBytes();
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 20);
  return client.uploadSkill(bytes, {
    scope: 'org',
    fileName: `${HOME_STYLE_SKILL}.zip`,
    idempotencyKey: `see-my-home:${HOME_STYLE_SKILL}:${digest}`,
  });
}

async function resolveAgent(client: ZooworkClient, modelId: string): Promise<AgentRecord> {
  const explicitId = process.env.ZOOWORK_STYLE_AGENT_ID?.trim();
  if (explicitId) return client.getAgent(explicitId);
  const matches = await client.listAgents({ labels: { application: 'see-my-home', agent_key: 'home-style' } });
  if (matches.length > 1) throw new Error('More than one Home Style Agent matches the stable labels; resolve manually');
  if (matches[0]) return matches[0];
  return client.createAgent(
    { resource: createHomeStyleAgentResource(modelId) },
    'see-my-home:home-style-agent:v1',
  );
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

async function reconcileAgent(client: ZooworkClient, agent: AgentRecord, modelId: string): Promise<AgentRecord> {
  if (!agent.declared) return agent;
  const desired = createHomeStyleAgentResource(modelId);
  const updates: Record<string, unknown> = {};
  for (const key of ['name', 'model', 'persona', 'labels', 'tool_policy', 'sandbox'] as const) {
    if (stableJson(agent.declared[key]) !== stableJson(desired[key])) updates[key] = desired[key];
  }
  return Object.keys(updates).length ? client.updateAgent(agent.agent_id, updates) : agent;
}

async function ensureRunning(client: ZooworkClient, agent: AgentRecord): Promise<void> {
  if (agent.status?.desired_state !== 'running') await client.startAgent(agent.agent_id);
  await client.waitUntilRunning(agent.agent_id, { timeoutMs: 60_000 });
}

async function attachPinnedStyleSkill(client: ZooworkClient, agentId: string, skill: SkillRecord): Promise<number> {
  const version = Number(skill.latest_version);
  if (!Number.isInteger(version) || version < 1) throw new Error('Style Skill latest_version is invalid');
  // One official PUT both attaches and pins. Read-back, not config_version, proves it resolved.
  await client.putAgentSkill(agentId, skill.skill_id, { enabled: true, versionPin: version });
  const verified = (await client.listAgentSkills(agentId, { verbose: true }))
    .find((item) => item.skill_id === skill.skill_id);
  if (!verified || verified.eligible !== true || Number(verified.version) !== version) {
    throw new Error(`Skill ${HOME_STYLE_SKILL} is not attached, eligible, and pinned to v${version}`);
  }
  return version;
}

export async function provisionPrivateStyleAgent(client: ZooworkClient, modelId: string): Promise<ProvisionedStyleAgentState> {
  requireRemoteWriteGuard();
  if (!modelId.trim()) throw new Error('ZOOWORK_MODEL_ID is required and must come from listModels()');
  const models = await client.listModels();
  if (!models.some((model) => model.model === modelId)) throw new Error(`ZOOWORK_MODEL_ID ${modelId} is not present in listModels()`);

  const resolved = await resolveAgent(client, modelId);
  const agent = await reconcileAgent(client, resolved, modelId);
  await ensureRunning(client, agent);
  const skill = await resolveOwnedStyleSkill(client);
  const version = await attachPinnedStyleSkill(client, agent.agent_id, skill);

  const state: ProvisionedStyleAgentState = {
    agent_id: agent.agent_id,
    model_id: modelId,
    style_skill_id: skill.skill_id,
    style_skill_version: version,
    provisioned_at: new Date().toISOString(),
  };
  mkdirSync(dirname(runtimeStatePath), { recursive: true });
  writeFileSync(runtimeStatePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  return state;
}

export async function syncStyleSkill(client: ZooworkClient): Promise<SkillRecord> {
  requireRemoteWriteGuard();
  const matches = (await client.listSkills({ q: HOME_STYLE_SKILL }))
    .filter((skill) => skill.name === HOME_STYLE_SKILL && (skill.scope === 'org' || skill.scope === 'personal'));
  if (matches.length !== 1) throw new Error(`Expected one owned ${HOME_STYLE_SKILL} skill, found ${matches.length}`);
  const skill = matches[0];
  if (!skill) throw new Error('Style Skill is missing');
  const bytes = archiveBytes();
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 20);
  const updated = await client.uploadSkillVersion(skill.skill_id, bytes, {
    fileName: `${HOME_STYLE_SKILL}.zip`,
    idempotencyKey: `see-my-home:${HOME_STYLE_SKILL}:${digest}`,
  });
  const agentId = process.env.ZOOWORK_STYLE_AGENT_ID?.trim();
  const version = Number(updated.latest_version);
  if (!agentId) throw new Error('ZOOWORK_STYLE_AGENT_ID is required to advance the pinned Skill version');
  if (!Number.isInteger(version) || version < 1) throw new Error('Uploaded Skill latest_version is invalid');
  await client.putAgentSkill(agentId, skill.skill_id, { enabled: true, versionPin: version });
  const verified = (await client.listAgentSkills(agentId, { verbose: true }))
    .find((item) => item.skill_id === skill.skill_id);
  if (!verified || verified.eligible !== true || Number(verified.version) !== version) {
    throw new Error(`Skill ${HOME_STYLE_SKILL} did not advance to pinned version ${version}`);
  }
  return updated;
}
