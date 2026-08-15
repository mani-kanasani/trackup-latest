// End-to-end check of the method engine:
//   pack -> composed system prompt -> validator against good and bad output.
//
//   npm run method:test

import { getPack, ALL_PACKS } from '../src/lib/method/packs/index';
import { composeSystemPrompt, describePack } from '../src/lib/method/compose';
import { outputSteps } from '../src/lib/method/forChannel';
import { validateOutput } from '../src/lib/method/validate';
import { subjectKey } from '../src/lib/method/types';
import { qualify } from '../src/lib/qualify/score';
import { renderQualification } from '../src/lib/qualify/render';
import { RUNGS, TIERS } from '../src/lib/qualify/doctrine';

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

// ---- every pack is structurally sound
for (const p of ALL_PACKS) {
  const keys = p.structure.map((s) => s.key);
  check(`${p.id}: step keys unique`, new Set(keys).size === keys.length);
  check(`${p.id}: every law cites a source`, p.laws.every((l) => !!l.source?.label));
  check(`${p.id}: banned ids unique`, new Set(p.banned.map((b) => b.id)).size === p.banned.length);
  check(`${p.id}: every step is grouped`, p.structure.every((s) => !!s.group));

  // The contract the generator is asked for must be the contract the validator
  // grades. When these drifted, every step came back "empty. Regenerate." on top
  // of copy that was fine, and the warning list was pure noise.
  //
  // Compared as SETS, not counts. This used to assume one output key per
  // structure step, which stopped being true the moment a step could carry its
  // own subject line: the count check then failed on a pack that was correct,
  // while still being unable to notice a requested key that nothing grades —
  // the actual bug it exists to catch.
  const requested = outputSteps(p).map((s) => s.key);
  const validated = p.structure.flatMap((s) => (s.subject ? [s.key, subjectKey(s.key)] : [s.key]));
  const missing = requested.filter((k) => !validated.includes(k));
  const ungraded = validated.filter((k) => !requested.includes(k));
  check(
    `${p.id}: requested keys === validated keys`,
    missing.length === 0 && ungraded.length === 0,
    missing.length || ungraded.length
      ? `requested but never graded: [${missing}]; graded but never requested: [${ungraded}]`
      : `${requested.length} keys`,
  );

  // A response carrying every requested key must pass. If it cannot, the app
  // shows violations no user can ever clear.
  const filled: Record<string, string> = {};
  for (const k of requested) {
    filled[k] = 'Your team page lists four estimators and nobody on business development. When a particular kind of client comes in, does one arrive through the network, or do you go find them?';
  }
  const graded = validateOutput(p, filled);
  check(`${p.id}: a complete response passes`, graded.ok, `${graded.hardCount} hard`);
}

// ---- the doctrine must obey the rules it imposes
//
// Every pack hard-bans the em dash on the grounds that it reads as
// machine-written, and the doctrine itself used to contain 214 of them. A prompt
// is written in the register its output copies, so this was the app asking for
// exactly what it then rejected.
for (const p of ALL_PACKS) {
  const authored = [
    p.thesis,
    p.primeDirective,
    ...p.laws.flatMap((l) => [l.rule, l.because]),
    ...p.structure.flatMap((st) => [st.label, st.purpose, ...st.constraints]),
  ].join(' ');
  check(`${p.id}: doctrine contains no em or en dash`, !/[—–]/.test(authored));
}

// ---- the prompt actually carries the doctrine
const pack = getPack('coldEmail');
const prompt = composeSystemPrompt({
  pack,
  context: 'I build lead-routing systems for mid-size logistics firms.',
  proof: 'Cut a dispatcher team from 6 hours of manual triage a day to about 40 minutes.',
  userPrompt: 'Keep it dry. No exclamation marks.',
});

check('prompt includes the prime directive', prompt.includes(pack.primeDirective));
check('prompt includes every law', pack.laws.every((l) => prompt.includes(l.rule)));
check('prompt includes the user context', prompt.includes('logistics'));
check('prompt includes the proof', prompt.includes('40 minutes'));
check('prompt includes the user override', prompt.includes('No exclamation marks'));
check('prompt forbids inventing numbers', prompt.includes('never round one up'));
check('prompt is substantial', prompt.length > 3000, `${prompt.length} chars`);

// ---- the screen's brief reaches the prompt, in the right place
const briefed = composeSystemPrompt({
  pack,
  qualification: renderQualification(
    qualify({
      pillars: { repetitive: 'yes', errorProne: 'yes' },
      rung: 'bottom',
      nicheClarity: 'unclear',
    }),
  ),
  context: 'I build lead-routing systems for mid-size logistics firms.',
  proof: 'Cut a dispatcher team from 6 hours of manual triage a day to about 40 minutes.',
});
check('prompt carries what the message must do', briefed.includes(RUNGS.bottom.instruction));
check('prompt carries the tier ceiling', briefed.includes(TIERS.C.ceiling));
check(
  'the brief precedes the sender and their proof',
  briefed.indexOf('What this message has to do') < briefed.indexOf('Who the sender is'),
);
check(
  'the closing check is extended when a brief is present',
  briefed.includes('delete any that exceeds it') && !prompt.includes('delete any that exceeds it'),
);

// ---- the validator catches what the doctrine forbids
const stepKeys = pack.structure.map((s) => s.key);
// Built from the CONTRACT rather than from pack.structure, so a key the
// generator is asked for cannot quietly go untested. Subjects get their own
// value because they are graded against a much tighter ceiling than a body.
const subjectKeys = new Set(
  pack.structure.filter((s) => s.subject).map((s) => subjectKey(s.key)),
);
const clean: Record<string, string> = {};
for (const { key } of outputSteps(pack)) {
  clean[key] = subjectKeys.has(key)
    ? 'four estimators'
    : 'Your team page lists four estimators and nobody on business development. When you want a particular kind of client, does one arrive through the network, or do you go find them?';
}
const cleanResult = validateOutput(pack, clean);
check('clean output passes', cleanResult.ok, `${cleanResult.hardCount} hard, ${cleanResult.softCount} soft`);

const dirty = { ...clean };
dirty[stepKeys[1]] = 'Hi there — I hope this email finds you well. Just checking in, and I am not pitching. Book a demo: https://example.com';
const dirtyResult = validateOutput(pack, dirty);
check('dirty output fails', !dirtyResult.ok, `${dirtyResult.hardCount} hard violations`);
check(
  'em dash caught',
  dirtyResult.violations.some((v) => v.patternId === 'em-dash'),
);
check(
  'hedging caught',
  dirtyResult.violations.some((v) => v.patternId === 'hedging'),
);
check(
  'negated negative caught',
  dirtyResult.violations.some((v) => v.patternId === 'negative-plant'),
);

const empty = { ...clean };
empty[stepKeys[0]] = '';
check('empty step caught', !validateOutput(pack, empty).ok);

// ---- subject lines
//
// Cold email shipped with no subject line anywhere: the rule lived inside the
// opening email's own constraints, so the model folded it into the body or
// dropped it, and nothing ever asked for the key so nothing ever reported it
// missing. These checks pin all three halves of the fix — asked for, graded,
// and confined to the step that actually opens a thread.
const SUBJECT_KEY = subjectKey('openingEmail');
check(
  'cold email asks for a subject line',
  outputSteps(pack).some((s) => s.key === SUBJECT_KEY),
);
check(
  'the subject is requested before the body it belongs to',
  outputSteps(pack).findIndex((s) => s.key === SUBJECT_KEY) <
    outputSteps(pack).findIndex((s) => s.key === 'openingEmail'),
);

const noSubject = { ...clean };
noSubject[SUBJECT_KEY] = '';
check(
  'a missing subject is a hard failure',
  validateOutput(pack, noSubject).violations.some((v) => v.stepKey === SUBJECT_KEY && v.level === 'hard'),
);

// The fabricated-Re and "quick question" patterns were written to match a BARE
// subject with no "subject:" prefix, which only pays off if the field is
// actually graded. Before this, it was the one field nothing checked.
const fakeThread = { ...clean };
fakeThread[SUBJECT_KEY] = 'Re: our chat';
check(
  'a faked reply in the subject is caught',
  validateOutput(pack, fakeThread).violations.some(
    (v) => v.stepKey === SUBJECT_KEY && v.patternId === 'fabricated-re-subject',
  ),
);

const longSubject = { ...clean };
longSubject[SUBJECT_KEY] = 'a subject line far longer than the ceiling this field is held to';
check(
  'an overlong subject is nudged',
  validateOutput(pack, longSubject).violations.some((v) => v.stepKey === SUBJECT_KEY && v.level === 'soft'),
);

// Follow-ups reply on the opening thread, so giving them their own subject is
// how you end up generating the fabricated 'Re:' the doctrine bans.
check(
  'only the thread-opening email carries a subject',
  pack.structure.filter((s) => s.subject).map((s) => s.key).join(',') === 'openingEmail',
);
for (const other of ALL_PACKS.filter((p) => p.id !== 'coldEmail')) {
  check(
    `${other.id}: no subject lines`,
    other.structure.every((s) => !s.subject),
  );
}

console.log(`\n${describePack(pack).split('\n').slice(-1)[0]}`);
console.log(failures ? `\n${failures} FAILURES` : '\nall checks passed');
process.exit(failures ? 1 : 0);
