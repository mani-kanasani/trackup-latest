import React, { useMemo, useState } from 'react';
import { ArrowRight, Clock, Flame, Send, Target, Check } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { buildQueue, queueSize, type QueueItem } from '../../lib/queue/today';
import { loadDailyTarget, saveDailyTarget, DEFAULT_QUEUE_CAP } from '../../lib/dailyTarget';
import type { OutreachRows } from '../../lib/activity/useOutreachRows';
import type { AppId } from '../../apps/registry';

interface TodayQueueProps {
  rows: OutreachRows;
  /**
   * Opens the channel on that row, and on the step that is due.
   *
   * Both halves matter. Selecting the lead is what makes it one click; naming
   * the step is what makes the click land on the message to write rather than
   * at the top of the sequence.
   */
  onOpen: (app: AppId, focusId?: string, stepKey?: string) => void;
}

const TIER_STYLE: Record<string, string> = {
  A: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  B: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  C: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const Row: React.FC<{ item: QueueItem; onOpen: TodayQueueProps['onOpen'] }> = ({ item, onOpen }) => (
  <button
    onClick={() => onOpen(item.app, item.id, item.stepKey)}
    className="w-full text-left flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-3 hover:border-ember-300 dark:hover:border-ember-700 transition-colors group"
  >
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
        {item.tier && (
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${TIER_STYLE[item.tier] ?? TIER_STYLE.C}`}>
            Tier {item.tier}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
        {item.reason === 'followUp' && item.stepLabel
          ? `${item.touch ? `Touch ${item.touch} · ` : ''}${item.stepLabel}`
          : item.subtitle}
      </p>
    </div>
    {item.reason === 'followUp' && (
      <span
        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded flex-none ${
          (item.daysOverdue ?? 0) > 0
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}
      >
        {(item.daysOverdue ?? 0) > 0 ? `${item.daysOverdue}d late` : 'Due today'}
      </span>
    )}
    <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-ember-500 flex-none transition-colors" />
  </button>
);

/**
 * The first thing on the screen, and the reason the screen exists.
 *
 * A member opening Ember used to face a choice of three channels, and every
 * choice is a place to stall. This removes the choice: here is what today is,
 * here is how far through it you are, and one click starts the next one.
 *
 * The committed number lives in CONQUER and cannot be read from here, so it is
 * asked for once and kept locally. Not having it is not a blocker — the queue
 * shows without a bar, because a member who never answers that question should
 * still be told who to write to.
 */
export const TodayQueue: React.FC<TodayQueueProps> = ({ rows, onOpen }) => {
  const { materials } = useData();
  const [target, setTarget] = useState<number | null>(() => loadDailyTarget());
  const [entry, setEntry] = useState('');

  const now = useMemo(() => new Date(), []);
  const queue = useMemo(
    () => buildQueue({ leads: rows.leads, prospects: rows.prospects, jobs: materials }, target, now),
    [rows.leads, rows.prospects, materials, target, now],
  );

  const commit = () => {
    const n = Number(entry);
    if (!Number.isFinite(n) || n < 1) return;
    saveDailyTarget(n);
    setTarget(loadDailyTarget());
    setEntry('');
  };

  const hit = target !== null && queue.done >= target;
  const pct = target ? Math.min(100, Math.round((queue.done / target) * 100)) : 0;
  const total = queueSize(queue);

  return (
    <div className="card-modern p-6 animate-rise">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 flex items-center justify-center shadow-lg shadow-ember-500/25">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Today</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {target === null
                ? `${queue.done} sent so far today.`
                : hit
                  ? `${queue.done} of ${target} sent. That is today done.`
                  : `${queue.done} of ${target} sent.`}
            </p>
          </div>
        </div>
        {target !== null && (
          <div className="text-right">
            <div className="text-3xl font-black text-gray-900 dark:text-white tabular-nums leading-none">
              {Math.max(0, target - queue.done)}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-gray-400">to go</div>
          </div>
        )}
      </div>

      {/* Only drawn when there is a number to draw it against. A bar with no
          denominator is decoration pretending to be information. */}
      {target !== null && (
        <div className="mt-4 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${hit ? 'bg-green-500' : 'bg-gradient-to-r from-ember-400 to-ember-600'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Asked once, inline, and skippable. A modal on first run would be one
          more thing standing between a member and the work. */}
      {target === null && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
          <Target className="w-4 h-4 text-gray-400 flex-none" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            How many a day did you commit to?
          </span>
          <input
            type="number"
            min="1"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
            placeholder="10"
            className="w-20 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-ember-400"
            aria-label="Your committed number of outreach messages a day"
          />
          <button
            onClick={commit}
            disabled={!entry.trim()}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-ember-600 hover:bg-ember-700 disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" /> Save
          </button>
          <span className="w-full text-xs text-gray-500 dark:text-gray-400">
            Kept in this browser. Ember cannot read it from anywhere else, and until you set it the
            list below shows {DEFAULT_QUEUE_CAP}.
          </span>
        </div>
      )}

      {queue.followUps.length > 0 && (
        <div className="mt-5">
          <h4 className="flex items-center text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Follow up ({queue.followUps.length})
          </h4>
          <div className="space-y-2">
            {queue.followUps.map((item) => (
              <Row key={`${item.app}:${item.id}`} item={item} onOpen={onOpen} />
            ))}
          </div>
        </div>
      )}

      {queue.waiting.length > 0 && (
        <div className="mt-5">
          <h4 className="flex items-center text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Write to next
          </h4>
          <div className="space-y-2">
            {queue.waiting.map((item) => (
              <Row key={`${item.app}:${item.id}`} item={item} onOpen={onOpen} />
            ))}
          </div>
          {queue.waitingTotal > queue.waiting.length && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {queue.waitingTotal - queue.waiting.length} more waiting, held back so this is a day's
              work rather than a backlog.
            </p>
          )}
        </div>
      )}

      {total === 0 && (
        <div className="mt-5 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 text-sm text-gray-600 dark:text-gray-400">
          {rows.loading
            ? 'Working out what today is...'
            : rows.loadError
              ? `Your list could not be read, so this is not the whole picture: ${rows.loadError}.`
              : 'Nothing is waiting. Add leads in LinkedIn or prospects in Cold Email, or write an Upwork proposal below — a list you cannot see is the one reason a number is unreachable no matter how motivated you are.'}
        </div>
      )}

      <button
        onClick={() => onOpen('trackup')}
        className="mt-4 inline-flex items-center text-sm font-semibold text-ember-600 hover:text-ember-700 dark:text-ember-400"
      >
        Write an Upwork proposal
        <ArrowRight className="w-4 h-4 ml-1.5" />
      </button>
    </div>
  );
};
