// The daily receipt: the one thing that crosses from Ember to CONQUER.
//
// It crosses by human copy and paste, and it carries counts and a date and
// nothing else. That is what lets a member be promised nobody sees their
// pipeline while a leaderboard still runs.
//
// The format is fixed by 00-SHARED-CONTEXT.md and a second codebase is parsing
// it. Do not change the field order, the separator, the prefix or the checksum
// without changing that file first, because the other side has no way to know.

import { sha256Hex } from './sha256';

/** Literal prefix and contract version. Bumping this breaks every parser. */
export const RECEIPT_VERSION = 'EMBER-1';

/** The contract accepts a date up to seven days old. */
export const MAX_BACKDATE_DAYS = 7;

export interface ReceiptCounts {
  upwork: number;
  linkedin: number;
  email: number;
  replies: number;
  calls: number;
}

export const EMPTY_COUNTS: ReceiptCounts = { upwork: 0, linkedin: 0, email: 0, replies: 0, calls: 0 };

/**
 * The exact shape of a valid line, used by the tests and by the UI.
 *
 * Anchored at both ends and permitting nothing but digits, the date and the
 * hex checksum. A test asserts generated output against this for adversarial
 * records, which is how "no name can ever appear" is proven rather than
 * asserted.
 */
export const RECEIPT_PATTERN =
  /^EMBER-1\|\d{4}-\d{2}-\d{2}\|upwork=\d+\|linkedin=\d+\|email=\d+\|replies=\d+\|calls=\d+\|#[0-9a-f]{6}$/;

/**
 * The member's LOCAL calendar date as YYYY-MM-DD.
 *
 * Deliberately not toISOString().slice(0,10), which is UTC. A member in
 * Vancouver sending at six in the evening is already on tomorrow's date in UTC,
 * so a UTC receipt would file their work under a day they had not reached yet
 * and leave today reading zero. The contract says local, and this is the only
 * place that decides what local means.
 */
export const localDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Whole, non-negative, and finite. A malformed count must not reach the line. */
const clean = (n: number): number =>
  Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;

/** Everything before `|#`, exactly as printed, including the prefix. */
export const receiptPayload = (dateKey: string, c: ReceiptCounts): string =>
  [
    RECEIPT_VERSION,
    dateKey,
    `upwork=${clean(c.upwork)}`,
    `linkedin=${clean(c.linkedin)}`,
    `email=${clean(c.email)}`,
    `replies=${clean(c.replies)}`,
    `calls=${clean(c.calls)}`,
  ].join('|');

/** First six lowercase hex characters of the SHA-256 of the payload. */
export const receiptChecksum = (payload: string): string => sha256Hex(payload).slice(0, 6);

/** The full line, ready to paste. */
export const buildReceipt = (dateKey: string, c: ReceiptCounts): string => {
  const payload = receiptPayload(dateKey, c);
  return `${payload}|#${receiptChecksum(payload)}`;
};

/**
 * The dates a member may file for: today back to the contract's limit.
 *
 * Returned newest first, because the common case is today and the catch-up case
 * is yesterday.
 */
export const selectableDates = (now: Date): string[] => {
  const out: string[] = [];
  for (let i = 0; i <= MAX_BACKDATE_DAYS; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push(localDateKey(d));
  }
  return out;
};

/** Human label for a date key, so the picker does not read as raw data. */
export const describeDate = (dateKey: string, now: Date): string => {
  const today = localDateKey(now);
  if (dateKey === today) return 'Today';
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dateKey === localDateKey(y)) return 'Yesterday';
  const [yy, mm, dd] = dateKey.split('-').map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};
