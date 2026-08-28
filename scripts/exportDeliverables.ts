// Exports the handout data from the live product.
//
//   npm run deliverables:export
//
// The two PDFs given to members are built from JSON produced here rather than
// written by hand, so a law added to a pack, a step renamed, or a new field in
// Settings shows up in the handout on the next build instead of quietly
// disagreeing with the software people are actually running.
//
// Writes into the Boardroom repo, which is where the DOCX builders live.

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { ALL_PACKS } from '../src/lib/method/packs/index';
import { buildChannelPrompt, outputSteps } from '../src/lib/method/forChannel';
import { INTERVIEW, FALLBACK, SPECIFICITY, CAPTURE_FIELDS } from '../src/lib/proof/interview';
import { PILLARS, PILLAR_THRESHOLD, BONUS, QUADRANTS, RUNGS, TIERS } from '../src/lib/qualify/doctrine';
import { FAILURE_CATEGORIES } from '../src/lib/vertical/types';
import { PROVIDER_META, type AIProvider } from '../src/lib/aiConfig';

const OUT_DIR = process.argv[2] ?? join('..', 'Boardroom Clients');

const channelName: Record<string, string> = {
  upwork: 'Upwork proposals',
  linkedin: 'LinkedIn outreach',
  coldEmail: 'Cold email',
};

/**
 * The prompt a beginner pastes by hand.
 *
 * Composed through the same seam the app uses, so it carries the real laws and
 * the real structure. The context and proof slots are left as bracketed blocks
 * for them to fill, which is the only difference from what the software sends.
 */
const promptFor = (id: 'upwork' | 'linkedin' | 'coldEmail'): string =>
  buildChannelPrompt(id).systemPrompt;

const prompts: Record<string, unknown> = {};
for (const pack of ALL_PACKS) {
  const steps = outputSteps(pack);
  prompts[pack.id] = {
    id: pack.id,
    name: channelName[pack.id] ?? pack.label,
    label: pack.label,
    thesis: pack.thesis,
    primeDirective: pack.primeDirective,
    lawCount: pack.laws.length,
    stepCount: steps.length,
    structure: pack.structure.map((s) => ({
      key: s.key,
      label: s.label,
      group: s.group ?? 'The sequence',
      purpose: s.purpose,
      day: s.day ?? null,
      maxChars: s.maxChars ?? null,
      // Cold email's opening step now carries its own subject line, and a
      // handout that does not mention it describes a sequence nobody will
      // recognise once they run it.
      hasSubject: Boolean(s.subject),
    })),
    laws: pack.laws.map((l) => ({ rule: l.rule, because: l.because, source: l.source?.label ?? null })),
    banned: pack.banned.map((b) => ({ id: b.id, label: b.label, because: b.because, level: b.level })),
    prompt: promptFor(pack.id),
  };
}

const providers = (Object.keys(PROVIDER_META) as AIProvider[]).map((k) => ({
  id: k,
  label: PROVIDER_META[k].label,
  defaultModel: PROVIDER_META[k].defaultModel,
  free: PROVIDER_META[k].free,
  hint: PROVIDER_META[k].hint,
  keyUrl: PROVIDER_META[k].keyUrl,
}));

writeFileSync(
  join(OUT_DIR, 'prompts-export.json'),
  JSON.stringify({ ...prompts, providers, generatedFrom: 'live method packs' }, null, 2),
  'utf8',
);

/**
 * The fields a person fills in, which is a different question from the prompts.
 *
 * Someone installing this opens Settings and sees empty boxes. This is the list
 * of what goes in each one, in the order the software asks.
 */
const fields = {
  interview: INTERVIEW,
  fallback: FALLBACK,
  specificity: SPECIFICITY,
  captureFields: CAPTURE_FIELDS,
  threshold: PILLAR_THRESHOLD,
  pillars: PILLARS,
  bonus: BONUS,
  // QUADRANTS, RUNGS and TIERS are keyed Records in the doctrine because the app
  // looks them up by id. The handout reads them in order, so they are flattened
  // here rather than the builder having to know both shapes.
  quadrants: Object.values(QUADRANTS),
  rungs: Object.values(RUNGS),
  tiers: Object.values(TIERS),
  providers,
  // New in this build: the vertical brief, its evidence table, and the
  // generation-time toggle that decides whether either reaches the prompt.
  vertical: {
    briefFields: [
      { label: 'The vertical', hint: 'Say it the way you would on a call.', example: 'Personal injury law, US firms' },
      { label: 'Who is accountable for the number', hint: 'The person outreach has to reach.', example: 'Managing partner' },
      { label: 'How you describe the work', hint: 'Functions and the money they move, not a feature list.', example: 'We run the intake function: every call and form answered in seconds, qualified and booked.' },
      { label: 'What you can demonstrate', hint: 'Your prototype in one line. Outreach can offer this.', example: 'A working 24/7 intake agent that qualifies a case and books the consult.' },
      { label: 'Engagement shapes', hint: 'Names and shapes only. Pricing does not belong in outreach.', example: 'Pilot, Engine, Partner' },
    ],
    failureCategories: FAILURE_CATEGORIES,
    evidenceFields: [
      { label: 'The finding', hint: 'What the research actually says.' },
      { label: 'The figure', hint: 'Kept apart so Ember can check it was credited.' },
      { label: 'Source', hint: 'Required. Without it the row cannot be stored at all.' },
      { label: 'Year', hint: 'Optional.' },
      { label: 'Scope', hint: 'Vertical specific, or generic business. Three and two is the split the method asks for.' },
      { label: 'I opened this source myself', hint: 'Unticked marks the claim as reported rather than confirmed.' },
    ],
  },
};

writeFileSync(join(OUT_DIR, 'fields-export.json'), JSON.stringify(fields, null, 2), 'utf8');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

console.log(`prompts-export.json  ${ALL_PACKS.length} packs, ${providers.length} providers`);
for (const pack of ALL_PACKS) {
  const subj = pack.structure.filter((s) => s.subject).length;
  console.log(
    `  ${pack.id.padEnd(10)} ${String(pack.laws.length).padStart(2)} laws, ` +
      `${String(outputSteps(pack).length).padStart(2)} output keys` +
      (subj ? `, ${subj} subject line${subj === 1 ? '' : 's'}` : ''),
  );
}
console.log(`fields-export.json   ${INTERVIEW.length} proof questions, ${PILLARS.length} pillars, ` +
  `${fields.vertical.briefFields.length} brief fields, ${fields.vertical.evidenceFields.length} evidence fields`);
