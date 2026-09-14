import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { STYLE_KNOWLEDGE } from '../src/runtime.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

const presets = [
  {
    id: 'modern_east' as const,
    schema: 'knowledge/modern-east/schema/modern-east.v1.yaml',
    prompt: 'knowledge/modern-east/prompts/modern-east-prompts.md',
    skill: 'skills/modern-east-style/SKILL.md',
    identity: /Ming-derived/i,
  },
  {
    id: 'california_modern' as const,
    schema: 'knowledge/california-modern/schema/california-modern.v1.yaml',
    prompt: 'knowledge/california-modern/prompts/california-modern-prompts.md',
    skill: 'skills/california-modern-style/SKILL.md',
    identity: /sling, leather, cane, or sculptural/i,
  },
  {
    id: 'maximal_luxe' as const,
    schema: 'knowledge/maximal-luxe/schema/maximal-luxe.v1.yaml',
    prompt: 'knowledge/maximal-luxe/prompts/maximal-luxe-prompts.md',
    skill: 'skills/maximal-luxe-style/SKILL.md',
    identity: /patterned silk or jacquard/i,
  },
];

test('keeps runtime and schema knowledge versions aligned', () => {
  const catalog = JSON.parse(read('config/style-catalog.v1.json')) as {
    styles: Record<string, { knowledge_version: string }>;
  };
  for (const preset of presets) {
    const schema = read(preset.schema);
    const match = schema.match(/^knowledge_base_version: "([^"]+)"/m);
    assert.equal(match?.[1], STYLE_KNOWLEDGE[preset.id].knowledgeVersion);
    assert.equal(catalog.styles[preset.id]?.knowledge_version, STYLE_KNOWLEDGE[preset.id].knowledgeVersion);
    assert.match(schema, /status: production/);
  }
});

test('requires designed surfaces, ceilings, furniture identity and premium material accents', () => {
  for (const preset of presets) {
    const combined = `${read(preset.schema)}\n${read(preset.prompt)}\n${read(preset.skill)}`;
    assert.match(combined, /wallcovering|wallpaper|upholstered textile/i);
    assert.match(combined, /ceiling/i);
    assert.match(combined, /blank (?:white )?ceiling|only two isolated downlights/i);
    assert.match(combined, /acrylic|cast resin|Lucite/i);
    assert.match(combined, preset.identity);
  }
});

test('Modern East cannot pass through one symbolic Chinese object', () => {
  const modernEast = presets[0]!;
  const combined = `${read(modernEast.schema)}\n${read(modernEast.prompt)}\n${read(modernEast.skill)}`;
  assert.match(combined, /ink-wash/i);
  assert.match(combined, /celadon/i);
  assert.match(combined, /not reduce the style to a single Chinese-looking picture|lone Chinese scroll as the only style cue/i);
});
