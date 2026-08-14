// Checks the proof vault's selection and naming behaviour.
//
//   npm run proof:test

import { rankCases, selectBest, usableFor } from '../src/lib/proof/select';
import { referTo, renderProof } from '../src/lib/proof/render';
import type { CaseStudy } from '../src/lib/proof/types';

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

const base: CaseStudy = {
  id: 'a', user_id: 'u', title: 'Untitled', client_name: null, anonymous_label: null,
  naming: 'anonymous_only', industry: null, company_size: null, buyer_role: null,
  problem: null, solution: null, outcome: null, metric_value: null, metric_label: null,
  timeframe: null, verified: false, source_note: null, file_path: null, file_name: null,
  file_size: null, extracted_text: null, active: true,
  created_at: '', updated_at: '',
};

const logistics: CaseStudy = {
  ...base, id: 'logistics', title: 'Dispatch triage', industry: 'Logistics',
  client_name: 'Northbeam Freight', anonymous_label: 'a regional freight carrier',
  naming: 'named', metric_value: '6 hours to 40 minutes', metric_label: 'daily triage time',
  verified: true,
};
const dental: CaseStudy = {
  ...base, id: 'dental', title: 'Recall automation', industry: 'Dental',
  anonymous_label: 'a multi-site dental group', metric_value: '31%', metric_label: 'recall rate lift',
};
const secretive: CaseStudy = {
  ...base, id: 'secretive', title: 'Unnameable', industry: 'Logistics',
  client_name: 'Confidential Co', naming: 'anonymous_only', anonymous_label: null,
};
const inactive: CaseStudy = { ...base, id: 'inactive', title: 'Old', active: false, industry: 'Logistics' };

const vault = [logistics, dental, secretive, inactive];

// --- matching
const ranked = rankCases(vault, { industry: 'Logistics' });
check('inactive cases excluded', !ranked.some((r) => r.caseStudy.id === 'inactive'));
check('industry match ranks first', ranked[0].caseStudy.id === 'logistics', ranked[0].caseStudy.id);
check('pick is explained', ranked[0].reasons.length > 0, ranked[0].reasons.join('; '));

const byNotes = rankCases([dental, secretive], { notes: 'A growing dental group in Ohio' });
check('free-text notes drive matching', byNotes[0].caseStudy.id === 'dental');

const metricWins = rankCases([dental, { ...base, id: 'nometric', title: 'No number' }], {});
check('a case with a hard number outranks one without', metricWins[0].caseStudy.id === 'dental');

// --- the naming rule
check('named client usable directly', referTo(logistics, 'direct') === 'Northbeam Freight');
check('named client anonymised in public', referTo(logistics, 'public') === 'a regional freight carrier');
check('anonymous-only never names, even directly', referTo(dental, 'direct') === 'a multi-site dental group');
check('unnameable case blocked from public', !usableFor(secretive, 'public'));
check('unnameable case allowed directly', usableFor(secretive, 'direct'));

const best = selectBest(vault, { industry: 'Logistics' }, 'public');
check('public selection skips the unnameable one', best?.caseStudy.id === 'logistics');

// --- rendering
const rendered = renderProof([logistics], 'direct');
check('render carries the number verbatim', rendered.includes('6 hours to 40 minutes'));
check('render forbids rounding', rendered.includes('do not round'));
check('render states the audience rule', rendered.includes('permitted'));

const publicRender = renderProof([logistics], 'public');
check('public render omits the client name', !publicRender.includes('Northbeam Freight'));
check('public render states the prohibition', publicRender.includes('prohibited'));

const unverified = renderProof([dental], 'direct');
check('unverified proof is flagged as such', unverified.includes('Self-reported'));
check('missing metric is called out', renderProof([secretive], 'direct').includes('No metric on record'));

console.log(failures ? `\n${failures} FAILURES` : '\nall checks passed');
process.exit(failures ? 1 : 0);
