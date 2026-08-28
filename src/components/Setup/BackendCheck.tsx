import React, { useState } from 'react';
import { ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { getSupabaseConfig } from '../../lib/supabaseConfig';
import { runReadinessChecks, isReady, type Check } from '../../lib/readiness';
import { ReadinessReport } from './ReadinessReport';

/**
 * The preflight, after the install.
 *
 * It only ever ran inside the setup wizard, which nobody sees twice: once the
 * connection is saved the wizard is gone, and the checks with it. Every
 * migration shipped after a member installed was therefore invisible to them —
 * their app kept working, quietly missing whatever the new one added, and the
 * first sign was a feature behaving as though they had no data.
 *
 * That is not hypothetical. The activity timestamps behind the daily receipt
 * landed after the first installs, and without them the Upwork count is silently
 * zero on every receipt: the query succeeds, the column is absent, and the
 * member files a day claiming they sent nothing on a channel they worked all
 * morning.
 */
export const BackendCheck: React.FC = () => {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    const config = getSupabaseConfig();
    if (!config) {
      setError('No database connection is saved in this browser, so there is nothing to check.');
      return;
    }
    setError('');
    setRunning(true);
    try {
      setChecks(await runReadinessChecks(config));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The check could not be run.');
    } finally {
      setRunning(false);
    }
  };

  const green = checks !== null && isReady(checks);

  return (
    <div id="setup-backend" className="card-modern p-8 animate-rise scroll-mt-6">
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 flex items-center justify-center shadow-lg shadow-ember-500/25">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Check your install</h3>
      </div>
      <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
        Every table, every column each release added, and whether requests are actually reaching your
        four functions. Run it after any Ember update: a migration that shipped after you installed
        does not apply itself, and the features that need it fail quietly rather than loudly.
      </p>

      <button onClick={run} disabled={running} className="btn-primary flex items-center disabled:opacity-50">
        {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
        {running ? 'Checking...' : checks ? 'Check again' : 'Check my install'}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
          {error}
        </p>
      )}

      {checks && (
        <div className="mt-5 space-y-3">
          <p className={`text-sm font-semibold ${green ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {green
              ? 'Everything is installed and reachable.'
              : 'Some of this is not installed. Each one below carries the file or the setting that fixes it.'}
          </p>
          <ReadinessReport checks={checks} />
        </div>
      )}
    </div>
  );
};
