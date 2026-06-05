// Bring-your-own-key AI configuration.
//
// The user picks a provider and supplies their own API key in Settings. The key
// is stored only in this browser's localStorage and sent to our Supabase Edge
// Function transiently at generation time — it is never persisted on our servers.

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

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
    defaultModel: 'gemini-2.5-flash',
    modelOptions: ['gemini-2.5-flash', 'gemini-3-flash', 'gemini-2.0-flash'],
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
    modelOptions: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    keyLabel: 'OpenAI API key',
    keyUrl: 'https://platform.openai.com/api-keys',
    free: false,
    hint: 'Paid usage. Matches the original setup (gpt-4o-mini). Key starts with "sk-".',
  },
  anthropic: {
    label: 'Anthropic Claude',
    defaultModel: 'claude-haiku-4-5',
    modelOptions: ['claude-haiku-4-5', 'claude-sonnet-4-5'],
    keyLabel: 'Anthropic API key',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    free: false,
    hint: 'Paid usage. Strong writing quality (Claude Haiku/Sonnet). Key starts with "sk-ant-".',
  },
};

const STORAGE_KEY = 'trackup.aiConfig';

export const isProvider = (value: unknown): value is AIProvider =>
  value === 'gemini' || value === 'openai' || value === 'anthropic';

export const loadAIConfig = (): AIConfig | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
};
