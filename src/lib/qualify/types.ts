// Qualification and tiering.
//
// The step that runs BEFORE generation, and the one that makes Ember something
// other than a copy generator. A copy generator answers "what do I say to this
// lead?". This answers the two questions that come first:
//
//   1. Is this lead worth writing to at all?
//   2. If it is, how much of your effort has it earned?
//
// Both are commercial decisions, and both are already answered in the doctrine —
// the four-pillar screen with its two-of-four threshold, the impact/complexity
// quadrant, the buying ladder, and the tier split. Encoding them here means the
// app can decline a lead, which is the single behaviour a generator cannot have.
//
// The output is not just a verdict. It also constrains generation: a lead nobody
// researched must not receive a message claiming research, and a message to a
// problem-unaware reader has a different job than one to a reader already
// choosing between vendors.

import type { Source } from '../method/types';

/**
 * Deliberately three-valued. "I checked and it does not apply" and "I have not
 * looked yet" produce very different verdicts, and collapsing them into a
 * boolean is how a screen starts declining leads for being unresearched.
 */
export type Answer = 'yes' | 'no' | 'unknown';

/** The four-pillar screen. A process must clear at least two. */
export type PillarId = 'repetitive' | 'timeConsuming' | 'errorProne' | 'scalable';

/** The bonus screen. Not a gate — it raises confidence in a pass. */
export type BonusId = 'doneThreeTimes' | 'clearPattern' | 'feelsBoring';

/** Where the reader sits on the buying ladder, which sets how many jobs the message has. */
export type LadderRung = 'top' | 'middle' | 'bottom';

export type Impact = 'high' | 'low';
export type Complexity = 'low' | 'high';

/** The quadrant a candidate build lands in. */
export type Quadrant = 'quickWin' | 'strategic' | 'lowHangingFruit' | 'timeWaster';

/** How clearly the prospect states who they serve. */
export type NicheClarity = 'specific' | 'generic' | 'unclear';

/** How confident we are that a message will actually reach the buyer. */
export type Reachability = 'verified' | 'likely' | 'uncertain';

export type TierId = 'A' | 'B' | 'C';

/**
 * `decline` means the screen ruled it out. `notYet` means the screen cannot
 * reach a verdict because too much is unanswered — a different state, and the
 * one that should send the user back to research rather than to the send button.
 */
export type Verdict = 'qualified' | 'notYet' | 'decline';

export interface Pillar {
  id: PillarId;
  label: string;
  /** The question the user is actually answering, in their words not ours. */
  question: string;
  /** What a "yes" licenses you to say in the copy. Empty for pillars that license nothing. */
  licenses: string;
  source: Source;
}

export interface BonusCheck {
  id: BonusId;
  label: string;
  question: string;
  because: string;
}

export interface RungDef {
  id: LadderRung;
  label: string;
  /** How many jobs the message must do to win them. */
  jobs: number;
  state: string;
  /** What the copy must therefore do, and what it must not. */
  instruction: string;
}

export interface TierDef {
  id: TierId;
  label: string;
  /** Roughly what share of a clean list lands here, per the source. */
  share: string;
  /** What this tier earns: research depth, sequence length, who sends. */
  effort: string;
  /** The ceiling. Goes into the prompt so the model cannot exceed the research done. */
  ceiling: string;
}

/** Everything the screen needs. Every field optional: a half-filled screen still returns a verdict. */
export interface QualificationInput {
  pillars?: Partial<Record<PillarId, Answer>>;
  bonus?: Partial<Record<BonusId, Answer>>;
  impact?: Impact;
  complexity?: Complexity;
  rung?: LadderRung;

  /** Tier signals. */
  nicheClarity?: NicheClarity;
  /** A concrete sign the business is growing: a hire, a new office, an added service line. */
  growthSignal?: string | null;
  reachable?: Reachability;
  /** The hand-written observation. Its presence is what separates a researched lead from a guessed one. */
  observation?: string | null;
}

export interface QualificationResult {
  verdict: Verdict;
  /** Null when the verdict is `decline` — a declined lead has earned no effort. */
  tier: TierId | null;
  /** 0–100. Confidence that this is worth the effort, not a probability of closing. */
  score: number;
  quadrant: Quadrant | null;
  rung: LadderRung | null;

  pillarsCleared: PillarId[];
  pillarsRuledOut: PillarId[];
  pillarsUnknown: PillarId[];

  /** Why it scored the way it did. Every entry traceable to a rule. */
  reasons: string[];
  /** What is stopping a `qualified` verdict. Empty when qualified. */
  blockers: string[];
  /** The specific questions to go and answer. Populated on `notYet`. */
  openQuestions: string[];
}
