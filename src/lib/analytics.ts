// Cross-channel analytics.
//
// The distinction this whole module is built around is GENERATED versus SENT.
//
// An outreach tool that counts what it produced is measuring itself. Every
// number here that claims to be activity counts entries in `sent_steps`, which
// only exist because a person ticked Sent — so "messages out" means messages
// that actually went out. The gap between the two is reported on purpose,
// because a large one is the most useful thing this screen can tell someone:
// copy sitting in the app unsent is the most common way outreach quietly stops.
//
// Everything derives from rows that already exist. No events table, no tracking,
// nothing to keep in sync.

import { readSentSteps, isTerminal, type Lead } from '../apps/linkedin/types';
import { localDateKey } from './receipt/format';
import { isProspectTerminal, type Prospect } from '../apps/coldemail/types';
import type { JobMaterial } from '../types';

export interface ChannelStats {
  channel: string;
  /** Rows in the pipeline, whatever their stage. */
  total: number;
  /** How many have copy written for them. */
  generated: number;
  /** Individual messages actually marked sent. */
  messagesSent: number;
  /** Rows where at least one message went out. */
  contacted: number;
  replied: number;
  meetings: number;
  won: number;
  lost: number;
  /** Closed one way or another, which is what makes the rest rates. */
  closed: number;
  revenue: number;
  /** Written but never sent. The number worth acting on. */
  generatedNotSent: number;
}

const rate = (num: number, denom: number): number | null => (denom > 0 ? num / denom : null);

/** Below this a percentage is theatre, not a measurement. */
export const MIN_SAMPLE = 10;

export const safeRate = (num: number, denom: number): number | null =>
  denom >= MIN_SAMPLE ? rate(num, denom) : null;

export const linkedInStats = (leads: Lead[]): ChannelStats => {
  const sentCounts = leads.map((l) => Object.keys(readSentSteps(l.sent_steps)).length);
  const generated = leads.filter((l) => l.outreach).length;
  const contacted = sentCounts.filter((n) => n > 0).length;
  return {
    channel: 'LinkedIn',
    total: leads.length,
    generated,
    messagesSent: sentCounts.reduce((a, b) => a + b, 0),
    contacted,
    replied: leads.filter((l) => ['replied', 'meeting', 'won', 'lost'].includes(l.status)).length,
    meetings: leads.filter((l) => ['meeting', 'won', 'lost'].includes(l.status)).length,
    won: leads.filter((l) => l.status === 'won').length,
    lost: leads.filter((l) => l.status === 'lost').length,
    closed: leads.filter((l) => isTerminal(l.status)).length,
    revenue: leads.reduce((sum, l) => sum + (l.status === 'won' ? l.deal_value ?? 0 : 0), 0),
    generatedNotSent: leads.filter((l, i) => l.outreach && sentCounts[i] === 0).length,
  };
};

export const coldEmailStats = (prospects: Prospect[]): ChannelStats => {
  const sentCounts = prospects.map((p) => Object.keys(readSentSteps(p.sent_steps)).length);
  const generated = prospects.filter((p) => p.sequence).length;
  return {
    channel: 'Cold email',
    total: prospects.length,
    generated,
    messagesSent: sentCounts.reduce((a, b) => a + b, 0),
    contacted: sentCounts.filter((n) => n > 0).length,
    replied: prospects.filter((p) => ['replied', 'meeting', 'won', 'lost'].includes(p.status)).length,
    meetings: prospects.filter((p) => ['meeting', 'won', 'lost'].includes(p.status)).length,
    won: prospects.filter((p) => p.status === 'won').length,
    lost: prospects.filter((p) => p.status === 'lost').length,
    closed: prospects.filter((p) => isProspectTerminal(p.status)).length,
    revenue: prospects.reduce((sum, p) => sum + (p.status === 'won' ? p.deal_value ?? 0 : 0), 0),
    generatedNotSent: prospects.filter((p, i) => p.sequence && sentCounts[i] === 0).length,
  };
};

/**
 * Upwork.
 *
 * `messagesSent` counts applications, because a proposal is one message and the
 * status IS the send. There is no per-step tracking here and pretending
 * otherwise would make the totals lie.
 */
export const upworkStats = (materials: JobMaterial[]): ChannelStats => {
  const applied = materials.filter((m) =>
    ['applied', 'responded', 'meeting', 'won', 'lost'].includes(m.status),
  );
  return {
    channel: 'Upwork',
    total: materials.length,
    generated: materials.length,
    messagesSent: applied.length,
    contacted: applied.length,
    replied: materials.filter((m) => ['responded', 'meeting', 'won'].includes(m.status)).length,
    meetings: materials.filter((m) => ['meeting', 'won'].includes(m.status)).length,
    won: materials.filter((m) => m.status === 'won').length,
    lost: materials.filter((m) => m.status === 'lost').length,
    closed: materials.filter((m) => ['won', 'lost'].includes(m.status)).length,
    revenue: materials
      .filter((m) => m.status === 'won')
      .reduce((sum, m) => sum + (m.actual_amount ?? m.proposed_amount ?? 0), 0),
    generatedNotSent: materials.filter((m) => m.status === 'drafted').length,
  };
};

export const totalStats = (channels: ChannelStats[]): ChannelStats =>
  channels.reduce(
    (acc, c) => ({
      channel: 'All channels',
      total: acc.total + c.total,
      generated: acc.generated + c.generated,
      messagesSent: acc.messagesSent + c.messagesSent,
      contacted: acc.contacted + c.contacted,
      replied: acc.replied + c.replied,
      meetings: acc.meetings + c.meetings,
      won: acc.won + c.won,
      lost: acc.lost + c.lost,
      closed: acc.closed + c.closed,
      revenue: acc.revenue + c.revenue,
      generatedNotSent: acc.generatedNotSent + c.generatedNotSent,
    }),
    {
      channel: 'All channels', total: 0, generated: 0, messagesSent: 0, contacted: 0,
      replied: 0, meetings: 0, won: 0, lost: 0, closed: 0, revenue: 0, generatedNotSent: 0,
    },
  );

// --- what is actually working -----------------------------------------------

export interface ProofPerformance {
  caseStudyId: string;
  title: string;
  used: number;
  replied: number;
  /** Null until the sample is large enough to mean anything. */
  replyRate: number | null;
}

/**
 * Reply rate by the case study that was cited.
 *
 * This is what `generation_meta` was stored for. Without it the question "which
 * proof actually gets replies" has no answer, because the vault records what a
 * user owns and nothing records what each message carried.
 *
 * Deliberately withholds a rate below the sample floor rather than printing a
 * number that would send someone to retire a case study on the strength of two
 * sends.
 */
export const proofPerformance = (
  rows: { generation_meta?: { case_study_id: string | null; case_study_title: string | null }[] | null; replied: boolean }[],
): ProofPerformance[] => {
  const byCase = new Map<string, ProofPerformance>();

  for (const row of rows) {
    // The LAST generation is the one that produced the copy actually sent.
    const meta = row.generation_meta?.[row.generation_meta.length - 1];
    if (!meta?.case_study_id) continue;
    const existing = byCase.get(meta.case_study_id) ?? {
      caseStudyId: meta.case_study_id,
      title: meta.case_study_title ?? 'Untitled',
      used: 0,
      replied: 0,
      replyRate: null,
    };
    existing.used += 1;
    if (row.replied) existing.replied += 1;
    byCase.set(meta.case_study_id, existing);
  }

  return [...byCase.values()]
    .map((p) => ({ ...p, replyRate: safeRate(p.replied, p.used) }))
    .sort((a, b) => (b.replyRate ?? -1) - (a.replyRate ?? -1) || b.used - a.used);
};

// --- activity over time -------------------------------------------------------

export interface DayActivity {
  date: string;
  sent: number;
}

/**
 * Messages sent per day, from the send timestamps themselves.
 *
 * Legacy rows carry an empty timestamp meaning "sent, time unknown" and are
 * excluded here rather than dated to today, which would invent a spike on
 * whichever day someone happened to open this screen.
 *
 * Bucketed by LOCAL day, not UTC. This used to slice an ISO string, which put
 * an evening send in the Americas on tomorrow — and the daily receipt counts
 * the same sends by local day. Two screens disagreeing about what happened on
 * Tuesday is worse than either being wrong on its own, because the member
 * reconciles them and concludes the app is broken. `localDateKey` is the one
 * place that decides what a day is.
 */
export const activityByDay = (
  sources: (Lead | Prospect)[],
  days: number,
  now: Date,
): DayActivity[] => {
  const counts = new Map<string, number>();
  for (const row of sources) {
    for (const at of Object.values(readSentSteps(row.sent_steps))) {
      if (!at) continue;
      const d = new Date(at);
      if (Number.isNaN(d.getTime())) continue;
      const key = localDateKey(d);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const out: DayActivity[] = [];
  for (let i = days - 1; i >= 0; i--) {
    // Calendar arithmetic, not a fixed 24 hours. Subtracting milliseconds
    // across a daylight-saving change repeats or skips a local day, so a
    // 30-day window would quietly contain 29 or 31.
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = localDateKey(d);
    out.push({ date: key, sent: counts.get(key) ?? 0 });
  }
  return out;
};

/** Sends inside the window, which is the honest headline for "how active am I". */
export const sentInLast = (sources: (Lead | Prospect)[], days: number, now: Date): number =>
  activityByDay(sources, days, now).reduce((a, b) => a + b.sent, 0);
