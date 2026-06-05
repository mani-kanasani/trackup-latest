import React, { useEffect, useState } from 'react';
import { Moon, Sun, Sparkles, Key, ExternalLink, Check, Database, RefreshCw, Loader2, UserRound } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatedLogo } from '../components/UI/AnimatedLogo';
import { AIProvider, PROVIDER_META, loadAIConfig, saveAIConfig } from '../lib/aiConfig';
import { getSupabaseConfig, clearSupabaseConfig } from '../lib/supabaseConfig';
import { loadUserContext, saveUserContext, UserContext } from '../lib/userContext';
import { supabase } from '../lib/supabase';

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

  useEffect(() => {
    const existing = loadAIConfig();
    if (existing) {
      setProvider(existing.provider);
      setModel(existing.model);
      setApiKey(existing.apiKey);
    }
    setContext(loadUserContext());
  }, []);

  const handleProviderChange = (next: AIProvider) => {
    setProvider(next);
    setModel(PROVIDER_META[next].defaultModel);
    setLoadedModels([]);
    setModelsError('');
  };

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
      <div className="card-modern p-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 bg-upwork-500 rounded-lg flex items-center justify-center">
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
            <input
              id="ai-model"
              list="ai-model-options"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="input-modern"
              placeholder={meta.defaultModel}
            />
            <datalist id="ai-model-options">
              {modelChoices.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
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

          <button onClick={handleSaveAI} className="btn-primary flex items-center">
            {saved ? <Check className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {saved ? 'Saved' : 'Save AI Settings'}
          </button>
        </div>
      </div>

      {/* Your context */}
      <div className="card-modern p-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 bg-upwork-500 rounded-lg flex items-center justify-center">
            <UserRound className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Your context</h3>
        </div>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
          Tell the AI about you and your agency. This is woven into every proposal and LinkedIn DM so
          they're grounded in your real background, wins and proof. Stored in this browser.
        </p>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">About you / your agency</label>
            <textarea
              value={context.about}
              onChange={(e) => setContext((c) => ({ ...c, about: e.target.value }))}
              rows={3}
              className="input-modern resize-none"
              placeholder="e.g. I run an AI automation agency that builds custom workflows and AI systems for B2B teams…"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Wins & results</label>
            <textarea
              value={context.wins}
              onChange={(e) => setContext((c) => ({ ...c, wins: e.target.value }))}
              rows={3}
              className="input-modern resize-none"
              placeholder="e.g. Saved a client 20 hrs/week with a lead-routing system; shipped 30+ automations; 3x'd a team's reply rate…"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Testimonials</label>
            <textarea
              value={context.testimonials}
              onChange={(e) => setContext((c) => ({ ...c, testimonials: e.target.value }))}
              rows={3}
              className="input-modern resize-none"
              placeholder={'e.g. "Mani completely transformed our outreach." — Jane, CEO of Acme'}
            />
          </div>
          <button onClick={handleSaveContext} className="btn-primary flex items-center">
            {contextSaved ? <Check className="w-4 h-4 mr-2" /> : <UserRound className="w-4 h-4 mr-2" />}
            {contextSaved ? 'Saved' : 'Save context'}
          </button>
        </div>
      </div>

      {/* Database Connection */}
      <div className="card-modern p-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 bg-upwork-500 rounded-lg flex items-center justify-center">
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
      <div className="card-modern p-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="w-8 h-8 bg-upwork-500 rounded-lg flex items-center justify-center mr-3">
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
              relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-upwork-500 focus:ring-offset-2 transform hover:scale-105
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
      <div className="card-modern p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-upwork-500/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <AnimatedLogo size="sm" />
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