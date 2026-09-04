import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const directParent = resolve(sourceDirectory, '..');

const candidates = [
  directParent,
  resolve(directParent, '..'),
  resolve(process.cwd(), 'Home-Layout-Agent'),
];

export const projectRoot = candidates.find((candidate) =>
  existsSync(resolve(candidate, 'skills', 'home-model-maintainer', 'references', 'home-model.schema.json')),
) ?? directParent;
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
