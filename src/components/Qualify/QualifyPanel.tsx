// The qualification screen, as a panel that sits above generation.
//
// Rendered entirely from the doctrine tables, so adding a pillar or a bonus
// check in `lib/qualify/doctrine.ts` adds a row here with no component change.
// The verdict is recomputed on every keystroke rather than on save, because the
// point of the screen is to be argued with before the work is done, not after.

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, HelpCircle, ShieldCheck, X,
} from 'lucide-react';
import { BONUS, PILLARS, RUNGS, TIERS } from '../../lib/qualify/doctrine';
import { qualify } from '../../lib/qualify/score';
import { summarise } from '../../lib/qualify/render';
import type {
  Answer, Complexity, Impact, LadderRung, NicheClarity, QualificationInput, Reachability,
} from '../../lib/qualify/types';

const ANSWERS: { value: Answer; label: string; icon: typeof Check }[] = [
  { value: 'yes', label: 'Yes', icon: Check },
  { value: 'no', label: 'No', icon: X },
  { value: 'unknown', label: 'Not checked', icon: HelpCircle },
];

const TONE = {
  qualified: {
    ring: 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
    text: 'text-green-800 dark:text-green-300',
    Icon: ShieldCheck,
  },
  notYet: {
    ring: 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-800 dark:text-amber-300',
    Icon: HelpCircle,
  },
  decline: {
    ring: 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
    text: 'text-red-800 dark:text-red-300',
    Icon: AlertTriangle,
  },
} as const;

/** A yes/no/not-checked control. Three states, because two would lose the distinction. */
const Tri: React.FC<{ value: Answer; onChange: (a: Answer) => void }> = ({ value, onChange }) => (
  <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
    {ANSWERS.map(({ value: v, label, icon: Icon }) => (
      <button
        key={v}
        type="button"
        onClick={() => onChange(v)}
        aria-pressed={value === v}
        title={label}
        className={`px-2.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
          value === v
            ? v === 'yes'
              ? 'bg-green-500 text-white'
              : v === 'no'
                ? 'bg-gray-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            : 'bg-white dark:bg-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <Icon className="w-3 h-3" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    ))}
  </div>
);

const Choice = <T extends string>({
  label, value, options, onChange, placeholder,
}: {
  label: string;
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T | undefined) => void;
  placeholder: string;
}) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{label}</label>
    <select
      value={value ?? ''}
      onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
      className="input-modern !py-2 text-sm"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

export const QualifyPanel: React.FC<{
  value: QualificationInput | null | undefined;
  /**
   * Takes an updater rather than a finished object.
   *
   * Two answers changed inside one React batch both read the same rendered
   * `value`, so the second overwrites the first and one of the clicks silently
   * does nothing. Threading the previous state through means every answer is
   * applied to whatever is actually current.
   */
  onChange: (update: (prev: QualificationInput) => QualificationInput) => void;
  /** Surfaced by the caller when a save failed, so answers are never silently lost. */
  error?: string;
}> = ({ value, onChange, error }) => {
  const input = useMemo<QualificationInput>(() => value ?? {}, [value]);
  const result = useMemo(() => qualify(input), [input]);
  const [open, setOpen] = useState(result.verdict === 'notYet' && !value);

  const patch = (next: (prev: QualificationInput) => Partial<QualificationInput>) =>
    onChange((prev) => ({ ...prev, ...next(prev) }));
  const tone = TONE[result.verdict];

  return (
    <div className={`card-modern overflow-hidden border ${tone.ring}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          <tone.Icon className={`w-4 h-4 flex-shrink-0 ${tone.text}`} />
          <span className={`font-semibold text-sm ${tone.text}`}>{summarise(result)}</span>
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>

      {/* The verdict's reasoning stays visible when collapsed — a screen you have
          to expand to understand is one people stop reading. */}
      {(result.blockers.length > 0 || (!open && result.reasons.length > 0)) && (
        <div className="px-4 pb-4 -mt-1 space-y-1">
          {result.blockers.map((b, i) => (
            <p key={`b${i}`} className={`text-xs ${tone.text}`}>{b}</p>
          ))}
          {!open && result.reasons.slice(0, 2).map((r, i) => (
            <p key={`r${i}`} className="text-xs text-gray-500 dark:text-gray-400">{r}</p>
          ))}
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 space-y-5 border-t border-gray-200/60 dark:border-gray-700/60 pt-4">
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
              The four pillars
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              At least two must hold, or there is no process here worth automating yet.
            </p>
            <div className="space-y-2">
              {PILLARS.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.question}</p>
                  </div>
                  <Tri
                    value={input.pillars?.[p.id] ?? 'unknown'}
                    onChange={(a) => patch((prev) => ({ pillars: { ...prev.pillars, [p.id]: a } }))}
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
              Bonus signals
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Not a gate. Boredom is a buying signal — predictable work is what makes an early win reliable.
            </p>
            <div className="space-y-2">
              {BONUS.map((b) => (
                <div key={b.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{b.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{b.because}</p>
                  </div>
                  <Tri
                    value={input.bonus?.[b.id] ?? 'unknown'}
                    onChange={(a) => patch((prev) => ({ bonus: { ...prev.bonus, [b.id]: a } }))}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="grid sm:grid-cols-2 gap-3">
            <Choice<Impact>
              label="Impact on their numbers"
              value={input.impact}
              placeholder="Not judged"
              options={[{ value: 'high', label: 'High' }, { value: 'low', label: 'Low' }]}
              onChange={(v) => patch(() => ({ impact: v }))}
            />
            <Choice<Complexity>
              label="Complexity to build"
              value={input.complexity}
              placeholder="Not judged"
              options={[{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]}
              onChange={(v) => patch(() => ({ complexity: v }))}
            />
          </section>

          <section>
            <Choice<LadderRung>
              label="Where they sit on the buying ladder"
              value={input.rung}
              placeholder="Not judged"
              options={(Object.keys(RUNGS) as LadderRung[]).map((r) => ({
                value: r, label: RUNGS[r].label,
              }))}
              onChange={(v) => patch(() => ({ rung: v }))}
            />
            {input.rung && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{RUNGS[input.rung].state}</p>
            )}
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">
              What effort they have earned
            </h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <Choice<NicheClarity>
                label="How clearly they state who they serve"
                value={input.nicheClarity}
                placeholder="Not judged"
                options={[
                  { value: 'specific', label: 'Names a specific client type' },
                  { value: 'generic', label: 'Generic positioning' },
                  { value: 'unclear', label: 'Cannot tell' },
                ]}
                onChange={(v) => patch(() => ({ nicheClarity: v }))}
              />
              <Choice<Reachability>
                label="Can you reach the buyer"
                value={input.reachable}
                placeholder="Not judged"
                options={[
                  { value: 'verified', label: 'Verified contact' },
                  { value: 'likely', label: 'Probably' },
                  { value: 'uncertain', label: 'Uncertain' },
                ]}
                onChange={(v) => patch(() => ({ reachable: v }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                A sign they are growing
              </label>
              <input
                value={input.growthSignal ?? ''}
                onChange={(e) => patch(() => ({ growthSignal: e.target.value }))}
                placeholder="A hire, a new office, an added service line, a new partner"
                className="input-modern !py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Your observation about them
              </label>
              <textarea
                value={input.observation ?? ''}
                onChange={(e) => patch(() => ({ observation: e.target.value }))}
                rows={2}
                placeholder="Something only real research produces, verifiable in ninety seconds, and about them."
                className="input-modern !py-2 text-sm resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tier A is earned by this line. Without it the screen holds the lead at Tier B, because the
                copy would otherwise have to invent the detail.
              </p>
            </div>
          </section>

          {result.tier && (
            <section className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3">
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {TIERS[result.tier].label} — {TIERS[result.tier].share}
              </p>
              <p>{TIERS[result.tier].effort}</p>
            </section>
          )}

          {result.openQuestions.length > 0 && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Still to find out
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                {result.openQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </section>
          )}

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
};
