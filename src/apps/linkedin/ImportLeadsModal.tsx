// Paste a list, check the mapping, import.
//
// Three screens rather than one form: paste, confirm what each column is, then
// see exactly what will and will not be imported before anything is written.
// The middle screen exists because auto-detection is right most of the time and
// silently wrong the rest, and a mis-mapped column produces messages addressed
// to an industry.

import React, { useMemo, useState } from 'react';
import { X, Upload, AlertCircle, Check, Loader2 } from 'lucide-react';
import {
  parseSheet, guessMapping, buildPlan, IMPORT_FIELDS,
  type ImportField, type ParsedSheet,
} from '../../lib/leadImport';
import type { Lead } from './types';

export const ImportLeadsModal: React.FC<{
  existingUrls: string[];
  onClose: () => void;
  onImport: (leads: Partial<Lead>[]) => Promise<{ inserted: number; error?: string }>;
  /** Pre-fills the paste box, so the starter template opens ready to import. */
  seed?: string;
}> = ({ existingUrls, onClose, onImport, seed }) => {
  const [text, setText] = useState(seed ?? '');
  const [stage, setStage] = useState<'paste' | 'map'>('paste');
  const [mapping, setMapping] = useState<Partial<Record<ImportField, number>>>({});
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<number | null>(null);

  const plan = useMemo(
    () => (sheet ? buildPlan(sheet, mapping, existingUrls) : null),
    [sheet, mapping, existingUrls],
  );

  const analyse = () => {
    const parsed = parseSheet(text);
    if (!parsed.rows.length) {
      setError('Nothing to import. Paste rows from a spreadsheet or a CSV export.');
      return;
    }
    setError('');
    setSheet(parsed);
    setMapping(guessMapping(parsed));
    setStage('map');
  };

  const run = async () => {
    if (!plan?.ready.length) return;
    setBusy(true);
    setError('');
    const res = await onImport(plan.ready.map((r) => r.lead as Partial<Lead>));
    setBusy(false);
    if (res.error) setError(res.error);
    else setDone(res.inserted);
  };

  const missingRequired = IMPORT_FIELDS.filter((f) => f.required && mapping[f.key] === undefined);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import leads</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {done !== null ? (
          <div className="text-center py-8">
            <Check className="w-10 h-10 mx-auto mb-3 text-green-500" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {done} lead{done === 1 ? '' : 's'} imported
            </p>
            <button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl font-semibold text-white bg-linkedin-600 hover:bg-linkedin-700">
              Done
            </button>
          </div>
        ) : stage === 'paste' ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Copy the rows straight out of your sheet or export and paste them here. A header row helps
              but is not required, and any column order works.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={'Name\tLinkedIn URL\tTitle\tCompany\nDana Reed\thttps://linkedin.com/in/dana-reed\tCEO\tAcme'}
              className="input-modern text-sm font-mono resize-none"
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
            <button
              onClick={analyse}
              disabled={!text.trim()}
              className="mt-4 w-full px-6 py-3 rounded-xl font-semibold text-white bg-linkedin-600 hover:bg-linkedin-700 disabled:opacity-50"
            >
              Check the columns
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {sheet?.hadHeaders ? 'Read the first line as headers.' : 'No header row, so these are by position.'}{' '}
              Ember guessed the mapping. Correct anything it got wrong before importing.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {f.label}{f.required && <span className="text-red-500"> *</span>}
                  </label>
                  <select
                    value={mapping[f.key] ?? ''}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [f.key]: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className="input-modern !py-2 text-sm"
                  >
                    <option value="">Not imported</option>
                    {sheet?.headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {missingRequired.length > 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                Map {missingRequired.map((f) => f.label).join(' and ')} before importing. Without them
                there is no lead to create.
              </p>
            )}

            {plan && (
              <div className="space-y-3 mb-4">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {plan.ready.length} ready to import
                  </p>
                  {plan.ready.slice(0, 5).map((r) => (
                    <p key={r.line} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {r.lead.name} · {r.lead.company_name || r.lead.job_title || r.lead.linkedin_url}
                    </p>
                  ))}
                  {plan.ready.length > 5 && (
                    <p className="text-xs text-gray-500 mt-1">and {plan.ready.length - 5} more</p>
                  )}
                </div>

                {/* Every rejection, with its line number. "42 of 200 imported"
                    with no explanation is where people stop trusting an importer. */}
                {plan.skipped.length > 0 && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {plan.skipped.length} will be skipped
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                      {plan.skipped.map((r) => (
                        <p key={r.line} className="text-xs text-amber-700 dark:text-amber-400">
                          Line {r.line}{r.lead.name ? ` (${r.lead.name})` : ''}: {r.problem}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStage('paste')}
                className="px-5 py-2.5 rounded-xl font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
              >
                Back
              </button>
              <button
                onClick={run}
                disabled={busy || !plan?.ready.length || missingRequired.length > 0}
                className="flex-1 inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-semibold text-white bg-linkedin-600 hover:bg-linkedin-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {busy ? 'Importing…' : `Import ${plan?.ready.length ?? 0}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
