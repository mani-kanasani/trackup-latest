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

// Flattened string passed to the edge functions and inserted into the prompt.
export const contextToPrompt = (c: UserContext): string => {
  const parts: string[] = [];
  if (c.about?.trim()) parts.push(`About me / my agency:\n${c.about.trim()}`);
  if (c.wins?.trim()) parts.push(`My wins & results (use specifics where relevant):\n${c.wins.trim()}`);
  if (c.testimonials?.trim()) parts.push(`Testimonials / social proof:\n${c.testimonials.trim()}`);
  return parts.join('\n\n');
};

export const hasUserContext = (c: UserContext): boolean =>
  Boolean(c.about?.trim() || c.wins?.trim() || c.testimonials?.trim());
