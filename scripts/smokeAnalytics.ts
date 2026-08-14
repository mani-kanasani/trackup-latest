// Checks the dashboard maths.
//
//   npm run analytics:test
//
// The failure this guards is a dashboard that flatters: counting what the app
// produced rather than what the operator sent, or printing a rate over a handful
// of messages that sends someone off to fix copy that was never the problem.

import {
  linkedInStats, coldEmailStats, upworkStats, totalStats,
  proofPerformance, activityByDay, sentInLast, safeRate, MIN_SAMPLE,
} from '../src/lib/analytics';
import type { Lead } from '../src/apps/linkedin/types';
import type { Prospect } from '../src/apps/coldemail/types';
import type { JobMaterial } from '../src/types';

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

const NOW = new Date('2026-08-20T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

const lead = (o: Partial<Lead>): Lead => ({
  id: Math.random().toString(36), user_id: 'u', name: 'X',
  linkedin_url: 'https://linkedin.com/in/x', status: 'new',
  created_at: '', updated_at: '', ...o,
});

// --- generated is not sent ---------------------------------------------------
const written = lead({ outreach: { connectionNote: 'hi' }, status: 'new' });
const actuallySent = lead({
  outreach: { connectionNote: 'hi' },
  sent_steps: { connectionNote: daysAgo(2), openerDm: daysAgo(1) },
  status: 'requested',
});
const li = linkedInStats([written, actuallySent]);
check('generating is not sending', li.messagesSent === 2, `${li.messagesSent}`);
check('only contacted people count as contacted', li.contacted === 1, `${li.contacted}`);
check('written-but-unsent is surfaced', li.generatedNotSent === 1, `${li.generatedNotSent}`);
check('both count as generated', li.generated === 2);

// --- a lead that advanced still counts at every stage it passed --------------
const advanced = linkedInStats([
  lead({ status: 'won', deal_value: 4000, sent_steps: { connectionNote: daysAgo(9) } }),
]);
check('a won lead counts as replied', advanced.replied === 1);
check('a won lead counts as a meeting', advanced.meetings === 1);
check('revenue only comes from won', advanced.revenue === 4000, String(advanced.revenue));
check('a won lead is closed', advanced.closed === 1);

const lostNoDeal = linkedInStats([lead({ status: 'lost', deal_value: 9999 })]);
check('a lost lead contributes no revenue', lostNoDeal.revenue === 0, String(lostNoDeal.revenue));

const noReply = linkedInStats([lead({ status: 'no_reply' })]);
check('no_reply closes without counting as a reply', noReply.closed === 1 && noReply.replied === 0);

// --- legacy rows --------------------------------------------------------------
const legacy = linkedInStats([lead({ sent_steps: ['connectionNote'], outreach: { connectionNote: 'hi' } })]);
check('a legacy array still counts as sent', legacy.messagesSent === 1 && legacy.contacted === 1);

// --- rates are withheld under the floor ---------------------------------------
check('a rate under the floor is withheld', safeRate(1, 3) === null);
check('a rate at the floor is given', safeRate(3, MIN_SAMPLE) !== null);
check('a rate on zero is withheld, not NaN', safeRate(0, 0) === null);

// --- cold email ----------------------------------------------------------------
const prospect = (o: Partial<Prospect>): Prospect => ({
  id: Math.random().toString(36), user_id: 'u', name: 'P', email: 'p@x.com',
  status: 'new', opted_out: false, created_at: '', updated_at: '', ...o,
});
const ce = coldEmailStats([
  prospect({ sequence: { openingEmail: 'a' }, sent_steps: { openingEmail: daysAgo(3) }, status: 'sent' }),
  prospect({ status: 'bounced' }),
]);
check('cold email counts its sends', ce.messagesSent === 1, String(ce.messagesSent));
check('a bounce closes without counting as a reply', ce.closed === 1 && ce.replied === 0);

// --- upwork ----------------------------------------------------------------------
const material = (o: Partial<JobMaterial>): JobMaterial => ({
  id: Math.random().toString(36), user_id: 'u', title: 't', summary: 's', cover_letter: '',
  proposal_document: '', mermaid_code: '', video_script: '', status: 'drafted',
  created_at: new Date(), updated_at: new Date(), ...o,
} as JobMaterial);
const up = upworkStats([
  material({ status: 'drafted' }),
  material({ status: 'applied' }),
  material({ status: 'won', actual_amount: 2500 }),
]);
check('a drafted proposal is not an application', up.messagesSent === 2, String(up.messagesSent));
check('drafted proposals show as unsent', up.generatedNotSent === 1);
check('actual amount is preferred for revenue', up.revenue === 2500, String(up.revenue));

// --- totals -----------------------------------------------------------------------
const all = totalStats([up, li, ce]);
check('totals add up', all.messagesSent === up.messagesSent + li.messagesSent + ce.messagesSent);
check('revenue totals add up', all.revenue === up.revenue + li.revenue + ce.revenue);

// --- activity ----------------------------------------------------------------------
const activity = activityByDay(
  [lead({ sent_steps: { a: daysAgo(0), b: daysAgo(0), c: daysAgo(5) } })],
  30,
  NOW,
);
check('activity spans the window', activity.length === 30);
check('two sends today land on today', activity[activity.length - 1].sent === 2, String(activity[activity.length - 1].sent));
check('a 7-day window excludes older sends', sentInLast([lead({ sent_steps: { a: daysAgo(20) } })], 7, NOW) === 0);

// A legacy send with no time must not be dated to today, which would invent a
// spike on whichever day someone opened the dashboard.
const legacyActivity = activityByDay([lead({ sent_steps: ['a', 'b'] })], 30, NOW);
check('undated sends do not fake a spike', legacyActivity.every((d) => d.sent === 0));

// --- which proof works ---------------------------------------------------------------
const meta = (id: string, title: string) => [{ case_study_id: id, case_study_title: title }];
const perf = proofPerformance([
  ...Array.from({ length: 12 }, (_, i) => ({ generation_meta: meta('a', 'Dispatch triage'), replied: i < 6 })),
  ...Array.from({ length: 2 }, () => ({ generation_meta: meta('b', 'Recall automation'), replied: true })),
  { generation_meta: null, replied: true },
]);
check('proof is grouped by case study', perf.length === 2, String(perf.length));
const a = perf.find((p) => p.caseStudyId === 'a')!;
const b = perf.find((p) => p.caseStudyId === 'b')!;
check('a well-sampled case study gets a rate', a.replyRate === 0.5, String(a.replyRate));
check('a thin one is counted but not rated', b.used === 2 && b.replyRate === null);
check('messages citing no proof are excluded', a.used + b.used === 14);

// The LAST generation is the one that produced the copy sent; a regenerated
// message must be attributed to the proof it actually carried.
const regenerated = proofPerformance([
  { generation_meta: [
      { case_study_id: 'old', case_study_title: 'Old' },
      { case_study_id: 'new', case_study_title: 'New' },
    ], replied: true },
]);
check('a regenerated message credits the latest proof', regenerated[0].caseStudyId === 'new', regenerated[0].caseStudyId);

console.log(failures ? `\n${failures} FAILURES` : '\nall checks passed');
process.exit(failures ? 1 : 0);
