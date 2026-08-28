// Drafts that were written and never marked sent.
//
// The gap this closes is the ordinary one: a member generates four messages,
// copies them out, pastes them into LinkedIn, sends them, and closes the tab
// without ticking anything. Nothing in the app knows those went out, so the
// receipt files a day of zeros for a day of real work, and the first number the
// cohort ever sees about them is wrong in the direction that makes people quit.
//
// So the app asks. Once, per draft, on the next visit — never on a loop, and
// never about something generated today, because a draft written an hour ago is
// still being worked on.

import { readSentSteps, isTerminal, type Lead } from '../../apps/linkedin/types';
import { isProspectTerminal, type Prospect } from '../../apps/coldemail/types';
import { scheduledSteps } from '../cadence';
import { getPack } from '../method/packs';
import { MAX_BACKDATE_DAYS, localDateKey } from '../receipt/format';
import type { JobMaterial } from '../../types';
import type { RowKind } from './milestones';

export interface UnmarkedDraft {
  kind: RowKind;
  id: string;
  /** Who it was written to, or the job title. Never leaves the machine. */
  name: string;
  channel: string;
  /** When it was written, which is the date it will be filed under. */
  generatedAt: string;
  /** The step to mark, for the two channels that have steps. */
  stepKey?: string;
}

/** The pack's outbound spine, in order. Reply branches are not sends. */
const spine = (packId: 'linkedin' | 'coldEmail'): string[] =>
  scheduledSteps(getPack(packId)).map((s) => s.key);

export const firstStepKey = (packId: 'linkedin' | 'coldEmail'): string | null =>
  spine(packId)[0] ?? null;

const startOfDay = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When a row's copy was written.
 *
 * `generation_meta` is the honest answer and is present on everything generated
 * since the method engine landed. `updated_at` is the fallback, and it is a
 * ceiling rather than the truth — editing a step moves it — which is acceptable
 * for a question the member is about to answer themselves.
 */
const writtenAt = (row: {
  generation_meta?: { at: string }[] | null;
  updated_at?: string;
}): string | null => {
  const meta = row.generation_meta;
  const last = meta && meta.length ? meta[meta.length - 1].at : null;
  return last || row.updated_at || null;
};

export interface DraftSources {
  leads: Lead[];
  prospects: Prospect[];
  jobs: JobMaterial[];
}

/**
 * Everything generated before today, still unmarked, recent enough to file.
 *
 * The window matches the receipt's back-dating limit on purpose. A draft from
 * three weeks ago cannot be reported on any receipt the member can still file,
 * so asking about it is archaeology rather than a question with a consequence —
 * and a prompt that lists twenty stale rows is one nobody reads.
 *
 * Newest first: the ones most likely to be remembered accurately come first.
 */
export const unmarkedDrafts = (
  src: DraftSources,
  now: Date = new Date(),
  windowDays: number = MAX_BACKDATE_DAYS,
): UnmarkedDraft[] => {
  const today = startOfDay(now);
  const earliest = today - windowDays * DAY_MS;
  const inWindow = (iso: string | null): boolean => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return false;
    // Strictly before today. A draft written this morning is not forgotten yet.
    return t < today && t >= earliest;
  };

  const out: UnmarkedDraft[] = [];

  const linkedInSpine = spine('linkedin');
  for (const lead of src.leads) {
    if (isTerminal(lead.status)) continue;
    if (Object.keys(readSentSteps(lead.sent_steps)).length) continue;
    const flow = lead.outreach;
    if (!flow) continue;
    const step = linkedInSpine.find((k) => flow[k]?.trim());
    if (!step) continue;
    const at = writtenAt(lead);
    if (!inWindow(at)) continue;
    out.push({ kind: 'lead', id: lead.id, name: lead.name, channel: 'LinkedIn', generatedAt: at!, stepKey: step });
  }

  const emailSpine = spine('coldEmail');
  for (const p of src.prospects) {
    if (p.opted_out || isProspectTerminal(p.status)) continue;
    if (Object.keys(readSentSteps(p.sent_steps)).length) continue;
    const seq = p.sequence;
    if (!seq) continue;
    const step = emailSpine.find((k) => seq[k]?.trim());
    if (!step) continue;
    const at = writtenAt(p);
    if (!inWindow(at)) continue;
    out.push({ kind: 'prospect', id: p.id, name: p.name, channel: 'Cold email', generatedAt: at!, stepKey: step });
  }

  for (const job of src.jobs) {
    // Upwork has no per-step marking: the proposal is one message, and
    // `drafted` is precisely the state of having written it and not sent it.
    if (job.status !== 'drafted') continue;
    const at = job.created_at instanceof Date ? job.created_at.toISOString() : String(job.created_at ?? '');
    if (!inWindow(at)) continue;
    out.push({ kind: 'job', id: job.id, name: job.title, channel: 'Upwork', generatedAt: at });
  }

  return out.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
};

/** How the day a draft belongs to is described, and filed. */
export const draftDateKey = (draft: UnmarkedDraft): string => localDateKey(new Date(draft.generatedAt));

// --- remembering what has already been asked ---------------------------------
//
// "Ask once" is taken literally: once per draft, not once per day. A member who
// says "not yet" about Tuesday's five is never asked about those five again.
// New drafts ageing past midnight produce a new prompt, which is the only thing
// that should.

const KEY = 'ember.activity.dismissedDrafts';
/** Enough for months of a cohort's pace, and bounded so the key cannot grow forever. */
const KEEP = 300;

export const draftRef = (draft: UnmarkedDraft): string => `${draft.kind}:${draft.id}`;

export const loadDismissed = (): Set<string> => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    // Private mode, quota, or a value someone hand-edited. Asking again is a
    // far smaller failure than crashing the home screen.
    return new Set();
  }
};

export const rememberDismissed = (refs: string[]): void => {
  try {
    const merged = [...loadDismissed(), ...refs];
    localStorage.setItem(KEY, JSON.stringify(merged.slice(-KEEP)));
  } catch {
    /* Best effort. The prompt reappearing is survivable; a thrown quota error is not. */
  }
};
