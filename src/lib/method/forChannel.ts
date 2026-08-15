// The single seam between the app and the method engine.
//
// Callers ask for a channel and get back the system prompt to send and the pack
// to validate the response against. Everything the doctrine needs — the user's
// background, the right proof for this specific reader, their own prompt edits —
// is gathered here so no page has to remember the composition order.

import { getPack } from './packs';
import { composeSystemPrompt } from './compose';
import { validateOutput, type GeneratedOutput } from './validate';
import { subjectKey } from './types';
import type { ChannelId, MethodPack, ValidationResult } from './types';
import { loadUserContext, contextToPrompt } from '../userContext';
import { loadPrompts } from '../prompts';
import { selectBest, rankCases } from '../proof/select';
import { renderProof } from '../proof/render';
import type { Audience, CaseStudy, ScoredCase, Target } from '../proof/types';
import { renderQualification } from '../qualify/render';
import type { QualificationResult } from '../qualify/types';

/** Maps a channel to the user's editable prompt slot. */
const PROMPT_SLOT: Record<ChannelId, 'proposal' | 'outreach'> = {
  upwork: 'proposal',
  linkedin: 'outreach',
  coldEmail: 'outreach',
};

/**
 * Every channel Ember generates for writes to one person already in the
 * conversation, so client names are permitted. Public-facing surfaces (posts,
 * lead magnets) would pass 'public' and get the anonymised form.
 */
const CHANNEL_AUDIENCE: Record<ChannelId, Audience> = {
  upwork: 'direct',
  linkedin: 'direct',
  coldEmail: 'direct',
};

export interface BuildOptions {
  /** The user's vault. Omitted means fall back to the free-text wins field. */
  cases?: CaseStudy[];
  /**
   * Set when the vault could not be READ, which is a different thing from the
   * vault being empty and must never be treated as the same. An empty array
   * from a failed query is indistinguishable from a genuinely empty vault, and
   * telling someone with three saved case studies that they have none — after
   * charging them for the generation — is the failure this prevents.
   */
  vaultUnavailable?: boolean;
  /** What we know about the reader, used to match a case study to their world. */
  target?: Target;
  /** Override the channel's default audience. */
  audience?: Audience;
  /** Force a specific case study, e.g. because the user overrode the pick. */
  forceCaseId?: string;
  /**
   * The screen's verdict on this reader. Omitted means no screen was run, and
   * the prompt simply carries no brief — the same graceful-degradation the
   * empty vault gets, because a half-adopted feature must not break the app.
   */
  qualification?: QualificationResult;
}

/**
 * One key the model must return, derived from the pack.
 *
 * This exists because the output contract has to come from the doctrine rather
 * than be restated next to it. When a generator hardcodes its own JSON shape,
 * the shape and the pack drift, and the validator then grades output against
 * keys that were never requested — reporting every step as empty while the copy
 * itself is fine. Deriving the contract makes that class of bug impossible.
 */
export interface OutputStep {
  key: string;
  label: string;
  purpose: string;
  maxChars?: number;
  constraints: string[];
}

export const outputSteps = (pack: MethodPack): OutputStep[] =>
  pack.structure.flatMap(({ key, label, purpose, maxChars, constraints, subject }) => {
    const body: OutputStep = { key, label, purpose, maxChars, constraints };
    if (!subject) return [body];
    // The subject is requested as its own key, immediately before the body it
    // belongs to. Asking for it inside the body's constraints produced a
    // sequence with no subject line at all: the model either folded it into the
    // first line or silently skipped it, and because nothing ever asked for the
    // key, nothing ever reported it missing.
    return [
      {
        key: subjectKey(key),
        label: `${label} — subject line`,
        purpose: subject.purpose,
        maxChars: subject.maxChars,
        constraints: subject.constraints,
      },
      body,
    ];
  });

export interface ChannelPrompt {
  pack: MethodPack;
  systemPrompt: string;
  /** The exact keys the model must return. Send these to the generator. */
  steps: OutputStep[];
  /** True when the user has supplied nothing about themselves. */
  contextEmpty: boolean;
  /** True when no proof is available, which several laws depend on. */
  proofEmpty: boolean;
  /** True when proof might exist but could not be read. Never say "you have none". */
  proofUnknown: boolean;
  /** The case study chosen, so the UI can show and explain the pick. */
  chosen: ScoredCase | null;
  /** Runners-up, so the user can swap without leaving the page. */
  alternatives: ScoredCase[];
  /** True when the screen declined this lead, so the caller can refuse to send. */
  declined: boolean;
}

export const buildChannelPrompt = (
  channel: ChannelId,
  options: BuildOptions = {},
): ChannelPrompt => {
  const pack = getPack(channel);
  const ctx = loadUserContext();
  const audience = options.audience ?? CHANNEL_AUDIENCE[channel];
  const target = options.target ?? {};

  let chosen: ScoredCase | null = null;
  let alternatives: ScoredCase[] = [];
  let proof = '';

  const vault = options.cases ?? [];
  if (vault.length) {
    const ranked = rankCases(vault, target);
    chosen = options.forceCaseId
      ? ranked.find((r) => r.caseStudy.id === options.forceCaseId) ?? null
      : selectBest(vault, target, audience);
    alternatives = ranked.filter((r) => r.caseStudy.id !== chosen?.caseStudy.id).slice(0, 4);
    if (chosen) proof = renderProof([chosen.caseStudy], audience);
  }

  // Fall back to the legacy free-text fields when the vault is empty, so an
  // existing user who has not migrated their wins still gets grounded output.
  if (!proof) {
    const legacy = [ctx.wins?.trim(), ctx.testimonials?.trim()].filter(Boolean).join('\n\n');
    if (legacy) {
      proof = `${legacy}\n\nUse at most one of these per message. Never state a number that does not appear above.`;
    }
  }

  const about = ctx.about?.trim() ? `About the sender:\n${ctx.about.trim()}` : '';
  const userPrompt = loadPrompts()[PROMPT_SLOT[channel]].trim();
  const qualification = options.qualification ? renderQualification(options.qualification) : '';

  return {
    pack,
    systemPrompt: composeSystemPrompt({ pack, qualification, context: about, proof, userPrompt }),
    steps: outputSteps(pack),
    contextEmpty: !contextToPrompt(ctx).trim(),
    proofEmpty: !proof && !options.vaultUnavailable,
    proofUnknown: Boolean(options.vaultUnavailable),
    chosen,
    alternatives,
    declined: options.qualification?.verdict === 'decline',
  };
};

/** Check a generator's response against the same doctrine that produced it. */
export const checkAgainstMethod = (channel: ChannelId, output: GeneratedOutput): ValidationResult =>
  validateOutput(getPack(channel), output);

export type { ValidationResult };
