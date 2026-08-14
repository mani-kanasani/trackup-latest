// Rendering a case study into the proof block the composer receives.
//
// Two jobs beyond formatting:
//
//   1. Apply the naming rule. Whether a client can be named is a property of the
//      case study and the audience, never of the prompt. Resolving it here means
//      no generator can leak a name into public-facing copy by accident.
//   2. Publish the number separately, so the instruction "never use a number that
//      does not appear here" has something concrete to point at.

import type { Audience, CaseStudy } from './types';

/** How this client may be referred to for this audience. */
export const referTo = (c: CaseStudy, audience: Audience): string => {
  const named = c.client_name?.trim();
  const anon = c.anonymous_label?.trim();

  if (audience === 'direct' && c.naming === 'named' && named) return named;
  if (anon) return anon;
  if (audience === 'direct' && named) return named;
  return 'a previous client';
};

const line = (label: string, value?: string | null): string | null =>
  value?.trim() ? `${label}: ${value.trim()}` : null;

export const renderCase = (c: CaseStudy, audience: Audience): string => {
  const parts = [
    `— ${c.title.trim()}`,
    line('Refer to them as', referTo(c, audience)),
    line('Industry', c.industry),
    line('Their problem', c.problem),
    line('What was built', c.solution),
    line('Outcome', c.outcome),
    c.metric_value?.trim()
      ? `THE NUMBER (use verbatim, do not round, do not extrapolate): ${c.metric_value.trim()}${
          c.metric_label?.trim() ? ` ${c.metric_label.trim()}` : ''
        }${c.timeframe?.trim() ? ` over ${c.timeframe.trim()}` : ''}`
      : 'No metric on record for this one. Describe the outcome qualitatively and claim no figure.',
    c.verified ? null : 'Self-reported, not independently verified. Do not present it as measured.',
  ].filter(Boolean);

  return parts.join('\n');
};

/**
 * The proof block for a generation.
 *
 * Deliberately capped. Sending every case study is what produces output that
 * name-drops four clients in a cold email, which every pack forbids.
 */
export const renderProof = (cases: CaseStudy[], audience: Audience, limit = 2): string => {
  if (!cases.length) return '';

  const chosen = cases.slice(0, limit);
  const header =
    chosen.length === 1
      ? 'Use this proof. At most one proof per message.'
      : `Use at most ONE of these per message, whichever fits the reader's world best.`;

  const naming =
    audience === 'public'
      ? 'This output is public-facing, so client names are prohibited. Use the "refer to them as" wording exactly.'
      : 'This output goes to one person already in the conversation, so the naming shown below is permitted.';

  return [header, naming, '', chosen.map((c) => renderCase(c, audience)).join('\n\n')].join('\n');
};
