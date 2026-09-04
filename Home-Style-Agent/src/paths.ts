import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const directParent = resolve(sourceDirectory, '..');

export const projectRoot = existsSync(resolve(directParent, 'package.json'))
  ? directParent
  : resolve(directParent, '..');
export const skillsRoot = resolve(projectRoot, 'skills');
export const runtimeStatePath = resolve(projectRoot, '.runtime', 'agent-state.json');
export const requestSchemaPath = resolve(projectRoot, 'contracts', 'style-request.schema.json');
export const responseSchemaPath = resolve(projectRoot, 'contracts', 'style-response.schema.json');
