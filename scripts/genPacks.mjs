// Generates src/lib/method/packs/*.ts from packs.source.json.
//
// The packs are authored as data and compiled to TypeScript so the doctrine is
// reviewable as prose in one place and type-checked in another. Re-run after
// editing packs.source.json:
//
//   node scripts/genPacks.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'src', 'lib', 'method', 'packs');
mkdirSync(outDir, { recursive: true });

const packs = JSON.parse(readFileSync(join(root, 'src', 'lib', 'method', 'packs.source.json'), 'utf8'));

const q = (s) => JSON.stringify(s ?? '');

const src = (o, indent) => {
  const pad = ' '.repeat(indent);
  return JSON.stringify(o, null, 2)
    .split('\n')
    .map((l, i) => (i === 0 ? l : pad + l))
    .join('\n');
};

const renderLaw = (l) => `  {
    id: ${q(l.id)},
    rule: ${q(l.rule)},
    because: ${q(l.because)},
    source: ${src(l.source, 4)},
  },`;

const renderBanned = (b) => `  {
    id: ${q(b.id)},
    label: ${q(b.label)},
    pattern: new RegExp(${q(b.patternSource)}, ${q(b.patternFlags || '')}),
    because: ${q(b.because)},
    level: ${q(b.level)},
  },`;

const renderStep = (s) => `  {
    key: ${q(s.key)},
    label: ${q(s.label)},${s.group === undefined ? '' : `\n    group: ${q(s.group)},`}
    purpose: ${q(s.purpose)},${s.day === undefined ? '' : `\n    day: ${s.day},`}${
  s.maxChars === undefined ? '' : `\n    maxChars: ${s.maxChars},`
}
    constraints: ${src(s.constraints, 4)},${
  s.subject === undefined ? '' : `\n    subject: ${src(s.subject, 4)},`
}
  },`;

const fileFor = (p) => `// AUTO-GENERATED from packs.source.json by scripts/genPacks.mjs. Do not edit by hand.
//
// ${p.label}
//
// Every law carries the source it came from. Where a source is one operator's
// account of their own results rather than a measurement, selfReported is true
// and the UI shows it as a claim.

import type { MethodPack } from '../types';
import { UNIVERSAL_BANNED } from '../validate';

export const ${p.id}Pack: MethodPack = {
  id: ${q(p.id)},
  version: ${q(p.version)},
  label: ${q(p.label)},

  thesis: ${q(p.thesis)},

  primeDirective: ${q(p.primeDirective)},

  laws: [
${p.laws.map(renderLaw).join('\n')}
  ],

  banned: [
    ...UNIVERSAL_BANNED,
${p.banned.map(renderBanned).join('\n')}
  ],

  structure: [
${p.structure.map(renderStep).join('\n')}
  ],

  evidence: ${src(p.evidence, 2)},

  knownTensions: ${src(p.knownTensions ?? [], 2)},
};
`;

const written = [];
for (const p of packs) {
  const f = join(outDir, `${p.id}.ts`);
  writeFileSync(f, fileFor(p), 'utf8');
  written.push(`${p.id}.ts (${p.laws.length} laws, ${p.banned.length} channel-specific bans)`);
}

const index = `// AUTO-GENERATED from packs.source.json by scripts/genPacks.mjs. Do not edit by hand.

import type { ChannelId, MethodPack } from '../types';
${packs.map((p) => `import { ${p.id}Pack } from './${p.id}';`).join('\n')}

export const PACKS: Record<ChannelId, MethodPack> = {
${packs.map((p) => `  ${p.id}: ${p.id}Pack,`).join('\n')}
};

export const getPack = (id: ChannelId): MethodPack => PACKS[id];

export const ALL_PACKS: MethodPack[] = Object.values(PACKS);
`;
writeFileSync(join(outDir, 'index.ts'), index, 'utf8');

console.log('generated:');
for (const w of written) console.log('  ' + w);
console.log('  index.ts');
