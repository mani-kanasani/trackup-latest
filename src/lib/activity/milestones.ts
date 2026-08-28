// What a status change means, in one place.
//
// Every number the receipt reports is downstream of a member recording that
// something happened. Three screens each had their own idea of how to record it
// — a checkbox that set a timestamp and nothing else, a dropdown per row, and on
// Upwork no path at all short of leaving the page — so the same act produced
// different data depending on where it was performed.
//
// The rules here are deliberately conservative in one direction and generous in
// the other. A recorded milestone never moves a row BACKWARDS and never rewrites
// a timestamp that is already set, because a receipt filed for a past day must
// not change afterwards. But it will fill in a timestamp the row is missing,
// because a lead that plainly replied and has no reply date is a hole in the
// data, not a fact worth preserving.

export type RowKind = 'lead' | 'prospect' | 'job';

/**
 * The stages each kind passes through, in order.
 *
 * Only the live ones. Terminal statuses are absent on purpose: they are
 * destinations rather than positions, and including them would let "advance to
 * the next stage" walk a row into being closed.
 */
const PROGRESSION: Record<RowKind, readonly string[]> = {
  lead: ['new', 'requested', 'connected', 'replied', 'meeting', 'won'],
  prospect: ['new', 'sent', 'replied', 'meeting', 'won'],
  job: ['drafted', 'applied', 'responded', 'meeting', 'won'],
};

/** Nothing automatic moves a row out of one of these. */
const TERMINAL: Record<RowKind, ReadonlySet<string>> = {
  lead: new Set(['won', 'lost', 'no_reply', 'disqualified']),
  prospect: new Set(['won', 'lost', 'no_reply', 'bounced', 'disqualified']),
  job: new Set(['won', 'lost']),
};

const rank = (kind: RowKind, status: string): number => PROGRESSION[kind].indexOf(status);

/**
 * `target`, or null when moving there would be a step backwards or sideways.
 *
 * A row already at `meeting` that gets a reply logged stays at `meeting`. The
 * reply date is still filled in — see `milestonePatch` — so nothing is lost,
 * but the stage the member set by hand is not undone by a later click.
 */
export const advanceTo = (kind: RowKind, current: string, target: string): string | null => {
  if (TERMINAL[kind].has(current)) return null;
  const from = rank(kind, current);
  const to = rank(kind, target);
  if (from < 0 || to < 0 || to <= from) return null;
  return target;
};

/**
 * The stage implied by marking one outbound step sent.
 *
 * For LinkedIn the first scheduled step is the connection request, and
 * everything after it is a direct message, which the pack only ever sends to a
 * connection. For cold email every step is a send to the same address, so the
 * first one is the whole distinction.
 *
 * `firstStepKey` comes from the pack rather than being written here, so a pack
 * that renames or reorders its opening step does not silently mis-stage leads.
 */
export const statusAfterSend = (
  kind: 'lead' | 'prospect',
  stepKey: string,
  firstStepKey: string | null,
): string => {
  if (kind === 'prospect') return 'sent';
  return firstStepKey && stepKey === firstStepKey ? 'requested' : 'connected';
};

export type Milestone = 'replied' | 'no_reply' | 'call_booked';

/** The columns a milestone can stamp. Every row kind carries the first two. */
export interface Stamped {
  status: string;
  replied_at?: string | null;
  call_booked_at?: string | null;
  /** Jobs only: when the proposal went out. */
  applied_at?: string | null;
  /** Jobs only: when it was drafted, which is the earliest it could have gone out. */
  created_at?: string | Date | null;
}

const MILESTONE_STATUS: Record<RowKind, Record<Milestone, string>> = {
  lead: { replied: 'replied', call_booked: 'meeting', no_reply: 'no_reply' },
  prospect: { replied: 'replied', call_booked: 'meeting', no_reply: 'no_reply' },
  // Upwork has no no-reply state. `lost` is where an unanswered proposal
  // already goes, and the KPI maths counts it as applied-but-not-responded,
  // which is exactly what no reply means.
  job: { replied: 'responded', call_booked: 'meeting', no_reply: 'lost' },
};

/**
 * The patch that records one milestone, or null when there is nothing to write.
 *
 * The timestamps are sent by the client as well as being set by a trigger. Both
 * are needed: the trigger covers status changes made through the dropdowns and
 * anything written outside the app, and the client value keeps the row on screen
 * in agreement with the row in the database without a refetch — which matters
 * here, because the receipt counts from the rows the app is holding.
 *
 * A value is only ever supplied when the column is empty. The trigger writes
 * only when NULL for the same reason.
 */
export const milestonePatch = (
  kind: RowKind,
  row: Stamped,
  milestone: Milestone,
  at: Date = new Date(),
): Record<string, unknown> | null => {
  const iso = at.toISOString();
  const patch: Record<string, unknown> = {};

  const target = MILESTONE_STATUS[kind][milestone];
  if (milestone === 'no_reply') {
    // An explicit close, so it is set outright rather than advanced into. The
    // member is answering a direct question about this row.
    if (row.status !== target) patch.status = target;
  } else {
    const next = advanceTo(kind, row.status, target);
    if (next) patch.status = next;
  }

  /*
    A reply on a proposal that was never marked applied.

    The database stamps `applied_at` the moment a job leaves `drafted`, so
    without this, saying "they replied" to an old proposal puts a send on
    TODAY's receipt for something that went out on some unknown earlier day.
    The draft date is the earliest defensible answer and the only one that
    cannot inflate today — the same rule the forgotten-drafts prompt follows.
  */
  if (kind === 'job' && !row.applied_at && milestone !== 'no_reply') {
    const drafted = row.created_at ? new Date(row.created_at) : null;
    patch.applied_at = (drafted && !Number.isNaN(drafted.getTime()) ? drafted : at).toISOString();
  }

  if (milestone === 'replied' && !row.replied_at) patch.replied_at = iso;
  if (milestone === 'call_booked') {
    // A booked call means they answered. The trigger takes the same view, and
    // the two must not disagree or the reply count changes on reload.
    if (!row.replied_at) patch.replied_at = iso;
    if (!row.call_booked_at) patch.call_booked_at = iso;
  }

  return Object.keys(patch).length ? patch : null;
};

/** Which of the three states a row currently reads as, for showing the control. */
export const currentMilestone = (kind: RowKind, row: Stamped): Milestone | null => {
  if (row.status === MILESTONE_STATUS[kind].no_reply && !row.replied_at) return 'no_reply';
  if (row.call_booked_at) return 'call_booked';
  if (row.replied_at) return 'replied';
  return null;
};
