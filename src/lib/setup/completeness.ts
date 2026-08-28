// Is this member set up well enough for what Ember writes to be worth sending?
//
// An empty proof vault degrades every generation, and the member blames the tool
// rather than the setup. Two batches of beginners will hit that at scale unless
// the app is explicit about it, so this names exactly what is missing and where
// to fix it.
//
// The load-bearing decision is what counts as proof. A researched industry
// figure with its source credited IS a valid starting state, not a gap. Most
// members arriving here have never had a client and cannot get one before their
// first send, and telling them they are incomplete for lacking a case study is
// both useless and untrue: Ember keeps industry research in its own store, and
// refuses to let a borrowed figure out without its source in the same message,
// so the honesty is already handled. Nothing here needs to nag about it.
//
// Failed reads are their own state. "We could not look" must never be rendered
// as "you have none" — that is how a member with a full vault gets told to go
// and build one.

export type ItemState = 'done' | 'missing' | 'unknown';

export interface SetupItem {
  id: string;
  /** What it is, in the member's terms. */
  label: string;
  /** Done: what they have. Missing: the specific next action, not a category. */
  detail: string;
  state: ItemState;
  /** False for things that sharpen output rather than decide whether it is sendable. */
  required: boolean;
  /** The section to scroll to. Matches an id in Settings. */
  anchor: string;
}

export interface SetupInputs {
  /** A provider and key are saved. Without them nothing generates at all. */
  aiConfigured: boolean;
  /** `about` from the user context. */
  about: string;
  /** The legacy free-text wins and testimonials, which still ground a generation. */
  legacyProof: string;
  /** Active case studies in the vault. */
  caseCount: number;
  /**
   * Sourced figures a generation would actually use.
   *
   * Counted the way the prompt builder counts them, and not one row wider. A
   * meter that says "you have proof" while generation finds none produces the
   * exact complaint this feature exists to prevent, only with the app
   * agreeing that everything is fine.
   */
  evidenceCount: number;
  /**
   * Sourced figures that exist but cannot be reached.
   *
   * A brief with no vertical named holds its evidence out of every generation.
   * The member did the work and none of it is in play, so this is named
   * exactly rather than being reported as having nothing.
   */
  strandedEvidence?: number;
  /** The seven questions have been through to the end at least once. */
  interviewDone: boolean;
  /** A vertical brief exists. */
  hasBrief: boolean;
  /** The vault read failed, so its count means nothing. */
  vaultUnknown?: boolean;
  /** The brief read failed, so the evidence count means nothing. */
  briefUnknown?: boolean;
}

export interface Completeness {
  items: SetupItem[];
  /** Everything required is done. */
  ready: boolean;
  missingRequired: SetupItem[];
  /** Optional items worth doing, so they can be shown quietly and separately. */
  suggestions: SetupItem[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * What the member can point to, and how.
 *
 * Deliberately satisfied by any one of three things. A vault entry is the
 * strongest, the legacy free-text wins still work for an existing user who never
 * migrated, and a sourced industry figure is a legitimate starting state rather
 * than a consolation prize.
 */
const proofItem = (i: SetupInputs): SetupItem => {
  const base = { id: 'proof', label: 'Something to point to', required: true, anchor: 'setup-vault' };

  if (i.vaultUnknown && i.briefUnknown) {
    return {
      ...base,
      state: 'unknown',
      detail: 'Your vault and your brief could not be read, so this is not a claim that you have nothing. Reload, or check the database connection.',
    };
  }

  if (i.caseCount > 0) {
    return {
      ...base,
      state: 'done',
      detail: `${plural(i.caseCount, 'case study', 'case studies')} in the vault. Ember matches one to each reader rather than sending all of them.`,
    };
  }

  if (i.evidenceCount > 0) {
    return {
      ...base,
      state: 'done',
      detail: `${plural(i.evidenceCount, 'sourced industry figure', 'sourced industry figures')}, credited in every message that uses one. That is a real starting state — a client result is not required before your first send.`,
    };
  }

  if ((i.strandedEvidence ?? 0) > 0 && !i.legacyProof.trim()) {
    return {
      ...base,
      anchor: 'setup-brief',
      state: 'missing',
      detail: `${plural(i.strandedEvidence!, 'sourced figure is', 'sourced figures are')} on your brief, but it has no vertical named, so no generation can reach them. Name the vertical and they come into play.`,
    };
  }

  if (i.legacyProof.trim()) {
    return {
      ...base,
      state: 'done',
      detail: 'Your wins and testimonials are being used. Moving them into the vault is better: Ember can then match one proof to each reader instead of sending the lot every time.',
    };
  }

  if (i.vaultUnknown || i.briefUnknown) {
    return {
      ...base,
      state: 'unknown',
      detail: 'Part of your setup could not be read, so nothing can be said about what you have. Reload before trusting this.',
    };
  }

  return {
    ...base,
    state: 'missing',
    detail: 'Add one case study, or one industry figure with its source. Either is enough — without one, every message Ember writes will claim no results.',
  };
};

export const assessSetup = (i: SetupInputs): Completeness => {
  const items: SetupItem[] = [
    {
      id: 'provider',
      label: 'An AI provider and key',
      required: true,
      anchor: 'setup-provider',
      state: i.aiConfigured ? 'done' : 'missing',
      detail: i.aiConfigured
        ? 'Saved in this browser and sent straight to your provider.'
        : 'Pick a provider and paste your key. Nothing generates without it.',
    },
    {
      id: 'about',
      label: 'Who you are',
      required: true,
      anchor: 'setup-context',
      state: i.about.trim() ? 'done' : 'missing',
      detail: i.about.trim()
        ? 'Every message is written from your background rather than a generic one.'
        : 'One or two lines on what you do. Without it the copy is written by a model that knows nothing about you, and it reads that way.',
    },
    proofItem(i),
  ];

  /*
    Suggestions, not gaps.

    The interview is only worth raising for someone with no first-party results,
    because its entire purpose is surfacing results people have and do not count.
    Once it has been through to the end it is never raised again: a member who
    answered no seven times has given their answer, and asking again is the nag
    this feature exists to remove.
  */
  const suggestions: SetupItem[] = [];

  if (i.caseCount === 0 && !i.vaultUnknown && !i.interviewDone) {
    suggestions.push({
      id: 'interview',
      label: 'Find proof you already have',
      required: false,
      anchor: 'setup-vault',
      state: 'missing',
      detail: 'Seven questions, one at a time. Most people answer no to the first few and yes to something further down they had never thought to count.',
    });
  }

  if (!i.hasBrief && !i.briefUnknown) {
    suggestions.push({
      id: 'brief',
      label: 'A vertical brief',
      required: false,
      anchor: 'setup-brief',
      state: 'missing',
      detail: 'Paste a report or blueprint about the niche you picked. It gives every message the language of that industry, and it is where sourced figures live.',
    });
  }

  const missingRequired = items.filter((it) => it.required && it.state !== 'done');

  return {
    items,
    ready: missingRequired.length === 0,
    missingRequired,
    suggestions,
  };
};
