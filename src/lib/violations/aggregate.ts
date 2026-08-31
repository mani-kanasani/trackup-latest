// Which rules this member breaks most, counted.
//
// Ember grades every generation against the doctrine and stores the ids of what
// fired. Nothing has ever read them. The weekly teardown is therefore driven by
// whatever the coach happened to notice, when the data to drive it properly has
// been accumulating on every row since the method engine landed.
//
// The privacy position is the receipt's, and it is structural rather than
// promised. The export is assembled from integers, a date, and a fixed
// vocabulary of rule names that ship inside this build. No value read out of the
// database is ever printed — not a name, not a company, and not a violation id.
// An id the catalogue does not recognise is COUNTED and not echoed, which is
// what makes the guarantee hold even if a future bug wrote message text into the
// violation list.

import { CATALOGUE, ruleFor, STRUCTURAL_IDS_SINCE, type RuleInfo, type Severity } from './catalogue';
import { localDateKey } from '../receipt/format';
import type { GenerationMeta } from '../../apps/linkedin/types';

export interface RuleCount {
  rule: RuleInfo;
  /** Times it fired. One pattern can fire in several steps of one generation. */
  count: number;
  /** Generations it appeared in at all, which is the honest denominator. */
  generations: number;
}

export interface ViolationAggregate {
  /** Generations that carried a violation record at all. */
  generations: number;
  /** Local date of the earliest generation counted, or null when there are none. */
  since: string | null;
  /** Every recognised rule that fired, worst first. */
  counts: RuleCount[];
  hard: number;
  soft: number;
  /**
   * Records naming something this build has no entry for.
   *
   * Never printed, only counted. An id outside the catalogue is the one place
   * unvetted text could otherwise reach an export, so it is counted and
   * dropped rather than echoed. In practice these are generations made under a
   * pack version that has since renamed or retired a pattern.
   */
  unrecognised: number;
  /**
   * `empty-step` records from before every violation carried its own id.
   *
   * Recognised, but not classifiable: back then the same id covered an empty
   * step, a missing subject line and an over-long one, and the first two are
   * hard while the third is soft. Counting them under the catalogue entry
   * would report soft length problems as things that stop a message being
   * sent, at the top of the list, to a coach.
   */
  legacyStructural: number;
  /** Channels whose generations were actually available to count. */
  channelsCounted: string[];
  /** Channels that record nothing on this install, so the total is partial. */
  channelsMissing: string[];
}

/** Anything carrying generation history. Leads and prospects do; jobs may not. */
export interface MetaCarrier {
  generation_meta?: GenerationMeta[] | null;
}

export interface AggregateSources {
  linkedin: MetaCarrier[];
  coldEmail: MetaCarrier[];
  /**
   * Upwork proposals.
   *
   * Optional because `jobs.generation_meta` arrived later than the other two:
   * on an install that has not run that migration the column is absent, every
   * row reads undefined, and a total built from the other two channels would
   * silently describe two thirds of the member's work as all of it. Passing
   * `undefined` here says "not available" rather than "none", and the aggregate
   * reports the gap instead of absorbing it.
   */
  upwork?: MetaCarrier[];
}

/** A local date key, or null if that string was not a date. Never the string itself. */
const earliestKey = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : localDateKey(d);
};

const isMeta = (v: unknown): v is GenerationMeta =>
  Boolean(v) && typeof v === 'object' && Array.isArray((v as GenerationMeta).violation_ids);

/**
 * Every generation record on a set of rows.
 *
 * Tolerant on purpose. `generation_meta` is jsonb and predates several schema
 * changes, so a row can hold null, an object where an array belongs, or an entry
 * with no violation list at all. None of that should stop the count.
 */
const generationsOf = (rows: MetaCarrier[]): GenerationMeta[] =>
  rows.flatMap((r) => (Array.isArray(r.generation_meta) ? r.generation_meta.filter(isMeta) : []));

export const aggregateViolations = (src: AggregateSources): ViolationAggregate => {
  const channelsCounted: string[] = [];
  const channelsMissing: string[] = [];

  const groups: [string, MetaCarrier[] | undefined][] = [
    ['linkedin', src.linkedin],
    ['coldEmail', src.coldEmail],
    ['upwork', src.upwork],
  ];

  const metas: GenerationMeta[] = [];
  for (const [channel, rows] of groups) {
    if (!rows) {
      channelsMissing.push(channel);
      continue;
    }
    channelsCounted.push(channel);
    metas.push(...generationsOf(rows));
  }

  const fired = new Map<string, { count: number; generations: number }>();
  let unrecognised = 0;
  let legacyStructural = 0;
  let earliest: string | null = null;

  for (const meta of metas) {
    if (typeof meta.at === 'string' && meta.at && (!earliest || meta.at < earliest)) earliest = meta.at;

    // Per generation, so the "appeared in N generations" figure counts a
    // generation once however many steps the pattern fired in.
    // A record written before ids were distinct. Its `at` is the only way to
    // know, and an entry with no usable date is treated as old, because
    // guessing new would mean guessing hard.
    // Lexical comparison, which is exact for the zero-padded ISO-8601 strings
    // every write site produces via `toISOString()`. A malformed date sorts
    // before the cutoff and is therefore treated as old, which understates
    // rather than inventing a hard count.
    const beforeIds = !(typeof meta.at === 'string' && meta.at >= STRUCTURAL_IDS_SINCE);

    const inThis = new Set<string>();
    for (const raw of meta.violation_ids) {
      if (typeof raw !== 'string' || !CATALOGUE.has(raw)) {
        unrecognised++;
        continue;
      }
      if (raw === 'empty-step' && beforeIds) {
        legacyStructural++;
        continue;
      }
      const entry = fired.get(raw) ?? { count: 0, generations: 0 };
      entry.count++;
      fired.set(raw, entry);
      inThis.add(raw);
    }
    for (const id of inThis) {
      const entry = fired.get(id);
      if (entry) entry.generations++;
    }
  }

  const counts: RuleCount[] = [...fired]
    .map(([id, v]) => ({ rule: ruleFor(id)!, count: v.count, generations: v.generations }))
    // Hard before soft at equal counts: they are the ones that stop a message
    // being sendable, so they are the ones a teardown should open with.
    .sort(
      (a, b) =>
        b.count - a.count ||
        Number(b.rule.level === 'hard') - Number(a.rule.level === 'hard') ||
        a.rule.label.localeCompare(b.rule.label),
    );

  const total = (level: Severity) =>
    counts.filter((c) => c.rule.level === level).reduce((n, c) => n + c.count, 0);

  return {
    generations: metas.length,
    /*
      Reformatted, never echoed.

      `at` is a string out of the database and is the only field here that is
      not an integer. Printing it raw would be the one crack in a counts-only
      export, and an unparseable one would print NaN-NaN-NaN into something a
      member is about to hand a coach. So it is parsed, and dropped if it is
      not a date.
    */
    since: earliestKey(earliest),
    counts,
    hard: total('hard'),
    soft: total('soft'),
    unrecognised,
    legacyStructural,
    channelsCounted,
    channelsMissing,
  };
};

const CHANNEL_NAMES: Record<string, string> = {
  linkedin: 'LinkedIn',
  coldEmail: 'cold email',
  upwork: 'Upwork',
};

export const channelName = (id: string): string => CHANNEL_NAMES[id] ?? id;

/** Right-aligned so the column of numbers reads as a column. */
const pad = (n: number, width: number) => String(n).padStart(width, ' ');

/**
 * The text a member hands to a coach.
 *
 * Plain prose rather than the receipt's machine format, because nothing parses
 * this — a person reads it. Every line is assembled from an integer, a date, or
 * a rule name that ships in this build, and the test feeds a deliberately
 * hostile pipeline through it to prove nothing else can appear.
 */
export const exportText = (agg: ViolationAggregate, today: Date = new Date()): string => {
  const lines: string[] = [];
  lines.push(`Ember doctrine check, ${localDateKey(today)}`);

  if (!agg.generations) {
    lines.push('');
    lines.push('No generations recorded yet, so there is nothing to report.');
    return lines.join('\n');
  }

  lines.push(
    `${agg.generations} generation${agg.generations === 1 ? '' : 's'}` +
      (agg.since ? ` since ${agg.since}` : '') +
      `, across ${agg.channelsCounted.map(channelName).join(' and ') || 'no channels'}.`,
  );

  if (agg.channelsMissing.length) {
    lines.push(
      `Not included: ${agg.channelsMissing.map(channelName).join(' and ')}. ` +
        'That channel does not record violations on this install, so these totals are partial.',
    );
  }

  const width = Math.max(...agg.counts.map((c) => String(c.count).length), 1);

  for (const level of ['hard', 'soft'] as Severity[]) {
    const rows = agg.counts.filter((c) => c.rule.level === level);
    if (!rows.length) continue;
    lines.push('');
    lines.push(level === 'hard' ? 'Must fix before sending' : 'Worth a look');
    for (const r of rows) lines.push(`  ${pad(r.count, width)}  ${r.rule.label}`);
  }

  if (!agg.counts.length) {
    lines.push('');
    lines.push('Nothing the doctrine bans has fired. Every generation came back clean.');
  }

  if (agg.legacyStructural) {
    lines.push('');
    lines.push(
      `${agg.legacyStructural} record${agg.legacyStructural === 1 ? '' : 's'} from before Ember told an ` +
        'empty step from an over-long one. Counted, not classified, because two of the three things ' +
        'they could mean must be fixed and the third is a judgement call.',
    );
  }

  if (agg.unrecognised) {
    lines.push('');
    lines.push(
      `${agg.unrecognised} record${agg.unrecognised === 1 ? '' : 's'} this version cannot name, ` +
        'from generations made under an older build. Counted here, not listed.',
    );
  }

  lines.push('');
  lines.push('Counts only. No message text, no names, no lead details.');
  return lines.join('\n');
};
