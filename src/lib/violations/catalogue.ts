// Every violation id Ember can record, and what each one means to a person.
//
// The apps store `v.patternId ?? v.lawId ?? 'empty-step'` on every generation.
// That is a bare id and nothing else — deliberately, because the excerpt is the
// member's own copy and has no business being duplicated into a log. Which means
// anything that reads those records needs this: a way back from an id to a name
// a coach can act on.
//
// Built from the packs rather than written out by hand, so a pattern added to
// `packs.source.json` appears here the moment it can appear in the data. The
// three ids below are the only ones the packs do not own.

import { ALL_PACKS } from '../method/packs';

/**
 * The day every violation started carrying its own id.
 *
 * Before it, `empty-step` was not one thing. Length overruns, missing subject
 * lines and genuinely empty steps all reached the log through the same
 * `patternId ?? lawId ?? 'empty-step'` fallback, because none of the three
 * carried an id. Two of those are hard and one is soft.
 *
 * So a stored `empty-step` from before this date cannot be classified, and
 * counting it as hard — which is what its catalogue entry now says — would put
 * a confidently wrong number at the top of the one report a coach reads. Records
 * older than this are counted apart and labelled as unclassifiable rather than
 * guessed at.
 */
export const STRUCTURAL_IDS_SINCE = '2026-08-31T00:00:00.000Z';

export type Severity = 'hard' | 'soft';

export interface RuleInfo {
  id: string;
  /** The name shown to a person. */
  label: string;
  level: Severity;
  /** Why the doctrine bans it, for a member asking "so what". */
  because: string;
  /** Which channels can produce it, so a coach knows where to look. */
  channels: string[];
}

/**
 * The three the packs do not own.
 *
 * `empty-step` and `over-length` come from the validator's own structural
 * checks, and `unattributed-borrowed-figure` from the attribution law, which is
 * enforced against the evidence sent with a prompt rather than against a pattern
 * in a pack.
 */
const STRUCTURAL: RuleInfo[] = [
  {
    id: 'empty-step',
    label: 'A step came back empty',
    level: 'hard',
    because:
      'The generator returned nothing for part of the message. Usually the model or the deployment, not the writing.',
    channels: ['coldEmail', 'linkedin', 'upwork'],
  },
  {
    id: 'empty-subject',
    label: 'An email came back with no subject line',
    level: 'hard',
    because: 'The subject is its own field and its own decision. A missing one is a regeneration, not an edit.',
    channels: ['coldEmail'],
  },
  {
    id: 'over-length',
    label: 'Longer than the ceiling for that step',
    level: 'soft',
    because: 'Shorter converts better. Every step has a ceiling because the doctrine has a reason for it.',
    channels: ['coldEmail', 'linkedin', 'upwork'],
  },
  {
    id: 'unattributed-borrowed-figure',
    label: 'A borrowed figure with no source in the message',
    level: 'hard',
    because:
      'Research that is not yours must carry its source in the same message. Without it the number reads as your own result.',
    channels: ['coldEmail', 'linkedin', 'upwork'],
  },
];

const build = (): Map<string, RuleInfo> => {
  const out = new Map<string, RuleInfo>();
  for (const rule of STRUCTURAL) out.set(rule.id, rule);

  for (const pack of ALL_PACKS) {
    for (const b of pack.banned) {
      const existing = out.get(b.id);
      if (existing) {
        // The same pattern in more than one pack. Verified identical in label
        // and level across all three today; if that ever stops being true the
        // first definition wins and the channel list still records both, which
        // is wrong quietly. The smoke test asserts it does not happen.
        if (!existing.channels.includes(pack.id)) existing.channels.push(pack.id);
        continue;
      }
      out.set(b.id, {
        id: b.id,
        label: b.label,
        level: b.level,
        because: b.because,
        channels: [pack.id],
      });
    }
  }
  return out;
};

export const CATALOGUE: Map<string, RuleInfo> = build();

export const ruleFor = (id: string): RuleInfo | undefined => CATALOGUE.get(id);

/** Every id this build can name. Anything else is an older record or not ours. */
export const KNOWN_IDS: ReadonlySet<string> = new Set(CATALOGUE.keys());
