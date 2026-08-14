// The LinkedIn funnel.
//
// Half an operator's work was invisible to the app's only reporting surface:
// DataContext queries `jobs` and nothing else, and the Dashboard mounts inside
// the Upwork app, so someone running LinkedIn had no numbers at all.
//
// Computed from `leads.status` alone, which already spans every stage, so this
// needs no schema of its own.

import { isTerminal, type Lead, type LeadStatus } from '../apps/linkedin/types';

export interface Stage {
  key: string;
  label: string;
  count: number;
  /** Share of the PRIOR stage, which is the number that tells you where it breaks. */
  rate: number | null;
  /** Why this rate is what it is, or why it is being withheld. */
  note?: string;
}

/**
 * Anyone who has reached this stage OR passed through it.
 *
 * Counting only the current status would show one lead at each stage and call it
 * a funnel. A lead sitting at `meeting` was requested, connected and replied on
 * the way there, and every one of those has to count.
 */
const REACHED: Record<string, LeadStatus[]> = {
  requested: ['requested', 'connected', 'replied', 'meeting', 'won', 'lost', 'no_reply'],
  connected: ['connected', 'replied', 'meeting', 'won', 'lost'],
  replied: ['replied', 'meeting', 'won', 'lost'],
  meeting: ['meeting', 'won', 'lost'],
  won: ['won'],
};

/**
 * Below this, a percentage is theatre.
 *
 * Three connections and one reply is not a 33% reply rate, and printing one is
 * how an operator talks themselves into keeping a message that is not working.
 */
export const MIN_SAMPLE = 10;

const rateOf = (num: number, denom: number): number | null =>
  denom >= MIN_SAMPLE ? num / denom : null;

export const funnelFor = (leads: Lead[]): Stage[] => {
  const count = (key: string) => leads.filter((l) => REACHED[key].includes(l.status)).length;

  const added = leads.length;
  const requested = count('requested');
  const connected = count('connected');
  const replied = count('replied');
  const meeting = count('meeting');
  const won = count('won');

  const withheld = (denom: number) =>
    denom < MIN_SAMPLE ? `Too few to rate: ${denom} of ${MIN_SAMPLE}` : undefined;

  return [
    { key: 'added', label: 'Leads added', count: added, rate: null },
    {
      key: 'requested',
      label: 'Requested',
      count: requested,
      rate: rateOf(requested, added),
      note: withheld(added),
    },
    {
      key: 'connected',
      label: 'Accepted',
      count: connected,
      rate: rateOf(connected, requested),
      // Acceptance is LinkedIn's own number, and the only stage here with a
      // benchmark worth quoting. The 4-8% figures in the packs are cold email
      // REPLY rates against emails sent, and the packs record an explicit
      // disagreement between sources about even that. Printing a cold-email
      // benchmark under a LinkedIn chart would be worse than printing nothing.
      note: withheld(requested),
    },
    {
      key: 'replied',
      label: 'Replied',
      count: replied,
      rate: rateOf(replied, connected),
      note: withheld(connected),
    },
    {
      key: 'meeting',
      label: 'Meetings',
      count: meeting,
      rate: rateOf(meeting, replied),
      note: withheld(replied),
    },
    { key: 'won', label: 'Won', count: won, rate: rateOf(won, meeting), note: withheld(meeting) },
  ];
};

/** Closed leads, which is what makes any of the above a rate rather than a tally. */
export const closedCount = (leads: Lead[]): number => leads.filter((l) => isTerminal(l.status)).length;

export const revenueFrom = (leads: Lead[]): number =>
  leads.filter((l) => l.status === 'won').reduce((sum, l) => sum + (l.deal_value ?? 0), 0);
