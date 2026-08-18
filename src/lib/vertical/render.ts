// Rendering a vertical brief into the block the composer receives.
//
// The whole job is keeping two things apart that look alike. Everything here is
// somebody else's published work, so every line that carries a number carries
// the name attached to it, and the section says outright that the sender did
// not produce any of it.

import { FAILURE_CATEGORIES, type IndustryEvidence, type LoadedBrief } from './types';

const line = (label: string, value?: string | null): string | null =>
  value?.trim() ? `${label}: ${value.trim()}` : null;

/**
 * One evidence row.
 *
 * The source is welded to the metric on the same line rather than listed
 * separately, because a model that reads the number and the attribution as two
 * facts will happily use one without the other.
 */
export const renderEvidence = (e: IndustryEvidence): string => {
  const cite = [e.source_name.trim(), e.source_year?.trim()].filter(Boolean).join(', ');
  const parts = [
    `— ${e.claim.trim()}`,
    e.metric?.trim()
      ? `THE FIGURE: ${e.metric.trim()} — you MUST name "${e.source_name.trim()}" in the same sentence as this figure, every time you use it.`
      : null,
    `Attribute to: ${cite}`,
    line('Speaks to', e.applies_to),
    e.confirmed ? null : 'Unconfirmed: the sender has not opened this source. Say "reported" rather than stating it as fact.',
  ].filter(Boolean);
  return parts.join('\n');
};

/**
 * The brief, as the model sees it.
 *
 * Returns an empty string when there is nothing worth sending, so the composer
 * can treat "no brief" and "an empty brief" identically.
 */
export const renderBrief = ({ brief, evidence }: LoadedBrief): string => {
  const sections: string[] = [];

  const head = [
    `Vertical: ${brief.vertical.trim()}`,
    line('The person accountable for these numbers', brief.buyer_role),
    line('How the sender describes the work', brief.function_language),
    line('What the sender can demonstrate', brief.prototype_note),
    line('Engagement shapes (never quote a price in outreach)', brief.offer_shapes),
  ].filter(Boolean);
  sections.push(head.join('\n'));

  const scenarios = brief.failure_scenarios.filter((s) => s.scenario?.trim());
  if (scenarios.length) {
    const byCategory = FAILURE_CATEGORIES.map(({ id, label }) => {
      const rows = scenarios.filter((s) => s.category === id);
      if (!rows.length) return null;
      const body = rows
        .map((s) => {
          const cost = s.cost?.trim() ? ` [costs them: ${s.cost.trim()}]` : '';
          const fix = s.solution?.trim() ? ` [what fixes it: ${s.solution.trim()}]` : '';
          return `  · ${s.scenario.trim()}${cost}${fix}`;
        })
        .join('\n');
      return `${label}:\n${body}`;
    }).filter(Boolean);

    sections.push(
      'How this business loses money. These are the observations an opener is built from, ' +
        'so pick the one the reader would recognise in their own week:\n' +
        byCategory.join('\n'),
    );
  }

  const live = evidence.filter((e) => e.active);
  if (live.length) {
    sections.push(
      'Published research about this category. THE SENDER DID NOT PRODUCE ANY OF THIS.\n' +
        'It is not their result, not their client, and not their promise. Use it only to show you ' +
        'understand the category, never as something the sender achieved. Every figure below must ' +
        'appear with its source named in the same sentence, or not at all. If you cannot fit the ' +
        'attribution, drop the figure.\n' +
        live.map(renderEvidence).join('\n\n'),
    );
  }

  return sections.join('\n\n').trim();
};
