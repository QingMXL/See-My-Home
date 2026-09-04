import { existsSync, readFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { projectRoot } from './paths.js';
import {
  createClientFromEnvironment,
  listAvailableModels,
  provisionPrivateStyleAgent,
  syncStyleSkill,
} from './provision.js';
import { assertStyleAgentResponse, assertStyleTurnRequest } from './validation.js';

const environmentPath = resolve(projectRoot, '.env');
if (existsSync(environmentPath)) loadEnvFile(environmentPath);

function readJson(path: string | undefined): unknown {
  if (!path) throw new Error('A JSON file path is required');
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

async function main(): Promise<void> {
  const [command, argument] = process.argv.slice(2);
  if (command === 'models') {
    process.stdout.write(`${JSON.stringify(await listAvailableModels(createClientFromEnvironment()), null, 2)}\n`);
    return;
  }
  if (command === 'status') {
    const agentId = process.env.ZOOWORK_STYLE_AGENT_ID?.trim();
    if (!agentId) throw new Error('ZOOWORK_STYLE_AGENT_ID is required');
    const client = createClientFromEnvironment();
    const [agent, skills] = await Promise.all([
      client.getAgent(agentId),
      client.listAgentSkills(agentId, { verbose: true }),
    ]);
    const declaredModel = agent.declared?.model;
    const modelId = typeof declaredModel === 'object'
      && declaredModel !== null
      && 'primary' in declaredModel
      && typeof declaredModel.primary === 'string'
      ? declaredModel.primary
      : null;
    process.stdout.write(`${JSON.stringify({
      agent_id: agent.agent_id,
      name: agent.declared?.name ?? null,
      model_id: modelId,
      desired_state: agent.status?.desired_state ?? null,
      skills: skills.map((skill) => ({
        skill_id: skill.skill_id,
        name: skill.name,
        version: skill.version,
        eligible: skill.eligible,
      })),
    }, null, 2)}\n`);
    return;
  }
  if (command === 'provision') {
    const state = await provisionPrivateStyleAgent(createClientFromEnvironment(), process.env.ZOOWORK_MODEL_ID ?? '');
    process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
    return;
  }
  if (command === 'sync-skill') {
    process.stdout.write(`${JSON.stringify(await syncStyleSkill(createClientFromEnvironment()), null, 2)}\n`);
    return;
  }
  if (command === 'validate-request') {
    assertStyleTurnRequest(readJson(argument));
    process.stdout.write('StyleTurnRequest is valid.\n');
    return;
  }
  if (command === 'validate-response') {
    assertStyleAgentResponse(readJson(argument));
    process.stdout.write('StyleAgentResponse is valid.\n');
    return;
  }
  process.stdout.write('Home Style Agent Runtime\n\nCommands:\n  models\n  status\n  provision\n  sync-skill\n  validate-request <file>\n  validate-response <file>\n');
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
