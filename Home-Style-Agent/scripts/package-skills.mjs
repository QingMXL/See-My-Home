import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stageRoot = resolve(projectRoot, 'dist', 'skill-stage');
const outputRoot = resolve(projectRoot, 'dist', 'skills');

const packages = [
  { skillName: 'modern-east-style', knowledgeName: 'modern-east', promptName: 'modern-east-prompts.md', schemaName: 'modern-east.v1.yaml' },
  { skillName: 'california-modern-style', knowledgeName: 'california-modern', promptName: 'california-modern-prompts.md', schemaName: 'california-modern.v1.yaml' },
  { skillName: 'maximal-luxe-style', knowledgeName: 'maximal-luxe', promptName: 'maximal-luxe-prompts.md', schemaName: 'maximal-luxe.v1.yaml' },
];

rmSync(stageRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });

for (const item of packages) {
  const sourceSkill = resolve(projectRoot, 'skills', item.skillName);
  const knowledgeRoot = resolve(projectRoot, 'knowledge', item.knowledgeName);
  const stagedSkill = resolve(stageRoot, item.skillName);
  const references = resolve(stagedSkill, 'references');
  mkdirSync(references, { recursive: true });
  cpSync(resolve(sourceSkill, 'SKILL.md'), resolve(stagedSkill, 'SKILL.md'));
  cpSync(resolve(knowledgeRoot, 'prompts', item.promptName), resolve(references, 'prompt-components.md'));

  const schema = readFileSync(resolve(knowledgeRoot, 'schema', item.schemaName), 'utf8');
  const productionSchema = schema.replace(/\nprovenance:\n[\s\S]*?\nprofiles:/, '\nprofiles:');
  writeFileSync(resolve(references, 'style-schema.yaml'), productionSchema);

  const declared = readFileSync(resolve(stagedSkill, 'SKILL.md'), 'utf8').match(/^name:\s*([^\n]+)$/m)?.[1]?.trim();
  if (declared !== item.skillName) throw new Error(`Skill directory ${item.skillName} does not match SKILL.md name ${declared ?? '(missing)'}`);

  const archivePath = resolve(outputRoot, `${item.skillName}.zip`);
  rmSync(archivePath, { force: true });
  execFileSync('zip', ['-qr', '-X', archivePath, item.skillName, '-x', '*/.DS_Store'], { cwd: stageRoot, stdio: 'inherit' });
  process.stdout.write(`${archivePath}\n`);
}
