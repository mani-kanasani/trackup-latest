// What today is.
//
// Ember was a very good generator that a member visited once they had decided to
// do outreach. Deciding to do outreach is the thing this cohort does not do, so
// the decision has to be gone before the screen loads.
//
// Everything here is derived at read time from rows the app already holds. No
// queue table, no scheduler, nothing that can drift from the leads it describes:
// a member who imports fifty prospects and reloads sees them in the queue, and a
// member who marks four sent sees the queue shorten.

import { cadenceForRow, isDue, scheduledSteps } from '../cadence';
import { getPack } from '../method/packs';
import { qualify } from '../qualify/score';
import { readSentSteps, isTerminal, type Lead } from '../../apps/linkedin/types';
import { isProspectTerminal, type Prospect } from '../../apps/coldemail/types';
import { countsForDate } from '../receipt/counts';
import { localDateKey } from '../receipt/format';
import { DEFAULT_QUEUE_CAP } from '../dailyTarget';
import type { AppId } from '../../apps/registry';
import type { JobMaterial } from '../../types';
import type { QualificationInput } from '../qualify/types';
import type { MethodPack } from '../method/types';

export type QueueReason = 'first' | 'followUp';

export interface QueueItem {
  /** Which app opens when this row is clicked. */
  app: AppId;
  id: string;
  name: string;
  /** Job title and company, or whatever identifies them at a glance. */
  subtitle: string;
  reason: QueueReason;
  /** 0–100 from the qualification screen, re-derived on every read. */
  score: number;
  tier: string | null;
  /** Which touch is due, counting from one. Follow-ups only. */
  touch?: number;
  /** The step to write. Follow-ups only. */
  stepLabel?: string;
  /** Positive means late. Follow-ups only. */
  daysOverdue?: number;
}

export interface TodayQueue {
  /** Sends recorded for today across all three channels. */
  done: number;
  /** The committed number, or null when it has never been entered. */
  target: number | null;
  /** Nobody has been written to yet, best first, capped. */
  waiting: QueueItem[];
  /** How many are waiting in total, so the cap can be honest about itself. */
  waitingTotal: number;
  /** The next touch is due or late, oldest first. */
  followUps: QueueItem[];
}

const LINKEDIN_PACK = getPack('linkedin');
const COLD_EMAIL_PACK = getPack('coldEmail');

const scoreOf = (q: QualificationInput | null | undefined) => {
  const verdict = qualify(q ?? {});
  return { score: verdict.score, tier: verdict.tier as string | null, declined: verdict.verdict === 'decline' };
};

const nameOf = (parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ');

/**
 * Ordering: best-qualified first.
 *
 * A tie on score falls back to the name, so the list is stable between renders
 * rather than reshuffling every time React recomputes it. A queue that reorders
 * under the cursor is a queue people stop trusting.
 */
const byScore = (a: QueueItem, b: QueueItem) => b.score - a.score || a.name.localeCompare(b.name);

/** Latest first is wrong here: the thing rotting longest is the thing to do now. */
const byOverdue = (a: QueueItem, b: QueueItem) =>
  (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0) || a.name.localeCompare(b.name);

export interface QueueSources {
  leads: Lead[];
  prospects: Prospect[];
  jobs: JobMaterial[];
}

export const buildQueue = (
  src: QueueSources,
  target: number | null,
  now: Date = new Date(),
): TodayQueue => {
  const waiting: QueueItem[] = [];
  const followUps: QueueItem[] = [];

  const consider = (
    app: AppId,
    row: { id: string; name: string; status: string; qualification?: QualificationInput | null },
    subtitle: string,
    terminal: boolean,
    sentRaw: unknown,
    pack: MethodPack,
  ) => {
    if (terminal) return;
    const { score, tier, declined } = scoreOf(row.qualification);
    // The screen already refused this one. Putting it at the top of a list
    // headed "do this today" would be the app arguing with itself.
    if (declined) return;

    const sent = readSentSteps(sentRaw);
    const base = { app, id: row.id, name: row.name, subtitle, score, tier };

    if (!Object.keys(sent).length) {
      waiting.push({ ...base, reason: 'first' });
      return;
    }

    const cadence = cadenceForRow(row, terminal, pack, sent, now);
    if (!isDue(cadence) || !cadence.next) return;
    // Position in the outbound spine, not in the whole pack. Cold email opens
    // with a preflight step that is advice rather than a send, so counting
    // structure entries would call the first email touch two.
    const index = scheduledSteps(pack).findIndex((s) => s.key === cadence.next!.step.key);
    followUps.push({
      ...base,
      reason: 'followUp',
      touch: index >= 0 ? index + 1 : undefined,
      stepLabel: cadence.next.step.label,
      daysOverdue: cadence.daysOverdue,
    });
  };

  for (const lead of src.leads) {
    consider(
      'linkedin',
      lead,
      nameOf([lead.job_title, lead.company_name]) || lead.linkedin_url,
      isTerminal(lead.status),
      lead.sent_steps,
      LINKEDIN_PACK,
    );
  }

  for (const p of src.prospects) {
    // An opt-out is not a lead you have yet to get to. It is an address nothing
    // may go to again, and it must never be offered as today's work.
    if (p.opted_out) continue;
    consider(
      'coldemail',
      p,
      nameOf([p.job_title, p.company_name]) || p.email,
      isProspectTerminal(p.status),
      p.sent_steps,
      COLD_EMAIL_PACK,
    );
  }

  waiting.sort(byScore);
  followUps.sort(byOverdue);

  const cap = target ?? DEFAULT_QUEUE_CAP;
  const counts = countsForDate(src, localDateKey(now));

  return {
    done: counts.upwork + counts.linkedin + counts.email,
    target,
    waiting: waiting.slice(0, cap),
    waitingTotal: waiting.length,
    followUps,
  };
};

/** Everything on the list, so "you have nothing queued" can be said honestly. */
export const queueSize = (q: TodayQueue): number => q.waiting.length + q.followUps.length;
