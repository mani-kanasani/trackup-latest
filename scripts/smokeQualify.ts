// Checks the qualification screen.
//
//   npm run qualify:test
//
// The cases that matter most are the ones where a screen goes wrong in a way
// nobody notices: declining an unresearched lead, passing a lead into Tier A on
// promise rather than research, and letting the copy argue from a pillar that
// was never confirmed.

import { qualify, isBlocked } from '../src/lib/qualify/score';
import { renderQualification, summarise } from '../src/lib/qualify/render';
import { PILLARS, PILLAR_THRESHOLD, RUNGS, TIERS } from '../src/lib/qualify/doctrine';
import { UNIVERSAL_BANNED } from '../src/lib/method/validate';
import type { QualificationInput } from '../src/lib/qualify/types';

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

// --- the threshold ----------------------------------------------------------

const empty = qualify();
check('an untouched lead is notYet, never declined', empty.verdict === 'notYet', empty.verdict);
check('an untouched lead comes back with questions', empty.openQuestions.length >= 4, `${empty.openQuestions.length}`);
check('an untouched lead is not blocked', !isBlocked(empty));

const oneYesRestNo = qualify({
  pillars: { repetitive: 'yes', timeConsuming: 'no', errorProne: 'no', scalable: 'no' },
});
check('one pillar with the rest ruled out is declined', oneYesRestNo.verdict === 'decline', oneYesRestNo.verdict);
check('a declined lead is blocked', isBlocked(oneYesRestNo));
check('a declined lead has no tier', oneYesRestNo.tier === null);
check('the decline says why', oneYesRestNo.blockers.join(' ').includes(String(PILLAR_THRESHOLD)));

const oneYesRestUnknown = qualify({ pillars: { repetitive: 'yes' } });
check(
  'one pillar with the rest unanswered is notYet, not declined',
  oneYesRestUnknown.verdict === 'notYet',
  oneYesRestUnknown.verdict,
);
check(
  'the notYet blocker calls it a research gap',
  oneYesRestUnknown.blockers.join(' ').includes('research gap'),
);

const twoYes = qualify({ pillars: { repetitive: 'yes', errorProne: 'yes' } });
check('two pillars clears the threshold', twoYes.verdict === 'qualified', twoYes.verdict);

// --- the quadrant overrides a passing pillar count --------------------------

const strongButPointless = qualify({
  pillars: { repetitive: 'yes', timeConsuming: 'yes', errorProne: 'yes', scalable: 'yes' },
  impact: 'low',
  complexity: 'high',
});
check(
  'the time-waster quadrant overrides four cleared pillars',
  strongButPointless.verdict === 'decline',
  strongButPointless.verdict,
);
check('the refusal names the quadrant', strongButPointless.blockers.join(' ').includes('refuse'));

const goldenSquare = qualify({
  pillars: { repetitive: 'yes', timeConsuming: 'yes' },
  impact: 'high',
  complexity: 'low',
});
check('high impact and low complexity is the quick win', goldenSquare.quadrant === 'quickWin');
check('a quick win outscores an equal-pillar time waster', goldenSquare.score > twoYes.score);

// --- tiering ----------------------------------------------------------------

const tierASignals: QualificationInput = {
  pillars: { repetitive: 'yes', errorProne: 'yes' },
  nicheClarity: 'specific',
  growthSignal: 'hiring a senior tax associate',
  reachable: 'verified',
};

const promisedNotDone = qualify(tierASignals);
check(
  'every Tier A signal but no observation lands in B',
  promisedNotDone.tier === 'B',
  String(promisedNotDone.tier),
);
check(
  'and says the research is what was missing',
  promisedNotDone.reasons.join(' ').includes('earned by the research'),
);

const researched = qualify({ ...tierASignals, observation: 'You opened the Fort Wayne office last spring.' });
check('signals plus a written observation is Tier A', researched.tier === 'A', String(researched.tier));

const unreachable = qualify({ ...tierASignals, reachable: 'uncertain' });
check('an unreachable buyer drops to Tier C', unreachable.tier === 'C', String(unreachable.tier));

const noNiche = qualify({ pillars: { repetitive: 'yes', errorProne: 'yes' }, nicheClarity: 'unclear' });
check('an unclear niche drops to Tier C', noNiche.tier === 'C', String(noNiche.tier));

const plain = qualify({ pillars: { repetitive: 'yes', errorProne: 'yes' } });
check('a lead with nothing remarkable is Tier B', plain.tier === 'B', String(plain.tier));

// --- what reaches the prompt ------------------------------------------------

const bottomRung = qualify({
  pillars: { repetitive: 'yes', errorProne: 'yes' },
  rung: 'bottom',
  nicheClarity: 'generic',
});
const bottomPrompt = renderQualification(bottomRung);
check('the rung instruction reaches the prompt', bottomPrompt.includes(RUNGS.bottom.instruction));
check('a bottom-rung brief forbids pitching', /do not pitch/i.test(bottomPrompt));

const topRung = qualify({ pillars: { repetitive: 'yes', errorProne: 'yes' }, rung: 'top' });
const topPrompt = renderQualification(topRung);
check('a top-rung brief forbids educating', /do not educate/i.test(topPrompt));
check('the two rungs produce different briefs', topPrompt !== bottomPrompt);

const tierCPrompt = renderQualification(noNiche);
check('the Tier C ceiling reaches the prompt', tierCPrompt.includes(TIERS.C.ceiling));
check('the Tier C ceiling forbids an invented detail', /inventing a specific detail/i.test(tierCPrompt));

const unconfirmed = qualify({ pillars: { repetitive: 'yes', timeConsuming: 'yes', errorProne: 'no' } });
const unconfirmedPrompt = renderQualification(unconfirmed);
const errorPronePillar = PILLARS.find((p) => p.id === 'errorProne')!;
check(
  'a confirmed pillar publishes what it licenses',
  unconfirmedPrompt.includes(PILLARS.find((p) => p.id === 'repetitive')!.licenses),
);
check(
  'a ruled-out pillar is named as unconfirmed',
  unconfirmedPrompt.includes(`${errorPronePillar.label} is not confirmed`),
);
check(
  'and its licensed angle is withheld',
  !unconfirmedPrompt.includes(errorPronePillar.licenses),
);

const declinedPrompt = renderQualification(oneYesRestNo);
check('a declined lead renders a refusal, not a brief', /did not pass qualification/i.test(declinedPrompt));
check('the refusal carries no tier ceiling', !declinedPrompt.includes(TIERS.B.ceiling));

// --- scoring stays in range -------------------------------------------------

const maxed = qualify({
  pillars: { repetitive: 'yes', timeConsuming: 'yes', errorProne: 'yes', scalable: 'yes' },
  bonus: { doneThreeTimes: 'yes', clearPattern: 'yes', feelsBoring: 'yes' },
  impact: 'high',
  complexity: 'low',
  rung: 'top',
  nicheClarity: 'specific',
  growthSignal: 'opened a second office',
  reachable: 'verified',
  observation: 'Your contractor page is more specific than most firms twice your size.',
});
check('a perfect lead scores 100', maxed.score === 100, String(maxed.score));
check('a perfect lead is Tier A and qualified', maxed.tier === 'A' && maxed.verdict === 'qualified');
check('score never leaves 0–100', empty.score >= 0 && empty.score <= 100, String(empty.score));

// --- the one-liner ----------------------------------------------------------

check('summary names the tier when qualified', summarise(researched).includes('Tier A'), summarise(researched));
check('summary names the decline', summarise(oneYesRestNo) === 'Declined by the screen');
check('summary counts open questions', /question/.test(summarise(empty)), summarise(empty));
check(
  'a low score on a qualified lead says what is missing',
  summarise(researched).includes('unanswered'),
  summarise(researched),
);
check('a fully answered lead carries no caveat', !summarise(maxed).includes('unanswered'), summarise(maxed));

// --- the brief must obey the rules it is about to impose --------------------
//
// The prompt is written in the register the output is expected to copy, so a
// system prompt full of em dashes is asking for output full of em dashes — and
// the validator then hard-fails copy the prompt itself modelled. Checking the
// brief against the same hard bans is cheap and catches it at build time.

const briefs = [researched, plain, noNiche, bottomRung, topRung, maxed, unconfirmed, oneYesRestNo]
  .map(renderQualification)
  .concat(Object.values(TIERS).map((t) => `${t.effort} ${t.ceiling}`))
  .concat(Object.values(RUNGS).map((r) => `${r.state} ${r.instruction}`));

for (const b of UNIVERSAL_BANNED.filter((p) => p.level === 'hard')) {
  const offender = briefs.find((text) => b.pattern.test(text));
  check(
    `no brief contains a hard-banned pattern: ${b.id}`,
    !offender,
    offender ? `"${offender.match(b.pattern)?.[0]}" in "${offender.slice(0, 60)}…"` : '',
  );
}

console.log(failures ? `\n${failures} FAILURES` : '\nall checks passed');
process.exit(failures ? 1 : 0);
