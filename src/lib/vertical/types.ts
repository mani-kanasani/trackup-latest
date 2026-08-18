// The vertical brief: what the member knows about the niche they committed to.
//
// This is the counterpart to the proof vault, and deliberately its opposite.
// The vault holds what the sender delivered. This holds what is published about
// the reader's category, which the sender did not produce and must never imply
// they did.

/** 3 vertical + 2 generic, the split the methodology asks for. */
export type EvidenceScope = 'vertical' | 'generic';

/** The four categories a failure scenario must spread across. */
export type FailureCategory = 'acquisition' | 'retention' | 'operations' | 'growth';

export const FAILURE_CATEGORIES: { id: FailureCategory; label: string }[] = [
  { id: 'acquisition', label: 'Customer acquisition' },
  { id: 'retention', label: 'Customer experience and retention' },
  { id: 'operations', label: 'Operational efficiency' },
  { id: 'growth', label: 'Business growth and scaling' },
];

/** One way the reader's business loses money, and what it costs them. */
export interface FailureScenario {
  category: FailureCategory;
  /** How the function breaks. This is what an opener observes. */
  scenario: string;
  /** What the breakdown costs. This is what makes the observation land. */
  cost?: string;
  solution?: string;
  /** DFY, DWY or Consulting. */
  model?: string;
}

/**
 * A published result about the reader's category.
 *
 * `source_name` is required at every level: the column is NOT NULL, and nothing
 * renders without it. An unattributable borrowed number should not be storable,
 * because the moment it is storable it will eventually be sent.
 */
export interface IndustryEvidence {
  id: string;
  user_id: string;
  brief_id: string;

  claim: string;
  metric: string | null;
  source_name: string;
  source_url: string | null;
  source_year: string | null;

  applies_to: string | null;
  scope: EvidenceScope;
  /** The member opened the source themselves. */
  confirmed: boolean;

  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VerticalBrief {
  id: string;
  user_id: string;

  label: string;
  vertical: string;
  buyer_role: string | null;

  function_language: string | null;
  prototype_note: string | null;
  offer_shapes: string | null;

  failure_scenarios: FailureScenario[];
  /** The pasted original. Kept for re-derivation, never sent to a generator. */
  source_text: string | null;

  active: boolean;
  created_at: string;
  updated_at: string;
}

/** A brief plus its evidence, which is how every consumer wants it. */
export interface LoadedBrief {
  brief: VerticalBrief;
  evidence: IndustryEvidence[];
}

/**
 * Whether a generation should use the brief.
 *
 * Present on every channel, including Upwork. A control that exists on two of
 * three apps reads as a missing feature, and a vertical Upwork job is a real
 * case even though most are not.
 */
export type VerticalMode = 'vertical' | 'generic';

/** Defaults by channel. Overridable everywhere; this only sets the starting position. */
export const DEFAULT_MODE: Record<string, VerticalMode> = {
  linkedin: 'vertical',
  coldEmail: 'vertical',
  upwork: 'generic',
};
