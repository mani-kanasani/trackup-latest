// Marking sent, logging a reply, and the question asked on return.
//
//   npm run activity:test
//
// Two properties matter more than the rest here, and both are about history not
// moving under a member's feet.
//
// A milestone never rewrites a timestamp that is already set, because the
// receipt for a past day has already been filed and a number that changes
// afterwards is worse than one that was never collected. And confirming a
// forgotten draft files it on the day it was WRITTEN, never today, because
// filing yesterday's work under today is the same error the whole feature
// exists to correct, only pointing the other way.

import {
  advanceTo, statusAfterSend, milestonePatch, currentMilestone,
} from '../src/lib/activity/milestones';
import {
  unmarkedDrafts, draftDateKey, draftRef, firstStepKey, loadDismissed, rememberDismissed,
} from '../src/lib/activity/drafts';
import { countsForDate } from '../src/lib/receipt/counts';
import { localDateKey, MAX_BACKDATE_DAYS } from '../src/lib/receipt/format';
import type { Lead } from '../src/apps/linkedin/types';
import type { Prospect } from '../src/apps/coldemail/types';
import type { JobMaterial } from '../src/types';

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

const NOW = new Date(2026, 7, 28, 9, 0, 0);
const daysAgo = (n: number, hour = 14) =>
  new Date(2026, 7, 28 - n, hour, 30, 0);

/* ---- the progression only ever runs forwards ----------------------------- */

check('a new lead advances to requested', advanceTo('lead', 'new', 'requested') === 'requested');
check('a connected lead is not dragged back to requested', advanceTo('lead', 'connected', 'requested') === null);
check('a lead does not advance to where it already is', advanceTo('lead', 'replied', 'replied') === null);
check('a won lead is never moved automatically', advanceTo('lead', 'won', 'meeting') === null);
check('a lost lead is never moved automatically', advanceTo('lead', 'lost', 'replied') === null);
check('a disqualified lead is never moved automatically', advanceTo('lead', 'disqualified', 'connected') === null);
check('a no-reply lead is never revived automatically', advanceTo('lead', 'no_reply', 'connected') === null);
check('a new prospect advances to sent', advanceTo('prospect', 'new', 'sent') === 'sent');
check('a bounced prospect is never moved automatically', advanceTo('prospect', 'bounced', 'sent') === null);
check('a drafted job advances to applied', advanceTo('job', 'drafted', 'applied') === 'applied');
check('an applied job is not dragged back to drafted', advanceTo('job', 'applied', 'drafted') === null);
check('an unknown status advances to nothing', advanceTo('lead', 'invented', 'requested') === null);

/* ---- what a send implies -------------------------------------------------- */

const LI_FIRST = firstStepKey('linkedin');
const CE_FIRST = firstStepKey('coldEmail');
check('the LinkedIn pack still opens with the connection note', LI_FIRST === 'connectionNote', String(LI_FIRST));
check('the cold email pack has a first scheduled step', Boolean(CE_FIRST), String(CE_FIRST));
check(
  'sending the connection request means requested, not connected',
  statusAfterSend('lead', LI_FIRST!, LI_FIRST) === 'requested',
);
check(
  'sending a direct message means connected',
  statusAfterSend('lead', 'proofDm', LI_FIRST) === 'connected',
);
check('every cold email step means sent', statusAfterSend('prospect', 'anything', CE_FIRST) === 'sent');

/* ---- logging a reply ------------------------------------------------------ */

const at = new Date(2026, 7, 28, 11, 0, 0);
const fresh = { status: 'connected' as const };

const replied = milestonePatch('lead', fresh, 'replied', at)!;
check('logging a reply sets the stage', replied.status === 'replied');
check('logging a reply stamps the date', replied.replied_at === at.toISOString());

const booked = milestonePatch('lead', fresh, 'call_booked', at)!;
check('booking a call sets the stage to meeting', booked.status === 'meeting');
check('booking a call also records that they replied', booked.replied_at === at.toISOString());
check('booking a call records the call date', booked.call_booked_at === at.toISOString());

const MONDAY = '2026-08-24T10:00:00.000Z';
const alreadyReplied = { status: 'replied' as const, replied_at: MONDAY };
const later = milestonePatch('lead', alreadyReplied, 'call_booked', at)!;
check('a call booked later does not rewrite the reply date', later.replied_at === undefined);
check('the call date is still recorded', later.call_booked_at === at.toISOString());
check('and the stage moves on', later.status === 'meeting');

const atMeeting = { status: 'meeting' as const, replied_at: MONDAY, call_booked_at: MONDAY };
check(
  'logging a reply on a lead already at meeting changes nothing at all',
  milestonePatch('lead', atMeeting, 'replied', at) === null,
);

const wonWithHoles = { status: 'won' as const };
const wonReply = milestonePatch('lead', wonWithHoles, 'replied', at)!;
check('a won lead missing its reply date still gets one', wonReply.replied_at === at.toISOString());
check('but a won lead is not demoted to replied', wonReply.status === undefined);

const noReply = milestonePatch('lead', { status: 'connected' }, 'no_reply', at)!;
check('no reply closes the lead', noReply.status === 'no_reply');
check('no reply stamps nothing, because nothing happened', noReply.replied_at === undefined && noReply.call_booked_at === undefined);

const jobReply = milestonePatch('job', { status: 'applied' }, 'replied', at)!;
check('a job reply uses the Upwork vocabulary', jobReply.status === 'responded');
const jobNoReply = milestonePatch('job', { status: 'applied' }, 'no_reply', at)!;
check('an unanswered proposal is closed as lost, the only state Upwork has', jobNoReply.status === 'lost');

check('a fresh lead reads as no milestone', currentMilestone('lead', { status: 'connected' }) === null);
check('a replied lead reads as replied', currentMilestone('lead', { status: 'replied', replied_at: MONDAY }) === 'replied');
check(
  'a booked lead reads as booked rather than replied',
  currentMilestone('lead', { status: 'meeting', replied_at: MONDAY, call_booked_at: MONDAY }) === 'call_booked',
);
check('a closed lead reads as no reply', currentMilestone('lead', { status: 'no_reply' }) === 'no_reply');
check(
  'a lead lost AFTER replying does not read as no reply',
  currentMilestone('lead', { status: 'lost', replied_at: MONDAY }) === 'replied',
);

/* ---- what still counts as an unanswered draft ---------------------------- */

const lead = (over: Partial<Lead>): Lead =>
  ({
    id: 'l1', user_id: 'u', name: 'Dana Reeve', linkedin_url: 'https://x', status: 'new',
    outreach: { connectionNote: 'hello there' },
    created_at: daysAgo(3).toISOString(), updated_at: daysAgo(1).toISOString(),
    ...over,
  }) as Lead;

const prospect = (over: Partial<Prospect>): Prospect =>
  ({
    id: 'p1', user_id: 'u', name: 'Sam Vale', email: 's@example.com', status: 'new',
    opted_out: false, sequence: { openingEmail: 'hi' },
    created_at: daysAgo(3).toISOString(), updated_at: daysAgo(1).toISOString(),
    ...over,
  }) as Prospect;

const job = (over: Partial<JobMaterial>): JobMaterial =>
  ({
    id: 'j1', user_id: 'u', title: 'Build an SDR', summary: '', cover_letter: 'x',
    proposal_document: '', mermaid_code: '', video_script: '', status: 'drafted',
    created_at: daysAgo(1), updated_at: daysAgo(1),
    ...over,
  }) as JobMaterial;

const CE_STEP = CE_FIRST!;
const seqProspect = prospect({ sequence: { [CE_STEP]: 'hi there' } });

const found = unmarkedDrafts({ leads: [lead({})], prospects: [seqProspect], jobs: [job({})] }, NOW);
check('all three channels are asked about', found.length === 3, `${found.length}`);
check('newest first', found[0].generatedAt >= found[found.length - 1].generatedAt);
check('the reference is unique per kind and row', new Set(found.map(draftRef)).size === 3);
check('a draft is filed on the day it was written', draftDateKey(found.find((d) => d.kind === 'lead')!) === localDateKey(daysAgo(1)));

const none = (src: Parameters<typeof unmarkedDrafts>[0]) => unmarkedDrafts(src, NOW).length === 0;

check('a lead written today is not asked about yet', none({ leads: [lead({ updated_at: new Date(2026, 7, 28, 8).toISOString() })], prospects: [], jobs: [] }));
check('a lead already marked sent is not asked about', none({ leads: [lead({ sent_steps: { connectionNote: daysAgo(1).toISOString() } })], prospects: [], jobs: [] }));
check('a legacy tick with no time still counts as marked', none({ leads: [lead({ sent_steps: ['connectionNote'] })], prospects: [], jobs: [] }));
check('a lead with no copy written is not asked about', none({ leads: [lead({ outreach: null })], prospects: [], jobs: [] }));
check('a lead whose only copy is a reply branch is not asked about', none({ leads: [lead({ outreach: { replyNotNow: 'later then' } })], prospects: [], jobs: [] }));
check('a closed lead is not asked about', none({ leads: [lead({ status: 'no_reply' })], prospects: [], jobs: [] }));
check('a won lead is not asked about', none({ leads: [lead({ status: 'won' })], prospects: [], jobs: [] }));
check('an opted-out prospect is never asked about', none({ leads: [], prospects: [prospect({ sequence: { [CE_STEP]: 'hi' }, opted_out: true })], jobs: [] }));
check('a job already applied is not asked about', none({ leads: [], prospects: [], jobs: [job({ status: 'applied' })] }));
check(
  'a draft older than the back-date window is left alone',
  none({ leads: [lead({ updated_at: daysAgo(MAX_BACKDATE_DAYS + 2).toISOString() })], prospects: [], jobs: [] }),
);
check(
  'a draft at the edge of the window is still asked about',
  unmarkedDrafts({ leads: [lead({ updated_at: daysAgo(MAX_BACKDATE_DAYS).toISOString() })], prospects: [], jobs: [] }, NOW).length === 1,
);
check(
  'generation_meta beats updated_at, because editing a step is not writing it',
  draftDateKey(
    unmarkedDrafts(
      {
        leads: [lead({
          generation_meta: [{ at: daysAgo(4).toISOString() } as never],
          updated_at: daysAgo(1).toISOString(),
        })],
        prospects: [], jobs: [],
      },
      NOW,
    )[0],
  ) === localDateKey(daysAgo(4)),
);
check(
  'a row with no usable date at all is skipped rather than dated to now',
  none({ leads: [lead({ updated_at: undefined as never, generation_meta: null })], prospects: [], jobs: [] }),
);

/* ---- confirming one lands on the right day, not on today ----------------- */

const draft = unmarkedDrafts({ leads: [lead({})], prospects: [], jobs: [] }, NOW)[0];
const confirmed: Lead = lead({ sent_steps: { [draft.stepKey!]: draft.generatedAt } });
const yesterday = localDateKey(daysAgo(1));
check(
  'confirming a forgotten draft files it on the day it was written',
  countsForDate({ leads: [confirmed], prospects: [], jobs: [] }, yesterday).linkedin === 1,
);
check(
  'and adds nothing to today',
  countsForDate({ leads: [confirmed], prospects: [], jobs: [] }, localDateKey(NOW)).linkedin === 0,
);

/* ---- the prompt asks once, per draft ------------------------------------- */

const store: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

check('nothing is dismissed to begin with', loadDismissed().size === 0);
rememberDismissed(['lead:l1', 'job:j1']);
check('a dismissal survives a reload', loadDismissed().has('lead:l1') && loadDismissed().has('job:j1'));
rememberDismissed(['lead:l1']);
check('dismissing the same draft twice does not duplicate it', loadDismissed().size === 2);
rememberDismissed(Array.from({ length: 400 }, (_, i) => `lead:${i}`));
check('the dismissal list is bounded', loadDismissed().size <= 300, `${loadDismissed().size}`);
check('and keeps the most recent', loadDismissed().has('lead:399'));

store['ember.activity.dismissedDrafts'] = '{not json';
check('a corrupt dismissal list asks again rather than crashing', loadDismissed().size === 0);
store['ember.activity.dismissedDrafts'] = '{"a":1}';
check('a dismissal list of the wrong shape asks again', loadDismissed().size === 0);

console.log(failures ? `\n${failures} FAILURES\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
