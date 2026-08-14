// Cold email.
//
// The pack has existed since the method engine landed; this is the app. It is
// built on the same spine as LinkedIn deliberately — the same qualification
// screen, the same proof matching, the same derived validation, the same
// read-time cadence — because the whole point of doing this channel last was to
// inherit those rather than fork them.
//
// Two things differ, and both are channel doctrine rather than plumbing.
// The sequence is dated in days from the pack, not gated on an acceptance that
// may never come. And an opt-out is permanent and suppresses the address
// everywhere, which a status field cannot express.

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Mail, Plus, Sparkles, Copy, Check, Trash2, Loader2, X, Ban,
} from 'lucide-react';
import { useProspects, type MutationResult } from './useProspects';
import { Prospect, ProspectStatus, EmailSequence, isProspectTerminal } from './types';
import { readSentSteps, type GenerationMeta } from '../linkedin/types';
import { supabase } from '../../lib/supabase';
import { loadAIConfig } from '../../lib/aiConfig';
import { loadUserContext, senderAbout } from '../../lib/userContext';
import { buildChannelPrompt, checkAgainstMethod } from '../../lib/method/forChannel';
import { getPack } from '../../lib/method/packs';
import { useCaseStudies } from '../../lib/proof';
import { QualifyPanel } from '../../components/Qualify/QualifyPanel';
import { qualify, isBlocked } from '../../lib/qualify/score';
import type { QualificationInput } from '../../lib/qualify/types';
import type { ValidationResult } from '../../lib/method/types';

const PACK = getPack('coldEmail');

const STATUS_LABELS: Record<ProspectStatus, string> = {
  new: 'New', sent: 'Sent', replied: 'Replied', meeting: 'Meeting',
  won: 'Won', lost: 'Lost', no_reply: 'No reply', bounced: 'Bounced', disqualified: 'Disqualified',
};
const STATUS_ORDER: ProspectStatus[] = [
  'new', 'sent', 'replied', 'meeting', 'won', 'lost', 'no_reply', 'bounced', 'disqualified',
];

const GROUPED_STEPS = PACK.structure.reduce<{ group: string; steps: typeof PACK.structure }[]>(
  (acc, step) => {
    const group = step.group ?? 'The sequence';
    const bucket = acc.find((g) => g.group === group);
    if (bucket) bucket.steps.push(step);
    else acc.push({ group, steps: [step] });
    return acc;
  },
  [],
);

const TRACKED_GROUPS = new Set(['The sequence']);

export const ColdEmailApp: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { prospects, loading, addProspect, updateProspect, deleteProspect } = useProspects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const selected = prospects.find((p) => p.id === selectedId) ?? null;

  const suppressed = prospects.filter((p) => p.opted_out).length;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-ember-50/40 to-white dark:from-gray-900 dark:to-gray-950">
      <header className="border-b border-ember-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onExit} className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-ember-600">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> All apps
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-ember-500 flex items-center justify-center">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">Cold Email</span>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-ember-600 hover:bg-ember-700 shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add prospect
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 grid lg:grid-cols-[320px_1fr] gap-6 overflow-hidden">
        <div className="overflow-y-auto pr-1">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Prospects ({prospects.length})
            {suppressed > 0 && <span className="normal-case font-normal"> · {suppressed} suppressed</span>}
          </h2>
          {loading ? (
            <div className="text-sm text-gray-400 p-4">Loading…</div>
          ) : prospects.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 card-modern p-6 text-center">
              No prospects yet. Click <span className="font-semibold">Add prospect</span>.
            </div>
          ) : (
            <div className="space-y-2">
              {prospects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedId === p.id
                      ? 'border-ember-400 bg-ember-50 dark:bg-ember-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-ember-300'
                  } ${p.opted_out ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-ember-100 text-ember-700 dark:bg-ember-900/40 dark:text-ember-300">
                      {p.opted_out ? 'Opted out' : STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {[p.job_title, p.company_name].filter(Boolean).join(' · ') || p.email}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto">
          {selected ? (
            <ProspectDetail
              key={selected.id}
              prospect={selected}
              onUpdate={updateProspect}
              onDelete={async (id) => { await deleteProspect(id); setSelectedId(null); }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-center text-gray-400 card-modern p-10">
              <div>
                <Mail className="w-10 h-10 mx-auto mb-3 text-ember-300" />
                <p>Select a prospect to write and track their sequence.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddProspectModal onClose={() => setShowAdd(false)} onAdd={addProspect} />}
    </div>
  );
};

const ProspectDetail: React.FC<{
  prospect: Prospect;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<MutationResult>;
  onDelete: (id: string) => void;
}> = ({ prospect, onUpdate, onDelete }) => {
  const { cases, loadError: vaultError } = useCaseStudies();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [localSeq, setLocalSeq] = useState<EmailSequence | null>(null);
  const [proofUsed, setProofUsed] = useState<string | null>(null);
  const [noProof, setNoProof] = useState(false);

  const sequence = prospect.sequence ?? localSeq;
  const sentSteps = useMemo(() => readSentSteps(prospect.sent_steps), [prospect.sent_steps]);

  // Derived, never latched. Same reasoning as the other two apps: a check that
  // fires once and vanishes says nothing about the copy actually sent.
  const check = useMemo(
    () => (sequence ? checkAgainstMethod('coldEmail', sequence) : null),
    [sequence],
  );
  const describe = (v: ValidationResult['violations'][number]) =>
    `${v.message}${v.excerpt ? ` — "${v.excerpt}"` : ''}`;
  const warnings = (check?.violations ?? []).filter((v) => v.level === 'hard').map(describe);
  const softNotes = (check?.violations ?? []).filter((v) => v.level === 'soft').map(describe);

  const [qual, setQual] = useState<QualificationInput | null>(prospect.qualification ?? null);
  const [override, setOverride] = useState(false);
  const verdict = useMemo(() => qualify(qual ?? {}), [qual]);
  const declined = isBlocked(verdict);

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch { /* */ }
  };

  const toggleSent = async (key: string) => {
    const next = { ...sentSteps };
    if (key in next) delete next[key];
    else next[key] = new Date().toISOString();
    const res = await onUpdate(prospect.id, { sent_steps: next });
    if (res.error) setError(`Could not save that change: ${res.error}`);
  };

  const saveStep = async (key: string, value: string) => {
    if (!sequence || sequence[key] === value) return;
    const next = { ...sequence, [key]: value };
    setLocalSeq(next);
    const res = await onUpdate(prospect.id, { sequence: next });
    if (res.error) setError(`That edit is on screen but did not save: ${res.error}`);
  };

  const handleGenerate = async () => {
    const cfg = loadAIConfig();
    if (!cfg) { setError('Add your AI provider and key first, in Settings.'); return; }
    if (vaultError) {
      setError(`Your case studies could not be loaded, so this would be written as if you had none: ${vaultError}.`);
      return;
    }
    setError(''); setProofUsed(null); setNoProof(false); setGenerating(true);

    const method = buildChannelPrompt('coldEmail', {
      cases,
      vaultUnavailable: Boolean(vaultError),
      target: {
        industry: prospect.industry,
        buyer_role: prospect.job_title,
        notes: [prospect.company_name, prospect.industry, prospect.observation, prospect.potential_services]
          .filter(Boolean).join(' · '),
      },
      qualification: verdict,
    });
    setProofUsed(method.chosen ? method.chosen.caseStudy.title : null);
    setNoProof(method.proofEmpty);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<EmailSequence>('generate-outreach', {
        body: {
          // The function is channel-agnostic: it asks for whatever steps it is
          // given, so cold email needs no second edge function.
          lead: {
            name: prospect.name, job_title: prospect.job_title, company_name: prospect.company_name,
            industry: prospect.industry, linkedin_url: prospect.email,
            company_website: prospect.company_website,
            potential_services: [prospect.observation, prospect.potential_services].filter(Boolean).join(' · '),
          },
          context: senderAbout(loadUserContext()),
          systemPrompt: method.systemPrompt,
          steps: method.steps,
          provider: cfg.provider, model: cfg.model, apiKey: cfg.apiKey,
        },
      });
      if (fnError) {
        let message = fnError.message;
        const ctx = (fnError as { context?: Response }).context;
        if (ctx?.json) { const b = await ctx.json().catch(() => null); if (b?.error) message = b.error; }
        throw new Error(message);
      }
      if (!data) throw new Error('No response from the generator.');

      const meta: GenerationMeta = {
        at: new Date().toISOString(),
        pack_id: method.pack.id,
        pack_version: method.pack.version,
        case_study_id: method.chosen?.caseStudy.id ?? null,
        case_study_title: method.chosen?.caseStudy.title ?? null,
        case_study_score: method.chosen?.score ?? null,
        tier: verdict.tier,
        rung: verdict.rung,
        verdict: verdict.verdict,
        violation_ids: checkAgainstMethod('coldEmail', data as Record<string, string>)
          .violations.map((v) => v.patternId ?? v.lawId ?? 'empty-step'),
      };

      const saved = await onUpdate(prospect.id, {
        sequence: data,
        generation_meta: [...(prospect.generation_meta ?? []), meta],
        // Recorded at generation, so a reply rate can be split by it later.
        variant: prospect.variant ?? `${method.pack.version}`,
      });
      if (saved.error) {
        setLocalSeq(data);
        throw new Error(`Generated, but saving failed: ${saved.error}. The sequence is below — copy anything you need.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate the sequence.');
    } finally {
      setGenerating(false);
    }
  };

  const Step: React.FC<{ id: string; title: string; text: string; track?: boolean; timing?: string }> = ({ id, title, text, track = true, timing }) => (
    <div className="card-modern p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center">
          {title}
          {timing && (
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {timing}
            </span>
          )}
        </h4>
        <div className="flex items-center gap-3">
          {track && (
            <label className="flex items-center text-xs text-gray-500 cursor-pointer select-none">
              <input type="checkbox" className="mr-1.5 accent-ember-600" checked={id in sentSteps} onChange={() => toggleSent(id)} />
              Sent
            </label>
          )}
          {text && (
            <button onClick={() => copy(text, id)} className="text-xs font-medium text-ember-600 hover:text-ember-700 inline-flex items-center">
              {copied === id ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied === id ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
      <textarea
        defaultValue={text}
        key={`${id}:${text}`}
        onBlur={(e) => saveStep(id, e.target.value)}
        rows={Math.min(10, Math.max(2, Math.ceil((text.length || 1) / 70)))}
        className="w-full text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-ember-400 rounded-lg p-2 -m-2 resize-y focus:outline-none"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="card-modern p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{prospect.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {[prospect.job_title, prospect.company_name].filter(Boolean).join(' · ')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{prospect.email}</p>
          </div>
          <button onClick={() => onDelete(prospect.id)} className="p-2 text-gray-400 hover:text-red-500" aria-label="Delete prospect">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <select
            value={prospect.status}
            onChange={(e) => onUpdate(prospect.id, { status: e.target.value as ProspectStatus })}
            className="input-modern !py-2 !w-auto text-sm"
          >
            <optgroup label="In flight">
              {STATUS_ORDER.filter((s) => !isProspectTerminal(s)).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </optgroup>
            <optgroup label="Closed">
              {STATUS_ORDER.filter(isProspectTerminal).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </optgroup>
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating || prospect.opted_out || (declined && !override)}
            title={prospect.opted_out ? 'This address has opted out.' : undefined}
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-ember-500 to-ember-700 hover:from-ember-600 hover:to-ember-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            {generating ? 'Writing…' : sequence ? 'Rewrite sequence' : 'Write the sequence'}
          </button>
          <button
            onClick={() => onUpdate(prospect.id, { opted_out: !prospect.opted_out })}
            className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold border ${
              prospect.opted_out
                ? 'border-red-300 text-red-700 dark:text-red-300 dark:border-red-800'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Ban className="w-4 h-4 mr-1.5" />
            {prospect.opted_out ? 'Opted out' : 'Mark opted out'}
          </button>
        </div>

        {/* Suppression, not a status. It survives a status edit and every later
            import of the same address, which is what an opt-out has to do. */}
        {prospect.opted_out && (
          <div className="mt-3 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300">
            This address has opted out. Nothing further goes to it, on this campaign or any other.
          </div>
        )}

        {declined && !prospect.opted_out && (
          <div className="mt-3 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <p className="font-semibold text-red-800 dark:text-red-300 mb-1">The screen says not to write to this one</p>
            {verdict.blockers.map((b, i) => <p key={i} className="text-red-700 dark:text-red-300 text-xs">{b}</p>)}
            {override ? (
              <p className="text-xs text-red-700 dark:text-red-300 mt-2 font-medium">
                Overridden. The generator has been told the screen failed, so it will not imply a fit.
              </p>
            ) : (
              <button onClick={() => setOverride(true)} className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300 underline underline-offset-2">
                I disagree — write it anyway
              </button>
            )}
          </div>
        )}

        {error && <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">{error}</div>}

        {noProof && !proofUsed && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            No case studies yet, so this was written from your background alone and claims no results.
          </p>
        )}
        {proofUsed && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Proof used: <span className="font-medium text-gray-700 dark:text-gray-300">{proofUsed}</span>
          </p>
        )}

        {warnings.length > 0 && (
          <div className="mt-3 text-sm bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
              {warnings.length} thing{warnings.length === 1 ? '' : 's'} to fix before you send
            </p>
            <ul className="list-disc pl-5 space-y-1 text-amber-700 dark:text-amber-300">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
        {softNotes.length > 0 && (
          <div className="mt-3 text-sm bg-gray-50 dark:bg-gray-800/60 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {softNotes.length} thing{softNotes.length === 1 ? '' : 's'} worth a look, your call
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
              {softNotes.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </div>

      <QualifyPanel
        value={qual}
        onChange={(update) => {
          setOverride(false);
          setQual((prev) => {
            const next = update(prev ?? {});
            onUpdate(prospect.id, { qualification: next });
            return next;
          });
        }}
      />

      {sequence ? (
        GROUPED_STEPS.map(({ group, steps }) => {
          const present = steps.filter((s) => sequence[s.key]?.trim());
          if (!present.length) return null;
          return (
            <React.Fragment key={group}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-1">{group}</h3>
              {present.map((s, i) => (
                <Step
                  key={s.key}
                  id={s.key}
                  title={TRACKED_GROUPS.has(group) ? `${i + 1} · ${s.label}` : s.label}
                  text={sequence[s.key]}
                  track={TRACKED_GROUPS.has(group)}
                  timing={typeof s.day === 'number' ? `day ${s.day}` : undefined}
                />
              ))}
            </React.Fragment>
          );
        })
      ) : (
        <div className="card-modern p-8 text-center text-gray-400">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-ember-300" />
          <p>No sequence yet — click <span className="font-semibold">Write the sequence</span>.</p>
        </div>
      )}
    </div>
  );
};

const AddProspectModal: React.FC<{
  onClose: () => void;
  onAdd: (p: Partial<Prospect>) => Promise<{ error?: string }>;
}> = ({ onClose, onAdd }) => {
  const [form, setForm] = useState<Partial<Prospect>>({ status: 'new' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof Prospect, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.email?.trim()) { setError('Name and email are required.'); return; }
    setSaving(true);
    const { error: err } = await onAdd(form);
    setSaving(false);
    if (err) setError(err); else onClose();
  };

  const field = (k: keyof Prospect, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <input type={type} value={(form[k] as string) ?? ''} onChange={(e) => set(k, e.target.value)} className="input-modern" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add prospect</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('name', 'Name *')}
            {field('email', 'Email *', 'email')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('job_title', 'Job title')}
            {field('company_name', 'Company')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('industry', 'Industry')}
            {field('city_or_region', 'City or region')}
          </div>
          {field('company_website', 'Company website', 'url')}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Your observation about them
            </label>
            <textarea
              value={form.observation ?? ''}
              onChange={(e) => set('observation', e.target.value)}
              rows={2}
              placeholder="Something only real research produces, verifiable in ninety seconds, and about them."
              className="input-modern resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This line carries more weight than the rest of the email combined. Without it the screen
              holds the prospect at a lower tier rather than letting the copy invent one.
            </p>
          </div>
          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
          <button type="submit" disabled={saving} className="w-full px-6 py-3 rounded-xl font-semibold text-white bg-ember-600 hover:bg-ember-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Add prospect'}
          </button>
        </form>
      </div>
    </div>
  );
};
