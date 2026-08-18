import React, { useState } from 'react';
import { Compass, Plus, Trash2, Loader2, Quote, AlertTriangle, Check } from 'lucide-react';
import { useVerticalBrief } from '../../lib/vertical/useVerticalBrief';
import { renderBrief } from '../../lib/vertical/render';
import {
  FAILURE_CATEGORIES,
  type FailureCategory,
  type IndustryEvidence,
  type VerticalBrief,
} from '../../lib/vertical/types';

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
  </div>
);

const input =
  'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ' +
  'text-gray-900 dark:text-white text-sm focus:outline-none focus:border-ember-400';

const EMPTY_EVIDENCE: Partial<IndustryEvidence> = {
  claim: '',
  metric: '',
  source_name: '',
  source_url: '',
  source_year: '',
  applies_to: '',
  scope: 'vertical',
  confirmed: false,
};

export const VerticalBriefPanel: React.FC = () => {
  const { brief, evidence, loaded, loading, loadError, saveBrief, addEvidence, deleteEvidence } =
    useVerticalBrief();

  const [draft, setDraft] = useState<Partial<VerticalBrief> | null>(null);
  const [evDraft, setEvDraft] = useState<Partial<IndustryEvidence> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const current = draft ?? brief ?? null;

  const set = (patch: Partial<VerticalBrief>) =>
    setDraft({ ...(draft ?? brief ?? { failure_scenarios: [] }), ...patch });

  const save = async () => {
    if (!draft) return;
    if (!draft.vertical?.trim()) {
      setError('Name the vertical first.');
      return;
    }
    setBusy(true);
    const { error: e } = await saveBrief(draft);
    setBusy(false);
    if (e) setError(e);
    else {
      setDraft(null);
      setError('');
    }
  };

  const scenarios = current?.failure_scenarios ?? [];
  const setScenario = (i: number, patch: Partial<(typeof scenarios)[number]>) =>
    set({ failure_scenarios: scenarios.map((s, k) => (k === i ? { ...s, ...patch } : s)) });

  const saveEvidence = async () => {
    if (!evDraft) return;
    setBusy(true);
    const { error: e } = await addEvidence(evDraft);
    setBusy(false);
    if (e) setError(e);
    else {
      setEvDraft(null);
      setError('');
    }
  };

  if (loading) {
    return (
      <div className="card-modern p-8 animate-rise flex items-center text-gray-500">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading your vertical...
      </div>
    );
  }

  return (
    <div className="card-modern p-8 animate-rise">
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-linkedin-400 to-linkedin-600 flex items-center justify-center shadow-lg shadow-linkedin-500/25">
          <Compass className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Your vertical</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-2xl">
        The niche you committed to, how it loses money, and the published research about it. Switch a
        generation to vertical mode and this gets sent with it. Your own delivered results belong in
        Case studies instead, not here.
      </p>

      {loadError && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm">
          Could not load your vertical: {loadError}. Generations fall back to generic rather than
          silently sending a half-loaded brief.
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="The vertical" hint="Say it the way you would on a call.">
          <input
            className={input}
            value={current?.vertical ?? ''}
            placeholder="Personal injury law, US firms"
            onChange={(e) => set({ vertical: e.target.value })}
          />
        </Field>
        <Field label="Who is accountable for the number" hint="The person outreach has to reach.">
          <input
            className={input}
            value={current?.buyer_role ?? ''}
            placeholder="Managing partner"
            onChange={(e) => set({ buyer_role: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-4 space-y-4">
        <Field
          label="How you describe the work"
          hint="Functions and the money they move, not a feature list."
        >
          <textarea
            rows={2}
            className={input}
            value={current?.function_language ?? ''}
            placeholder="We run the intake function: every call and form answered in seconds, qualified and booked."
            onChange={(e) => set({ function_language: e.target.value })}
          />
        </Field>
        <Field label="What you can demonstrate" hint="Your prototype in one line. Outreach can offer this.">
          <textarea
            rows={2}
            className={input}
            value={current?.prototype_note ?? ''}
            placeholder="A working 24/7 intake agent that qualifies a case and books the consult."
            onChange={(e) => set({ prototype_note: e.target.value })}
          />
        </Field>
        <Field label="Engagement shapes" hint="Names and shapes only. Pricing does not belong in outreach.">
          <input
            className={input}
            value={current?.offer_shapes ?? ''}
            placeholder="Pilot, Engine, Partner"
            onChange={(e) => set({ offer_shapes: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-gray-900 dark:text-white">How this business loses money</h4>
          <button
            onClick={() =>
              set({
                failure_scenarios: [
                  ...scenarios,
                  { category: 'acquisition' as FailureCategory, scenario: '', cost: '' },
                ],
              })
            }
            className="text-sm font-semibold text-ember-600 hover:text-ember-700 inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          These are what an opener is built from. Spread them across all four categories, three or four
          each.
        </p>

        {scenarios.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">Nothing yet.</p>
        )}

        <div className="space-y-2">
          {scenarios.map((s, i) => (
            <div key={i} className="flex gap-2 items-start">
              <select
                className={`${input} !w-40 flex-none`}
                value={s.category}
                onChange={(e) => setScenario(i, { category: e.target.value as FailureCategory })}
              >
                {FAILURE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                className={input}
                value={s.scenario}
                placeholder="Lead calls at 11pm and hits voicemail"
                onChange={(e) => setScenario(i, { scenario: e.target.value })}
              />
              <input
                className={`${input} !w-56 flex-none`}
                value={s.cost ?? ''}
                placeholder="signs with the next firm"
                onChange={(e) => setScenario(i, { cost: e.target.value })}
              />
              <button
                onClick={() => set({ failure_scenarios: scenarios.filter((_, k) => k !== i) })}
                className="flex-none p-2 text-gray-400 hover:text-red-600"
                aria-label="Remove scenario"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {draft && (
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="btn-primary inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Save vertical
          </button>
          <button
            onClick={() => {
              setDraft(null);
              setError('');
            }}
            className="text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-gray-900 dark:text-white flex items-center">
            <Quote className="w-4 h-4 mr-2 text-gray-400" /> Published research about this category
          </h4>
          {brief && (
            <button
              onClick={() => setEvDraft(EMPTY_EVIDENCE)}
              className="text-sm font-semibold text-ember-600 hover:text-ember-700 inline-flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </button>
          )}
        </div>

        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-none mt-0.5 text-amber-600 dark:text-amber-400" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            This is not your work. Anything here is written into outreach only with its source named in
            the same sentence, and Ember marks the copy a hard failure if a figure from here appears
            without that credit. Your own results go in Case studies, where they are presented as yours.
          </p>
        </div>

        {!brief && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Save the vertical first, then add evidence to it.
          </p>
        )}

        {evidence.map((e) => (
          <div
            key={e.id}
            className="mb-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex gap-3 items-start"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-900 dark:text-white">{e.claim}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {e.metric ? <span className="font-semibold">{e.metric} · </span> : null}
                {e.source_name}
                {e.source_year ? `, ${e.source_year}` : ''}
                <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 uppercase tracking-wide text-[10px] font-bold">
                  {e.scope}
                </span>
                {!e.confirmed && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">unconfirmed</span>
                )}
              </p>
            </div>
            <button
              onClick={() => deleteEvidence(e.id)}
              className="flex-none p-1.5 text-gray-400 hover:text-red-600"
              aria-label="Delete evidence"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {evDraft && (
          <div className="mt-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
            <Field label="The finding">
              <textarea
                rows={2}
                className={input}
                value={evDraft.claim ?? ''}
                placeholder="A lead contacted within five minutes is far more likely to qualify."
                onChange={(e) => setEvDraft({ ...evDraft, claim: e.target.value })}
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="The figure" hint="Kept apart so Ember can check it was credited.">
                <input
                  className={input}
                  value={evDraft.metric ?? ''}
                  placeholder="21 times more likely"
                  onChange={(e) => setEvDraft({ ...evDraft, metric: e.target.value })}
                />
              </Field>
              <Field label="Source" hint="Required. Without it, this cannot be stored.">
                <input
                  className={input}
                  value={evDraft.source_name ?? ''}
                  placeholder="Hennessey Digital"
                  onChange={(e) => setEvDraft({ ...evDraft, source_name: e.target.value })}
                />
              </Field>
              <Field label="Year">
                <input
                  className={input}
                  value={evDraft.source_year ?? ''}
                  placeholder="2025"
                  onChange={(e) => setEvDraft({ ...evDraft, source_year: e.target.value })}
                />
              </Field>
              <Field label="Scope" hint="Three vertical and two generic is the split the method asks for.">
                <select
                  className={input}
                  value={evDraft.scope ?? 'vertical'}
                  onChange={(e) =>
                    setEvDraft({ ...evDraft, scope: e.target.value as 'vertical' | 'generic' })
                  }
                >
                  <option value="vertical">Vertical specific</option>
                  <option value="generic">Generic business</option>
                </select>
              </Field>
            </div>
            <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="mr-2 accent-ember-600"
                checked={!!evDraft.confirmed}
                onChange={(e) => setEvDraft({ ...evDraft, confirmed: e.target.checked })}
              />
              I opened this source myself
            </label>
            <div className="flex gap-3">
              <button
                onClick={saveEvidence}
                disabled={busy}
                className="btn-primary inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold"
              >
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Add evidence
              </button>
              <button
                onClick={() => {
                  setEvDraft(null);
                  setError('');
                }}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Context that changes output invisibly is what erodes trust in a tool
          like this, so the exact injected text is always inspectable. */}
      {loaded && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-ember-600">
            Show exactly what vertical mode sends
          </summary>
          <pre className="mt-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
            {renderBrief(loaded)}
          </pre>
        </details>
      )}
    </div>
  );
};
