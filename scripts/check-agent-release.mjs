import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const release = JSON.parse(await readFile(resolve(root, 'agent-release.json'), 'utf8'));
const agents = Object.entries(release.agents ?? {});

if (release.schema_version !== '1.0' || !release.release_set || agents.length !== 3) {
  throw new Error('agent-release.json must define one release set containing exactly three Agents');
}

const envNames = new Set();
const namespaces = new Set();
for (const [key, agent] of agents) {
  const pkg = JSON.parse(await readFile(resolve(root, agent.directory, 'package.json'), 'utf8'));
  if (pkg.name !== agent.package) throw new Error(`${key}: package name does not match agent-release.json`);
  if (pkg.version !== agent.package_version) throw new Error(`${key}: package version does not match agent-release.json`);
  if (!/^home-[a-z-]+-v\d+$/.test(agent.runtime_contract)) throw new Error(`${key}: invalid runtime contract`);
  if (envNames.has(agent.agent_id_env)) throw new Error(`${key}: Agent ID environment variable is not isolated`);
  if (namespaces.has(agent.api_namespace)) throw new Error(`${key}: API namespace is not isolated`);
  envNames.add(agent.agent_id_env);
  namespaces.add(agent.api_namespace);
}

process.stdout.write(`Agent release ${release.release_set} is internally consistent.\n`);
