// Counting a day's activity for the receipt.
//
// Counts are sends MARKED SENT, never drafts generated. That distinction is the
// entire point: a member who generated forty drafts and sent none has done
// nothing, and the receipt has to say so.

import { readSentSteps } from '../../apps/linkedin/types';
import { localDateKey, type ReceiptCounts } from './format';
import type { Lead } from '../../apps/linkedin/types';
import type { Prospect } from '../../apps/coldemail/types';
import type { JobMaterial } from '../../types';

/** Rows carrying dated send timestamps: `{ stepKey: ISO }`. */
type Sendable = Pick<Lead | Prospect, 'sent_steps'>;

/**
 * Local-date bucket for an ISO timestamp, or null when it cannot be dated.
 *
 * Legacy `sent_steps` entries carry an empty timestamp meaning "sent, time
 * unknown". Those are excluded rather than dated to today: inventing a send on
 * whichever day someone happened to open the app would put a number in a
 * receipt that the member did not do.
 */
const dayOf = (iso: string): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : localDateKey(d);
};

/** Messages marked sent on `dateKey`, across a set of leads or prospects. */
export const sendsOn = (rows: Sendable[], dateKey: string): number => {
  let n = 0;
  for (const row of rows) {
    for (const at of Object.values(readSentSteps(row.sent_steps))) {
      if (dayOf(at) === dateKey) n++;
    }
  }
  return n;
};

/** Rows whose given timestamp column falls on `dateKey`. */
const stampedOn = (rows: { [k: string]: unknown }[], column: string, dateKey: string): number =>
  rows.reduce((n, r) => {
    const v = r[column];
    return typeof v === 'string' && dayOf(v) === dateKey ? n + 1 : n;
  }, 0);

export interface CountSources {
  leads: Lead[];
  prospects: Prospect[];
  jobs: JobMaterial[];
}

/**
 * Every number on the receipt, for one local date.
 *
 * Upwork is counted from `applied_at` rather than from status, because status
 * alone says a proposal went out at some point and not which day. Replies and
 * calls come from their own first-set timestamps for the same reason: a lead
 * that replied on Monday and booked on Tuesday must contribute to both days,
 * and a single status field can only ever remember the last thing that
 * happened to it.
 */
export const countsForDate = (src: CountSources, dateKey: string): ReceiptCounts => {
  const linkedin = sendsOn(src.leads, dateKey);
  const email = sendsOn(src.prospects, dateKey);
  const upwork = stampedOn(src.jobs as unknown as Record<string, unknown>[], 'applied_at', dateKey);

  const rows = [
    ...(src.leads as unknown as Record<string, unknown>[]),
    ...(src.prospects as unknown as Record<string, unknown>[]),
    ...(src.jobs as unknown as Record<string, unknown>[]),
  ];

  return {
    upwork,
    linkedin,
    email,
    replies: stampedOn(rows, 'replied_at', dateKey),
    calls: stampedOn(rows, 'call_booked_at', dateKey),
  };
};
