// The number the member committed to, held locally.
//
// It lives in CONQUER, and Ember cannot read it — that is the boundary, and it
// is not a limitation to be worked around. So Ember asks for it once and keeps
// it in this browser, next to the API key and everything else that never leaves
// the machine.
//
// Unset is a legitimate state. A member who has not entered a number still gets
// the queue; they just get it without a progress bar. Blocking the whole screen
// on a setting would turn the one screen meant to remove a decision into a form.

const KEY = 'ember.dailyTarget';

/** Above this it is not a daily outreach target, it is a typo or a tool. */
const MAX = 500;

/** The number, or null when it has never been set. */
export const loadDailyTarget = (): number | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 1 && n <= MAX ? Math.floor(n) : null;
  } catch {
    return null;
  }
};

/** Passing null clears it, which is how a member says "stop showing me a bar". */
export const saveDailyTarget = (n: number | null): void => {
  try {
    if (n === null || !Number.isFinite(n) || n < 1) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(Math.min(MAX, Math.floor(n))));
  } catch {
    /* Private mode. The queue still works, it just forgets the number. */
  }
};

/**
 * How many leads to put in front of someone with no number set.
 *
 * The point of the cap is that the list must not look infinite. Without a
 * target that is still true, so there is still a cap — it is just not a claim
 * about what they promised anyone.
 */
export const DEFAULT_QUEUE_CAP = 10;
