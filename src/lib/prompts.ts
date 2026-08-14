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

/**
 * Example additions, shown as PLACEHOLDER text and never as a value.
 *
 * These used to be pre-filled into the Settings textarea, which meant pressing
 * Save persisted "an expert automation & AI systems specialist" as the user's
 * own stated direction — an offer a designer, a bookkeeper or a copywriter never
 * claimed, injected into every generation as "The sender's own direction". Same
 * class of defect as the hardcoded persona removed from generate-proposal.
 *
 * Left blank, nothing is added and the method pack governs alone, which is the
 * correct default: the packs carry the doctrine, and a vague persona line placed
 * after them can only dilute it.
 */
export const DEFAULT_PROMPTS: CustomPrompts = {
  proposal:
    'Optional. Anything the method should know about how you specifically write. ' +
    'For example: name the trade you actually work in, a constraint you always apply, ' +
    'or a phrase you never use.',
  outreach:
    'Optional. Anything the method should know about how you specifically write. ' +
    'For example: how formal you are, whether you use first names, ' +
    'or a subject you will not open on.',
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
