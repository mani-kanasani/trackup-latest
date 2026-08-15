// The method engine.
//
// A MethodPack is the difference between asking a model to "be an expert" and
// telling it how the work is actually done. Each pack carries the doctrine for
// one outreach channel: the laws that must hold, the patterns that must never
// appear, the shape of the artifact, and the evidence that justifies each rule.
//
// Packs do two jobs:
//   1. They compose into the system prompt, so the model writes to method.
//   2. They are machine-checkable, so generated output can be VALIDATED against
//      the same doctrine rather than merely hoped to follow it.
//
// That second job is the point. A rule the app can check is a rule that holds.

export type ChannelId = 'upwork' | 'linkedin' | 'coldEmail';

/** Where a rule came from. Every law cites one, so nothing is folklore. */
export interface Source {
  /** Short human label, e.g. "Cold Email Lab 4.2" or "Maker School M2". */
  label: string;
  /** What the source actually claims, in one line. */
  claim: string;
  /** True when the claim is one operator's self-report rather than measured. */
  selfReported: boolean;
}

/** A non-negotiable rule. Violating one is a defect, not a style choice. */
export interface Law {
  id: string;
  /** Imperative, second person, short. Goes into the prompt near-verbatim. */
  rule: string;
  /** The reason. Models follow rules better when the reason travels with them. */
  because: string;
  source?: Source;
}

/**
 * A pattern that must never appear in output, expressed as a regex so the
 * validator can enforce it. Keep patterns narrow: a false positive that blocks
 * good copy is worse than a miss.
 */
export interface BannedPattern {
  id: string;
  /** Human description for the error message. */
  label: string;
  pattern: RegExp;
  because: string;
  /** `hard` fails validation. `soft` warns and lets the user decide. */
  level: 'hard' | 'soft';
}

/** One step of the artifact being produced: an email, a DM, a proposal section. */
export interface StructureStep {
  key: string;
  label: string;
  /**
   * Which phase of the conversation this step belongs to: the outbound sequence,
   * the interested branch, the chases. Part of the artifact's shape rather than
   * decoration, and it means the UI groups steps from the doctrine instead of
   * from a hardcoded list that drifts every time a step is added.
   */
  group?: string;
  /** What this step is FOR. One job per step. */
  purpose: string;
  /** Timing, where the channel has a cadence. */
  day?: number;
  /** Soft ceiling in characters; the validator warns past it. */
  maxChars?: number;
  /** Rules that apply to this step only. */
  constraints: string[];
  /**
   * The subject line this step needs, where the channel has one.
   *
   * Set only on steps that OPEN a thread. A subject named inside a step's own
   * constraints gets written into the body or dropped entirely, which is what
   * happened here: cold email shipped with no subject line anywhere. Follow-ups
   * deliberately leave this unset because the doctrine sends them as genuine
   * replies on the opening thread, and giving them a fresh subject invites the
   * fabricated 'Re:' that the banned patterns exist to catch.
   */
  subject?: SubjectSpec;
}

/** The subject line for a step that opens a thread. Graded like any other step. */
export interface SubjectSpec {
  purpose: string;
  maxChars?: number;
  constraints: string[];
}

/**
 * The output key carrying a step's subject line.
 *
 * One definition, imported by the prompt builder, the validator and the UI, so
 * the key the model is asked for is provably the key that gets graded and the
 * key that gets rendered. Three hand-written copies of `key + 'Subject'` is the
 * drift that makes a field validate as permanently empty.
 */
export const subjectKey = (stepKey: string): string => `${stepKey}Subject`;

export interface MethodPack {
  id: ChannelId;
  version: string;
  label: string;
  /** One paragraph: what this channel is for and what it is not. */
  thesis: string;
  /** The single rule that overrides the others when they conflict. */
  primeDirective: string;
  laws: Law[];
  banned: BannedPattern[];
  structure: StructureStep[];
  /** Numbers that justify the doctrine, carried so the UI can show its work. */
  evidence: Source[];
  /** Named, sourced trade-offs the user may legitimately choose to make. */
  knownTensions?: { tension: string; resolution: string }[];
}

/** Result of checking generated output against a pack. */
export interface Violation {
  stepKey?: string;
  lawId?: string;
  patternId?: string;
  level: 'hard' | 'soft';
  message: string;
  /** The offending excerpt, so the UI can highlight it. */
  excerpt?: string;
}

export interface ValidationResult {
  ok: boolean;
  hardCount: number;
  softCount: number;
  violations: Violation[];
}
