import React, { useEffect, useState } from 'react';
import { Moon, Sun, Sparkles, Key, ExternalLink, Check, Database, RefreshCw, Loader2, UserRound, Wand2, Zap, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { EmberMark } from '../components/UI/EmberMark';
import { AIProvider, PROVIDER_META, loadAIConfig, saveAIConfig } from '../lib/aiConfig';
import { getSupabaseConfig, clearSupabaseConfig } from '../lib/supabaseConfig';
import { loadUserContext, saveUserContext, UserContext } from '../lib/userContext';
import { CustomPrompts, DEFAULT_PROMPTS, PROMPT_META, PromptKey, loadPrompts, savePrompts } from '../lib/prompts';
import { getPack } from '../lib/method/packs';
import { composeSystemPrompt } from '../lib/method/compose';
import type { ChannelId } from '../lib/method/types';
import { supabase } from '../lib/supabase';
import { contractOf, EXPECTED_CONTRACT, probeFunctionVersions, type FunctionVersion } from '../lib/deployment';
import { ModelSelect } from '../components/UI/ModelSelect';
import { CaseStudyVault } from '../components/Settings/CaseStudyVault';
import { VerticalBriefPanel } from '../components/Settings/VerticalBriefPanel';

/**
 * What is actually sent, so "there is no prompt" is answerable by reading it.
 *
 * The method is composed from the packs at generation time and never shown, so
 * an empty box in this section read as an empty prompt. It is not: it is an
 * optional addition to roughly nineteen thousand characters of doctrine.
 */
const PROMPT_CHANNEL: Record<PromptKey, ChannelId> = { proposal: 'upwork', outreach: 'linkedin' };

const methodPromptFor = (key: PromptKey): string =>
  composeSystemPrompt({ pack: getPack(PROMPT_CHANNEL[key]) });

const METHOD_SUMMARY = (() => {
  const packs = [getPack('upwork'), getPack('linkedin'), getPack('coldEmail')];
  const laws = packs.reduce((n, p) => n + p.laws.length, 0);
  const banned = packs.reduce((n, p) => n + p.banned.length, 0);
  const steps = packs.reduce((n, p) => n + p.structure.length, 0);
  return `${laws} laws, ${banned} banned patterns and ${steps} steps across the three channels`;
})();

export const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [model, setModel] = useState(PROVIDER_META.gemini.defaultModel);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const [loadedModels, setLoadedModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');

  const [context, setContext] = useState<UserContext>({ about: '', wins: '', testimonials: '' });
  const [contextSaved, setContextSaved] = useState(false);

  const [prompts, setPrompts] = useState<CustomPrompts>({ proposal: '', outreach: '' });
  const [promptsSaved, setPromptsSaved] = useState(false);

  useEffect(() => {
    const existing = loadAIConfig();
    if (existing) {
      setProvider(existing.provider);
      setModel(existing.model);
      setApiKey(existing.apiKey);
    }
    setContext(loadUserContext());
    const sp = loadPrompts();
    // Load exactly what the user wrote. Falling back to the defaults here is
    // what turned an example into a saved assertion about their business.
    setPrompts({ proposal: sp.proposal, outreach: sp.outreach });
  }, []);

  const handleProviderChange = (next: AIProvider) => {
    setProvider(next);
    setModel(PROVIDER_META[next].defaultModel);
    setLoadedModels([]);
    setModelsError('');
  };

  const [versions, setVersions] = useState<FunctionVersion[] | null>(null);
  const [checkingVersions, setCheckingVersions] = useState(false);

  /** Answers "which code is actually live" without spending a token. */
  const handleCheckBackend = async () => {
    setCheckingVersions(true);
    setVersions(
      await probeFunctionVersions((name) => supabase.functions.invoke(name, { body: {} })),
    );
    setCheckingVersions(false);
  };

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleLoadModels = async () => {
    if (!apiKey.trim()) { setModelsError('Enter your API key first.'); return; }
    setModelsError('');
    setLoadingModels(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ models: string[] }>('list-models', {
        body: { provider, apiKey: apiKey.trim() },
      });
      if (error) {
        let message = error.message;
        const ctx = (error as { context?: Response }).context;
        if (ctx?.json) { const b = await ctx.json().catch(() => null); if (b?.error) message = b.error; }
        throw new Error(message);
      }
      setLoadedModels(data?.models ?? []);
      setTestResult(null);
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : 'Could not load models.');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveContext = () => {
    saveUserContext(context);
    setContextSaved(true);
    setTimeout(() => setContextSaved(false), 2000);
  };

  const handleSavePrompts = () => {
    savePrompts(prompts);
    setPromptsSaved(true);
    setTimeout(() => setPromptsSaved(false), 2000);
  };
  // Reset clears it. The default IS blank: with nothing here the method pack
  // governs alone, which is stronger than any persona line placed after it.
  const resetPrompt = (key: PromptKey) => setPrompts((p) => ({ ...p, [key]: '' }));

  /**
   * Proves the key can actually generate, not merely that it authenticates.
   *
   * Listing models only checks the key is valid. The failures people hit are
   * downstream of that — the chosen model does not exist for this account, there
   * is no credit, the key lacks the scope — and they used to surface halfway
   * through generating a proposal, as an error about the proposal. One word out
   * of the real model, capped at a handful of tokens, answers it up front.
   */
  const handleTestKey = async () => {
    if (!apiKey.trim()) { setTestResult({ ok: false, message: 'Enter your API key first.' }); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke<{ ok: boolean; model: string; reply: string; __contract?: number }>(
        'list-models',
        { body: { action: 'test', provider, apiKey: apiKey.trim(), model: (model || meta.defaultModel).trim() } },
      );
      if (error) {
        let message = error.message;
        const ctx = (error as { context?: Response }).context;
        if (ctx?.json) { const b = await ctx.json().catch(() => null); if (b?.error) message = b.error; }
        throw new Error(message);
      }
      // The same call reports which revision of the backend answered. That is
      // the fastest way to tell a redeploy that landed from one that silently
      // did not, and it costs nothing extra because the round trip already
      // happened.
      // The old list-models has no test path at all: it ignores `action` and
      // returns its model list, so `reply` comes back undefined. Claiming "your
      // key works and this model can generate" off that is a lie, and it printed
      // "undefined answered ok" while doing it.
      const ranTest = typeof data?.reply === 'string' && data.reply.length > 0;
      const live = contractOf(data);
      const backend =
        live === null
          ? ' Your edge functions are running code older than this app expects, so generation will fail until you redeploy all four from this build.'
          : live < EXPECTED_CONTRACT
            ? ` Your edge functions report version ${live}; this app needs ${EXPECTED_CONTRACT}. Redeploy all four.`
            : ` Backend version ${live}, up to date.`;
      setTestResult({
        ok: ranTest && live !== null && live >= EXPECTED_CONTRACT,
        message: ranTest
          ? `${data?.model ?? 'The model'} answered "${data.reply}". Your key works and this model can generate.${backend}`
          : `Your key reached Supabase, but this function is too old to run a generation test, so nothing about the model was proved.${backend}`,
      });
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'The test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAI = () => {
    saveAIConfig({
      provider,
      model: model.trim() || PROVIDER_META[provider].defaultModel,
      apiKey: apiKey.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const meta = PROVIDER_META[provider];
  const modelChoices = Array.from(new Set([...meta.modelOptions, ...loadedModels]));

  const supabaseConfig = getSupabaseConfig();
  const handleReconfigure = () => {
    clearSupabaseConfig();
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* AI Provider */}
      <div className="card-modern p-8 animate-rise">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-upwork-400 to-upwork-600 flex items-center justify-center shadow-lg shadow-upwork-500/25">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">AI Provider</h3>
        </div>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
          Choose who writes your proposals and paste your own API key. Your key is stored only in this
          browser and is never saved on our servers.
        </p>

        <div className="space-y-6">
          <div>
            <label htmlFor="ai-provider" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Provider
            </label>
            <select
              id="ai-provider"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              className="input-modern"
            >
              {(Object.keys(PROVIDER_META) as AIProvider[]).map((key) => (
                <option key={key} value={key}>
                  {PROVIDER_META[key].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="ai-model" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Model
              </label>
              <button
                type="button"
                onClick={handleLoadModels}
                disabled={loadingModels}
                className="inline-flex items-center text-xs font-semibold text-upwork-600 dark:text-upwork-400 hover:text-upwork-700 disabled:opacity-50"
              >
                {loadingModels ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                {loadedModels.length ? `${loadedModels.length} models loaded` : 'Load models from my key'}
              </button>
            </div>
            <ModelSelect value={model} onChange={setModel} options={modelChoices} placeholder={meta.defaultModel} />
            {modelsError && <p className="text-xs text-red-500 mt-2">{modelsError}</p>}
          </div>

          <div>
            <label htmlFor="ai-key" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              <Key className="w-4 h-4 mr-2 text-upwork-500" />
              {meta.keyLabel}
            </label>
            <div className="relative">
              <input
                id="ai-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="input-modern pr-20"
                placeholder="Paste your API key"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-upwork-600 dark:text-upwork-400"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 bg-upwork-50/60 dark:bg-upwork-900/10 border border-upwork-100 dark:border-upwork-800/40 rounded-xl p-4">
            <p className="leading-relaxed">{meta.hint}</p>
            <a
              href={meta.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-3 font-semibold text-upwork-600 dark:text-upwork-400 hover:text-upwork-700 dark:hover:text-upwork-300"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Get {meta.free ? 'a free' : 'an'} {meta.keyLabel}
            </a>
          </div>

          {versions && (
            <div className="text-sm p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 space-y-1">
              <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                Deployed function versions (this app needs {EXPECTED_CONTRACT})
              </p>
              {/* The project being read, spelled out. When all four functions
                  report stale after a redeploy that definitely happened, the
                  usual cause is that the deploy landed in a different project
                  from the one the app is pointed at, and nothing on screen said
                  which project that was. */}
              <p className="text-xs text-gray-500 dark:text-gray-400 pb-1 break-all">
                Reading from <span className="font-mono">{supabaseConfig?.url ?? 'no project configured'}</span>. Deploy
                your functions to <span className="font-semibold">this</span> project.
              </p>
              {versions.map((v) => (
                <p
                  key={v.name}
                  className={
                    v.version !== null && v.version >= EXPECTED_CONTRACT
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }
                >
                  <span className="font-mono">{v.name}</span>{' '}
                  {v.isTemplate
                    ? 'still contains Supabase’s default hello-world template. Ember’s code was never saved into it: pasting is not enough, you have to press Deploy.'
                    : v.gatewayRejected
                    ? 'was blocked before it ran. Turn OFF "Verify JWT" in that function’s settings.'
                    : !v.reachable
                      ? 'did not respond. It may not be deployed.'
                      : v.version === null
                        ? 'is running code older than this check. Redeploy it.'
                        : v.version >= EXPECTED_CONTRACT
                          ? `is version ${v.version}, up to date.`
                          : `is version ${v.version}. Redeploy it.`}
                </p>
              ))}
            </div>
          )}

          {testResult && (
            <div
              className={`flex items-start text-sm p-4 rounded-xl border ${
                testResult.ok
                  ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              }`}
            >
              {testResult.ok
                ? <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={handleSaveAI} className="btn-primary flex items-center">
              {saved ? <Check className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {saved ? 'Saved' : 'Save AI Settings'}
            </button>
            <button
              onClick={handleCheckBackend}
              disabled={checkingVersions}
              className="btn-secondary flex items-center disabled:opacity-50"
            >
              {checkingVersions ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
              {checkingVersions ? 'Checking…' : 'Check backend'}
            </button>
            <button
              onClick={handleTestKey}
              disabled={testing}
              className="btn-secondary flex items-center disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              {testing ? 'Testing…' : 'Test this key'}
            </button>
          </div>
        </div>
      </div>

      {/* Your context */}
      <div className="card-modern p-8 animate-rise">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-upwork-400 to-upwork-600 flex items-center justify-center shadow-lg shadow-upwork-500/25">
            <UserRound className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Your context</h3>
        </div>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
          Tell the AI about you and what you do. This is woven into every proposal and LinkedIn DM so
          they're grounded in your real background, wins and proof. Stored in this browser.
        </p>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">About you and what you do</label>
            <textarea
              value={context.about}
              onChange={(e) => setContext((c) => ({ ...c, about: e.target.value }))}
              rows={3}
              className="input-modern resize-none"
              placeholder="e.g. I design brand identities for early-stage consumer companies. Or: I run an AI automation agency building workflows for B2B teams."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Wins & results</label>
            <textarea
              value={context.wins}
              onChange={(e) => setContext((c) => ({ ...c, wins: e.target.value }))}
              rows={3}
              className="input-modern resize-none"
              placeholder="e.g. Saved a client 20 hrs a week with a lead-routing system. Cut a bookkeeping close from 9 days to 3."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Used only when your case-study vault below is empty. Adding case studies there is better:
              Ember can then match one proof to each prospect instead of sending all of this every time.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Testimonials</label>
            <textarea
              value={context.testimonials}
              onChange={(e) => setContext((c) => ({ ...c, testimonials: e.target.value }))}
              rows={3}
              className="input-modern resize-none"
              placeholder={'e.g. "They completely transformed our outreach." Jane, CEO of Acme'}
            />
          </div>
          <button onClick={handleSaveContext} className="btn-primary flex items-center">
            {contextSaved ? <Check className="w-4 h-4 mr-2" /> : <UserRound className="w-4 h-4 mr-2" />}
            {contextSaved ? 'Saved' : 'Save context'}
          </button>
        </div>
      </div>

      <CaseStudyVault />

      <VerticalBriefPanel />

      {/* System prompts */}
      <div className="card-modern p-8 animate-rise">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-upwork-400 to-upwork-600 flex items-center justify-center shadow-lg shadow-upwork-500/25">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Your additions to the method</h3>
        </div>
        {/* This section used to be called "System prompts" and said the box
            "controls the voice and approach". Under an empty box that reads as
            "there is no prompt", when in fact a full method is already running
            and invisible. Say what is actually there, and let people read it. */}
        <p className="text-base text-gray-600 dark:text-gray-400 mb-4">
          Every channel already writes to a complete method: {METHOD_SUMMARY}. That is built in and always
          applied. You do not need to write anything here.
        </p>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
          These boxes are for anything you want to add <span className="font-semibold">on top of</span> it, in
          your own words. Blank is the normal state, and the method is stronger on its own than with a vague
          instruction placed after it. Stored in this browser.
        </p>
        <details className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <summary className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800/60">
            Read the method that is already running
          </summary>
          <div className="border-t border-gray-200 dark:border-gray-700">
            {(Object.keys(PROMPT_META) as PromptKey[]).map((key) => (
              <div key={key} className="p-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  {PROMPT_META[key].label}
                </p>
                <pre className="max-h-56 overflow-auto bg-gray-50 dark:bg-gray-900/60 rounded-lg p-3 text-[11px] leading-relaxed font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {methodPromptFor(key)}
                </pre>
              </div>
            ))}
          </div>
        </details>
        <div className="space-y-6">
          {(Object.keys(PROMPT_META) as PromptKey[]).map((key) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {PROMPT_META[key].label}
                </label>
                <button
                  type="button"
                  onClick={() => resetPrompt(key)}
                  className="text-xs font-medium text-upwork-600 dark:text-upwork-400 hover:text-upwork-700"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{PROMPT_META[key].description}</p>
              <textarea
                value={prompts[key]}
                onChange={(e) => setPrompts((p) => ({ ...p, [key]: e.target.value }))}
                rows={4}
                placeholder={DEFAULT_PROMPTS[key]}
                className="input-modern resize-none text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave blank unless you need it. Ember already writes to a full method for this channel,
                and anything here is added on top of that, never instead of it.
              </p>
            </div>
          ))}
          <button onClick={handleSavePrompts} className="btn-primary flex items-center">
            {promptsSaved ? <Check className="w-4 h-4 mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
            {promptsSaved ? 'Saved' : 'Save prompts'}
          </button>
        </div>
      </div>

      {/* Database Connection */}
      <div className="card-modern p-8 animate-rise">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-upwork-400 to-upwork-600 flex items-center justify-center shadow-lg shadow-upwork-500/25">
            <Database className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Database Connection</h3>
        </div>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
          The Supabase project this app reads from and writes to.
        </p>
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 break-all">
          <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
            {supabaseConfig?.url ?? 'Not configured'}
          </p>
        </div>
        <button onClick={handleReconfigure} className="btn-secondary flex items-center mt-6">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reconfigure
        </button>
      </div>

      {/* Dark Mode Toggle */}
      <div className="card-modern p-8 animate-rise">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-upwork-400 to-upwork-600 flex items-center justify-center shadow-lg shadow-upwork-500/25 mr-3">
                {theme === 'light' ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-white" />}
              </div>
              Dark Mode
            </h3>
            <p className="text-base text-gray-600 dark:text-gray-400 mt-2">
              Toggle between light and dark themes
            </p>
          </div>
          
          <button
            onClick={toggleTheme}
            className={`
              relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-upwork-500 focus:ring-offset-2
              ${theme === 'dark' ? 'bg-upwork-500 shadow-lg' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-md
                ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
            <span className="sr-only">Toggle dark mode</span>
          </button>
        </div>
        
        <div className="flex items-center mt-6 text-base text-gray-500 dark:text-gray-400 font-medium">
          {theme === 'light' ? (
            <>
              <Sun className="w-5 h-5 mr-3" />
              Light mode active
            </>
          ) : (
            <>
              <Moon className="w-5 h-5 mr-3" />
              Dark mode active
            </>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="card-modern p-8 animate-rise">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-upwork-500/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <EmberMark size="sm" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            How It Works
          </h3>
        </div>
        
        <div className="space-y-6 text-base text-gray-600 dark:text-gray-400">
          <div className="flex space-x-4 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 text-upwork-600 dark:text-upwork-400 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
              1
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-white mb-2">Paste Job Details</p>
              <p className="leading-relaxed">Copy the job title and description from Upwork and paste them into the Apply section.</p>
            </div>
          </div>
          
          <div className="flex space-x-4 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 text-upwork-600 dark:text-upwork-400 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
              2
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-white mb-2">Generate Proposal</p>
              <p className="leading-relaxed">Click "Generate Proposal" to create your cover letter, diagram code, proposal document, and video script.</p>
            </div>
          </div>
          
          <div className="flex space-x-4 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 text-upwork-600 dark:text-upwork-400 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
              3
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-white mb-2">Save Materials</p>
              <p className="leading-relaxed">Review and edit your materials, then save them as a complete record for tracking.</p>
            </div>
          </div>
          
          <div className="flex space-x-4 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 text-upwork-600 dark:text-upwork-400 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
              4
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-white mb-2">Track Progress</p>
              <p className="leading-relaxed">Update the status of your proposals in the Track section as you progress through the application process.</p>
            </div>
          </div>
          
          <div className="flex space-x-4 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 bg-upwork-100 dark:bg-upwork-900/30 text-upwork-600 dark:text-upwork-400 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
              5
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-white mb-2">Monitor Success</p>
              <p className="leading-relaxed">View your performance metrics and success rates on the Dashboard to improve your proposal strategy.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};