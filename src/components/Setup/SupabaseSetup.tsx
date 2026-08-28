import React, { useState } from 'react';
import functionSource from '../../../supabase/functions/generate-proposal/index.ts?raw';
import outreachSource from '../../../supabase/functions/generate-outreach/index.ts?raw';
import listModelsSource from '../../../supabase/functions/list-models/index.ts?raw';
import extractBriefSource from '../../../supabase/functions/extract-brief/index.ts?raw';
import {
  Database,
  ExternalLink,
  Check,
  Loader2,
  ShieldCheck,
  Copy,
  ArrowRight,
  ArrowLeft,
  Terminal,
  Flame,
} from 'lucide-react';
import {
  SupabaseConfig,
  saveSupabaseConfig,
  looksLikeSupabaseUrl,
} from '../../lib/supabaseConfig';
import {
  runReadinessChecks,
  isReady,
  canConnect,
  type Check as ReadinessCheck,
} from '../../lib/readiness';
import { ALL_SQL } from '../../lib/setup/migrations';
import { ReadinessReport } from './ReadinessReport';

// Pulled straight from the repo so the SQL + function shown to the user always
// match what's actually committed. Shared with the preflight, which hands back
// individual files when only some of them are missing.
const setupSql = ALL_SQL;

const STEPS = ['Create database', 'Set up backend', 'Connect'];

const linkClass =
  'inline-flex items-center text-sm font-semibold text-ember-600 dark:text-ember-400 hover:text-ember-700 dark:hover:text-ember-300';

export const SupabaseSetup: React.FC = () => {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [checks, setChecks] = useState<ReadinessCheck[] | null>(null);
  const [forceSave, setForceSave] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const config: SupabaseConfig = { url, anonKey };
  const canSubmit = looksLikeSupabaseUrl(url) && anonKey.trim().length > 20;

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('Could not copy to clipboard, select the text and copy manually.');
    }
  };

  const handleTest = async () => {
    setError('');
    setChecks(null);
    setForceSave(false);
    if (!canSubmit) {
      setError('Enter a valid Supabase URL and publishable key first.');
      return;
    }
    setTesting(true);
    setChecks(await runReadinessChecks(config));
    setTesting(false);
  };

  /**
   * Saving is gated on the checks having actually been run and passed.
   *
   * The previous version never read the test result at all: Save worked with the
   * test unrun, or red. Someone whose SQL half-failed sailed through here and
   * met the problem several screens later as a raw Postgres error, with nothing
   * connecting the two. Now the wizard will not let that happen silently — but
   * it is still overridable, because a check that cannot be argued with is a
   * check that traps someone whose setup is fine in a way we did not anticipate.
   */
  const handleSave = async () => {
    setError('');
    if (!canSubmit) {
      setError('Enter a valid Supabase URL and publishable key first.');
      return;
    }

    let current = checks;
    if (!current) {
      setTesting(true);
      current = await runReadinessChecks(config);
      setChecks(current);
      setTesting(false);
    }

    if (!canConnect(current)) {
      setError('Ember cannot reach that project yet, so there is nothing to save. Fix the connection first.');
      return;
    }
    if (!isReady(current) && !forceSave) {
      setForceSave(true);
      return;
    }

    saveSupabaseConfig(config);
    window.location.reload();
  };

  const CopyBlock: React.FC<{ id: string; text: string; label: string }> = ({ id, text, label }) => (
    <div className="relative">
      <button
        onClick={() => copy(text, id)}
        className="absolute right-2 top-2 z-10 inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        {copied === id ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
        {copied === id ? 'Copied' : label}
      </button>
      <pre className="max-h-44 overflow-auto bg-gray-900 text-gray-100 text-[11px] leading-relaxed p-4 pt-12 rounded-xl font-mono">
        {text}
      </pre>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-ember-400 to-ember-600 rounded-2xl flex items-center justify-center shadow-lg shadow-ember-500/30">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">Welcome to Ember</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">A quick one-time setup and you're ready.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((label, index) => {
            const n = index + 1;
            const active = n === step;
            const done = n < step;
            return (
              <React.Fragment key={label}>
                <button
                  onClick={() => setStep(n)}
                  className="flex items-center group"
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      active
                        ? 'bg-ember-500 text-white'
                        : done
                        ? 'bg-ember-100 dark:bg-ember-900/40 text-ember-600 dark:text-ember-400'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {done ? <Check className="w-4 h-4" /> : n}
                  </span>
                  <span
                    className={`ml-2 mr-1 text-sm font-medium hidden sm:inline ${
                      active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </button>
                {n < STEPS.length && <div className="w-6 sm:w-10 h-px bg-gray-300 dark:bg-gray-600 mx-1" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="card-modern p-8 animate-rise">
          {/* Step 1, Create database */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 flex items-center justify-center shadow-lg shadow-ember-500/25">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create your database</h2>
              </div>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Ember stores your data in your own free Supabase project. This takes about 2 minutes.
              </p>
              <ol className="space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex"><span className="font-bold text-ember-500 mr-3">1.</span>Open Supabase and click <span className="font-semibold mx-1">New project</span>.</li>
                <li className="flex"><span className="font-bold text-ember-500 mr-3">2.</span>Give it a name and <span className="font-semibold mx-1">set a database password</span>, write it down, you'll need it.</li>
                <li className="flex"><span className="font-bold text-ember-500 mr-3">3.</span>Pick a region and create it. Wait until it finishes provisioning.</li>
              </ol>
              <a href="https://supabase.com/dashboard/new" target="_blank" rel="noopener noreferrer" className={linkClass}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Supabase → New project
              </a>
              <div className="flex justify-end pt-2">
                <button onClick={() => setStep(2)} className="btn-primary flex items-center">
                  My project is ready <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2, Set up backend */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 flex items-center justify-center shadow-lg shadow-ember-500/25">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Set up the backend</h2>
              </div>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Install the tables, storage, and AI functions on your new project. No terminal needed —
                just copy &amp; paste in the Supabase dashboard.
              </p>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="w-6 h-6 rounded-full bg-ember-100 dark:bg-ember-900/40 text-ember-600 dark:text-ember-400 text-sm font-bold flex items-center justify-center mr-2">1</span>
                  Create the tables &amp; storage
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Copy this SQL, paste it into the Supabase <span className="font-semibold">SQL Editor</span>, and click <span className="font-semibold">Run</span>.
                </p>
                <CopyBlock id="sql" text={setupSql} label="Copy SQL" />
                <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noopener noreferrer" className={linkClass}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open SQL Editor
                </a>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="w-6 h-6 rounded-full bg-ember-100 dark:bg-ember-900/40 text-ember-600 dark:text-ember-400 text-sm font-bold flex items-center justify-center mr-2">2</span>
                  Deploy the four functions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  In <span className="font-semibold">Edge Functions → Deploy a new function → Via editor</span>, create{' '}
                  <span className="font-semibold">four</span> functions. For each one: set the name <span className="font-semibold">exactly</span>{' '}
                  as shown (the dashboard suggests a random name like{' '}
                  <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-xs">swift-handler</code>, change it),
                  then click <span className="font-semibold">Deploy</span>.
                </p>
                {/* The failure this exists to prevent, found the hard way. The
                    editor opens on a hello-world index.ts. Pasting into a NEW
                    file leaves index.ts as the entrypoint, so the template keeps
                    answering and every call returns {"message":"Hello undefined!"}
                    while looking, from the outside, like broken or stale code. */}
                <div className="text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl p-3">
                  <span className="font-semibold">Replace the contents of <code className="font-mono">index.ts</code>.</span>{' '}
                  The editor opens with a hello-world <code className="font-mono">index.ts</code> already in it. Select all
                  of that and paste over it. Do <span className="font-semibold">not</span> add a new file beside it:{' '}
                  <code className="font-mono">index.ts</code> is the entrypoint, so a new file is never run and the
                  template keeps answering every request.
                </div>
                {/* This was worded as "Recommended", which was wrong. With it on,
                    Supabase rejects the call before the function runs, so the
                    failure looks like a broken function rather than a setting. */}
                <div className="text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl p-3">
                  <span className="font-semibold">Required, on all four:</span> after deploying each function, open its
                  settings and turn <span className="font-semibold">OFF “Verify JWT”</span>. Leave it on and Supabase
                  rejects the request before your function ever runs, so generation fails with an error that looks like
                  the function is broken. Nothing is left unprotected: each function checks the signed-in user itself.
                  <span className="block mt-1">
                    Settings has a <span className="font-semibold">Check backend</span> button that tells you if this is
                    still on.
                  </span>
                </div>
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300 pt-1">generate-proposal</p>
                <CopyBlock id="fn" text={functionSource} label="Copy generate-proposal" />
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300 pt-1">generate-outreach</p>
                <CopyBlock id="fn2" text={outreachSource} label="Copy generate-outreach" />
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300 pt-1">list-models</p>
                <CopyBlock id="fn3" text={listModelsSource} label="Copy list-models" />
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300 pt-1">extract-brief</p>
                <CopyBlock id="fn4" text={extractBriefSource} label="Copy extract-brief" />
                <a href="https://supabase.com/dashboard/project/_/functions" target="_blank" rel="noopener noreferrer" className={linkClass}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Edge Functions
                </a>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start">
                <Terminal className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-ember-500" />
                <span>
                  Cloned the repo instead? Skip the two steps above and just run{' '}
                  <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-xs">npm run setup</code>.
                </span>
              </div>

              {/* Checkable from here, not only from the last step.

                  Someone pasting SQL wants to know whether THAT worked, and the
                  answer used to live two screens away behind a credentials form.
                  So they moved on, hit a failure later, and had no way to tell
                  which of the two steps was wrong. */}
              {checks && (
                <div className="pt-2">
                  <ReadinessReport checks={checks} />
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <button onClick={() => setStep(1)} className="btn-secondary flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Only a real check once there are credentials to check with.
                      Before that it says what it will actually do rather than
                      promising a check and delivering a form. */}
                  <button
                    onClick={canSubmit ? handleTest : () => setStep(3)}
                    disabled={testing}
                    className="btn-secondary flex items-center justify-center disabled:opacity-50"
                  >
                    {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {testing ? 'Checking...' : canSubmit ? 'Check what I have done' : 'Add my keys, then check'}
                  </button>
                  <button onClick={() => setStep(3)} className="btn-primary flex items-center justify-center">
                    Done, connect it <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3, Connect */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 flex items-center justify-center shadow-lg shadow-ember-500/25">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Connect your project</h2>
              </div>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Paste your project credentials from Supabase{' '}
                <span className="font-semibold">Project Settings → API</span>.
              </p>

              <div>
                <label htmlFor="sb-url" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Project URL
                </label>
                <input
                  id="sb-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="input-modern"
                  placeholder="https://your-project-ref.supabase.co"
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="sb-key" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Publishable key (or anon key)
                </label>
                <textarea
                  id="sb-key"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  rows={3}
                  className="input-modern resize-none font-mono text-xs"
                  placeholder="sb_publishable_…  (or the legacy anon key, eyJ…)"
                  autoComplete="off"
                />
                <p className="flex items-start mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <ShieldCheck className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-ember-500" />
                  Use the <span className="font-semibold">publishable</span> key
                  (<span className="font-mono">sb_publishable_…</span>) for newer projects, the AI functions reject the
                  legacy anon key. Either key is public and safe in the browser; your data is protected by Row Level Security.
                </p>
                <p className="flex items-start mt-2 text-xs text-gray-400 dark:text-gray-500">
                  <Database className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-ember-500" />
                  Deploying this for others? Set these as <span className="font-mono">VITE_SUPABASE_URL</span> /{' '}
                  <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> environment variables on your host instead, so
                  every visitor connects automatically (this screen only saves to your browser).
                </p>
              </div>

              {error && (
                <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              {checks && (
                <div className="space-y-2">
                  <ReadinessReport checks={checks} />
                  {forceSave && (
                    <p className="text-sm text-amber-700 dark:text-amber-400 px-1">
                      Ember will open, but the parts above will not work until they are fixed. Press
                      Continue anyway if you would rather sort them out later.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <button onClick={() => setStep(2)} className="btn-secondary flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={handleTest} disabled={testing} className="btn-secondary flex items-center justify-center disabled:opacity-50">
                    {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {testing ? 'Checking...' : 'Check my setup'}
                  </button>
                  <button onClick={handleSave} disabled={testing} className="btn-primary flex items-center justify-center disabled:opacity-50">
                    {forceSave ? 'Continue anyway' : 'Save & continue'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          After connecting, you'll sign up and add a free AI key in Settings. Full guide:{' '}
          <span className="font-mono">SETUP.md</span>
        </p>
      </div>
    </div>
  );
};
