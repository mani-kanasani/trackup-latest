import type { QualificationInput } from '../../lib/qualify/types';
import type { GenerationMeta, SentSteps } from '../linkedin/types';

/**
 * `bounced` earns its place beside the other terminals: a bad address is not a
 * prospect who said no, and merging them would make a list-quality problem look
 * like a copy problem.
 */
export type ProspectStatus =
  | 'new'
  | 'sent'
  | 'replied'
  | 'meeting'
  | 'won'
  | 'lost'
  | 'no_reply'
  | 'bounced'
  | 'disqualified';

export const PROSPECT_TERMINAL: ReadonlySet<ProspectStatus> = new Set<ProspectStatus>([
  'won',
  'lost',
  'no_reply',
  'bounced',
  'disqualified',
]);

export const isProspectTerminal = (s: ProspectStatus): boolean => PROSPECT_TERMINAL.has(s);

/** Keyed by cold email pack step key, exactly as the flow is for LinkedIn. */
export type EmailSequence = Record<string, string>;

export interface Prospect {
  id: string;
  user_id: string;

  name: string;
  email: string;
  job_title?: string | null;
  company_name?: string | null;
  industry?: string | null;
  company_website?: string | null;
  city_or_region?: string | null;

  /** The line only real research produces. Tier A is earned by this. */
  observation?: string | null;
  potential_services?: string | null;

  /** Which copy variant this prospect received, so replies can be split by it. */
  variant?: string | null;

  sequence?: EmailSequence | null;
  sent_steps?: SentSteps | string[] | null;
  qualification?: QualificationInput | null;
  generation_meta?: GenerationMeta[] | null;

  status: ProspectStatus;
  status_changed_at?: string | null;
  close_reason?: string | null;
  deal_value?: number | null;

  /**
   * Permanent, and checked independently of status.
   *
   * A status can be edited or advanced by mistake. An opt-out has to survive
   * that, and survive every later import of the same address.
   */
  opted_out: boolean;

  created_at: string;
  updated_at: string;
}
