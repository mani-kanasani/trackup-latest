import React, { useMemo, useState } from 'react';
import { Check, X, HelpCircle, Loader2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import {
  unmarkedDrafts, draftRef, draftDateKey, loadDismissed, rememberDismissed, firstStepKey,
  type UnmarkedDraft,
} from '../../lib/activity/drafts';
import { advanceTo, statusAfterSend } from '../../lib/activity/milestones';
import { describeDate } from '../../lib/receipt/format';
import type { OutreachRows } from '../../lib/activity/useOutreachRows';
import { useToday } from '../../lib/activity/useToday';
import type { Lead } from '../../apps/linkedin/types';
import type { Prospect } from '../../apps/coldemail/types';

/** More than this and the card becomes a list to scroll rather than a question. */
const SHOWN = 6;

/**
 * "written yesterday", but "written Tuesday 25 August".
 *
 * Only the relative words want lowercasing mid-sentence; a weekday and a
 * month keep their capitals wherever they appear.
 */
const midSentence = (described: string): string =>
  described === 'Today' || described === 'Yesterday' ? described.toLowerCase() : described;

/**
 * The question the app has to ask, and only once.
 *
 * A member generates messages, copies them out, sends them, and closes the tab.
 * Nothing here knows that happened, so their day reads as zero. Asking on return
 * is the cheapest correction available — but only about drafts from a previous
 * day, only about ones recent enough to still be filed, and never twice about
 * the same draft. A prompt that reappears is a prompt that gets clicked away
 * without being read, and then it is worse than nothing.
 */
export const UnmarkedDrafts: React.FC<{ rows: OutreachRows }> = ({ rows }) => {
  const { materials, updateMaterial } = useData();
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Drafts written 'today' become drafts written yesterday at midnight, and
  // this is the screen that has to notice.
  const now = useToday();
  const drafts = useMemo(
    () =>
      rows.loadError
        ? []
        : unmarkedDrafts({ leads: rows.leads, prospects: rows.prospects, jobs: materials }, now)
            .filter((d) => !dismissed.has(draftRef(d))),
    [rows.leads, rows.prospects, rows.loadError, materials, dismissed, now],
  );

  const confirm = async (draft: UnmarkedDraft): Promise<{ error?: string }> => {
    // Dated to when it was written, not to now. A message sent on Tuesday
    // belongs on Tuesday's receipt; filing it today would put a number in a day
    // the member did not work, which is the failure this whole feature exists
    // to prevent, only pointing the other way.
    const at = draft.generatedAt;

    if (draft.kind === 'job') {
      const res = await updateMaterial(draft.id, { status: 'applied', applied_at: at });
      return res.success ? {} : { error: res.error };
    }

    if (draft.kind === 'lead') {
      const lead = rows.leads.find((l) => l.id === draft.id);
      if (!lead || !draft.stepKey) return { error: 'That lead is no longer here.' };
      const patch: Partial<Lead> = { sent_steps: { [draft.stepKey]: at } };
      const next = advanceTo('lead', lead.status, statusAfterSend('lead', draft.stepKey, firstStepKey('linkedin')));
      if (next) patch.status = next as Lead['status'];
      return rows.patchLead(draft.id, patch);
    }

    const prospect = rows.prospects.find((p) => p.id === draft.id);
    if (!prospect || !draft.stepKey) return { error: 'That prospect is no longer here.' };
    const patch: Partial<Prospect> = { sent_steps: { [draft.stepKey]: at } };
    const next = advanceTo('prospect', prospect.status, statusAfterSend('prospect', draft.stepKey, firstStepKey('coldEmail')));
    if (next) patch.status = next as Prospect['status'];
    return rows.patchProspect(draft.id, patch);
  };

  const confirmOne = async (draft: UnmarkedDraft) => {
    setBusy(draftRef(draft));
    setError('');
    const res = await confirm(draft);
    setBusy(null);
    if (res.error) setError(`Could not record that: ${res.error}`);
  };

  const confirmAll = async () => {
    setBusy('all');
    setError('');
    for (const draft of drafts) {
      const res = await confirm(draft);
      // Stop at the first failure rather than firing the rest at a database
      // that has just refused one: the member should see which one broke.
      if (res.error) { setError(`Could not record ${draft.name}: ${res.error}`); break; }
    }
    setBusy(null);
  };

  const hide = (refs: string[]) => {
    rememberDismissed(refs);
    setDismissed((prev) => new Set([...prev, ...refs]));
  };

  if (rows.loading || !drafts.length) return null;

  const shown = drafts.slice(0, SHOWN);
  const dayLabel = describeDate(draftDateKey(drafts[0]), now);

  return (
    <div className="card-modern p-6 animate-rise border-l-4 border-l-amber-400">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-none">
          <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Did these go out?</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You wrote {drafts.length} message{drafts.length === 1 ? '' : 's'}
            {drafts.length === 1 ? ` ${midSentence(dayLabel)}` : ' before today'} and marked none of them
            sent. Ember only counts what you say went out.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {shown.map((draft) => {
          const ref = draftRef(draft);
          return (
            <li
              key={ref}
              className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{draft.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {draft.channel} · written {midSentence(describeDate(draftDateKey(draft), now))}
                </p>
              </div>
              <button
                onClick={() => confirmOne(draft)}
                disabled={busy !== null}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {busy === ref ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                Yes, sent
              </button>
              <button
                onClick={() => hide([ref])}
                disabled={busy !== null}
                aria-label={`Leave ${draft.name} unmarked`}
                title="Not sent, leave it"
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>

      {drafts.length > shown.length && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          And {drafts.length - shown.length} more, which &ldquo;Yes, all of them&rdquo; covers too.
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={confirmAll}
          disabled={busy !== null}
          className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {busy === 'all' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          Yes, all of them
        </button>
        <button
          onClick={() => hide(drafts.map(draftRef))}
          disabled={busy !== null}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          Not yet
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Each one is filed on the day it was written, not today, so that day's numbers stay right. If you
        have already copied that day's line, copy it again. You will not be asked about these twice.
      </p>
    </div>
  );
};
