// Builds the system prompt sent to the model.
//
// Composition order matters. Doctrine first, because it governs. The user's own
// context second, because it supplies the specifics doctrine asks for. Their
// overrides last, because a user who edits the prompt should win, except on the
// laws, which are what makes output good in the first place.

import type { MethodPack } from './types';

export interface ComposeInput {
  pack: MethodPack;
  /** Who the user is: background, positioning, offer. */
  context?: string;
  /** Selected case studies, already rendered to text. */
  proof?: string;
  /** The user's own additions to the persona. Never replaces the laws. */
  userPrompt?: string;
}

const bullet = (s: string) => `- ${s.replace(/\s+/g, ' ').trim()}`;

export const composeSystemPrompt = ({ pack, context, proof, userPrompt }: ComposeInput): string => {
  const sections: string[] = [];

  sections.push(
    `You are writing ${pack.label}. Your output is sent to a real buyer by a real operator, so it has to work, not merely read well.`,
  );

  sections.push(`## What this channel is for\n${pack.thesis}`);

  sections.push(
    `## The rule that overrides all others\n${pack.primeDirective}\nWhen any other instruction conflicts with this one, this one wins.`,
  );

  sections.push(
    `## Laws. These are not preferences.\n${pack.laws.map((l) => bullet(`${l.rule} (${l.because})`)).join('\n')}`,
  );

  const hard = pack.banned.filter((b) => b.level === 'hard');
  if (hard.length) {
    sections.push(
      `## Never produce any of these. Output is automatically rejected if it contains them.\n${hard
        .map((b) => bullet(`${b.label}: ${b.because}`))
        .join('\n')}`,
    );
  }

  sections.push(
    `## The shape of what you produce\n${pack.structure
      .map((s) => {
        const when = s.day === undefined ? '' : ` [day ${s.day}]`;
        const cap = s.maxChars ? ` [max ~${s.maxChars} characters]` : '';
        const cons = s.constraints.length ? `\n  ${s.constraints.map((c) => `· ${c}`).join('\n  ')}` : '';
        return `- **${s.label}**${when}${cap} — ${s.purpose}${cons}`;
      })
      .join('\n')}`,
  );

  if (context?.trim()) {
    sections.push(
      `## Who the sender is. Use these specifics. Never invent facts about them.\n${context.trim()}`,
    );
  }

  if (proof?.trim()) {
    sections.push(
      `## The sender's verified proof. Use at most ONE per message, matched to the reader's world.\n` +
        `Never use a number that does not appear below, and never round one up.\n${proof.trim()}`,
    );
  }

  if (userPrompt?.trim()) {
    sections.push(
      `## The sender's own direction. Follow it wherever it does not conflict with the laws above.\n${userPrompt.trim()}`,
    );
  }

  sections.push(
    `## Before you answer\nRe-read your output once against the laws and the banned list. Fix anything that violates them, then reply.`,
  );

  return sections.join('\n\n');
};

/** A compact human-readable digest of the doctrine, for showing the user what is being applied. */
export const describePack = (pack: MethodPack): string =>
  [
    pack.thesis,
    '',
    `Prime directive: ${pack.primeDirective}`,
    '',
    `${pack.laws.length} laws, ${pack.banned.length} banned patterns, ${pack.structure.length} steps.`,
  ].join('\n');
