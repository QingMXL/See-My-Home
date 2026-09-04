import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillsRoot = resolve(projectRoot, 'skills');
const outputRoot = resolve(projectRoot, 'dist', 'skills');
const skillNames = ['table-design-spec', 'table-concept-renderer'];

mkdirSync(outputRoot, { recursive: true });
for (const skillName of skillNames) {
  const declared = readFileSync(resolve(skillsRoot, skillName, 'SKILL.md'), 'utf8')
    .match(/^name:\s*([^\n]+)$/m)?.[1]?.trim();
  if (declared !== skillName) {
    throw new Error(`Skill directory ${skillName} does not match SKILL.md name ${declared ?? '(missing)'}`);
  }
  const archivePath = resolve(outputRoot, `${skillName}.zip`);
  rmSync(archivePath, { force: true });
  execFileSync('zip', ['-qr', '-X', archivePath, skillName, '-x', '*/.DS_Store'], {
    cwd: skillsRoot,
    stdio: 'inherit',
  });
  process.stdout.write(`${archivePath}\n`);
}
