// When each step is due.
//
// The packs have always carried a `day` on every outbound step, and the app
// threw it away — rendering "1 ·", "2 ·", "3 ·" and telling the operator the
// ORDER of four touches but never the SPACING. Order without spacing is a list;
// with spacing it is a sequence, and the difference is whether anyone can answer
// "who do I message today".
//
// Everything here is derived at read time from `sent_steps` and the pack. No
// scheduler, no stored due dates, nothing that can drift out of sync with a pack
// version. Nothing auto-sends either: every step is still copy-to-clipboard, so
// a wrong due date costs a glance, not a misfire.

import type { MethodPack, StructureStep } from './method/types';
import { firstSentAt, isTerminal, type SentSteps } from '../apps/linkedin/types';
import type { Lead } from '../apps/linkedin/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DueStep {
  step: StructureStep;
  /** Null when the sequence has not started, so nothing can be dated yet. */
  dueAt: Date | null;
  /** Negative means overdue. Null when undateable. */
  daysUntilDue: number | null;
  sent: boolean;
  sentAt: string | null;
}

export interface LeadCadence {
  lead: Lead;
  steps: DueStep[];
  /** The step to act on now: the earliest unsent one that is due. */
  next: DueStep | null;
  /** How many days late `next` is. 0 when due today, negative is not used. */
  daysOverdue: number;
  /** Set when the cadence is deliberately not running. */
  haltedBecause: string | null;
}

const startOfDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Whole days from today, so "due in 0 days" means today rather than 18 hours. */
export const daysFromToday = (target: Date, now: Date): number =>
  Math.round((startOfDay(target) - startOfDay(now)) / DAY_MS);

/**
 * The outbound spine, in pack order.
 *
 * Only steps carrying a `day` are scheduled. Reply branches and chases are
 * contingencies, not touches on a clock, and dating them would put things in the
 * queue that depend on the prospect having done something first.
 */
export const scheduledSteps = (pack: MethodPack): StructureStep[] =>
  pack.structure.filter((s) => typeof s.day === 'number');

/**
 * Builds the schedule for one lead.
 *
 * Dates run from when the FIRST step was actually sent, not from when the lead
 * was created. A lead added three weeks ago and first messaged yesterday is on
 * day one of its sequence, and anchoring to `created_at` would have declared its
 * whole sequence overdue on arrival.
 */
export const cadenceFor = (
  lead: Lead,
  pack: MethodPack,
  sent: SentSteps,
  now: Date,
): LeadCadence => {
  const steps = scheduledSteps(pack);
  const anchorIso = firstSentAt(sent);
  const anchor = anchorIso ? new Date(anchorIso) : null;
  const baseDay = steps.length ? (steps[0].day ?? 0) : 0;

  const due: DueStep[] = steps.map((step) => {
    const sentAt = sent[step.key] ?? null;
    const isSent = step.key in sent;
    // Undateable until something has gone out, and undateable when the anchor is
    // a legacy row whose send time was never recorded.
    const dueAt =
      anchor && !Number.isNaN(anchor.getTime())
        ? new Date(anchor.getTime() + ((step.day ?? 0) - baseDay) * DAY_MS)
        : null;
    return {
      step,
      dueAt,
      daysUntilDue: dueAt ? daysFromToday(dueAt, now) : null,
      sent: isSent,
      sentAt: sentAt || null,
    };
  });

  let haltedBecause: string | null = null;
  if (isTerminal(lead.status)) {
    haltedBecause = `Closed as ${lead.status.replace('_', ' ')}.`;
  } else if (lead.status === 'replied' || lead.status === 'meeting') {
    // A reply halts the sequence in every pack. Continuing to send scheduled
    // touches at someone who has answered is the single rudest thing an outreach
    // tool can do on its operator's behalf.
    haltedBecause = 'They replied. The sequence stops here and you take it from the reply branches.';
  }

  const firstUnsent = due.find((d) => !d.sent) ?? null;
  const next = haltedBecause ? null : firstUnsent;

  return {
    lead,
    steps: due,
    next,
    daysOverdue: next?.daysUntilDue != null ? Math.max(0, -next.daysUntilDue) : 0,
    haltedBecause,
  };
};

/** True when this lead wants action today. */
export const isDue = (c: LeadCadence): boolean =>
  !c.haltedBecause && c.next != null && (c.next.daysUntilDue == null || c.next.daysUntilDue <= 0);

/**
 * Everything wanting action, most overdue first.
 *
 * A lead that has never been messaged sorts in too: its first step has no due
 * date, which makes it due now rather than exempt. Silently excluding
 * never-started leads is how a queue looks empty while the list grows.
 */
export const dueQueue = (cadences: LeadCadence[]): LeadCadence[] =>
  cadences
    .filter(isDue)
    .sort((a, b) => b.daysOverdue - a.daysOverdue || a.lead.name.localeCompare(b.lead.name));

/**
 * How long a connection request has been pending.
 *
 * The LinkedIn pack makes withdrawing invitations pending past three weeks a
 * law, and nothing in the app could compute that age.
 */
export const pendingInvitationDays = (lead: Lead, sent: SentSteps, now: Date): number | null => {
  if (lead.status !== 'requested') return null;
  const iso = firstSentAt(sent);
  if (!iso) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : Math.max(0, -daysFromToday(at, now));
};

export const STALE_INVITATION_DAYS = 21;
