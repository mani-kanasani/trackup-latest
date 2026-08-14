// The qualification doctrine, as data.
//
// This does not live in `packs.source.json` because it is not per-channel. A
// MethodPack answers "how is a LinkedIn DM written"; this answers "is this lead
// worth a LinkedIn DM", and the answer is the same whichever channel carries it.
// Keeping it separate also keeps it out of the generator's path, so editing it
// here is safe — unlike `method/packs/*.ts`, which is generated.
//
// Sources are carried the same way the method packs carry them, including
// `selfReported`, because the provenance problem is identical: most of this is
// one operator's account of what worked in their own business.

import type { BonusCheck, LadderRung, Pillar, RungDef, TierDef, TierId } from './types';

const HERK = (claim: string) => ({
  label: 'Agency operator playbook §4',
  claim,
  selfReported: true,
});

/**
 * The four-pillar screen.
 *
 * The threshold is the point of it. Without one, four questions become four
 * things to feel good about; with one, they become a reason to decline.
 */
export const PILLARS: Pillar[] = [
  {
    id: 'repetitive',
    label: 'Repetitive',
    question: 'Do they run this same task daily or weekly, with consistent inputs and outputs?',
    licenses: 'You may name the frequency, because they told you it.',
    source: HERK('Same task daily or weekly, consistent inputs and outputs.'),
  },
  {
    id: 'timeConsuming',
    label: 'Time-consuming',
    question: 'Does it eat a meaningful chunk of someone’s week, even if it happens rarely?',
    licenses: 'You may talk about hours returned, but only the hours they stated.',
    source: HERK('Eats a significant chunk of team time even when infrequent.'),
  },
  {
    id: 'errorProne',
    label: 'Error-prone',
    question: 'Is there manual data entry, several handoffs, or conditional logic a person has to hold?',
    licenses: 'You may talk about mistakes and rework. Without this, do not.',
    source: HERK('Manual entry, multiple handoffs, conditional logic.'),
  },
  {
    id: 'scalable',
    label: 'Scalable',
    question: 'Does the workload grow as their business grows?',
    licenses: 'You may price against where they are going rather than where they are.',
    source: HERK(
      'Workload grows with the business; the same build returns ~10x at 10x volume, which is what sets deal size.',
    ),
  },
];

/** A process must clear at least this many pillars to be worth building. */
export const PILLAR_THRESHOLD = 2;

/**
 * The bonus screen. Not a gate.
 *
 * "Boring is beautiful" — a task the buyer finds dull has known inputs, known
 * rules and few edge cases, which is what makes an early win reliable rather
 * than impressive.
 */
export const BONUS: BonusCheck[] = [
  {
    id: 'doneThreeTimes',
    label: 'Done three or more times',
    question: 'Have they done it at least three times already?',
    because: 'Three runs is where the edge cases have surfaced and the shape is known.',
  },
  {
    id: 'clearPattern',
    label: 'Follows a clear pattern',
    question: 'Does it follow the same steps every time?',
    because: 'Known inputs and known rules are what let guardrails be set.',
  },
  {
    id: 'feelsBoring',
    label: 'Has started to feel boring',
    question: 'Has whoever does it started calling it boring?',
    because: 'Boredom is a buying signal. The interesting problems are the ones with edge cases.',
  },
];

export const QUADRANTS = {
  quickWin: {
    label: 'Quick win',
    note: 'High impact, low complexity. The proper home of a first engagement.',
  },
  strategic: {
    label: 'Strategic',
    note: 'High impact, high complexity. Real money, but the wrong thing to build first.',
  },
  lowHangingFruit: {
    label: 'Low-hanging fruit',
    note: 'Low impact, low complexity. Cheap and fine, but it will not justify a retainer.',
  },
  timeWaster: {
    label: 'Time waster',
    note: 'Low impact, high complexity. Refuse this one.',
  },
} as const;

/**
 * The buying ladder.
 *
 * Every lead is classified by how many jobs you must do to win them, and the
 * number of jobs is what the copy has to be shaped around. Writing a
 * differentiation message to someone who does not yet know they have a problem
 * is the most common way a technically correct message fails.
 */
export const RUNGS: Record<LadderRung, RungDef> = {
  top: {
    id: 'top',
    label: 'Top, choosing a provider',
    jobs: 1,
    state: 'Problem-aware and solution-aware. They are deciding who to pick.',
    instruction:
      'One job: be the obvious pick. Do not explain the problem, do not sell the category, do not educate. ' +
      'Lead with the closest-matching proof and make the next step trivially easy.',
  },
  middle: {
    id: 'middle',
    label: 'Middle, knows the problem, not the solution',
    jobs: 2,
    state: 'Problem-aware, solution-unaware. They feel the pain and are living with it.',
    instruction:
      'Two jobs: show that this class of solution exists, then that you are the one to build it. ' +
      'Spend most of the message on the mechanism, meaning what actually happens, and only then on proof. ' +
      'Do not assume they know automation can do this.',
  },
  bottom: {
    id: 'bottom',
    label: 'Bottom, has not named the problem',
    jobs: 3,
    state: 'Problem-unaware. They have normalised the thing you would fix.',
    instruction:
      'Three jobs, and the first one is the whole message: make the problem visible using something ' +
      'specific about them. Do not pitch, do not describe a solution, do not ask for a call in the ' +
      'first touch. If you cannot name their problem concretely, you are not ready to write to them.',
  },
};

/**
 * Tiering.
 *
 * The axes are deliberately only two — how clearly they state who they serve,
 * and whether anything suggests they want to grow — because those are the two
 * a person can actually judge in a ninety-second site visit, and a tier nobody
 * applies consistently is not a tier.
 *
 * What a tier controls is effort, and therefore what the copy is allowed to
 * claim. The ceiling is the load-bearing field: it is what stops a message to an
 * unresearched lead from opening with an observation nobody made.
 */
export const TIERS: Record<TierId, TierDef> = {
  A: {
    id: 'A',
    label: 'Tier A',
    share: 'roughly the top 15% of a clean list',
    effort:
      'Full sequence. A hand-written observation from real research. Proof matched to their specific ' +
      'client type. You send it personally and you answer replies fast.',
    ceiling:
      'Research has been done on this lead, so specifics about them are permitted, but only the ones ' +
      'supplied below. Nothing inferred, nothing typical-for-their-industry dressed up as observed.',
  },
  B: {
    id: 'B',
    label: 'Tier B',
    share: 'roughly 55%',
    effort:
      'Full sequence. Observation drawn from their own site: what they do, how long they have done it, ' +
      'where they are. Shared research, honest because it is stated as shared.',
    ceiling:
      'Only what is visible on their own site may be treated as known. Do not imply you studied them. ' +
      'Anything about their market must be framed as being about their market, not about them.',
  },
  C: {
    id: 'C',
    label: 'Tier C',
    share: 'the rest',
    effort:
      'Short sequence only: an opener, one follow-up, and a close. No custom research. This tier exists ' +
      'to test copy and clean a list, not to win a marquee client.',
    ceiling:
      'Firmographics only: what they do, roughly how big they are, where they are. No observation, no ' +
      'claimed familiarity, no reference to anything they have published. Inventing a specific detail ' +
      'here is the failure this tier exists to prevent.',
  },
};

export const TIER_SOURCE = {
  label: 'Outbound tiering, two-axis',
  claim:
    'Tier on how clear their niche is and whether the firm shows any sign of wanting to grow. ' +
    'Tier A gets hand-written research and the full sequence; Tier C gets firmographics and a short one.',
  selfReported: true,
};

export const LADDER_SOURCE = {
  label: 'First-client playbook §2',
  claim:
    'Every lead classified by jobs-to-win: three if problem-unaware, two if problem-aware and ' +
    'solution-unaware, one if already choosing a provider.',
  selfReported: true,
};
