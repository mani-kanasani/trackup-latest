import React, { useState } from 'react';
import {
  FolderOpen, Plus, Trash2, Pencil, Check, X, Loader2, Paperclip, ShieldCheck, EyeOff,
} from 'lucide-react';
import { useCaseStudies } from '../../lib/proof';
import type { CaseStudy, CaseNaming } from '../../lib/proof/types';
import { ProofInterview } from './ProofInterview';

const EMPTY: Partial<CaseStudy> = {
  title: '',
  client_name: '',
  anonymous_label: '',
  naming: 'anonymous_only',
  industry: '',
  company_size: '',
  buyer_role: '',
  problem: '',
  solution: '',
  outcome: '',
  metric_value: '',
  metric_label: '',
  timeframe: '',
  verified: false,
  source_note: '',
};

const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
  </div>
);

export const CaseStudyVault: React.FC = () => {
  const { cases, loading, loadError, addCase, updateCase, deleteCase, uploadFile } = useCaseStudies();

  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Partial<CaseStudy>>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // The empty state opens straight into the interview. Someone who has
  // concluded they have no proof will not click a button that assumes they do.
  const [interviewing, setInterviewing] = useState(true);

  const startNew = () => {
    setDraft(EMPTY);
    setFile(null);
    setError('');
    setEditing('new');
  };

  const startEdit = (c: CaseStudy) => {
    setDraft(c);
    setFile(null);
    setError('');
    setEditing(c.id);
  };

  const cancel = () => {
    setEditing(null);
    setDraft(EMPTY);
    setFile(null);
    setError('');
  };

  const save = async () => {
    setError('');
    if (!draft.title?.trim()) {
      setError('Give it a title so you can find it later.');
      return;
    }
    // A case study that can be named nowhere is unusable in public-facing work.
    if (draft.naming === 'anonymous_only' && !draft.anonymous_label?.trim()) {
      setError('Add a way to refer to them without the name, e.g. "a regional freight carrier".');
      return;
    }
    setBusy(true);
    try {
      const patch: Partial<CaseStudy> = { ...draft };

      if (file) {
        const { path, error: upErr } = await uploadFile(file);
        if (upErr) {
          setError(upErr);
          return;
        }
        patch.file_path = path ?? null;
        patch.file_name = file.name;
        patch.file_size = file.size;
      }

      const res =
        editing === 'new' ? await addCase(patch) : await updateCase(editing as string, patch);
      if (res.error) {
        setError(res.error);
        return;
      }
      cancel();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const res = await deleteCase(id);
    if (res.error) setError(res.error);
    setConfirmDelete(null);
  };

  const set = <K extends keyof CaseStudy>(k: K, v: CaseStudy[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="card-modern p-8 animate-rise">
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-upwork-400 to-upwork-600 flex items-center justify-center shadow-lg shadow-upwork-500/25">
          <FolderOpen className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Case studies</h3>
      </div>
      <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
        Your proof, stored properly. Ember picks the <span className="font-semibold">one</span> case study
        closest to each prospect's world rather than dumping everything into the prompt, and it will never
        state a number that is not recorded here.{' '}
        <span className="font-semibold">This is optional</span>, with an empty vault, Ember writes from
        your background instead and avoids claiming results you do not have.
      </p>

      {loadError && (
        <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          Could not load your case studies: {loadError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {cases.length === 0 && editing === null && (
            interviewing ? (
              <ProofInterview
                onFound={(seed) => {
                  setDraft({ ...EMPTY, ...seed });
                  setFile(null);
                  setError('');
                  setEditing('new');
                  setInterviewing(false);
                }}
                onClose={() => setInterviewing(false)}
              />
            ) : (
              <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl mb-4">
                <p className="text-gray-600 dark:text-gray-400 mb-1">No case studies yet.</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">
                  Ember writes from your background alone until there is one here, and claims no results.
                </p>
                <button
                  onClick={() => setInterviewing(true)}
                  className="text-sm font-semibold text-ember-600 dark:text-ember-400 underline underline-offset-2"
                >
                  Help me find one
                </button>
              </div>
            )
          )}

          <div className="space-y-3 mb-4">
            {cases.map((c) => (
              <div
                key={c.id}
                className={`border rounded-xl p-4 ${
                  c.active
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-200 dark:border-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">{c.title}</h4>
                      {c.naming === 'named' ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          Nameable
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          <EyeOff className="w-3 h-3 mr-1" /> Anonymous only
                        </span>
                      )}
                      {c.verified && (
                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                        </span>
                      )}
                      {c.file_name && (
                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          <Paperclip className="w-3 h-3 mr-1" /> {c.file_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {[c.industry, c.metric_value && `${c.metric_value} ${c.metric_label ?? ''}`.trim()]
                        .filter(Boolean)
                        .join(' · ') || 'No industry or metric recorded'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateCase(c.id, { active: !c.active })}
                      className="text-xs px-2 py-1 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      title={c.active ? 'Stop using this in generations' : 'Use this again'}
                    >
                      {c.active ? 'Active' : 'Paused'}
                    </button>
                    <button
                      onClick={() => startEdit(c)}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {confirmDelete === c.id ? (
                      <button
                        onClick={() => remove(c.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(c.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {editing === null ? (
            <button onClick={startNew} className="btn-primary flex items-center">
              <Plus className="w-4 h-4 mr-2" /> Add case study
            </button>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-5">
              <Field label="Title" hint="For your own reference. Not sent to the client.">
                <input
                  className="input-modern"
                  value={draft.title ?? ''}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. Dispatch triage automation"
                />
              </Field>

              {/* The naming rule lives here, not in a prompt. */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 space-y-4">
                <Field label="Can you name this client?">
                  <div className="flex gap-2">
                    {(['named', 'anonymous_only'] as CaseNaming[]).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => set('naming', opt)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                          draft.naming === opt
                            ? 'border-upwork-500 bg-upwork-500/10 text-upwork-700 dark:text-upwork-300'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {opt === 'named' ? 'Yes, they gave permission' : 'No, anonymous only'}
                      </button>
                    ))}
                  </div>
                </Field>

                {draft.naming === 'named' && (
                  <Field label="Client name">
                    <input
                      className="input-modern"
                      value={draft.client_name ?? ''}
                      onChange={(e) => set('client_name', e.target.value)}
                      placeholder="e.g. Northbeam Freight"
                    />
                  </Field>
                )}

                <Field
                  label="How to describe them without the name"
                  hint="Used wherever the name cannot go. Required, because a client you can neither name nor describe is unusable as proof."
                >
                  <input
                    className="input-modern"
                    value={draft.anonymous_label ?? ''}
                    onChange={(e) => set('anonymous_label', e.target.value)}
                    placeholder="e.g. a regional freight carrier"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Industry" hint="Used to match this to the right prospect.">
                  <input
                    className="input-modern"
                    value={draft.industry ?? ''}
                    onChange={(e) => set('industry', e.target.value)}
                    placeholder="e.g. Logistics"
                  />
                </Field>
                <Field label="Company size">
                  <input
                    className="input-modern"
                    value={draft.company_size ?? ''}
                    onChange={(e) => set('company_size', e.target.value)}
                    placeholder="e.g. 20-50 staff"
                  />
                </Field>
                <Field label="Buyer role">
                  <input
                    className="input-modern"
                    value={draft.buyer_role ?? ''}
                    onChange={(e) => set('buyer_role', e.target.value)}
                    placeholder="e.g. Operations Director"
                  />
                </Field>
              </div>

              <Field label="Their problem">
                <textarea
                  rows={2}
                  className="input-modern resize-none"
                  value={draft.problem ?? ''}
                  onChange={(e) => set('problem', e.target.value)}
                  placeholder="What was broken before you turned up."
                />
              </Field>
              <Field label="What you built">
                <textarea
                  rows={2}
                  className="input-modern resize-none"
                  value={draft.solution ?? ''}
                  onChange={(e) => set('solution', e.target.value)}
                />
              </Field>
              <Field label="Outcome">
                <textarea
                  rows={2}
                  className="input-modern resize-none"
                  value={draft.outcome ?? ''}
                  onChange={(e) => set('outcome', e.target.value)}
                  placeholder="What changed for them, in their terms."
                />
              </Field>

              {/* The number is stored apart from prose so generators can be held to it. */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="The number">
                    <input
                      className="input-modern"
                      value={draft.metric_value ?? ''}
                      onChange={(e) => set('metric_value', e.target.value)}
                      placeholder="e.g. 6 hours to 40 minutes"
                    />
                  </Field>
                  <Field label="What it measures">
                    <input
                      className="input-modern"
                      value={draft.metric_label ?? ''}
                      onChange={(e) => set('metric_label', e.target.value)}
                      placeholder="e.g. daily triage time"
                    />
                  </Field>
                  <Field label="Over what period">
                    <input
                      className="input-modern"
                      value={draft.timeframe ?? ''}
                      onChange={(e) => set('timeframe', e.target.value)}
                      placeholder="e.g. 8 weeks"
                    />
                  </Field>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Leave blank if you have no hard number. Ember will describe the outcome qualitatively
                  rather than inventing a figure.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(draft.verified)}
                  onChange={(e) => set('verified', e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">I can defend this number if a buyer asks.</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Unchecked proof is still used, but is labelled self-reported so it is never presented
                    as measured.
                  </span>
                </span>
              </label>

              <Field
                label="Source document (optional)"
                hint="Stored privately. Only you can ever read it."
              >
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 dark:file:bg-gray-800 file:text-sm"
                />
              </Field>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button onClick={save} disabled={busy} className="btn-primary flex items-center">
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  {busy ? 'Saving…' : editing === 'new' ? 'Add case study' : 'Save changes'}
                </button>
                <button
                  onClick={cancel}
                  className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                >
                  <X className="w-4 h-4 mr-1.5" /> Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
