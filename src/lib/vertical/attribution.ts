// The honesty rule, enforced mechanically.
//
// The methodology states it in prose: borrowed proof must be labelled as
// borrowed. Prose asks a beginner to remember, at the exact moment they are
// most tempted to forget, and the failure is invisible until a buyer checks.
//
// So: if a figure from the industry evidence appears in generated copy without
// its source named in the same message, that is a hard violation. The member
// cannot ship an unattributed borrowed number by accident.

import type { IndustryEvidence } from './types';
import type { Violation } from '../method/types';

/**
 * Flatten the ways the same figure gets written.
 *
 * "21 times" and "21x" are the same claim, and a model asked for plain English
 * will pick whichever fits the sentence. Comparing raw strings would catch one
 * and miss the other, which is worse than not checking at all: it would teach
 * people the check works.
 */
const normalise = (s: string): string =>
  s
    .toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, '$1')
    .replace(/\s*per\s*cent\b/g, '%')
    .replace(/\s*percent\b/g, '%')
    .replace(/(\d)\s*times\b/g, '$1x')
    .replace(/(\d)\s*x\b/g, '$1x')
    .replace(/\s+/g, ' ');

/**
 * The figures in a metric that are distinctive enough to match on.
 *
 * A bare small number is deliberately ignored. "30" appears in ordinary copy
 * constantly ("30 minutes", "30 days"), and flagging it would bury the real
 * violations under noise until people stopped reading the warnings. A number
 * carrying a unit, or a figure in the thousands, is specific enough to be worth
 * asserting about.
 */
export const figuresIn = (metric: string): string[] => {
  const found = new Set<string>();
  for (const m of normalise(metric).matchAll(/\$?\d[\d.]*\s*[%x]?/g)) {
    const tok = m[0].replace(/\s+/g, '');
    const hasUnit = /[%x$]/.test(tok);
    const digits = tok.replace(/\D/g, '');
    if (hasUnit || digits.length >= 4) found.add(tok);
  }
  return [...found];
};

/** Words from the source name worth looking for. "Digital" alone proves nothing. */
const sourceTokens = (name: string): string[] =>
  normalise(name)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !['digital', 'group', 'report', 'study', 'data', 'the'].includes(w));

/** Is this source credited anywhere in the text? */
export const isAttributed = (text: string, e: IndustryEvidence): boolean => {
  const hay = normalise(text);
  const tokens = sourceTokens(e.source_name);
  // A source whose every word is generic falls back to the whole string, so a
  // check can never silently pass because the name was unusable.
  if (!tokens.length) return hay.includes(normalise(e.source_name));
  return tokens.some((t) => hay.includes(t));
};

/**
 * Grade one step's text against the evidence that was sent with the prompt.
 *
 * Only figures actually present are checked, so evidence the model sensibly
 * ignored costs nothing.
 */
export const checkAttribution = (
  stepKey: string,
  text: string,
  evidence: IndustryEvidence[],
): Violation[] => {
  if (!text.trim() || !evidence.length) return [];
  const hay = normalise(text);
  const out: Violation[] = [];

  for (const e of evidence) {
    if (!e.metric?.trim()) continue;
    const hit = figuresIn(e.metric).find((f) => hay.includes(f));
    if (!hit) continue;
    if (isAttributed(text, e)) continue;
    out.push({
      stepKey,
      patternId: 'unattributed-borrowed-figure',
      level: 'hard',
      message:
        `${hit} comes from ${e.source_name}, not from the sender, and it is used here with nobody credited. ` +
        `Name ${e.source_name} in the same sentence as the figure, or cut the figure. ` +
        `A borrowed number presented as your own result is the one thing a buyer can catch you on.`,
      excerpt: text.trim().slice(0, 120),
    });
  }
  return out;
};
