import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillName = 'modern-east-style';
const sourceSkill = resolve(projectRoot, 'skills', skillName);
const knowledgeRoot = resolve(projectRoot, 'knowledge', 'modern-east');
const stageRoot = resolve(projectRoot, 'dist', 'skill-stage');
const stagedSkill = resolve(stageRoot, skillName);
const references = resolve(stagedSkill, 'references');
const outputRoot = resolve(projectRoot, 'dist', 'skills');

rmSync(stageRoot, { recursive: true, force: true });
mkdirSync(references, { recursive: true });
mkdirSync(outputRoot, { recursive: true });
cpSync(resolve(sourceSkill, 'SKILL.md'), resolve(stagedSkill, 'SKILL.md'));
cpSync(resolve(knowledgeRoot, 'prompts', 'modern-east-prompts.md'), resolve(references, 'prompt-components.md'));

const schema = readFileSync(resolve(knowledgeRoot, 'schema', 'modern-east.v1.yaml'), 'utf8');
const productionSchema = schema.replace(/\nprovenance:\n[\s\S]*?\nprofiles:/, '\nprofiles:');
writeFileSync(resolve(references, 'style-schema.yaml'), productionSchema);

const declared = readFileSync(resolve(stagedSkill, 'SKILL.md'), 'utf8').match(/^name:\s*([^\n]+)$/m)?.[1]?.trim();
if (declared !== skillName) throw new Error(`Skill directory ${skillName} does not match SKILL.md name ${declared ?? '(missing)'}`);

const archivePath = resolve(outputRoot, `${skillName}.zip`);
rmSync(archivePath, { force: true });
execFileSync('zip', ['-qr', '-X', archivePath, skillName, '-x', '*/.DS_Store'], { cwd: stageRoot, stdio: 'inherit' });
process.stdout.write(`${archivePath}\n`);
