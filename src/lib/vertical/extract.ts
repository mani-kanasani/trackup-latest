// Turning a pasted growth sheet into a brief.
//
// The model does the reading. It is NOT trusted with the part that matters.
//
// An extractor that invents a plausible source name would defeat the entire
// point of this feature: the attribution law would then be enforcing a citation
// that does not exist, which is worse than no law at all, because the copy
// looks checked. So everything the model attributes is reconciled against the
// text it was given, and anything it cannot be shown to have read is held back
// rather than saved.

import { normalise, figuresIn } from './attribution';
import type { EvidenceScope, FailureScenario } from './types';

/** One claim the model pulled out, before anything has been believed. */
export interface ExtractedEvidence {
  claim: string;
  metric?: string | null;
  source_name?: string | null;
  source_year?: string | null;
  applies_to?: string | null;
  scope?: EvidenceScope;
}

/** What the extractor returns. Three buckets, because provenance is the job. */
export interface ExtractedBrief {
  vertical?: string;
  buyer_role?: string;
  function_language?: string;
  prototype_note?: string;
  offer_shapes?: string;
  failure_scenarios?: FailureScenario[];
  /** Published research by other people. */
  industry_evidence?: ExtractedEvidence[];
  /** Claims that read as the member's OWN delivered results. */
  first_party_claims?: ExtractedEvidence[];
  /** Claims with a number and nobody to attribute it to. */
  unsourced_claims?: ExtractedEvidence[];
}

export type RejectionReason = 'no-source' | 'source-not-in-document' | 'figure-not-in-document';

export interface ReviewedEvidence extends ExtractedEvidence {
  /** Every check passed and this is safe to store. */
  ok: boolean;
  reason?: RejectionReason;
  note?: string;
}

export interface ReviewedBrief extends Omit<ExtractedBrief, 'industry_evidence'> {
  /** Everything the model called industry evidence, each with a verdict. */
  evidence: ReviewedEvidence[];
  /** Count of rows that survived reconciliation. */
  keptCount: number;
}

const REASONS: Record<RejectionReason, string> = {
  'no-source':
    'No source named. A borrowed figure with nobody attached to it cannot be stored, ' +
    'because there would be nothing for the attribution check to enforce.',
  'source-not-in-document':
    'That source does not appear anywhere in the text you pasted, so it was invented rather ' +
    'than read. Add it by hand if it is real.',
  'figure-not-in-document':
    'That figure does not appear in the text you pasted. Check it before storing it.',
};

/**
 * Hold the extractor to what it was actually given.
 *
 * Both the source name and the figure have to be findable in the pasted
 * document. A model summarising 17,000 characters under instruction to produce
 * citations is exactly the situation where a confident, wrong attribution
 * appears, and that is the one error this whole feature cannot afford.
 */
export const reviewExtraction = (raw: ExtractedBrief, sourceText: string): ReviewedBrief => {
  const hay = normalise(sourceText);

  const evidence: ReviewedEvidence[] = (raw.industry_evidence ?? []).map((e) => {
    const source = e.source_name?.trim();
    if (!source) return { ...e, ok: false, reason: 'no-source', note: REASONS['no-source'] };

    // Any substantial word of the source name is enough. Requiring the whole
    // string would reject "ABA TechReport 2025" against "ABA Tech Report".
    const words = normalise(source)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4);
    const found = words.length ? words.some((w) => hay.includes(w)) : hay.includes(normalise(source));
    if (!found) {
      return { ...e, ok: false, reason: 'source-not-in-document', note: REASONS['source-not-in-document'] };
    }

    if (e.metric?.trim()) {
      const figures = figuresIn(e.metric);
      // Only assert when there is a distinctive figure to assert about.
      if (figures.length && !figures.some((f) => hay.includes(f))) {
        return { ...e, ok: false, reason: 'figure-not-in-document', note: REASONS['figure-not-in-document'] };
      }
    }

    return { ...e, ok: true, scope: e.scope ?? 'vertical' };
  });

  return {
    ...raw,
    evidence,
    keptCount: evidence.filter((e) => e.ok).length,
  };
};

/**
 * The instruction sent with the paste.
 *
 * Kept here rather than in the edge function so the rules the model is given and
 * the rules the client enforces live in one file and can be read together.
 */
export const EXTRACTION_SYSTEM = [
  'You read one document and turn it into a structured brief. You do not write marketing copy.',
  '',
  'The single most important job is separating claims by WHO PRODUCED THEM:',
  '',
  '- industry_evidence: published research, benchmarks and other companies\' results. Somebody',
  '  else did this work. Every row MUST carry source_name exactly as written in the document.',
  '- first_party_claims: results the author says THEY delivered for THEIR OWN clients.',
  '- unsourced_claims: a figure with no source named anywhere in the document.',
  '',
  'Rules that override everything else:',
  '- NEVER invent a source. If the document does not name who produced a finding, it belongs in',
  '  unsourced_claims. A plausible guess is the worst possible answer here.',
  '- NEVER invent or adjust a figure. Copy numbers exactly as they appear, including the unit.',
  '- If you are unsure whether something is the author\'s own result, put it in first_party_claims.',
  '- scope is "vertical" when only this industry cares, "generic" when any business would.',
  '- failure_scenarios: how the business loses money. category is one of exactly:',
  '  acquisition, retention, operations, growth.',
  '- offer_shapes: tier NAMES only. Never include prices.',
  '',
  'Return a single JSON object and nothing else.',
].join('\n');

/** The keys the model must return, so the request and the parse cannot drift. */
export const EXTRACTION_KEYS = [
  'vertical',
  'buyer_role',
  'function_language',
  'prototype_note',
  'offer_shapes',
  'failure_scenarios',
  'industry_evidence',
  'first_party_claims',
  'unsourced_claims',
] as const;
