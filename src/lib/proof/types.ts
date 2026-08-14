// The proof vault.
//
// Several method laws depend on proof existing as structured data rather than as
// a paragraph: use ONE proof per message, match it to the reader's world, attach
// a concrete substantiating fact to every claim, and never state a number that is
// not on record. None of that is possible when the model receives one blob.

/** Whether the client granted permission to be named. */
export type CaseNaming = 'named' | 'anonymous_only';

/**
 * Where the output is going.
 *
 * The naming rule turns on this and nothing else: client names are permitted
 * where the audience is already in the funnel, and prohibited in anything that
 * travels publicly.
 */
export type Audience = 'direct' | 'public';

export interface CaseStudy {
  id: string;
  user_id: string;

  title: string;
  client_name: string | null;
  anonymous_label: string | null;
  naming: CaseNaming;

  industry: string | null;
  company_size: string | null;
  buyer_role: string | null;

  problem: string | null;
  solution: string | null;
  outcome: string | null;

  metric_value: string | null;
  metric_label: string | null;
  timeframe: string | null;

  verified: boolean;
  source_note: string | null;

  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  extracted_text: string | null;

  active: boolean;
  created_at: string;
  updated_at: string;
}

/** What we know about who is being written to, used to match a case study. */
export interface Target {
  industry?: string | null;
  company_size?: string | null;
  buyer_role?: string | null;
  /** Free text about them: a job description, a company summary, a headline. */
  notes?: string | null;
}

export interface ScoredCase {
  caseStudy: CaseStudy;
  score: number;
  /** Why it scored, so the UI can explain the pick rather than assert it. */
  reasons: string[];
}
