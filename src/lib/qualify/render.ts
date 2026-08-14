// Turning a verdict into instructions the model can follow.
//
// The screen would be a reporting feature if it stopped at a verdict. What makes
// it part of generation is that three of its outputs change what the copy is
// allowed to be:
//
//   · the RUNG decides what job the message has to do, and writing a
//     differentiation message to someone who has not named the problem is the
//     most common way a technically clean message fails;
//   · the TIER sets a ceiling on claimed familiarity, so a lead nobody
//     researched cannot receive a message that opens with an observation;
//   · the PILLARS decide which angles are available, because "you are losing
//     hours to rework" is an invention unless somebody confirmed the rework.

import { PILLARS, RUNGS, TIERS } from './doctrine';
import type { QualificationResult } from './types';

export const renderQualification = (q: QualificationResult): string => {
  if (q.verdict === 'decline') {
    // Included rather than omitted: if a caller generates anyway, the model
    // should know the screen failed rather than write in the dark.
    return [
      '## This lead did not pass qualification',
      q.blockers.join(' '),
      'Do not write outreach that implies a fit nobody has established.',
    ].join('\n');
  }

  const sections: string[] = [];

  if (q.rung) {
    const rung = RUNGS[q.rung];
    sections.push(
      `## What this message has to do\n${rung.state}\n${rung.jobs} job${
        rung.jobs === 1 ? '' : 's'
      } to win them.\n${rung.instruction}`,
    );
  }

  if (q.tier) {
    const tier = TIERS[q.tier];
    // Only the ceiling goes to the model. `effort` is advice to the OPERATOR
    // about how much of themselves to spend — how many touches to send, whether
    // to answer replies personally — and putting it in the prompt made the
    // request contradict itself: "short sequence only" alongside a contract
    // demanding every step in the pack. The model produces the artifact; how
    // much of it gets sent is the operator's call, shown in the UI.
    sections.push(
      `## What you may claim to know about this lead\n${tier.label}.\n${tier.ceiling}`,
    );
  }

  const licensed = q.pillarsCleared
    .map((id) => PILLARS.find((p) => p.id === id)!)
    .filter((p) => p.licenses)
    .map((p) => `- ${p.label} is confirmed. ${p.licenses}`);

  const withheld = [...q.pillarsRuledOut, ...q.pillarsUnknown]
    .map((id) => PILLARS.find((p) => p.id === id)!)
    .map((p) => `- ${p.label} is not confirmed.`);

  if (licensed.length || withheld.length) {
    sections.push(
      `## Which angles are available\n${[...licensed, ...withheld].join('\n')}\n` +
        'Argue only from the confirmed ones. An unconfirmed pillar is a guess about their business, ' +
        'and a guess stated as a fact is what gets a message deleted.',
    );
  }

  return sections.join('\n\n');
};

/**
 * One line for the UI, where a paragraph would not fit.
 *
 * The unanswered count travels with the score deliberately. A qualified Tier A
 * lead can still score in the thirties, purely because most of the screen is
 * blank — and "Tier A, 30/100" reads as a contradiction unless the reason is on
 * the same line.
 */
export const summarise = (q: QualificationResult): string => {
  if (q.verdict === 'decline') return 'Declined by the screen';
  // Named as the optional aid it is. Nobody has to run it, and a lead nobody
  // ran it on is not deficient.
  if (!q.answered) return 'Qualify this lead (optional)';
  if (q.verdict === 'notYet') return `Not enough known yet, ${q.openQuestions.length} question(s) open`;
  const open = q.openQuestions.length ? ` · ${q.openQuestions.length} unanswered` : '';
  return `Qualified · ${TIERS[q.tier!].label} · ${q.score}/100${open}`;
};
