import type { QualificationInput } from '../../lib/qualify/types';

export type LeadStatus = 'new' | 'requested' | 'connected' | 'replied' | 'meeting';

/**
 * A generated flow, keyed by method-pack step key.
 *
 * Deliberately open rather than a fixed interface: the pack owns the shape, and
 * a step added to `packs.source.json` should flow through to the generator and
 * the UI without a type change here. `blank_strategy` rides along as advice
 * rather than a message, and is not a pack step.
 */
export type OutreachFlow = Record<string, string>;

/**
 * Flows generated before the pack became the contract used these keys. Reading
 * them through this map means an existing user's saved work still renders
 * instead of showing eight blank cards.
 */
const LEGACY_KEYS: Record<string, string> = {
  connection_note: 'connectionNote',
  opener: 'openerDm',
  value: 'proofDm',
  cta: 'closeFileDm',
  bump: 'chaseBookingNudge',
  reply_positive: 'answerTheQuestion',
  reply_objection: 'replyNotNow',
};

export const migrateFlow = (flow: OutreachFlow | null | undefined): OutreachFlow | null => {
  if (!flow) return null;
  const out: OutreachFlow = { ...flow };
  for (const [old, current] of Object.entries(LEGACY_KEYS)) {
    if (flow[old]?.trim() && !out[current]?.trim()) out[current] = flow[old];
  }
  return out;
};

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  industry?: string | null;
  linkedin_url: string;
  company_linkedin_url?: string | null;
  company_website?: string | null;
  potential_services?: string | null;
  outreach?: OutreachFlow | null;
  sent_steps?: string[] | null;
  /**
   * The screen's answers, not its verdict. Storing the derived tier and score
   * would leave every lead frozen against whichever doctrine was current when
   * it was screened; storing the answers re-scores them on every read.
   */
  qualification?: QualificationInput | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}
