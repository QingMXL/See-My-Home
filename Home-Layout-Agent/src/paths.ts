import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const directParent = resolve(sourceDirectory, '..');

export const projectRoot = existsSync(resolve(directParent, 'package.json'))
  ? directParent
  : resolve(directParent, '..');
export const skillsRoot = resolve(projectRoot, 'skills');
export const runtimeStatePath = resolve(projectRoot, '.runtime', 'agent-state.json');

export const schemaPaths = {
  roomMapResponse: resolve(
    skillsRoot,
    'room-map-parser',
    'references',
    'room-map-response.schema.json',
  ),
  homeEvidence: resolve(
    skillsRoot,
    'home-layout-intake',
    'references',
    'home-evidence.schema.json',
  ),
  homeModel: resolve(
    skillsRoot,
    'home-model-maintainer',
    'references',
    'home-model.schema.json',
  ),
  agentResponse: resolve(
    skillsRoot,
    'home-model-maintainer',
    'references',
    'agent-response.schema.json',
  ),
} as const;
