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

/**
 * Which steps have been sent, and when.
 *
 * Stored as `{ stepKey: iso8601 }`. Rows written before the cadence work hold a
 * bare array of keys with no times; those map to an empty string, meaning "sent,
 * time unknown" — which is honest, and keeps the tick marks a user already set
 * from disappearing.
 */
export type SentSteps = Record<string, string>;

export const readSentSteps = (raw: unknown): SentSteps => {
  if (Array.isArray(raw)) {
    return Object.fromEntries(raw.filter((k): k is string => typeof k === 'string').map((k) => [k, '']));
  }
  if (raw && typeof raw === 'object') {
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, typeof v === 'string' ? v : '']),
    );
  }
  return {};
};

/** The earliest recorded send, which is what a cadence counts from. */
export const firstSentAt = (sent: SentSteps): string | null => {
  const times = Object.values(sent).filter(Boolean).sort();
  return times[0] ?? null;
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
  /**
   * Step key -> ISO8601 send time. Legacy rows hold a bare array of keys;
   * always read through `readSentSteps` rather than touching this directly.
   */
  sent_steps?: SentSteps | string[] | null;
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
