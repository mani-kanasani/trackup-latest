// The vertical brief and the honesty rule.
//
//   npm run vertical:test

import { checkAttribution, figuresIn, isAttributed } from '../src/lib/vertical/attribution';
import { renderBrief } from '../src/lib/vertical/render';
import { buildChannelPrompt } from '../src/lib/method/forChannel';
import type { IndustryEvidence, LoadedBrief, VerticalBrief } from '../src/lib/vertical/types';
import { reviewExtraction, EXTRACTION_SYSTEM } from '../src/lib/vertical/extract';

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


// ---- the extractor is not trusted with attribution
//
// A model summarising a long document under instruction to produce citations is
// exactly where a confident, invented source appears. Stored, it would leave the
// attribution law enforcing a citation that does not exist, which is worse than
// having no law at all, because the copy then looks checked.
const DOC = [
  'Personal injury law blueprint.',
  'About 38% of personal injury leads arrive after hours, and a lead contacted within five',
  'minutes is 21 times more likely to qualify, per the Hennessey Digital 2025 lead-response',
  'study of 1,333 firms. The ABA 2025 TechReport finds 41% of firms name intake as their',
  'number one bottleneck. We cut a client demand-letter cycle from 15 hours to 3.',
].join(' ');

const reviewed = reviewExtraction({
  vertical: 'Personal injury law, US firms',
  industry_evidence: [
    { claim: 'Fast response wins', metric: '21 times more likely', source_name: 'Hennessey Digital' },
    { claim: 'Intake is the bottleneck', metric: '41%', source_name: 'ABA TechReport', source_year: '2025' },
    { claim: 'Firms see big gains', metric: '63% uplift', source_name: 'McKinsey' },
    { claim: 'Response times matter a lot', metric: '99%', source_name: 'Hennessey Digital' },
    { claim: 'Something everyone knows', metric: '55%' },
  ],
}, DOC);

const byClaim = (c: string) => reviewed.evidence.find((e) => e.claim === c)!;
check('a real source in the document is kept', byClaim('Fast response wins').ok);
check(
  'a source named slightly differently still matches',
  byClaim('Intake is the bottleneck').ok,
  'ABA TechReport against ABA 2025 TechReport',
);
check(
  'an invented source is rejected',
  !byClaim('Firms see big gains').ok && byClaim('Firms see big gains').reason === 'source-not-in-document',
);
check(
  'a figure not in the document is rejected',
  !byClaim('Response times matter a lot').ok &&
    byClaim('Response times matter a lot').reason === 'figure-not-in-document',
);
check(
  'a claim with no source at all is rejected',
  !byClaim('Something everyone knows').ok && byClaim('Something everyone knows').reason === 'no-source',
);
check('only verified rows are counted', reviewed.keptCount === 2, 'kept 2 of 5');
check('every rejection explains itself', reviewed.evidence.filter((e) => !e.ok).every((e) => !!e.note));
check('kept rows default to vertical scope', byClaim('Fast response wins').scope === 'vertical');
check('the brief fields survive review', reviewed.vertical === 'Personal injury law, US firms');
check('rejects are returned for review, never dropped silently', reviewed.evidence.length === 5);

check('the instruction forbids inventing a source', /NEVER invent a source/.test(EXTRACTION_SYSTEM));
check(
  'the instruction names all three buckets',
  ['industry_evidence', 'first_party_claims', 'unsourced_claims'].every((k) => EXTRACTION_SYSTEM.includes(k)),
);
check('the instruction keeps pricing out of offer shapes', /Never include prices/.test(EXTRACTION_SYSTEM));

console.log(`\nbrief adds ${on.systemPrompt.length - off.systemPrompt.length} chars to the prompt.`);
console.log(failures ? `\n${failures} FAILURES\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
