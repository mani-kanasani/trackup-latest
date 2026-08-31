// The violation aggregate.
//
//   npm run violations:test
//
// One check here outranks the rest, and it is the brief's acceptance: no draft
// text, no message content and no lead detail leaves the machine in the export.
// Same standard as the receipt, so it is proved the same way — a deliberately
// hostile pipeline is pushed through and the output is asserted to contain none
// of it.
//
// The subtle part is WHERE the hostility can enter. Names and companies are the
// obvious fields and they are never read here at all. `violation_ids` is the
// dangerous one: it is a jsonb array read straight out of the database, so if a
// future bug ever wrote message text into it, an aggregate that echoed unknown
// ids would carry that text into something the member hands to a coach. Which is
// why an unrecognised id is counted and never printed.

import { aggregateViolations, exportText, type AggregateSources } from '../src/lib/violations/aggregate';
import { CATALOGUE, ruleFor } from '../src/lib/violations/catalogue';
import { ALL_PACKS } from '../src/lib/method/packs';
import { validateOutput } from '../src/lib/method/validate';
import { getPack } from '../src/lib/method/packs';
import type { GenerationMeta } from '../src/apps/linkedin/types';

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

const TODAY = new Date(2026, 7, 31, 10, 0, 0);

const gen = (ids: string[], at = '2026-08-20T10:00:00.000Z'): GenerationMeta => ({
  at,
  pack_id: 'linkedin',
  pack_version: '1',
  case_study_id: null,
  case_study_title: null,
  case_study_score: null,
  tier: 'A',
  rung: 'middle',
  verdict: 'qualified',
  violation_ids: ids,
});

const row = (...gens: GenerationMeta[]) => ({ generation_meta: gens });
const agg = (src: Partial<AggregateSources>) =>
  aggregateViolations({ linkedin: [], coldEmail: [], ...src } as AggregateSources);

/* ---- the catalogue covers everything that can be recorded ---------------- */

const packIds = new Set(ALL_PACKS.flatMap((p) => p.banned.map((b) => b.id)));
check('every banned pattern in every pack has a name', [...packIds].every((id) => CATALOGUE.has(id)), `${packIds.size} ids`);
for (const id of ['empty-step', 'empty-subject', 'over-length', 'unattributed-borrowed-figure']) {
  check(`the structural id ${id} has a name`, CATALOGUE.has(id));
}

// The catalogue keeps the FIRST definition when a pattern appears in more than
// one pack. That is only safe while the definitions agree, so it is checked
// rather than assumed.
const byId = new Map<string, { levels: Set<string>; labels: Set<string> }>();
for (const p of ALL_PACKS) {
  for (const b of p.banned) {
    const e = byId.get(b.id) ?? { levels: new Set(), labels: new Set() };
    e.levels.add(b.level);
    e.labels.add(b.label);
    byId.set(b.id, e);
  }
}
check(
  'a pattern shared between packs agrees on severity',
  [...byId].every(([, e]) => e.levels.size === 1),
  [...byId].filter(([, e]) => e.levels.size > 1).map(([id]) => id).join(', '),
);
check(
  'and agrees on its name',
  [...byId].every(([, e]) => e.labels.size === 1),
  [...byId].filter(([, e]) => e.labels.size > 1).map(([id]) => id).join(', '),
);
check(
  'a shared pattern lists every channel it can fire in',
  (ruleFor('em-dash')?.channels.length ?? 0) === 3,
  ruleFor('em-dash')?.channels.join(','),
);

/* ---- the validator now records three different things differently -------- */
//
// Before this, an over-long step, a missing subject line and a step that came
// back empty were all logged under `empty-step`, because none of them carried an
// id and the apps fall back to that. Any count built on it said "empty step" for
// a member whose actual problem was that they write long.

const li = getPack('linkedin');
const empty = validateOutput(li, {});
check(
  'an empty step is recorded as empty-step',
  empty.violations.some((v) => v.patternId === 'empty-step'),
);

const longStep = li.structure.find((s) => typeof s.maxChars === 'number')!;
const over = validateOutput(li, Object.fromEntries(li.structure.map((s) => [s.key, s.key === longStep.key ? 'a'.repeat((longStep.maxChars ?? 10) + 50) : 'fine'])));
check(
  'an over-long step is recorded as over-length, not as empty',
  over.violations.some((v) => v.patternId === 'over-length'),
  over.violations.map((v) => v.patternId).join(','),
);
check(
  '  and is soft, because length is a judgement not a failure',
  over.violations.find((v) => v.patternId === 'over-length')?.level === 'soft',
);

const ce = getPack('coldEmail');
const subjectStep = ce.structure.find((s) => s.subject)!;
const noSubject = validateOutput(ce, Object.fromEntries(ce.structure.map((s) => [s.key, 'fine'])));
check(
  'a missing subject line is recorded as empty-subject',
  noSubject.violations.some((v) => v.patternId === 'empty-subject'),
  subjectStep.key,
);
check(
  'every violation the validator produces now carries an id',
  [...empty.violations, ...over.violations, ...noSubject.violations].every((v) => Boolean(v.patternId ?? v.lawId)),
);

/* ---- counting ------------------------------------------------------------ */

const counted = agg({
  linkedin: [row(gen(['em-dash', 'em-dash', 'hedging']), gen(['em-dash']))],
  coldEmail: [row(gen(['ai-tell']))],
});
check('generations are counted', counted.generations === 3, `${counted.generations}`);
const emDash = counted.counts.find((c) => c.rule.id === 'em-dash')!;
check('a pattern firing twice in one generation counts twice', emDash.count === 3, `${emDash.count}`);
check('but appears in two generations, not three', emDash.generations === 2, `${emDash.generations}`);
check('the worst offender sorts first', counted.counts[0].rule.id === 'em-dash');
check('hard total counts hard rules only', counted.hard === 4, `${counted.hard}`);
check('soft total counts soft rules only', counted.soft === 1, `${counted.soft}`);
check('the earliest generation sets the since date', counted.since === '2026-08-20', String(counted.since));

const tie = agg({ linkedin: [row(gen(['ai-tell', 'hedging']))] });
check('at equal counts, hard sorts above soft', tie.counts[0].rule.level === 'hard', tie.counts.map((c) => c.rule.id).join(' > '));

/* ---- an id this build cannot name is counted, never echoed --------------- */

const NOW_ISO = '2026-08-31T09:00:00.000Z';
const strange = agg({ linkedin: [row(gen(['em-dash', 'some-rule-from-the-future', 'empty-step'], NOW_ISO))] });
check('an unknown id is counted', strange.unrecognised === 1, `${strange.unrecognised}`);
check('and does not become a row', strange.counts.every((c) => c.rule.id !== 'some-rule-from-the-future'));
check('while the known ones still count', strange.counts.length === 2, `${strange.counts.length}`);
check(
  'the unknown id never reaches the export',
  !exportText(strange, TODAY).includes('some-rule-from-the-future'),
);
check(
  'but the export says how many it could not name',
  /1 record this version cannot name/.test(exportText(strange, TODAY)),
);

/* ---- an empty-step from before ids were distinct is not classified ------- */
//
// Until every violation carried its own id, `empty-step` covered three things:
// an empty step and a missing subject line, both hard, and an over-long step,
// which is soft. Counting old records under the catalogue entry would report
// soft length problems as things that stop a message being sent, at the top of
// the list, to a coach. So they are counted apart.

const OLD_ISO = '2026-08-20T10:00:00.000Z';
const old = agg({ linkedin: [row(gen(['empty-step', 'em-dash'], OLD_ISO))] });
check('a pre-cutoff empty-step is set aside', old.legacyStructural === 1, `${old.legacyStructural}`);
check('  and is not counted as hard', old.hard === 1, `${old.hard}`);
check('  and does not appear as a rule', old.counts.every((c) => c.rule.id !== 'empty-step'));
check('  while the rest of that generation still counts', old.counts.length === 1);
check('  and it is not confused with an unnameable id', old.unrecognised === 0);

const fresh = agg({ linkedin: [row(gen(['empty-step'], NOW_ISO))] });
check('a post-cutoff empty-step IS classified', fresh.legacyStructural === 0);
check('  as hard, because now it means exactly one thing', fresh.hard === 1 && fresh.counts[0].rule.id === 'empty-step');

const undated = agg({ linkedin: [row({ ...gen(['empty-step']), at: '' })] });
check(
  'a record with no usable date is treated as old, because guessing new means guessing hard',
  undated.legacyStructural === 1 && undated.hard === 0,
  `${undated.legacyStructural}/${undated.hard}`,
);

check('the export explains the set-aside records', /before Ember told an empty step/.test(exportText(old, TODAY)));

/* ---- a channel that records nothing is declared, not absorbed ------------ */

const noUpwork = agg({ linkedin: [row(gen(['em-dash']))] });
check('an absent Upwork column is reported missing', noUpwork.channelsMissing.includes('upwork'));
check('and the two that work are reported counted', noUpwork.channelsCounted.length === 2);
check('the export says so plainly', /Not included: Upwork/.test(exportText(noUpwork, TODAY)));

const withUpwork = agg({ linkedin: [row(gen(['em-dash']))], upwork: [] });
check('an empty but present Upwork is counted, not missing', withUpwork.channelsMissing.length === 0);
check('and is not claimed in the export', !/Not included/.test(exportText(withUpwork, TODAY)));

/* ---- tolerant of every shape jsonb has ever held ------------------------- */

const messy = agg({
  linkedin: [
    { generation_meta: null },
    { generation_meta: undefined },
    { generation_meta: 'not an array' as never },
    { generation_meta: [null as never, { at: 'x' } as never, gen(['em-dash'])] },
  ],
  coldEmail: [row({ ...gen([]), violation_ids: undefined as never })],
});
check('null, undefined and the wrong type do not throw', messy.generations === 1, `${messy.generations}`);
check('and the one real record still counts', messy.counts.length === 1);

const badDate = agg({ linkedin: [row(gen(['em-dash'], 'not a date'))] });
check('an unparseable date is dropped rather than printed', badDate.since === null);
check('  and NaN never reaches the export', !exportText(badDate, TODAY).includes('NaN'));

/* ---- empty states -------------------------------------------------------- */

const nothing = agg({});
check('no data produces a valid, honest export', exportText(nothing, TODAY).includes('nothing to report'));
const clean = agg({ linkedin: [row(gen([]))] });
check('generations with no violations say so', /came back clean/.test(exportText(clean, TODAY)));
check('and are still counted as generations', clean.generations === 1);

/* ---- the acceptance: nothing but counts leaves the machine --------------- */
//
// Everything a lead, prospect or generation record can hold, stuffed with the
// nastiest content that could be constructed, including into the violation list
// itself.

const NASTY = [
  'Acme Corporation Ltd',
  'Dr. Margarethe O’Brien-Nakamura',
  'margarethe@acme-corp.example',
  'Hi Margarethe, I noticed your booking page 404s on mobile and thought',
  '"; DROP TABLE leads; --',
  '<script>alert(1)</script>',
  '日本語のクライアント',
  'https://linkedin.com/in/secret-prospect',
  'PROPRIETARY DEAL WORTH $250,000',
  'em-dash\nhedging',
  'a'.repeat(400),
];

const hostile: GenerationMeta[] = NASTY.map((n, i) => ({
  at: i % 2 ? n : '2026-08-20T10:00:00.000Z',
  pack_id: n,
  pack_version: n,
  case_study_id: n,
  case_study_title: n,
  case_study_score: 1,
  tier: n,
  rung: n,
  verdict: n,
  // The dangerous field: unvetted strings where ids belong.
  violation_ids: [n, 'em-dash', n],
}));

const hostileAgg = aggregateViolations({
  linkedin: [{ generation_meta: hostile }],
  coldEmail: [{ generation_meta: hostile }],
  upwork: [{ generation_meta: hostile }],
});
const hostileOut = exportText(hostileAgg, TODAY);

for (const needle of NASTY) {
  check(`the export does not carry: ${needle.slice(0, 34)}`, !hostileOut.includes(needle));
}
check('nor any fragment of the injected message', !/booking page|Margarethe|Acme|DROP TABLE|script|250,000/.test(hostileOut));
check('the real violations in the hostile records still counted', hostileAgg.counts.some((c) => c.rule.id === 'em-dash'));
check('and the hostile ids were counted as unnameable', hostileAgg.unrecognised === NASTY.length * 2 * 3, `${hostileAgg.unrecognised}`);

// A positive statement, not only an absence: every line is drawn from the fixed
// vocabulary this build ships, plus digits and dates.
const VOCAB = new Set<string>();
for (const rule of CATALOGUE.values()) {
  for (const w of `${rule.label} ${rule.because}`.split(/\s+/)) VOCAB.add(w.toLowerCase());
}
for (const w of (
  'ember doctrine check generation generations since across and not included that channel does ' +
  'record violations on this install so these totals are partial must fix before sending worth a ' +
  'look counts only no message text names lead details nothing the bans has fired every came back ' +
  'clean record records this version cannot name from made under an older build counted here listed ' +
  'linkedin cold email upwork recorded yet there is to report'
).split(/\s+/)) VOCAB.add(w);

const stray = hostileOut
  .split(/\s+/)
  .map((w) => w.replace(/[.,:;()"']/g, '').toLowerCase())
  .filter(Boolean)
  .filter((w) => !VOCAB.has(w))
  .filter((w) => !/^[\d-]+$/.test(w));
check('every word in the export comes from this build, not the database', stray.length === 0, stray.slice(0, 8).join(' '));

console.log(failures ? `\n${failures} FAILURES\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
