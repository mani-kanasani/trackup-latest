import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Check, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { countsForDate } from '../../lib/receipt/counts';
import {
  buildReceipt, selectableDates, describeDate, localDateKey, EMPTY_COUNTS,
} from '../../lib/receipt/format';
import type { OutreachRows } from '../../lib/activity/useOutreachRows';
import { useToday } from '../../lib/activity/useToday';

/**
 * The daily receipt: counts and a date, copied by hand into CONQUER.
 *
 * The line is shown before it is copied, and said to be everything that gets
 * shared. That is not decoration. The member is being asked to paste something
 * into a system their coach can see, and "trust us, it is only numbers" is worth
 * nothing next to a box they can read themselves.
 */
export const DailyReceipt: React.FC<{ rows: OutreachRows }> = ({ rows }) => {
  const { materials } = useData();
  // The rows arrive as a prop rather than being fetched here, because the
  // prompt above this card writes to the same leads and prospects. Two fetches
  // would mean marking a message sent and watching the count beside it stay
  // wrong until a reload.
  const { leads, prospects, loading, loadError } = rows;

  /*
    Re-checked rather than captured at mount.

    The chosen date is deliberately NOT dragged along when the day turns over.
    It is still in the list and it is still labelled truthfully — "Yesterday"
    rather than "Today" — and silently changing the string sitting under a
    copy button is worse than letting someone see which day they are filing.
  */
  const now = useToday();
  const dates = useMemo(() => selectableDates(now), [now]);
  const [dateKey, setDateKey] = useState(() => localDateKey(now));

  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const counts = useMemo(
    () => (loadError ? EMPTY_COUNTS : countsForDate({ leads, prospects, jobs: materials }, dateKey)),
    [leads, prospects, materials, dateKey, loadError],
  );
  const line = useMemo(() => buildReceipt(dateKey, counts), [dateKey, counts]);
  const total = counts.upwork + counts.linkedin + counts.email;

  useEffect(() => { setCopied(false); setCopyFailed(false); }, [line]);

  /**
   * Copy, with a fallback that is not a dead end.
   *
   * navigator.clipboard needs a secure context and a permission that browsers
   * refuse in several ordinary situations. Failing silently there would leave a
   * member pressing a button that does nothing, so the text is selected instead
   * and they are told to press the shortcut.
   */
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard api');
      await navigator.clipboard.writeText(line);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2200);
      return;
    } catch {
      // Fall through to selection.
    }
    const box = boxRef.current;
    if (box) {
      box.focus();
      box.select();
      try {
        // Deprecated, still the only synchronous path, and it works where the
        // async API is refused.
        if (document.execCommand('copy')) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
          return;
        }
      } catch { /* fall through */ }
    }
    setCopyFailed(true);
  };

  return (
    <div className="card-modern p-6 animate-rise">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 flex items-center justify-center shadow-lg shadow-ember-500/25">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Today's numbers</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Paste this into your check-in.</p>
          </div>
        </div>

        <select
          value={dateKey}
          onChange={(e) => setDateKey(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-ember-400"
          aria-label="Which day these numbers cover"
        >
          {dates.map((d) => (
            <option key={d} value={d}>{describeDate(d, now)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center text-sm text-gray-500 py-6">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Counting what you sent...
        </div>
      ) : (
        <>
          {loadError && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm">
              Could not read your activity, so these counts are not trustworthy: {loadError}. Reload before
              you paste this, rather than filing a day of zeros you did not have.
            </div>
          )}

          <div className="mt-4 grid grid-cols-5 gap-2">
            {([
              ['Upwork', counts.upwork], ['LinkedIn', counts.linkedin], ['Email', counts.email],
              ['Replies', counts.replies], ['Calls', counts.calls],
            ] as const).map(([label, n]) => (
              <div key={label} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-center">
                <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{n}</div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          {total === 0 && !loadError && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Nothing sent on this day. Send it anyway. A day of zeros is a real answer, and checking in
              with one keeps you in the count.
            </p>
          )}

          <p className="mt-5 mb-2 text-xs text-gray-600 dark:text-gray-400">
            This is everything that gets shared. No names, no messages, no lead details. Read it yourself:
          </p>

          {/* Read-only rather than disabled: a disabled textarea cannot be
              selected, and selection is the fallback when clipboard is refused. */}
          <textarea
            ref={boxRef}
            readOnly
            value={line}
            rows={2}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-mono text-[12.5px] text-gray-900 dark:text-white resize-none focus:outline-none focus:border-ember-400"
          />

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={copy}
              className="btn-primary inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied' : "Copy today's numbers"}
            </button>
            {copyFailed && (
              <span className="inline-flex items-center text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                Your browser blocked the clipboard. The line is selected above, press Ctrl+C or Cmd+C.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};
