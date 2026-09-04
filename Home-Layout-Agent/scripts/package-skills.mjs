import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillsRoot = resolve(projectRoot, 'skills');
const outputRoot = resolve(projectRoot, 'dist', 'skills');

mkdirSync(outputRoot, { recursive: true });

const skillNames = readdirSync(skillsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const skillName of skillNames) {
  const skillMarkdown = readFileSync(resolve(skillsRoot, skillName, 'SKILL.md'), 'utf8');
  const declaredName = skillMarkdown.match(/^name:\s*([^\n]+)$/m)?.[1]?.trim();
  if (declaredName !== skillName) {
    throw new Error(
      `Skill directory ${skillName} does not match SKILL.md name ${declaredName ?? '(missing)'}`,
    );
  }

  const archivePath = resolve(outputRoot, `${skillName}.zip`);
  rmSync(archivePath, { force: true });
  execFileSync('zip', ['-qr', archivePath, skillName, '-x', '*/.DS_Store'], {
    cwd: skillsRoot,
    stdio: 'inherit',
  });
  process.stdout.write(`${archivePath}\n`);
}
