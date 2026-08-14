// Checks the cadence derivation.
//
//   npm run cadence:test
//
// Date arithmetic is where an outreach tool quietly ruins someone's week, so the
// cases here are the ones that would be wrong in a way nobody notices: a lead
// that has never been messaged, a legacy row with no send time, and a reply that
// must stop the sequence dead.

import { getPack } from '../src/lib/method/packs/index';
import { cadenceFor, dueQueue, isDue, scheduledSteps, pendingInvitationDays, daysFromToday, STALE_INVITATION_DAYS } from '../src/lib/cadence';
import { readSentSteps } from '../src/apps/linkedin/types';
import type { Lead, LeadStatus } from '../src/apps/linkedin/types';

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

const pack = getPack('linkedin');
const NOW = new Date('2026-08-20T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: 'l1', user_id: 'u', name: 'Dana Reed', linkedin_url: 'https://linkedin.com/in/dana',
  status: 'requested' as LeadStatus, created_at: '', updated_at: '', ...over,
});

// --- the schedule comes from the pack ---------------------------------------
const scheduled = scheduledSteps(pack);
check('only dated steps are scheduled', scheduled.length > 0 && scheduled.every((s) => typeof s.day === 'number'), `${scheduled.length} of ${pack.structure.length}`);
check('reply branches are not scheduled', scheduled.every((s) => !s.key.startsWith('reply')));

// --- a lead nobody has messaged is due NOW, not exempt ----------------------
const fresh = cadenceFor(lead({ status: 'new' }), pack, {}, NOW);
check('an unstarted lead has no due dates', fresh.steps.every((s) => s.dueAt === null));
check('an unstarted lead is still due', isDue(fresh));
check('its next step is the first in the pack', fresh.next?.step.key === scheduled[0].key, String(fresh.next?.step.key));

// --- spacing runs from the first SEND, not from lead creation ---------------
const started = cadenceFor(lead(), pack, readSentSteps({ [scheduled[0].key]: daysAgo(5) }), NOW);
const second = started.steps[1];
const expectedGap = (scheduled[1].day ?? 0) - (scheduled[0].day ?? 0);
check(
  'the second step is dated off the first send',
  second.daysUntilDue === expectedGap - 5,
  `due in ${second.daysUntilDue}, gap ${expectedGap}, sent 5d ago`,
);
check('the first step reads as sent', started.steps[0].sent && !!started.steps[0].sentAt);
check('overdue is reported as a positive number', started.daysOverdue >= 0, String(started.daysOverdue));

// --- a reply stops everything ------------------------------------------------
const replied = cadenceFor(lead({ status: 'replied' }), pack, readSentSteps({ [scheduled[0].key]: daysAgo(9) }), NOW);
check('a reply halts the sequence', replied.next === null && !!replied.haltedBecause);
check('and says why', /replied/i.test(replied.haltedBecause ?? ''));
check('a halted lead is not in the queue', !isDue(replied));

const won = cadenceFor(lead({ status: 'won' }), pack, {}, NOW);
check('a terminal lead halts too', !isDue(won) && /closed as won/i.test(won.haltedBecause ?? ''));

const disqualified = cadenceFor(lead({ status: 'disqualified' }), pack, {}, NOW);
check('disqualified drains from the queue', !isDue(disqualified));

// --- legacy rows: sent, time unknown ----------------------------------------
const legacy = cadenceFor(lead(), pack, readSentSteps([scheduled[0].key]), NOW);
check('a legacy row still shows the step as sent', legacy.steps[0].sent);
check('but refuses to invent a due date', legacy.steps[1].dueAt === null);
check('and stays actionable rather than vanishing', isDue(legacy));

// --- ordering ----------------------------------------------------------------
const veryLate = cadenceFor(lead({ id: 'late', name: 'Alex Kim' }), pack, readSentSteps({ [scheduled[0].key]: daysAgo(30) }), NOW);
const queue = dueQueue([started, veryLate, replied, fresh]);
check('halted leads are excluded from the queue', !queue.some((c) => c.lead.status === 'replied'));
check('most overdue sorts first', queue[0].lead.id === 'late', queue.map((c) => c.lead.id).join(','));

// --- pending invitations ------------------------------------------------------
const stale = pendingInvitationDays(lead({ status: 'requested' }), readSentSteps({ [scheduled[0].key]: daysAgo(25) }), NOW);
check('a pending invitation reports its age', stale === 25, String(stale));
check('and that clears the withdraw threshold', (stale ?? 0) > STALE_INVITATION_DAYS);
check('a connected lead has no pending age', pendingInvitationDays(lead({ status: 'connected' }), {}, NOW) === null);
check('a legacy send time yields no age', pendingInvitationDays(lead(), readSentSteps([scheduled[0].key]), NOW) === null);

// --- day arithmetic is whole days in the OPERATOR'S timezone -----------------
//
// Local, not UTC, and deliberately: "due today" has to mean the day the person
// looking at the screen is having. Constructed with local components here for
// the same reason — an earlier version of this test built UTC instants and
// failed everywhere east of Greenwich, which was the test being wrong about the
// intent rather than the code being wrong about the maths.
const local = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h);
check('any two times on one calendar day are 0 apart', daysFromToday(local(2026, 8, 20, 23), local(2026, 8, 20, 1)) === 0);
check('tomorrow is 1, even one hour later', daysFromToday(local(2026, 8, 21, 1), local(2026, 8, 20, 23)) === 1);
check('yesterday is -1', daysFromToday(local(2026, 8, 19, 23), local(2026, 8, 20, 1)) === -1);

console.log(failures ? `\n${failures} FAILURES` : '\nall checks passed');
process.exit(failures ? 1 : 0);
