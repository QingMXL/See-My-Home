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

export const HOME_STYLE_SKILLS = ['modern-east-style', 'california-modern-style', 'maximal-luxe-style'] as const;
export type HomeStyleSkillName = typeof HOME_STYLE_SKILLS[number];

export interface ProvisionedStyleAgentState {
  agent_id: string;
  model_id: string;
  style_skills: Array<{ name: HomeStyleSkillName; skill_id: string; version: number }>;
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

function archiveBytes(skillName: HomeStyleSkillName): Uint8Array {
  return new Uint8Array(readFileSync(resolve(projectRoot, 'dist', 'skills', `${skillName}.zip`)));
}

async function resolveOwnedStyleSkill(client: ZooworkClient, skillName: HomeStyleSkillName): Promise<SkillRecord> {
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

export function styleAgentConfigUpdates(
  current: Record<string, unknown>,
  desired: Record<string, unknown>,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const key of ['name', 'model', 'persona', 'labels', 'sandbox'] as const) {
    if (stableJson(current[key]) !== stableJson(desired[key])) updates[key] = desired[key];
  }
  // ZooWork does not publish a stable allow-list vocabulary for tool_policy.
  // Clearing our former guessed policy restores the platform tool manifest,
  // including the file reader that attached Skills need at runtime.
  if (current.tool_policy !== undefined && stableJson(current.tool_policy) !== stableJson({})) {
    updates.tool_policy = {};
  }
  return updates;
}

export function skillVersionFromReceipt(receipt: { version?: unknown; latest_version?: unknown; [key: string]: unknown }): number {
  const version = Number(receipt.version ?? receipt.latest_version);
  if (!Number.isInteger(version) || version < 1) throw new Error('Uploaded Skill version is invalid');
  return version;
}

async function reconcileAgent(client: ZooworkClient, agent: AgentRecord, modelId: string): Promise<AgentRecord> {
  if (!agent.declared) return agent;
  const desired = createHomeStyleAgentResource(modelId);
  const updates = styleAgentConfigUpdates(
    agent.declared as unknown as Record<string, unknown>,
    desired as unknown as Record<string, unknown>,
  );
  return Object.keys(updates).length ? client.updateAgent(agent.agent_id, updates) : agent;
}

async function ensureRunning(client: ZooworkClient, agent: AgentRecord): Promise<void> {
  if (agent.status?.desired_state !== 'running') await client.startAgent(agent.agent_id);
  await client.waitUntilRunning(agent.agent_id, { timeoutMs: 60_000 });
}

async function attachPinnedStyleSkill(client: ZooworkClient, agentId: string, skillName: HomeStyleSkillName, skill: SkillRecord): Promise<number> {
  const version = Number(skill.latest_version);
  if (!Number.isInteger(version) || version < 1) throw new Error('Style Skill latest_version is invalid');
  // One official PUT both attaches and pins. Read-back, not config_version, proves it resolved.
  await client.putAgentSkill(agentId, skill.skill_id, { enabled: true, versionPin: version });
  const verified = (await client.listAgentSkills(agentId, { verbose: true }))
    .find((item) => item.skill_id === skill.skill_id);
  if (!verified || verified.eligible !== true || Number(verified.version) !== version) {
    throw new Error(`Skill ${skillName} is not attached, eligible, and pinned to v${version}`);
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
  const styleSkills: ProvisionedStyleAgentState['style_skills'] = [];
  for (const skillName of HOME_STYLE_SKILLS) {
    const skill = await resolveOwnedStyleSkill(client, skillName);
    const version = await attachPinnedStyleSkill(client, agent.agent_id, skillName, skill);
    styleSkills.push({ name: skillName, skill_id: skill.skill_id, version });
  }

  const state: ProvisionedStyleAgentState = {
    agent_id: agent.agent_id,
    model_id: modelId,
    style_skills: styleSkills,
    provisioned_at: new Date().toISOString(),
  };
  mkdirSync(dirname(runtimeStatePath), { recursive: true });
  writeFileSync(runtimeStatePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  return state;
}

export async function syncStyleSkills(client: ZooworkClient) {
  requireRemoteWriteGuard();
  const agentId = process.env.ZOOWORK_STYLE_AGENT_ID?.trim();
  if (!agentId) throw new Error('ZOOWORK_STYLE_AGENT_ID is required to advance the pinned Skill version');
  const synced: Array<{ name: HomeStyleSkillName; skill_id: string; version: number; state: unknown }> = [];
  for (const skillName of HOME_STYLE_SKILLS) {
    const matches = (await client.listSkills({ q: skillName }))
      .filter((skill) => skill.name === skillName && (skill.scope === 'org' || skill.scope === 'personal'));
    if (matches.length > 1) throw new Error(`Expected at most one owned ${skillName} skill, found ${matches.length}`);
    const bytes = archiveBytes(skillName);
    const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 20);
    let skill = matches[0];
    let version: number;
    let state: unknown;
    if (skill) {
      const updated = await client.uploadSkillVersion(skill.skill_id, bytes, {
        fileName: `${skillName}.zip`,
        idempotencyKey: `see-my-home:${skillName}:${digest}`,
      });
      version = skillVersionFromReceipt(updated);
      state = updated;
    } else {
      skill = await client.uploadSkill(bytes, {
        scope: 'org',
        fileName: `${skillName}.zip`,
        idempotencyKey: `see-my-home:${skillName}:${digest}`,
      });
      version = skillVersionFromReceipt(skill);
      state = skill;
    }
    await client.putAgentSkill(agentId, skill.skill_id, { enabled: true, versionPin: version });
    const verified = (await client.listAgentSkills(agentId, { verbose: true }))
      .find((item) => item.skill_id === skill.skill_id);
    if (!verified || verified.eligible !== true || Number(verified.version) !== version) {
      throw new Error(`Skill ${skillName} did not advance to pinned version ${version}`);
    }
    synced.push({ name: skillName, skill_id: skill.skill_id, version, state });
  }
  return synced;
}
