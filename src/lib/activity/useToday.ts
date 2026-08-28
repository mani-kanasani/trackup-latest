// Today, for a screen that is still open tomorrow.
//
// Every daily surface in the app captured `new Date()` once, at mount, and then
// used it forever. Ember is meant to be the thing you open in the morning, which
// means it is also the thing left open overnight — and a receipt whose date was
// fixed at yesterday's mount labels yesterday as "Today" and gets copied into a
// check-in under the wrong day. That is a wrong number in the one place the
// whole contract has to be trustworthy.
//
// The day is re-checked on a timer and whenever the tab is looked at again,
// because a laptop that slept through midnight fires no timers at all.

import { useEffect, useMemo, useState } from 'react';
import { localDateKey } from '../receipt/format';

/** Frequent enough that the change is noticed, cheap enough to be free. */
const CHECK_MS = 60_000;

/**
 * Local midnight of the current day, refreshed when the day turns over.
 *
 * Midnight rather than the current instant, deliberately. Every consumer —
 * the receipt's date list, the queue's cadence maths, the forgotten-drafts
 * window — reduces its argument to a local day and throws the time away, so
 * returning the day itself makes the value derive entirely from the day key.
 * That keeps its identity stable across renders, which matters because it feeds
 * `useMemo` dependencies on every daily surface: a fresh object each second
 * would rebuild every queue and recount every receipt on a timer.
 */
export const useToday = (): Date => {
  const [day, setDay] = useState(() => localDateKey(new Date()));

  useEffect(() => {
    const check = () => {
      const current = localDateKey(new Date());
      // Compared, not assigned. Setting state to an equal string still
      // re-renders, and this runs every minute for as long as the app is open.
      setDay((prev) => (prev === current ? prev : current));
    };
    const timer = setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  return useMemo(() => dayStart(day), [day]);
};

/**
 * A `YYYY-MM-DD` key back to local midnight.
 *
 * Not `new Date(key)`, which parses a bare date string as UTC and lands on the
 * wrong day for everyone west of Greenwich — the same trap `localDateKey` exists
 * to avoid in the other direction.
 */
export const dayStart = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
