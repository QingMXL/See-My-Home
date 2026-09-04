import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const directParent = resolve(sourceDirectory, '..');

const candidates = [
  directParent,
  resolve(directParent, '..'),
  resolve(process.cwd(), 'Home-Furniture-Agent'),
];

export const projectRoot = candidates.find((candidate) =>
  existsSync(resolve(candidate, 'contracts', 'furniture-response.schema.json')),
) ?? directParent;

export const skillsRoot = resolve(projectRoot, 'skills');
export const runtimeStatePath = resolve(projectRoot, '.runtime', 'agent-state.json');
export const requestSchemaPath = resolve(projectRoot, 'contracts', 'furniture-request.schema.json');
export const responseSchemaPath = resolve(projectRoot, 'contracts', 'furniture-response.schema.json');
