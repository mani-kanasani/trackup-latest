// Checks generated output against a MethodPack.
//
// Generation is probabilistic; doctrine is not. A model told "never put a link
// in a cold email" will still occasionally put a link in a cold email. This is
// the layer that catches it, so the user sees the violation instead of sending it.

import { subjectKey } from './types';
import { checkAttribution } from '../vertical/attribution';
import type { IndustryEvidence } from '../vertical/types';
import type { MethodPack, StructureStep, ValidationResult, Violation } from './types';

/** Output keyed by structure step: { opener: "...", value: "..." }. */
export type GeneratedOutput = Record<string, string>;

const EXCERPT_PAD = 28;

const excerptAround = (text: string, index: number, length: number): string => {
  const start = Math.max(0, index - EXCERPT_PAD);
  const end = Math.min(text.length, index + length + EXCERPT_PAD);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
};

const checkBanned = (pack: MethodPack, stepKey: string, text: string): Violation[] => {
  const out: Violation[] = [];
  for (const b of pack.banned) {
    // Regexes are shared across calls; reset lastIndex so /g patterns behave.
    const re = new RegExp(b.pattern.source, b.pattern.flags.includes('g') ? b.pattern.flags : `${b.pattern.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push({
        stepKey,
        patternId: b.id,
        level: b.level,
        message: `${b.label}. ${b.because}`,
        excerpt: excerptAround(text, m.index, m[0].length),
      });
      if (m[0].length === 0) re.lastIndex++; // guard against zero-width loops
      break; // one report per pattern per step is enough to act on
    }
  }
  return out;
};

/*
  Every violation carries an id, because an id is the whole of what gets
  recorded.

  The apps log `patternId ?? lawId ?? 'empty-step'` and nothing else — the
  excerpt is the member's own copy and does not belong in a log. Length and
  structural failures had neither id, so all three fell through to the same
  fallback: an over-long step, a missing subject line and a step that came
  back empty were recorded as the same thing. Any count built from that says
  "empty step" for a member whose real problem is that they write long.
*/
const checkLength = (step: StructureStep, text: string): Violation[] => {
  if (!step.maxChars || text.length <= step.maxChars) return [];
  return [
    {
      stepKey: step.key,
      patternId: 'over-length',
      level: 'soft',
      message: `${step.label} is ${text.length} characters against a ${step.maxChars} ceiling. Shorter converts better; cut to the single idea this step is for.`,
    },
  ];
};

/** Extra material the output must be graded against, beyond the pack itself. */
export interface ValidateOptions {
  /**
   * The industry evidence sent with this prompt.
   *
   * Passed in rather than read from storage so the validator grades what was
   * ACTUALLY sent. Grading against whatever the vault holds now would flag copy
   * generated before a row was added, and miss copy generated before one was
   * deleted.
   */
  evidence?: IndustryEvidence[];
}

export const validateOutput = (
  pack: MethodPack,
  output: GeneratedOutput,
  options: ValidateOptions = {},
): ValidationResult => {
  const violations: Violation[] = [];

  for (const step of pack.structure) {
    const text = (output[step.key] ?? '').trim();
    if (!text) {
      violations.push({
        stepKey: step.key,
        patternId: 'empty-step',
        level: 'hard',
        message: `${step.label} came back empty. Regenerate.`,
      });
      continue;
    }
    violations.push(...checkBanned(pack, step.key, text));
    violations.push(...checkLength(step, text));
    violations.push(...checkAttribution(step.key, text, options.evidence ?? []));

    // Subjects are graded too, and against the same banned patterns.
    //
    // Two of those patterns exist specifically for this field — the fabricated
    // 'Re:' and "quick question" — and both were written to match a bare
    // subject with no "subject:" prefix. Skipping the key here would leave the
    // one field they were designed for as the only one nothing checks.
    if (!step.subject) continue;
    const sKey = subjectKey(step.key);
    const subject = (output[sKey] ?? '').trim();
    if (!subject) {
      violations.push({
        stepKey: sKey,
        patternId: 'empty-subject',
        level: 'hard',
        message: `${step.label} came back with no subject line. Regenerate.`,
      });
      continue;
    }
    violations.push(...checkBanned(pack, sKey, subject));
    violations.push(...checkAttribution(sKey, subject, options.evidence ?? []));
    violations.push(
      ...checkLength(
        { ...step, key: sKey, label: `${step.label} subject`, maxChars: step.subject.maxChars },
        subject,
      ),
    );
  }

  const hardCount = violations.filter((v) => v.level === 'hard').length;
  const softCount = violations.length - hardCount;
  return { ok: hardCount === 0, hardCount, softCount, violations };
};

/**
 * Patterns every channel bans, merged into each pack. These come from the
 * outreach doctrine in the playbooks and hold regardless of channel.
 */
export const UNIVERSAL_BANNED = [
  {
    id: 'em-dash',
    label: 'Em dash or en dash',
    pattern: /[—–]/,
    because: 'Reads as machine-written to anyone who has seen AI copy. Use a comma, a period or a colon.',
    level: 'hard' as const,
  },
  {
    id: 'hedging',
    label: 'Hedging or supplication',
    pattern: /\b(?:just checking in|hope this finds you well|sorry to bother|worth 30 seconds|hope this isn'?t weird|quick question)\b/i,
    because: 'A sophisticated buyer reads hedging as insecurity and discounts you. Write with a flat, confident spine.',
    level: 'hard' as const,
  },
  {
    id: 'negative-plant',
    label: 'Negated negative',
    pattern: /\b(?:not (?:pitching|selling|trying to sell)|no fluff|not a sales)\b/i,
    because: 'The mind drops the "not" and keeps the noun. Saying "not pitching" makes them think pitch. Rewrite positively.',
    level: 'hard' as const,
  },
  {
    id: 'ai-tell',
    label: 'Generic AI phrasing',
    pattern: /\b(?:in today'?s fast-paced|leverage synergies|I hope this email finds you|delve into|it'?s worth noting that)\b/i,
    because: 'Filler that signals a template. Every sentence should carry something only this sender could write.',
    level: 'soft' as const,
  },
  {
    id: 'emoji',
    label: 'Emoji',
    pattern: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
    because: 'Wrong register for a senior B2B buyer, and a spam signal in cold email.',
    level: 'soft' as const,
  },
];
