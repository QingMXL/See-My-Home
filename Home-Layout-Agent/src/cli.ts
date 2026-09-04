import { existsSync, readFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import {
  HOME_LAYOUT_SKILLS,
  createClientFromEnvironment,
  listAvailableModels,
  provisionPrivateAgent,
  syncPersonalSkillVersion,
} from './provision.js';
import { projectRoot } from './paths.js';
import { assertAgentResponse, assertHomeModel, assertHomeTurnRequest } from './validation.js';

const localEnvironmentPath = resolve(projectRoot, '.env');
if (existsSync(localEnvironmentPath)) loadEnvFile(localEnvironmentPath);

function printUsage(): void {
  process.stdout.write(
    [
      'Home Layout Agent Runtime',
      '',
      'Commands:',
      '  models                         Read-only: list exact ZooWork model identifiers',
      '  provision                      Create/reuse the private Agent and attach personal Skills',
      '  sync-skill <name>              Publish a new version of one attached personal Skill',
      '  validate-request <file.json>   Validate a HomeTurnRequest locally',
      '  validate-model <file.json>     Validate a Home Model locally',
      '  validate-response <file.json>  Validate a Runtime response locally',
      '',
    ].join('\n'),
  );
}

function readJson(path: string | undefined): unknown {
  if (!path) throw new Error('A JSON file path is required');
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

async function main(): Promise<void> {
  const [command, argument] = process.argv.slice(2);

  switch (command) {
    case 'models': {
      const models = await listAvailableModels(createClientFromEnvironment());
      process.stdout.write(`${JSON.stringify(models, null, 2)}\n`);
      return;
    }
    case 'provision': {
      const modelId = process.env.ZOOWORK_MODEL_ID ?? '';
      const state = await provisionPrivateAgent(createClientFromEnvironment(), modelId);
      process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
      return;
    }
    case 'sync-skill': {
      if (!argument || !HOME_LAYOUT_SKILLS.includes(argument as (typeof HOME_LAYOUT_SKILLS)[number])) {
        throw new Error(`Skill name must be one of: ${HOME_LAYOUT_SKILLS.join(', ')}`);
      }
      const skill = await syncPersonalSkillVersion(
        createClientFromEnvironment(),
        argument as (typeof HOME_LAYOUT_SKILLS)[number],
      );
      process.stdout.write(`${JSON.stringify(skill, null, 2)}\n`);
      return;
    }
    case 'validate-request':
      assertHomeTurnRequest(readJson(argument));
      process.stdout.write('HomeTurnRequest is valid.\n');
      return;
    case 'validate-model':
      assertHomeModel(readJson(argument));
      process.stdout.write('Home Model is valid.\n');
      return;
    case 'validate-response':
      assertAgentResponse(readJson(argument));
      process.stdout.write('HomeAgentResponse is valid.\n');
      return;
    default:
      printUsage();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
