// User / agency context, woven into every generation so proposals and DMs are
// grounded in the user's real background. Stored in the browser (like the AI key).

export interface UserContext {
  about: string; // who you are / your agency / what you do
  wins: string; // results, metrics, case studies
  testimonials: string; // social proof
}

const STORAGE_KEY = 'ember.userContext';

const EMPTY: UserContext = { about: '', wins: '', testimonials: '' };

export const loadUserContext = (): UserContext => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<UserContext>;
    return {
      about: parsed.about ?? '',
      wins: parsed.wins ?? '',
      testimonials: parsed.testimonials ?? '',
    };
  } catch {
    return EMPTY;
  }
};

export const saveUserContext = (context: UserContext): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
};

/**
 * Who the sender is, and nothing else. This is what generators may be given.
 *
 * `contextToPrompt` must never reach a generator that also receives proof from
 * the vault. It carries wins and testimonials as a free-text blob labelled "use
 * specifics where relevant", which lands in the user prompt while the system
 * prompt is telling the model to use exactly one matched case study and to never
 * state a number that is not on record. The model gets both, and the blob wins
 * because it is closer to the task — so a number nobody vetted, attributed to a
 * client who was never cleared for naming, ends up in the copy.
 *
 * The vault's own empty-vault fallback in `forChannel` already handles the user
 * who has wins and no case studies, and it applies the cap and the framing.
 */
export const senderAbout = (c: UserContext): string => c.about?.trim() ?? '';

/**
 * The full flattened context, including wins and testimonials.
 *
 * Only for callers with no proof pipeline of their own. Prefer `senderAbout`.
 */
export const contextToPrompt = (c: UserContext): string => {
  const parts: string[] = [];
  if (c.about?.trim()) parts.push(`About the sender:\n${c.about.trim()}`);
  if (c.wins?.trim()) parts.push(`My wins & results (use specifics where relevant):\n${c.wins.trim()}`);
  if (c.testimonials?.trim()) parts.push(`Testimonials / social proof:\n${c.testimonials.trim()}`);
  return parts.join('\n\n');
};

export const hasUserContext = (c: UserContext): boolean =>
  Boolean(c.about?.trim() || c.wins?.trim() || c.testimonials?.trim());
