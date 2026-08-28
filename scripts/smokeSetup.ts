// The setup completeness check.
//
//   npm run setup:test
//
// One assertion here matters more than all the others, and it is the brief's own
// acceptance: a member with zero client results, a completed proof interview and
// one sourced industry figure reads as READY, with no warnings and no
// suggestions. Most people arriving in this cohort have never had a client and
// cannot get one before their first send. Telling them they are incomplete for
// lacking a case study is untrue as well as useless — Ember keeps industry
// research in its own store and forces its source into the same message, so a
// figure used that way is honest.
//
// The other thing under test is the difference between "you have none" and "we
// could not look". A failed read rendered as an empty vault sends a member who
// has twenty case studies off to write their first one.

import { assessSetup, type SetupInputs } from '../src/lib/setup/completeness';
import { buildChannelPrompt } from '../src/lib/method/forChannel';
import type { IndustryEvidence, LoadedBrief } from '../src/lib/vertical/types';
import type { CaseStudy } from '../src/lib/proof/types';

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

const BASE: SetupInputs = {
  aiConfigured: true,
  about: 'I build AI systems for accounting firms.',
  legacyProof: '',
  caseCount: 0,
  evidenceCount: 0,
  interviewDone: false,
  hasBrief: false,
};

const at = (over: Partial<SetupInputs>) => assessSetup({ ...BASE, ...over });
const item = (r: ReturnType<typeof assessSetup>, id: string) => r.items.find((i) => i.id === id)!;
const suggested = (r: ReturnType<typeof assessSetup>, id: string) => r.suggestions.some((s) => s.id === id);

/* ---- the acceptance, spelled out ---------------------------------------- */

const beginner = at({ caseCount: 0, evidenceCount: 1, interviewDone: true, hasBrief: true });
check('a member with no client result but one sourced figure is READY', beginner.ready);
check('  and is shown no missing requirements', beginner.missingRequired.length === 0, `${beginner.missingRequired.length}`);
check('  and is not nagged to run the interview again', !suggested(beginner, 'interview'));
check('  and is not nagged for a brief they already have', !suggested(beginner, 'brief'));
check('  so nothing at all is suggested', beginner.suggestions.length === 0, `${beginner.suggestions.length}`);
check('  and the proof item reads as done', item(beginner, 'proof').state === 'done');
check(
  '  describing it as a real starting state rather than a shortfall',
  /starting state/i.test(item(beginner, 'proof').detail),
  item(beginner, 'proof').detail,
);

/* ---- what counts as something to point to -------------------------------- */

check('a case study counts', at({ caseCount: 1 }).ready);
check('a sourced industry figure counts', at({ evidenceCount: 1 }).ready);
check('the legacy free-text wins still count', at({ legacyProof: 'Cut a close from 9 days to 3.' }).ready);
check('whitespace is not proof', !at({ legacyProof: '   \n  ' }).ready);
check('nothing at all does not count', !at({}).ready);
check(
  'and the gap names both ways out of it rather than just the case study',
  /industry figure/i.test(item(at({}), 'proof').detail),
  item(at({}), 'proof').detail,
);

/* ---- research that exists but cannot be reached -------------------------- */
//
// A brief with no vertical named holds its evidence out of every generation.
// Reporting that member as having nothing is the failure this whole feature is
// about, with the app agreeing that everything is fine.

const stranded = at({ evidenceCount: 0, strandedEvidence: 3, hasBrief: true });
check('research behind an unusable brief is not counted as usable', !stranded.ready);
check('  and the gap says what is actually wrong', /no vertical named/i.test(item(stranded, 'proof').detail), item(stranded, 'proof').detail);
check('  and points at the brief rather than the vault', item(stranded, 'proof').anchor === 'setup-brief');
check('  and does not claim they have no research', !/add one case study/i.test(item(stranded, 'proof').detail));
check('legacy wins still carry someone whose brief is unusable', at({ strandedEvidence: 3, hasBrief: true, legacyProof: 'Cut a close from 9 to 3 days.' }).ready);

/* ---- the required three -------------------------------------------------- */

check('no provider key is a gap', item(at({ aiConfigured: false, caseCount: 1 }), 'provider').state === 'missing');
check('and it blocks ready', !at({ aiConfigured: false, caseCount: 1 }).ready);
check('no background is a gap', item(at({ about: '', caseCount: 1 }), 'about').state === 'missing');
check('a blank-space background is still a gap', item(at({ about: '   ', caseCount: 1 }), 'about').state === 'missing');
check('three requirements, no more', at({}).items.filter((i) => i.required).length === 3);
check('every gap names where to fix it', at({ aiConfigured: false, about: '' }).missingRequired.every((i) => Boolean(i.anchor)));

/* ---- a failed read is not an empty vault --------------------------------- */

const unread = at({ vaultUnknown: true, briefUnknown: true });
check('a failed read is unknown, not missing', item(unread, 'proof').state === 'unknown');
check('and it does not claim they have nothing', !/add one case study/i.test(item(unread, 'proof').detail));
check('it still blocks ready, because nothing can be promised', !unread.ready);
check(
  'a half-failed read is unknown too rather than guessing',
  item(at({ vaultUnknown: true }), 'proof').state === 'unknown',
);
check(
  'but a vault that failed while a figure IS present is still done',
  item(at({ vaultUnknown: true, evidenceCount: 2 }), 'proof').state === 'done',
);
check(
  'the interview is never suggested off the back of an unreadable vault',
  !suggested(at({ vaultUnknown: true }), 'interview'),
);

/* ---- suggestions stay suggestions ---------------------------------------- */

check('someone with no case studies who never ran the interview is offered it', suggested(at({ evidenceCount: 1, hasBrief: true }), 'interview'));
check('once run, it is never offered again', !suggested(at({ evidenceCount: 1, hasBrief: true, interviewDone: true }), 'interview'));
check('someone with case studies is not offered it either', !suggested(at({ caseCount: 3 }), 'interview'));
check('a missing brief is a suggestion, not a gap', suggested(at({ caseCount: 1 }), 'brief'));
check('and a suggestion never blocks ready', at({ caseCount: 1 }).ready);
check('no suggestion is marked required', at({}).suggestions.every((s) => !s.required));

/* ---- the generation-time warning ----------------------------------------- */
//
// The prompt builder decides which of the two notes an app shows. `proofEmpty`
// stayed as it was; the new pair is what the UI reads, because a member with a
// sourced figure was being told they had nothing.

const evidence = (n: number): IndustryEvidence[] =>
  Array.from({ length: n }, (_, k) => ({
    id: `e${k}`, user_id: 'u', brief_id: 'b',
    claim: 'Firms lose a fifth of billable hours to manual intake.',
    metric: '20%', source_name: 'Some Institute', source_url: null, source_year: '2025',
    applies_to: null, scope: 'vertical', confirmed: true, active: true,
    created_at: '', updated_at: '',
  }));

const brief = (n: number): LoadedBrief => ({
  brief: {
    id: 'b', user_id: 'u', label: 'Accounting', vertical: 'accounting', buyer_role: null,
    function_language: null, prototype_note: null, offer_shapes: null,
    failure_scenarios: [], source_text: null, active: true, created_at: '', updated_at: '',
  },
  evidence: evidence(n),
});

const caseStudy: CaseStudy = {
  id: 'c1', user_id: 'u', title: 'Cut a close from nine days to three',
  client_name: 'Acme', anonymous_label: null, naming: 'named',
  industry: 'accounting', company_size: null, buyer_role: null,
  problem: null, solution: null, outcome: 'Close went from 9 days to 3',
  metric_value: '3', metric_label: 'days', timeframe: null,
  verified: true, source_note: null, file_path: null, file_name: null,
  file_size: null, extracted_text: null, active: true, created_at: '', updated_at: '',
};

// localStorage is read by the prompt builder for the sender's own context.
const store: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

const bare = buildChannelPrompt('linkedin', { cases: [] });
check('with nothing at all, the app is told there is nothing to write from', bare.nothingToWriteFrom);
check('and that it is not merely industry-only', !bare.industryOnly);

const industry = buildChannelPrompt('linkedin', { cases: [], brief: brief(2), verticalMode: 'vertical' });
check('with a sourced figure, first-party proof is still empty', industry.proofEmpty);
check('but there IS something to write from', !industry.nothingToWriteFrom);
check('and the app is told to say so honestly', industry.industryOnly);
check('the evidence travels for the attribution check', industry.evidence.length === 2, `${industry.evidence.length}`);

const withCase = buildChannelPrompt('linkedin', { cases: [caseStudy] });
check('with a case study, neither note fires', !withCase.nothingToWriteFrom && !withCase.industryOnly);
check('and proof is not empty', !withCase.proofEmpty);

// Generic mode does not inject the brief, so its evidence is not in play and
// must not be counted as something the message can lean on.
const genericMode = buildChannelPrompt('linkedin', { cases: [], brief: brief(2), verticalMode: 'generic' });
check('a brief switched off is not something to write from', genericMode.nothingToWriteFrom);
check('and claims no industry backing', !genericMode.industryOnly);

const unreadable = buildChannelPrompt('linkedin', { cases: [], vaultUnavailable: true });
check('an unreadable vault never says there is nothing to write from', !unreadable.nothingToWriteFrom);
check('it says proof is unknown instead', unreadable.proofUnknown);

console.log(failures ? `\n${failures} FAILURES\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
