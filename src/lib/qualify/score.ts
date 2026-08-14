// Running the screen.
//
// Every point scored carries a reason, for the same purpose the proof selector
// does: a user has to be able to see why a lead was declined and disagree with
// it. A screen that returns a number nobody can argue with is a screen people
// route around.
//
// The one non-obvious rule is that "no" and "not checked yet" are kept apart all
// the way through. A lead nobody has researched must come back as `notYet` with
// the questions to answer, never as `decline` — otherwise the screen punishes
// the user for not having done the work it is about to ask them to do.

import {
  BONUS,
  PILLARS,
  PILLAR_THRESHOLD,
  QUADRANTS,
  RUNGS,
  TIERS,
} from './doctrine';
import type {
  Answer,
  PillarId,
  QualificationInput,
  QualificationResult,
  Quadrant,
  TierId,
} from './types';

const POINTS = {
  /** Each cleared pillar. Four cleared is 60 of the 100. */
  pillar: 15,
  /** Each bonus check that holds. */
  bonus: 5,
  quadrant: { quickWin: 15, strategic: 8, lowHangingFruit: 4, timeWaster: 0 },
  /** Fewer jobs to do is cheaper to win, so it is worth more today. */
  rung: { top: 10, middle: 6, bottom: 2 },
} as const;

const answerOf = (map: Partial<Record<string, Answer>> | undefined, id: string): Answer =>
  map?.[id] ?? 'unknown';

const quadrantOf = (input: QualificationInput): Quadrant | null => {
  if (!input.impact || !input.complexity) return null;
  if (input.impact === 'high') return input.complexity === 'low' ? 'quickWin' : 'strategic';
  return input.complexity === 'low' ? 'lowHangingFruit' : 'timeWaster';
};

/**
 * Tier is earned by research actually done, not by the lead looking promising.
 *
 * A prospect can carry every Tier A signal and still not be Tier A, because the
 * thing Tier A buys is a hand-written observation — and if nobody wrote one, the
 * copy would have to invent it. That is the exact failure the tiers exist to
 * prevent, so the observation is a requirement rather than a bonus.
 */
const tierOf = (input: QualificationInput, reasons: string[]): TierId => {
  const niche = input.nicheClarity ?? 'generic';
  const reach = input.reachable ?? 'likely';
  const growth = input.growthSignal?.trim();
  const observation = input.observation?.trim();

  if (niche === 'unclear' || reach === 'uncertain') {
    reasons.push(
      niche === 'unclear'
        ? 'Tier C: they do not say who they serve, so there is nothing specific to write about.'
        : 'Tier C: the buyer is not reliably reachable, so research here is spent on a maybe.',
    );
    return 'C';
  }

  if (niche === 'specific' && growth && reach === 'verified') {
    if (observation) {
      reasons.push(`Tier A: clear niche, a growth signal (${growth}), a reachable buyer, and research done.`);
      return 'A';
    }
    reasons.push(
      'Tier B, not A: the signals are all there, but no observation has been written. ' +
        'Tier A is earned by the research, not by the prospect.',
    );
    return 'B';
  }

  reasons.push(
    growth
      ? 'Tier B: fits, and something suggests movement, but not every Tier A signal is present.'
      : 'Tier B: fits the profile, no visible growth signal.',
  );
  return 'B';
};

export const qualify = (input: QualificationInput = {}): QualificationResult => {
  const reasons: string[] = [];
  const blockers: string[] = [];
  const openQuestions: string[] = [];

  // --- the four-pillar screen
  const cleared: PillarId[] = [];
  const ruledOut: PillarId[] = [];
  const unknown: PillarId[] = [];

  for (const pillar of PILLARS) {
    const answer = answerOf(input.pillars, pillar.id);
    if (answer === 'yes') cleared.push(pillar.id);
    else if (answer === 'no') ruledOut.push(pillar.id);
    else {
      unknown.push(pillar.id);
      openQuestions.push(pillar.question);
    }
  }

  let score = cleared.length * POINTS.pillar;
  if (cleared.length) {
    reasons.push(
      `${cleared.length} of the four pillars ${cleared.length === 1 ? 'holds' : 'hold'}: ${cleared
        .map((id) => PILLARS.find((p) => p.id === id)!.label.toLowerCase())
        .join(', ')}.`,
    );
  }

  // --- the bonus screen. Confidence, not a gate.
  const bonusHeld = BONUS.filter((b) => answerOf(input.bonus, b.id) === 'yes');
  score += bonusHeld.length * POINTS.bonus;
  if (bonusHeld.length) {
    reasons.push(
      `${bonusHeld.length} of the three bonus checks ${bonusHeld.length === 1 ? 'holds' : 'hold'}${
        bonusHeld.some((b) => b.id === 'feelsBoring') ? ', including that they find it boring' : ''
      }.`,
    );
  }

  // --- the quadrant
  const quadrant = quadrantOf(input);
  if (quadrant) {
    score += POINTS.quadrant[quadrant];
    reasons.push(`${QUADRANTS[quadrant].label}. ${QUADRANTS[quadrant].note}`);
  } else {
    openQuestions.push('How much does fixing this move their numbers, and how hard is it to build?');
  }

  // --- the buying ladder
  const rung = input.rung ?? null;
  if (rung) {
    score += POINTS.rung[rung];
    reasons.push(`${RUNGS[rung].label}. ${RUNGS[rung].jobs} job${RUNGS[rung].jobs === 1 ? '' : 's'} to win them.`);
  } else {
    openQuestions.push(
      'Do they know they have this problem, and do they know a solution like yours exists?',
    );
  }

  // --- verdict
  //
  // Refusal first: the time-waster quadrant overrides a passing pillar count,
  // because a high pillar score on a low-impact build is exactly the case the
  // quadrant was drawn to catch.
  let verdict: QualificationResult['verdict'];

  if (quadrant === 'timeWaster') {
    verdict = 'decline';
    blockers.push(
      'Low impact and high complexity. This is the quadrant the doctrine says to refuse outright — ' +
        'it costs the most and shows the least, which is how a first build ends the relationship.',
    );
  } else if (cleared.length >= PILLAR_THRESHOLD) {
    verdict = 'qualified';
  } else if (cleared.length + unknown.length >= PILLAR_THRESHOLD) {
    verdict = 'notYet';
    blockers.push(
      `Only ${cleared.length} of the four pillars is confirmed and the threshold is ${PILLAR_THRESHOLD}. ` +
        `${unknown.length} question${unknown.length === 1 ? ' is' : 's are'} still unanswered, so this is ` +
        'a research gap, not a rejection.',
    );
  } else {
    verdict = 'decline';
    blockers.push(
      `${ruledOut.length} of the four pillars are ruled out, so the threshold of ${PILLAR_THRESHOLD} ` +
        'can no longer be met. There is not enough of a repeating problem here to build against yet.',
    );
  }

  const tier = verdict === 'decline' ? null : tierOf(input, reasons);

  if (verdict === 'qualified' && tier) {
    reasons.push(TIERS[tier].effort);
  }

  return {
    verdict,
    tier,
    score: Math.max(0, Math.min(100, score)),
    quadrant,
    rung,
    pillarsCleared: cleared,
    pillarsRuledOut: ruledOut,
    pillarsUnknown: unknown,
    reasons,
    blockers,
    // A declined lead has nothing left to research; the questions would read as
    // an invitation to keep going on something that has already failed.
    openQuestions: verdict === 'decline' ? [] : openQuestions,
  };
};

/** True when the screen says not to write to this lead at all. */
export const isBlocked = (result: QualificationResult): boolean => result.verdict === 'decline';
