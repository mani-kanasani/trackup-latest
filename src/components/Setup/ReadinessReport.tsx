import React, { useState } from 'react';
import { Check as CheckIcon, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { migrationsNamed } from '../../lib/setup/migrations';
import type { Check } from '../../lib/readiness';

/**
 * The preflight result, with the fix attached rather than described.
 *
 * The old version printed the check, the observation and a sentence of advice.
 * The advice was accurate and unusable: "re-run every migration in filename
 * order" is a correct instruction that someone who has never opened Supabase
 * cannot follow, because they cannot tell which of eighteen SQL blocks adds the
 * column named in the failure.
 *
 * So a failing check now hands over the exact files. One copy, one Run.
 */
export const ReadinessReport: React.FC<{ checks: Check[] }> = ({ checks }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [failedCopy, setFailedCopy] = useState(false);

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setFailedCopy(false);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Same reason the receipt has a fallback: clipboard permission is refused
      // in ordinary situations and a button that does nothing is worse than one
      // that says why.
      setFailedCopy(true);
    }
  };

  return (
    <div className="space-y-2">
      {checks.map((c) => {
        const files = migrationsNamed(c.migrations ?? []);
        return (
          <div
            key={c.id}
            className={`text-sm p-4 rounded-xl border ${
              c.status === 'ok'
                ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : c.status === 'warn'
                  ? 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'
                  : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            }`}
          >
            <div className="flex items-start">
              {c.status === 'ok' ? (
                <CheckIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.label}</p>
                <p>{c.detail}</p>
                {c.fix && <p className="mt-1 opacity-90">{c.fix}</p>}

                {/* The files themselves, in run order, each on its own button.
                    Named so the member can see in the SQL editor's history which
                    one they have already done. */}
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((m, i) => (
                      <div key={m.name} className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono opacity-80 min-w-0 break-all">
                          {files.length > 1 ? `${i + 1}. ` : ''}{m.name}
                        </span>
                        <button
                          onClick={() => copy(m.sql, m.name)}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/70 dark:bg-gray-900/50 border border-black/10 dark:border-white/20 hover:bg-white dark:hover:bg-gray-900"
                        >
                          {copied === m.name ? (
                            <CheckIcon className="w-3.5 h-3.5 mr-1.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {copied === m.name ? 'Copied' : 'Copy this one'}
                        </button>
                      </div>
                    ))}
                    <a
                      href="https://supabase.com/dashboard/project/_/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs font-semibold underline underline-offset-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Open the SQL editor
                    </a>
                  </div>
                )}

                {/* A function name is the thing to find in the dashboard, so it
                    is repeated as a list rather than left inside a sentence. */}
                {c.functions?.length ? (
                  <div className="mt-3">
                    <ul className="text-xs font-mono space-y-0.5">
                      {c.functions.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                    <a
                      href="https://supabase.com/dashboard/project/_/functions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-2 text-xs font-semibold underline underline-offset-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Open Edge Functions
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}

      {failedCopy && (
        <p className="text-xs text-amber-700 dark:text-amber-400 px-1">
          Your browser blocked the clipboard. The full SQL is on the setup screen, or in the
          repository under <span className="font-mono">supabase/migrations</span>.
        </p>
      )}
    </div>
  );
};
