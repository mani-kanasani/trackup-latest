// The vertical brief and the honesty rule.
//
//   npm run vertical:test

import { checkAttribution, figuresIn, isAttributed } from '../src/lib/vertical/attribution';
import { renderBrief } from '../src/lib/vertical/render';
import { buildChannelPrompt } from '../src/lib/method/forChannel';
import type { IndustryEvidence, LoadedBrief, VerticalBrief } from '../src/lib/vertical/types';

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

const ev = (over: Partial<IndustryEvidence> = {}): IndustryEvidence => ({
  id: 'e1', user_id: 'u', brief_id: 'b',
  claim: 'A lead contacted within five minutes is far more likely to qualify.',
  metric: '21 times more likely to qualify',
  source_name: 'Hennessey Digital',
  source_url: null, source_year: '2025',
  applies_to: 'lead response', scope: 'vertical', confirmed: true,
  active: true, created_at: '', updated_at: '', ...over,
});

// ---- figure extraction
check('reads "21 times" as 21x', figuresIn('21 times more likely').includes('21x'));
check('reads a percentage', figuresIn('about 38% arrive after hours').includes('38%'));
check('reads a large money figure', figuresIn('$250,000 a year').some((f) => f.includes('250000')));
check(
  'ignores bare small numbers',
  figuresIn('within five minutes, 5 steps, 30 days').length === 0,
  'so "30 days" in ordinary copy is not a violation',
);

// ---- attribution matching
check('credits the source when named', isAttributed('Hennessey Digital found that...', ev()));
check('matches a partial name', isAttributed('per Hennessey, response time decides it', ev()));
check('does not credit when absent', !isAttributed('Leads convert 21x better when you are fast', ev()));
check(
  'ignores generic words in a source name',
  !isAttributed('our digital study found', ev({ source_name: 'Hennessey Digital' })),
  'a match on "digital" alone would be meaningless',
);

// ---- the law
const unattributed = checkAttribution('openingEmail', 'Firms that answer fast convert 21x better.', [ev()]);
check('unattributed borrowed figure is a HARD violation', unattributed.length === 1 && unattributed[0].level === 'hard');
check('the violation names the source to credit', /Hennessey Digital/.test(unattributed[0]?.message ?? ''));

const attributed = checkAttribution(
  'openingEmail',
  'Hennessey Digital found firms answering inside five minutes convert 21x better.',
  [ev()],
);
check('the same figure passes once credited', attributed.length === 0);

check(
  'the phrasing variant is caught too',
  checkAttribution('s', 'you would be 21 times more likely to convert', [ev()]).length === 1,
  '"21 times" and "21x" are the same claim',
);

check(
  'ordinary copy with no borrowed figure is clean',
  checkAttribution('s', 'I noticed you run intake through a web form. Worth a look?', [ev()]).length === 0,
);

check(
  'evidence with no metric never fires',
  checkAttribution('s', 'anything at all', [ev({ metric: null })]).length === 0,
);

// ---- the prompt
const brief: VerticalBrief = {
  id: 'b', user_id: 'u', label: 'PI law', vertical: 'Personal injury law, US firms',
  buyer_role: 'Managing partner', function_language: 'We run the intake function.',
  prototype_note: 'A 24/7 intake agent that books the consult.',
  offer_shapes: 'Pilot, Engine, Partner',
  failure_scenarios: [
    { category: 'acquisition', scenario: 'Lead calls at 11pm and hits voicemail', cost: 'signs with the next firm' },
    { category: 'operations', scenario: 'Demand letters take 8 to 15 hours each' },
  ],
  source_text: null, active: true, created_at: '', updated_at: '',
};
const loaded: LoadedBrief = { brief, evidence: [ev()] };
const rendered = renderBrief(loaded);

check('the brief renders the vertical', rendered.includes('Personal injury law'));
check('failure scenarios reach the prompt', rendered.includes('hits voicemail'));
check('evidence is labelled as not the sender\'s', /DID NOT PRODUCE/.test(rendered));
check('the figure carries its source inline', /Hennessey Digital/.test(rendered));
check(
  'the brief is far smaller than a growth sheet',
  rendered.length < 3000,
  `${rendered.length} chars vs ~17,000 for the source document`,
);

const off = buildChannelPrompt('coldEmail', { brief: loaded, verticalMode: 'generic' });
const on = buildChannelPrompt('coldEmail', { brief: loaded, verticalMode: 'vertical' });
check('generic mode injects nothing', !off.systemPrompt.includes('Personal injury law') && off.usingBrief === false);
check('generic mode reports no evidence to grade', off.evidence.length === 0);
check('vertical mode injects the brief', on.systemPrompt.includes('Personal injury law') && on.usingBrief === true);
check('vertical mode passes evidence to the validator', on.evidence.length === 1);
// Ordering only means anything when BOTH sections exist, so this build carries
// a case study as well as the brief. The first version of this check passed a
// prompt with no proof at all, where indexOf returns -1 and the assertion was
// comparing against a section that was never there.
const withProof = buildChannelPrompt('coldEmail', {
  brief: loaded,
  verticalMode: 'vertical',
  cases: [{
    id: 'c1', user_id: 'u', title: 'Intake rebuild', client_name: 'Fenwick Law',
    anonymous_label: 'a regional firm', naming: 'named',
    industry: 'Legal', company_size: null, buyer_role: null,
    problem: 'Missed after-hours leads', solution: 'Voice intake agent',
    outcome: 'Booked consults overnight', metric_value: '38', metric_label: 'more consults',
    timeframe: '60 days', verified: true, source_note: null,
    file_path: null, file_name: null, file_size: null, extracted_text: null,
    active: true, created_at: '', updated_at: '',
  }],
});
const iCategory = withProof.systemPrompt.indexOf("reader's category");
const iProof = withProof.systemPrompt.indexOf("sender's verified proof");
check('both sections present in that build', iCategory > -1 && iProof > -1, `category@${iCategory} proof@${iProof}`);
check(
  'the category section precedes the sender own proof',
  iCategory < iProof,
  'so the model reads "not yours" before it reads "yours"',
);
check(
  'the two sections say opposite things',
  /DID NOT PRODUCE/.test(withProof.systemPrompt) && /This IS theirs/.test(withProof.systemPrompt),
);
check(
  'upwork defaults to generic',
  buildChannelPrompt('upwork', { brief: loaded }).verticalMode === 'generic',
);
check(
  'linkedin and cold email default to vertical',
  buildChannelPrompt('linkedin', { brief: loaded }).verticalMode === 'vertical' &&
    buildChannelPrompt('coldEmail', { brief: loaded }).verticalMode === 'vertical',
);
check(
  'no brief means no vertical section even in vertical mode',
  !buildChannelPrompt('coldEmail', { verticalMode: 'vertical' }).systemPrompt.includes("reader's category"),
);

console.log(`\nbrief adds ${on.systemPrompt.length - off.systemPrompt.length} chars to the prompt.`);
console.log(failures ? `\n${failures} FAILURES\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
