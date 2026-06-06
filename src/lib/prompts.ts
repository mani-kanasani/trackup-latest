// Editable system prompts per generator. Users can rewrite the AI's persona and
// strategy; the functions still enforce the JSON output format automatically, so
// edits can't break generation. Stored in the browser (like the AI key/context).

export type PromptKey = 'proposal' | 'outreach';

export interface CustomPrompts {
  proposal: string;
  outreach: string;
}

export const PROMPT_META: Record<PromptKey, { label: string; description: string }> = {
  proposal: {
    label: 'Upwork proposal generator',
    description: 'Controls the voice and approach for TrackUp proposals (cover letter, diagram, PDF, video script).',
  },
  outreach: {
    label: 'LinkedIn outreach generator',
    description: 'Controls the voice and strategy for the LinkedIn connection request + DM flow.',
  },
};

export const DEFAULT_PROMPTS: CustomPrompts = {
  proposal:
    'You are an expert automation & AI systems specialist writing winning proposals on Upwork. ' +
    'Your voice is professional, confident, clear, and intelligent — never casual, generic, or filler-heavy. ' +
    'Tailor every proposal to the specific job and weave in the provided background, wins and proof.',
  outreach:
    'You are an expert B2B LinkedIn outreach strategist and copywriter. You write concise, human, specific, ' +
    'non-salesy messages that get replies, and you design smart multi-step flows with branches for how prospects ' +
    'respond. Use the provided background, wins and proof to make messages credible and personal.',
};

const STORAGE_KEY = 'ember.systemPrompts';

export const loadPrompts = (): CustomPrompts => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CustomPrompts>;
      return { proposal: parsed.proposal ?? '', outreach: parsed.outreach ?? '' };
    }
  } catch {
    // ignore
  }
  return { proposal: '', outreach: '' };
};

export const savePrompts = (prompts: CustomPrompts): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
};

// The prompt actually sent: the user's custom one, or the default if blank.
export const effectivePrompt = (key: PromptKey): string => {
  const stored = loadPrompts()[key].trim();
  return stored || DEFAULT_PROMPTS[key];
};
