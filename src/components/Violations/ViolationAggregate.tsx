import React, { useMemo, useRef, useState } from 'react';
import { Gavel, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import {
  aggregateViolations, exportText, channelName, type MetaCarrier,
} from '../../lib/violations/aggregate';
import { useToday } from '../../lib/activity/useToday';
import type { OutreachRows } from '../../lib/activity/useOutreachRows';

/**
 * Which rules this member breaks most.
 *
 * Ember has graded every generation against its doctrine since the method engine
 * landed, and nothing has ever read the result. So the weekly teardown runs on
 * whatever the coach happened to notice, while the data to run it properly has
 * been sitting on every row the whole time.
 *
 * Everything here stays on the machine. The export is counts and rule names —
 * names that ship inside this build — and never a value read out of the
 * database, which is what makes "no message text leaves" a property of the code
 * rather than a promise.
 */
export const ViolationAggregate: React.FC<{ rows: OutreachRows }> = ({ rows }) => {
  const { materials } = useData();
  const today = useToday();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  /*
    `jobs.generation_meta` arrived later than the other two columns. On an
    install that has not run that migration every row reads undefined, which is
    indistinguishable from "this member has generated no proposals" — so the
    absent column is detected once, here, and passed as "not available" rather
    than as an empty list. The aggregate then reports the gap instead of
    quietly describing two thirds of the work as all of it.
  */
  const upwork = useMemo<MetaCarrier[] | undefined>(() => {
    if (!materials.length) return materials;
    const recorded = materials.some((m) => 'generation_meta' in m);
    return recorded ? materials : undefined;
  }, [materials]);

  const agg = useMemo(
    () => aggregateViolations({ linkedin: rows.leads, coldEmail: rows.prospects, upwork }),
    [rows.leads, rows.prospects, upwork],
  );

  const text = useMemo(() => exportText(agg, today), [agg, today]);

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard api');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2200);
      return;
    } catch {
      // Fall through to selection, same as the receipt: the clipboard is refused
      // in ordinary situations and a dead button is worse than an instruction.
    }
    const box = boxRef.current;
    if (box) {
      box.focus();
      box.select();
      try {
        if (document.execCommand('copy')) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
          return;
        }
      } catch { /* fall through */ }
    }
    setCopyFailed(true);
  };

  if (rows.loading) {
    return (
      <div className="card-modern p-6 flex items-center text-sm text-gray-500">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reading what the checks caught...
      </div>
    );
  }

  return (
    <div className="card-modern p-6 animate-rise">
      <div className="flex items-center space-x-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 flex items-center justify-center shadow-lg shadow-ember-500/25">
          <Gavel className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">What the doctrine caught</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {rows.loadError
              ? 'Could not be read.'
              : agg.generations
                ? `Across ${agg.generations} generation${agg.generations === 1 ? '' : 's'}${agg.since ? ` since ${agg.since}` : ''}.`
                : 'Nothing generated yet.'}
          </p>
        </div>
      </div>

      {rows.loadError && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm">
          Your leads and prospects could not be read, so this is not the whole picture:{' '}
          {rows.loadError}
        </div>
      )}

      {agg.channelsMissing.length > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm">
          {agg.channelsMissing.map(channelName).join(' and ')} is not counted here: your database is
          missing the column that records it. Settings, Check my install, names the file that adds it.
        </div>
      )}

      {rows.loadError ? null : agg.generations === 0 ? (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Every message Ember writes is graded against the pack that wrote it. Once you have
          generated a few, this is where the pattern shows up.
        </p>
      ) : agg.counts.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Nothing the doctrine bans has fired. Every generation came back clean.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-center">
              <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{agg.hard}</div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Must fix</div>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-center">
              <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{agg.soft}</div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Worth a look</div>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {agg.counts.map(({ rule, count, generations }) => (
              <li
                key={rule.id}
                className="flex items-start gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-2"
              >
                <span className="text-lg font-black tabular-nums text-gray-900 dark:text-white w-8 text-right flex-none">
                  {count}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {rule.label}
                    <span
                      className={`ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        rule.level === 'hard'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {rule.level === 'hard' ? 'Must fix' : 'Soft'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{rule.because}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    In {generations} of {agg.generations} generations ·{' '}
                    {rule.channels.map(channelName).join(', ')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {agg.legacyStructural > 0 && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {agg.legacyStructural} record{agg.legacyStructural === 1 ? '' : 's'} from before Ember told an
          empty step from an over-long one. Counted, not classified: two of the three things they could
          mean must be fixed and the third is a judgement call, and guessing would put the wrong number
          at the top of this list.
        </p>
      )}

      {agg.unrecognised > 0 && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {agg.unrecognised} record{agg.unrecognised === 1 ? '' : 's'} this version cannot name, from
          generations made under an older build. Counted, not listed.
        </p>
      )}

      {agg.generations > 0 && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Counted across every generation, including ones you regenerated. That is deliberate: this
          is what your setup keeps producing, not what you ended up sending. And it grades what came
          back from the model, so anything you fixed by hand afterwards still shows here.
        </p>
      )}

      <p className="mt-5 mb-2 text-xs text-gray-600 dark:text-gray-400">
        This is everything the export contains. Counts and rule names, nothing read from your
        pipeline. Read it yourself before you share it:
      </p>

      {/* Read-only rather than disabled: a disabled textarea cannot be selected,
          and selection is the fallback when the clipboard is refused. */}
      <textarea
        ref={boxRef}
        readOnly
        value={text}
        rows={Math.min(18, text.split('\n').length + 1)}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-mono text-[12.5px] text-gray-900 dark:text-white resize-none focus:outline-none focus:border-ember-400"
      />

      <div className="mt-3 flex items-center gap-3">
        <button onClick={copy} className="btn-primary inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold">
          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied ? 'Copied' : 'Copy for your coach'}
        </button>
        {copyFailed && (
          <span className="inline-flex items-center text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
            Your browser blocked the clipboard. The text is selected above, press Ctrl+C or Cmd+C.
          </span>
        )}
      </div>
    </div>
  );
};
