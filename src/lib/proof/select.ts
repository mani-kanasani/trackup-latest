// Picking which proof to send.
//
// "Use one proof, matched to the reader's world" is a law in all three packs.
// Handing the model everything and hoping it chooses well is the behaviour the
// law exists to prevent: given five case studies it will either use the most
// impressive one regardless of fit, or gesture at all of them.
//
// The scoring is deliberately simple and explainable. A user has to be able to
// see why a case study was chosen and overrule it, which rules out anything
// opaque.

import type { Audience, CaseStudy, ScoredCase, Target } from './types';

const norm = (s: string | null | undefined): string => (s ?? '').trim().toLowerCase();

/** Loose containment either way, so "SaaS" matches "B2B SaaS". */
const related = (a: string, b: string): boolean =>
  a.length > 2 && b.length > 2 && (a.includes(b) || b.includes(a));

const WEIGHTS = {
  industryExact: 40,
  industryRelated: 25,
  mentionedInNotes: 20,
  buyerRole: 15,
  companySize: 10,
  hasMetric: 12,
  verified: 8,
};

export const scoreCase = (c: CaseStudy, target: Target): ScoredCase => {
  let score = 0;
  const reasons: string[] = [];

  const ci = norm(c.industry);
  const ti = norm(target.industry);
  if (ci && ti) {
    if (ci === ti) {
      score += WEIGHTS.industryExact;
      reasons.push(`same industry (${c.industry})`);
    } else if (related(ci, ti)) {
      score += WEIGHTS.industryRelated;
      reasons.push(`related industry (${c.industry})`);
    }
  }

  // The strongest signal available when structured fields are empty: the
  // case study's industry showing up in what we know about the target.
  const notes = norm(target.notes);
  if (ci && notes && notes.includes(ci)) {
    score += WEIGHTS.mentionedInNotes;
    reasons.push('their brief mentions this industry');
  }

  if (norm(c.buyer_role) && norm(c.buyer_role) === norm(target.buyer_role)) {
    score += WEIGHTS.buyerRole;
    reasons.push(`same buyer role (${c.buyer_role})`);
  }

  if (norm(c.company_size) && norm(c.company_size) === norm(target.company_size)) {
    score += WEIGHTS.companySize;
    reasons.push(`similar company size (${c.company_size})`);
  }

  // A proof without a number is an assertion. Prefer the ones that can be
  // defended, independently of how well they match.
  if (c.metric_value?.trim()) {
    score += WEIGHTS.hasMetric;
    reasons.push('carries a hard number');
  }
  if (c.verified) {
    score += WEIGHTS.verified;
    reasons.push('marked verified');
  }

  return { caseStudy: c, score, reasons };
};

/**
 * Ranks the user's active case studies against a target.
 *
 * Returns everything scored rather than just the winner, so the UI can show the
 * pick, the runners-up, and let the user swap.
 */
export const rankCases = (cases: CaseStudy[], target: Target): ScoredCase[] =>
  cases
    .filter((c) => c.active)
    .map((c) => scoreCase(c, target))
    .sort((a, b) => b.score - a.score || a.caseStudy.title.localeCompare(b.caseStudy.title));

/**
 * A case study is only usable in public-facing work if it can be de-identified.
 * One granted no naming permission AND carrying no anonymous label cannot go
 * anywhere public, because there is no safe way to refer to it.
 */
export const usableFor = (c: CaseStudy, audience: Audience): boolean => {
  if (audience === 'direct') return true;
  if (c.naming === 'named') return true; // a named client can still be anonymised
  return Boolean(c.anonymous_label?.trim());
};

export const selectBest = (
  cases: CaseStudy[],
  target: Target,
  audience: Audience,
): ScoredCase | null => {
  const ranked = rankCases(cases, target).filter((r) => usableFor(r.caseStudy, audience));
  return ranked[0] ?? null;
};
