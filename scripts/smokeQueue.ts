// Today's queue.
//
//   npm run queue:test
//
// The queue is the screen that removes a decision, so what it must never do is
// put something in front of a member that they should not act on: a lead the
// qualification screen declined, an address that opted out, a sequence that
// stopped because somebody replied. Most of what follows is that.
//
// The rest is the cap. The list is capped at the committed number so a day looks
// like a day rather than a backlog, and it has to stay capped when no number has
// ever been entered — which is the state every member is in on first run.

import { buildQueue, queueSize } from '../src/lib/queue/today';
import { DEFAULT_QUEUE_CAP } from '../src/lib/dailyTarget';
import { getPack } from '../src/lib/method/packs';
import { scheduledSteps } from '../src/lib/cadence';
import type { Lead } from '../src/apps/linkedin/types';
import type { Prospect } from '../src/apps/coldemail/types';
import type { JobMaterial } from '../src/types';
import type { QualificationInput } from '../src/lib/qualify/types';

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

const NOW = new Date(2026, 7, 28, 9, 0, 0);
const daysAgo = (n: number) => new Date(2026, 7, 28 - n, 10, 0, 0);

const LI = getPack('linkedin');
const CE = getPack('coldEmail');
const LI_STEPS = scheduledSteps(LI);
const CE_STEPS = scheduledSteps(CE);

/** A screen that passes cleanly, so score ordering has something to order by. */
const strong: QualificationInput = {
  pillars: { repetitive: 'yes', timeConsuming: 'yes', errorProne: 'yes', scalable: 'yes' },
  impact: 'high', complexity: 'low', rung: 'middle',
  nicheClarity: 'specific', reachable: 'verified',
  growthSignal: 'Hired two people last month', observation: 'Their booking page 404s on mobile.',
};
/** Answered, passing, but thinner. Must sort below the one above. */
const weak: QualificationInput = {
  pillars: { repetitive: 'yes', timeConsuming: 'yes', errorProne: 'unknown', scalable: 'unknown' },
  rung: 'top',
};

const lead = (over: Partial<Lead>): Lead =>
  ({
    id: 'l', user_id: 'u', name: 'Lead', linkedin_url: 'https://x', status: 'new',
    created_at: daysAgo(10).toISOString(), updated_at: daysAgo(10).toISOString(),
    ...over,
  }) as Lead;

const prospect = (over: Partial<Prospect>): Prospect =>
  ({
    id: 'p', user_id: 'u', name: 'Prospect', email: 'p@example.com', status: 'new',
    opted_out: false,
    created_at: daysAgo(10).toISOString(), updated_at: daysAgo(10).toISOString(),
    ...over,
  }) as Prospect;

const empty = { leads: [], prospects: [], jobs: [] as JobMaterial[] };
const build = (src: Partial<typeof empty>, target: number | null = null) =>
  buildQueue({ ...empty, ...src } as never, target, NOW);

/* ---- who gets on the list ------------------------------------------------ */

check('a fresh lead is waiting to be written to', build({ leads: [lead({})] }).waiting.length === 1);
check('a fresh prospect is too', build({ prospects: [prospect({})] }).waiting.length === 1);
check(
  'a lead already written to is not waiting',
  build({ leads: [lead({ sent_steps: { [LI_STEPS[0].key]: daysAgo(1).toISOString() } })] }).waiting.length === 0,
);
check('a closed lead is off the list entirely', queueSize(build({ leads: [lead({ status: 'no_reply' })] })) === 0);
check('a won lead is off the list entirely', queueSize(build({ leads: [lead({ status: 'won' })] })) === 0);
check('an opted-out prospect is never offered as work', queueSize(build({ prospects: [prospect({ opted_out: true })] })) === 0);
check('a bounced address is off the list', queueSize(build({ prospects: [prospect({ status: 'bounced' })] })) === 0);

// A declined screen is the app's own refusal. Offering the lead anyway would be
// the queue arguing with the screen.
const declining: QualificationInput = {
  pillars: { repetitive: 'no', timeConsuming: 'no', errorProne: 'no', scalable: 'no' },
};
check(
  'a lead the screen declined is not put in front of anyone',
  queueSize(build({ leads: [lead({ qualification: declining })] })) === 0,
);
check(
  'an unscreened lead is still offered, because nobody claimed it needs screening',
  build({ leads: [lead({ qualification: null })] }).waiting.length === 1,
);

/* ---- ordering ------------------------------------------------------------ */

const ordered = build({
  leads: [
    lead({ id: 'a', name: 'Weaker', qualification: weak }),
    lead({ id: 'b', name: 'Stronger', qualification: strong }),
  ],
}).waiting;
check('the best-qualified lead is first', ordered[0].name === 'Stronger', ordered.map((i) => i.name).join(' > '));
check('the tier travels with it', ordered[0].tier !== null, String(ordered[0].tier));

const tied = build({
  leads: [lead({ id: 'z', name: 'Zoe' }), lead({ id: 'a', name: 'Alex' })],
}).waiting;
check('a tie breaks on name, so the list does not reshuffle between renders', tied[0].name === 'Alex');

/* ---- the cap ------------------------------------------------------------- */

const many = Array.from({ length: 25 }, (_, i) => lead({ id: `l${i}`, name: `Lead ${i}` }));
const capped = build({ leads: many }, 5);
check('the list is capped at the committed number', capped.waiting.length === 5, `${capped.waiting.length}`);
check('and says how many it is holding back', capped.waitingTotal === 25);
const uncommitted = build({ leads: many }, null);
check(
  'with no number set the list is still capped, so it cannot look infinite',
  uncommitted.waiting.length === DEFAULT_QUEUE_CAP,
  `${uncommitted.waiting.length}`,
);
check('and the target is reported as unset rather than invented', uncommitted.target === null);

/* ---- follow-ups ---------------------------------------------------------- */

// Anchored on the first send, so a second touch on day N falls N days later.
const gap = (LI_STEPS[1].day ?? 1) - (LI_STEPS[0].day ?? 0);
const started = (n: number, over: Partial<Lead> = {}) =>
  lead({ status: 'requested', sent_steps: { [LI_STEPS[0].key]: daysAgo(n).toISOString() }, ...over });

check('a sequence not yet due is not in the follow-up list', build({ leads: [started(0)] }).followUps.length === 0);
const due = build({ leads: [started(gap)] }).followUps;
check('a lead due its second touch today appears', due.length === 1, `${due.length}`);
check('at the right touch number', due[0]?.touch === 2, String(due[0]?.touch));
check('with the step named, so the row says what to write', Boolean(due[0]?.stepLabel), String(due[0]?.stepLabel));
check('and nothing overdue yet', due[0]?.daysOverdue === 0);

const late = build({ leads: [started(gap + 4)] }).followUps;
check('an overdue touch is still shown rather than disappearing', late.length === 1);
check('and says how late it is', late[0]?.daysOverdue === 4, String(late[0]?.daysOverdue));

const mixed = build({
  leads: [started(gap, { id: 'ontime', name: 'On time' }), started(gap + 6, { id: 'late', name: 'Late one' })],
}).followUps;
check('the oldest overdue comes first', mixed[0].name === 'Late one', mixed.map((i) => i.name).join(' > '));

check(
  'a lead that replied has no follow-up, because the sequence stops on a reply',
  build({ leads: [started(gap + 3, { status: 'replied' })] }).followUps.length === 0,
);
check(
  'a lead written to but not yet due is on neither list',
  queueSize(build({ leads: [started(0)] })) === 0,
);

// The brief's own example, spelled out. Touch two goes out, and three days
// later — the pack spacing between touch two and touch three — the next one is
// due, at the right number, naming the step to write.
const anchorDay = LI_STEPS[0].day ?? 0;
const thirdDue = build({
  leads: [
    lead({
      status: 'connected',
      sent_steps: {
        [LI_STEPS[0].key]: daysAgo((LI_STEPS[2].day ?? 4) - anchorDay).toISOString(),
        [LI_STEPS[1].key]: daysAgo((LI_STEPS[2].day ?? 4) - (LI_STEPS[1].day ?? 1)).toISOString(),
      },
    }),
  ],
}).followUps;
check('the third touch comes due on the day the pack says', thirdDue.length === 1, String(thirdDue.length));
check('at touch three', thirdDue[0]?.touch === 3, String(thirdDue[0]?.touch));
check('and carries the step key, so the click can land on it', thirdDue[0]?.stepKey === LI_STEPS[2].key, String(thirdDue[0]?.stepKey));
check('a waiting lead has no step to land on yet', build({ leads: [lead({})] }).waiting[0].stepKey === undefined);

const ceGap = (CE_STEPS[1].day ?? 1) - (CE_STEPS[0].day ?? 0);
const ceDue = build({
  prospects: [prospect({ status: 'sent', sent_steps: { [CE_STEPS[0].key]: daysAgo(ceGap).toISOString() } })],
}).followUps;
check('cold email gets follow-ups from its own pack, not LinkedIn spacing', ceDue.length === 1, `${ceDue.length}`);
check('and routes to the cold email app', ceDue[0]?.app === 'coldemail');
// The cold email pack opens with a preflight step carrying no day. Counting
// pack entries rather than scheduled sends would call this touch three.
check('the touch number counts sends, not pack entries', ceDue[0]?.touch === 2, String(ceDue[0]?.touch));
const ceFirst = build({ prospects: [prospect({})] }).waiting[0];
check('and a never-contacted prospect is waiting rather than a follow-up', ceFirst?.reason === 'first');

/* ---- progress ------------------------------------------------------------ */

const todayIso = new Date(2026, 7, 28, 8, 0, 0).toISOString();
const progressed = build(
  {
    leads: [lead({ id: 'sent1', sent_steps: { [LI_STEPS[0].key]: todayIso } })],
    prospects: [prospect({ id: 'sent2', sent_steps: { [CE_STEPS[0].key]: todayIso } })],
    jobs: [{ id: 'j', status: 'applied', applied_at: todayIso } as JobMaterial],
  },
  10,
);
check('today\'s progress counts all three channels', progressed.done === 3, `${progressed.done}`);
check('yesterday does not count towards today', build({ leads: [lead({ sent_steps: { [LI_STEPS[0].key]: daysAgo(1).toISOString() } })] }, 10).done === 0);
check('the target is carried through', progressed.target === 10);

/* ---- one row, one destination -------------------------------------------- */

const routes = build({ leads: [lead({})], prospects: [prospect({})] }).waiting;
check('a lead row opens LinkedIn', routes.some((i) => i.app === 'linkedin'));
check('a prospect row opens cold email', routes.some((i) => i.app === 'coldemail'));
check('every row carries the id needed to select it', routes.every((i) => Boolean(i.id)));

console.log(failures ? `\n${failures} FAILURES\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
