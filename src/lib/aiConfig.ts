// Bring-your-own-key AI configuration.
//
// The user picks a provider and supplies their own API key in Settings. The key
// is stored only in this browser's localStorage and sent to our Supabase Edge
// Function transiently at generation time — it is never persisted on our servers.

import { readMigrating } from './storage';

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

export interface ProviderMeta {
  label: string;
  defaultModel: string;
  modelOptions: string[];
  keyLabel: string;
  keyUrl: string;
  free: boolean;
  hint: string;
}

export const PROVIDER_META: Record<AIProvider, ProviderMeta> = {
  gemini: {
    label: 'Google Gemini (free tier)',
    defaultModel: 'gemini-3.7-flash',
    // gemini-3-flash never existed (the ID is gemini-3-flash-preview),
    // gemini-2.0-flash shut down 1 Jun 2026, gemini-1.5-flash 29 Sep 2025.
    modelOptions: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    keyLabel: 'Gemini API key',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    free: true,
    hint:
      'Free, no credit card required. Create a key in Google AI Studio. The free tier (Flash models) ' +
      'easily covers everyday proposal generation (~1,500 requests/day).',
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    // gpt-4.1-nano and o3-mini both shut down 23 Oct 2026, and o3-mini rejects
    // temperature, so neither belongs in a preset list.
    modelOptions: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini'],
    keyLabel: 'OpenAI API key',
    keyUrl: 'https://platform.openai.com/api-keys',
    free: false,
    hint: 'Paid usage. Matches the original setup (gpt-4o-mini). Key starts with "sk-".',
  },
  anthropic: {
    label: 'Anthropic Claude',
    defaultModel: 'claude-sonnet-5',
    // claude-3-5-haiku-latest was retired 19 Feb 2026; requests to it fail, and
    // the alias does not resolve to anything live.
    modelOptions: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5', 'claude-fable-5'],
    keyLabel: 'Anthropic API key',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    free: false,
    hint: 'Paid usage. Strong writing quality (Claude Haiku/Sonnet). Key starts with "sk-ant-".',
  },
  openrouter: {
    label: 'OpenRouter (Kimi, DeepSeek, GLM, 400+ models)',
    // Kimi K2 at roughly $0.60 in / $2.50 out per million tokens against Claude
    // Sonnet's $3 / $15: the same job for a fraction of the spend, which is the
    // reason people ask for this provider by name.
    defaultModel: 'moonshotai/kimi-k2-0905',
    // Quick picks only. The full catalogue, 350+ models across 44 labs, loads
    // from the provider with "Load models". This is a spread across price
    // points and labs rather than a leaderboard, and every entry was checked
    // live for the ability to return JSON on request.
    modelOptions: [
      'moonshotai/kimi-k2-0905',
      'moonshotai/kimi-k3',
      'deepseek/deepseek-v4-flash-0731',
      'z-ai/glm-5.2',
      'qwen/qwen3.7-plus',
      'anthropic/claude-sonnet-5',
      'openai/gpt-oss-20b:free',
    ],
    keyLabel: 'OpenRouter API key',
    keyUrl: 'https://openrouter.ai/keys',
    free: false,
    hint:
      'One key, 400+ models from every major lab. Kimi K2 costs roughly a fifth of Claude Sonnet ' +
      'and has no daily cap, so it sits between the free Gemini tier and the expensive options. ' +
      'Load credit once and switch models freely. Key starts with "sk-or-".',
  },
};

const STORAGE_KEY = 'ember.aiConfig';
const LEGACY_STORAGE_KEY = 'trackup.aiConfig';

/**
 * Derived from PROVIDER_META rather than restating the union.
 *
 * The hand-written list silently rejected any provider added to the type and the
 * metadata but not to this third place, and the symptom is a saved config that
 * loads as null — the user's key "disappears" on refresh with no error anywhere.
 */
export const isProvider = (value: unknown): value is AIProvider =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(PROVIDER_META, value);

export const loadAIConfig = (): AIConfig | null => {
  try {
    const raw = readMigrating(STORAGE_KEY, LEGACY_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AIConfig>;
    const provider = parsed.provider;
    if (!isProvider(provider) || typeof parsed.apiKey !== 'string' || !parsed.apiKey) {
      return null;
    }

    return {
      provider,
      model: parsed.model || PROVIDER_META[provider].defaultModel,
      apiKey: parsed.apiKey,
    };
  } catch {
    return null;
  }
};

export const saveAIConfig = (config: AIConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const clearAIConfig = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
};
