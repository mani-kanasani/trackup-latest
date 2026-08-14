// Checks the lead importer.
//
//   npm run import:test
//
// The failures worth guarding are the silent ones: a comma inside a company name
// shifting every column by one, five spellings of the same profile URL becoming
// five leads, and a row rejected with no reason given.

import {
  parseSheet, guessMapping, buildPlan, splitLine, detectDelimiter, normalizeLinkedInUrl,
} from '../src/lib/leadImport';

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

// --- splitting ---------------------------------------------------------------
check(
  'a quoted comma does not shift the columns',
  JSON.stringify(splitLine('Dana,"Reed, Baker & Co",CEO', ',')) === JSON.stringify(['Dana', 'Reed, Baker & Co', 'CEO']),
  splitLine('Dana,"Reed, Baker & Co",CEO', ',').join(' | '),
);
check('escaped quotes survive', splitLine('a,"say ""hi""",b', ',')[1] === 'say "hi"');
check('a spreadsheet paste is read as tab-separated', detectDelimiter('Name\tURL\nDana\thttps://x') === '\t');
check('a plain csv is read as comma-separated', detectDelimiter('Name,URL') === ',');

// --- one canonical URL per person -------------------------------------------
const variants = [
  'https://www.linkedin.com/in/dana-reed/',
  'http://linkedin.com/in/dana-reed',
  'linkedin.com/in/dana-reed/',
  'https://uk.linkedin.com/in/dana-reed',
  'https://www.linkedin.com/in/Dana-Reed',
];
const canonical = new Set(variants.map(normalizeLinkedInUrl));
check('five spellings collapse to one profile', canonical.size === 1, [...canonical].join(' | '));
check('a query string is dropped', normalizeLinkedInUrl('https://linkedin.com/in/dana-reed?utm=x') === 'https://linkedin.com/in/dana-reed');
check('junk does not throw', typeof normalizeLinkedInUrl('not a url') === 'string');

// --- headers ------------------------------------------------------------------
const withHeaders = parseSheet(
  'Full Name,Profile URL,Title,Company\nDana Reed,https://linkedin.com/in/dana-reed,CEO,Acme',
);
check('headers are detected', withHeaders.hadHeaders && withHeaders.rows.length === 1);
const m1 = guessMapping(withHeaders);
check('name maps', m1.name === 0, String(m1.name));
check('a differently-worded URL header still maps', m1.linkedin_url === 1, String(m1.linkedin_url));
check('title maps', m1.job_title === 2 && m1.company_name === 3);

// A headerless paste has to work: people copy rows without the header line.
const headerless = parseSheet('Dana Reed,https://linkedin.com/in/dana-reed,CEO');
check('a headerless paste keeps every row', !headerless.hadHeaders && headerless.rows.length === 1);
const m2 = guessMapping(headerless);
check('the URL column is found by content alone', m2.linkedin_url === 1, String(m2.linkedin_url));

// --- the plan -----------------------------------------------------------------
const sheet = parseSheet(
  [
    'Name,LinkedIn,Company',
    'Dana Reed,https://www.linkedin.com/in/dana-reed/,Acme',
    'Dana Again,https://linkedin.com/in/dana-reed,Acme',      // same person, different spelling
    'Existing Person,https://linkedin.com/in/already-here,Beta',
    'No Link,,Gamma',
    ',https://linkedin.com/in/nameless,Delta',
    'Wrong Site,https://twitter.com/someone,Epsilon',
    'Fine Lead,https://linkedin.com/in/fine-lead,Zeta',
  ].join('\n'),
);
const plan = buildPlan(sheet, guessMapping(sheet), ['https://www.linkedin.com/in/already-here/']);

check('good rows are ready', plan.ready.length === 2, plan.ready.map((r) => r.lead.name).join(','));
check('an in-paste duplicate is caught', plan.skipped.some((r) => /Duplicated inside/.test(r.problem ?? '')));
check('an existing lead is caught despite a different spelling', plan.skipped.some((r) => /Already in your list/.test(r.problem ?? '')));
check('a missing URL is caught', plan.skipped.some((r) => /No LinkedIn URL/.test(r.problem ?? '')));
check('a missing name is caught', plan.skipped.some((r) => /No name/.test(r.problem ?? '')));
check('a non-LinkedIn URL is caught', plan.skipped.some((r) => /Not a LinkedIn/.test(r.problem ?? '')));
check('every rejection says why', plan.skipped.every((r) => !!r.problem));
check('every rejection cites its line', plan.skipped.every((r) => r.line > 0));
check('the stored URL is the canonical one', plan.ready[0].lead.linkedin_url === 'https://linkedin.com/in/dana-reed');
check('a tidied URL is flagged as tidied', !!plan.ready[0].note);
check('optional columns come through', plan.ready[0].lead.company_name === 'Acme');

// A blank trailing line is not an error anyone should hear about.
const trailing = parseSheet('Name,LinkedIn\nDana,https://linkedin.com/in/dana\n\n');
const tp = buildPlan(trailing, guessMapping(trailing), []);
check('blank lines are ignored silently', tp.ready.length === 1 && tp.skipped.length === 0);

console.log(failures ? `\n${failures} FAILURES` : '\nall checks passed');
process.exit(failures ? 1 : 0);
