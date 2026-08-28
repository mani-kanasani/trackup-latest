import React, { useState } from 'react';
import { MessageSquare, CalendarCheck, MinusCircle, Loader2 } from 'lucide-react';
import { milestonePatch, currentMilestone, type Milestone, type RowKind, type Stamped } from '../../lib/activity/milestones';

interface ReplyLogProps {
  kind: RowKind;
  row: Stamped;
  onLog: (patch: Record<string, unknown>) => Promise<{ error?: string }>;
  /** Shown instead of the buttons' own error line, when the parent has one. */
  onError?: (message: string) => void;
}

const OPTIONS: { key: Milestone; label: string; icon: typeof MessageSquare; hint: string }[] = [
  { key: 'replied', label: 'Replied', icon: MessageSquare, hint: 'They answered' },
  { key: 'call_booked', label: 'Call booked', icon: CalendarCheck, hint: 'A call is in the diary' },
  { key: 'no_reply', label: 'No reply', icon: MinusCircle, hint: 'Nothing came back, close it' },
];

const ACTIVE: Record<Milestone, string> = {
  replied: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
  call_booked: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700',
  no_reply: 'bg-gray-200 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
};

/**
 * What came back, in one click.
 *
 * Three states rather than a dropdown, because the point is that logging a reply
 * costs nothing. A dropdown is two interactions and a decision about which of
 * nine statuses applies; this is the three answers that actually happen, and the
 * status they imply is worked out for you.
 *
 * "No reply" is here on purpose. It is the answer nobody volunteers, and a
 * pipeline where only the good outcomes get recorded produces a reply rate that
 * is pure fiction.
 */
export const ReplyLog: React.FC<ReplyLogProps> = ({ kind, row, onLog, onError }) => {
  const [busy, setBusy] = useState<Milestone | null>(null);
  const [error, setError] = useState('');
  const active = currentMilestone(kind, row);

  const log = async (milestone: Milestone) => {
    const patch = milestonePatch(kind, row, milestone);
    // Already recorded, and nothing here overwrites a date that is set. Saying
    // so beats a write that changes nothing and looks like it did something.
    if (!patch) return;
    setBusy(milestone);
    setError('');
    const res = await onLog(patch);
    setBusy(null);
    if (res.error) {
      const message = `That did not save: ${res.error}`;
      if (onError) onError(message);
      else setError(message);
    }
  };

  return (
    <div>
      <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-x divide-gray-200 dark:divide-gray-700">
        {OPTIONS.map(({ key, label, icon: Icon, hint }) => {
          const on = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => log(key)}
              aria-pressed={on}
              title={hint}
              className={`inline-flex items-center px-3 py-2 text-xs font-semibold transition-colors ${
                on
                  ? ACTIVE[key]
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {busy === key ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Icon className="w-3.5 h-3.5 mr-1.5" />
              )}
              {label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};
