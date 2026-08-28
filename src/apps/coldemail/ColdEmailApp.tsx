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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Mail, Plus, Sparkles, Copy, Check, Trash2, Loader2, X, Ban,
} from 'lucide-react';
import { useProspects, type MutationResult } from './useProspects';
import { Prospect, ProspectStatus, EmailSequence, isProspectTerminal } from './types';
import { readSentSteps, type GenerationMeta } from '../linkedin/types';
import { supabase } from '../../lib/supabase';
import { loadAIConfig } from '../../lib/aiConfig';
import { loadUserContext, senderAbout } from '../../lib/userContext';
import { buildChannelPrompt, checkAgainstMethod } from '../../lib/method/forChannel';
import { getPack } from '../../lib/method/packs';
import { subjectKey } from '../../lib/method/types';
import { useVerticalBrief } from '../../lib/vertical/useVerticalBrief';
import type { IndustryEvidence } from '../../lib/vertical/types';
import { useVerticalMode } from '../../lib/vertical/useVerticalMode';
import { VerticalToggle } from '../../components/UI/VerticalToggle';
import { useCaseStudies } from '../../lib/proof';
import { QualifyPanel } from '../../components/Qualify/QualifyPanel';
import { AppBar } from '../../components/Layout/AppBar';
import { ReplyLog } from '../../components/Activity/ReplyLog';
import { advanceTo, statusAfterSend } from '../../lib/activity/milestones';
import { cadenceForRow, isDue, scheduledSteps } from '../../lib/cadence';
import { qualify, isBlocked } from '../../lib/qualify/score';
import { isStaleDeployment, stripContract, outOfDateMessage } from '../../lib/deployment';
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

/**
 * The first email in the sequence, from the pack rather than named here.
 *
 * Cold email needs it only to know that a first send has happened at all —
 * every step goes to the same address, so the opener is the whole distinction
 * between a prospect nobody has written to and one in flight.
 */
const FIRST_STEP_KEY: string | null = scheduledSteps(PACK)[0]?.key ?? null;

export const ColdEmailApp: React.FC<{
  onExit: () => void;
  initialProspectId?: string;
  initialStepKey?: string;
}> = ({ onExit, initialProspectId, initialStepKey }) => {
  const { prospects, loading, addProspect, updateProspect, deleteProspect } = useProspects();
  // See LinkedInApp: the queue names the row, and it is a starting point
  // rather than something that reasserts itself on every render.
  const [selectedId, setSelectedId] = useState<string | null>(initialProspectId ?? null);
  const [focusStep, setFocusStep] = useState<string | undefined>(initialStepKey);
  const [showDue, setShowDue] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const selected = prospects.find((p) => p.id === selectedId) ?? null;

  const suppressed = prospects.filter((p) => p.opted_out).length;

  /*
    Who to email today.

    The pack has carried a day on every step since it was written, and the
    schedule that reads it was built against `Lead`, so this channel had the
    spacing and no way to see it. Beginners send once and stop; nothing here
    could tell them the second touch was three days late.

    Opted-out addresses are filtered before anything is computed. Nothing that
    can never be sent belongs in a list of what to send.
  */
  const due = useMemo(() => {
    const now = new Date();
    return prospects
      .filter((p) => !p.opted_out)
      .map((p) => ({
        prospect: p,
        cadence: cadenceForRow(p, isProspectTerminal(p.status), PACK, readSentSteps(p.sent_steps), now),
      }))
      .filter((x) => isDue(x.cadence))
      // Oldest first. The thing rotting longest is the thing to do now, and a
      // touch that slips past its day must not quietly leave the list.
      .sort(
        (a, b) =>
          b.cadence.daysOverdue - a.cadence.daysOverdue ||
          a.prospect.name.localeCompare(b.prospect.name),
      );
  }, [prospects]);

  return (
    <div className="min-h-screen flex flex-col app-canvas accent-ember">
      <AppBar title="Cold Email" icon={Mail} gradient="from-ember-400 to-ember-600" onExit={onExit}>
        <button onClick={() => setShowAdd(true)} className="btn-primary !py-2 !px-4 text-sm">
          <Plus className="w-4 h-4 mr-1.5" /> Add prospect
        </button>
      </AppBar>

      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 grid lg:grid-cols-[320px_1fr] gap-6 overflow-hidden">
        <div className="overflow-y-auto pr-1">
          {due.length > 0 && showDue && (
            <div className="mb-4 rounded-xl border border-ember-200 dark:border-ember-800 bg-ember-50/60 dark:bg-ember-900/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-ember-700 dark:text-ember-300">
                  Due now ({due.length})
                </h2>
                <button onClick={() => setShowDue(false)} className="text-xs text-gray-500 hover:text-gray-700">Hide</button>
              </div>
              <div className="space-y-1.5">
                {due.slice(0, 8).map(({ prospect: p, cadence }) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedId(p.id); setFocusStep(cadence.next?.step.key); }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                      {cadence.next?.step.label}
                      {cadence.daysOverdue > 0
                        ? ` · ${cadence.daysOverdue} day${cadence.daysOverdue === 1 ? '' : 's'} late`
                        : cadence.next?.dueAt
                          ? ' · due today'
                          : ' · not started'}
                    </span>
                  </button>
                ))}
                {due.length > 8 && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 px-2">and {due.length - 8} more</p>
                )}
              </div>
            </div>
          )}
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
                  onClick={() => { setSelectedId(p.id); setFocusStep(undefined); }}
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
              focusStep={focusStep}
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
  /** The sequence position to open on, when arriving from a due list. */
  focusStep?: string;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<MutationResult>;
  onDelete: (id: string) => void;
}> = ({ prospect, focusStep, onUpdate, onDelete }) => {
  const { cases, loadError: vaultError } = useCaseStudies();
  /*
    Land on the step that is due, not at the top of the sequence.

    Found in the DOM rather than held in a ref, because the cards are rendered
    by a component declared inside this one and so remount on every render — a
    ref would be reattached constantly. The guard makes this happen once per
    focused step: after the first successful scroll it never runs again, so
    editing a step does not yank the page back to it.
  */
  const scrolledTo = useRef<string | null>(null);
  useEffect(() => {
    if (!focusStep || scrolledTo.current === focusStep) return;
    const el = document.querySelector(`[data-step="${CSS.escape(focusStep)}"]`);
    if (!el) return;
    scrolledTo.current = focusStep;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [localSeq, setLocalSeq] = useState<EmailSequence | null>(null);
  const [proofUsed, setProofUsed] = useState<string | null>(null);
  /*
    Two different things, and they used to be one.

    `noProof` means there was nothing at all to write from. `industryOnly`
    means there is no client result but there IS a sourced industry figure,
    which is a legitimate starting state and not a gap — the attribution law
    forces the source into the same message. Showing "you have no case
    studies" to that member is both wrong and the nag we decided against.
  */
  const [noProof, setNoProof] = useState(false);
  const [industryOnly, setIndustryOnly] = useState(false);

  const { loaded: brief, loading: briefLoading, loadError: briefError } = useVerticalBrief();
  const { mode, setMode } = useVerticalMode('coldEmail');
  // The evidence actually sent with the last generation, so the validator
  // grades attribution against what the model was given rather than against
  // whatever the vault holds now.
  const [sentEvidence, setSentEvidence] = useState<IndustryEvidence[]>([]);

  const sequence = prospect.sequence ?? localSeq;
  const sentSteps = useMemo(() => readSentSteps(prospect.sent_steps), [prospect.sent_steps]);

  // Derived, never latched. Same reasoning as the other two apps: a check that
  // fires once and vanishes says nothing about the copy actually sent.
  /*
    Attribution has to keep working after a reload.

    sentEvidence is state, and this component remounts per selection, so on
    reopening a prospect it is empty and the attribution rule silently has
    nothing to check while every other rule still runs. That is the "fires once
    and vanishes" failure the derived check was written to avoid, reintroduced
    for the one rule whose whole job is catching an uncited borrowed number.
    Falling back to the current evidence re-grades stored copy.
  */
  // Memoised: a fresh array literal on every render would change the
  // dependency of the check below every time, so the memo would recompute
  // the whole validation pass on each keystroke.
  const evidenceToGrade = useMemo(
    () => (sentEvidence.length ? sentEvidence : brief?.evidence ?? []),
    [sentEvidence, brief],
  );
  const check = useMemo(
    () => (sequence ? checkAgainstMethod('coldEmail', sequence, evidenceToGrade) : null),
    [sequence, evidenceToGrade],
  );
  const describe = (v: ValidationResult['violations'][number]) =>
    `${v.message}${v.excerpt ? `, "${v.excerpt}"` : ''}`;
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
    const marking = !(key in next);
    if (marking) next[key] = new Date().toISOString();
    else delete next[key];

    // The stage moves with the send, exactly as it does on LinkedIn, so
    // ticking the opener is the whole record rather than half of it.
    // Forwards only: unticking never demotes, and a prospect the member has
    // moved on by hand stays where they put it.
    const patch: Partial<Prospect> = { sent_steps: next };
    if (marking) {
      const advanced = advanceTo('prospect', prospect.status, statusAfterSend('prospect', key, FIRST_STEP_KEY));
      if (advanced) patch.status = advanced as ProspectStatus;
    }

    const res = await onUpdate(prospect.id, patch);
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
    setError(''); setProofUsed(null); setNoProof(false); setIndustryOnly(false); setGenerating(true);

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
      brief,
      verticalMode: mode,
    });
    setSentEvidence(method.evidence);
    setProofUsed(method.chosen ? method.chosen.caseStudy.title : null);
    setNoProof(method.nothingToWriteFrom);
    setIndustryOnly(method.industryOnly);

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
      if (isStaleDeployment(data)) throw new Error(outOfDateMessage(data));
      const seqData = stripContract(data as unknown as Record<string, string>) as unknown as EmailSequence;

      const partial = (seqData as Record<string, string>).__partial;
      if (partial) {
        delete (seqData as Record<string, string>).__partial;
        setError(`${partial} You can regenerate, or write the missing ones yourself.`);
      }

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
        violation_ids: checkAgainstMethod('coldEmail', seqData as Record<string, string>, method.evidence)
          .violations.map((v) => v.patternId ?? v.lawId ?? 'empty-step'),
      };

      const saved = await onUpdate(prospect.id, {
        sequence: seqData,
        generation_meta: [...(prospect.generation_meta ?? []), meta],
        // Recorded at generation, so a reply rate can be split by it later.
        variant: prospect.variant ?? `${method.pack.version}`,
      });
      if (saved.error) {
        setLocalSeq(seqData);
        throw new Error(`Generated, but saving failed: ${saved.error}. The sequence is below, copy anything you need.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate the sequence.');
    } finally {
      setGenerating(false);
    }
  };

  const Step: React.FC<{
    id: string;
    title: string;
    text: string;
    track?: boolean;
    timing?: string;
    /** Present only on the step that opens the thread; follow-ups reply on it. */
    subject?: string;
    subjectId?: string;
  }> = ({ id, title, text, track = true, timing, subject, subjectId }) => (
    <div
      data-step={id}
      className={`card-modern p-4 ${id === focusStep ? 'ring-2 ring-ember-400 dark:ring-ember-500' : ''}`}
    >
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
      {/* Its own field, because that is how it gets used: the subject goes in a
          separate box in every mail client, so it needs a separate copy button
          rather than being something to pick back out of the body. */}
      {subjectId && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 flex-none">Subject</span>
          <input
            defaultValue={subject ?? ''}
            key={`${subjectId}:${subject ?? ''}`}
            onBlur={(e) => saveStep(subjectId, e.target.value)}
            placeholder="No subject came back. Regenerate."
            className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-ember-400 rounded-lg px-2 py-1 focus:outline-none"
          />
          <button
            onClick={() => copy(subject ?? '', subjectId)}
            className="flex-none text-xs font-medium text-ember-600 hover:text-ember-700 inline-flex items-center"
          >
            {copied === subjectId ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
            {copied === subjectId ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
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

        {/* One click from the prospect. An opted-out address is not a lead
            whose reply you are still waiting on, so the control is hidden
            rather than shown and refused. */}
        {!prospect.opted_out && (
          <div className="mt-4">
            <ReplyLog
              kind="prospect"
              row={prospect}
              onLog={(patch) => onUpdate(prospect.id, patch as Partial<Prospect>)}
              onError={setError}
            />
          </div>
        )}

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
          <div className="w-full sm:w-auto sm:ml-auto">
            <VerticalToggle
              mode={mode}
              onChange={setMode}
              vertical={brief?.brief.vertical}
              loading={briefLoading}
              unavailable={Boolean(briefError)}
            />
          </div>
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
                I disagree, write it anyway
              </button>
            )}
          </div>
        )}

        {error && <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">{error}</div>}

        {noProof && !proofUsed && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Nothing to write from yet, so this claims no results. One case study or one industry
            figure with its source is enough — either is in Settings.
          </p>
        )}

        {industryOnly && !proofUsed && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            No result of your own yet, so this leans on your industry research and credits the
            source in the message itself.
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
                  subject={s.subject ? sequence[subjectKey(s.key)] : undefined}
                  subjectId={s.subject ? subjectKey(s.key) : undefined}
                />
              ))}
            </React.Fragment>
          );
        })
      ) : (
        <div className="card-modern p-8 text-center text-gray-400">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-ember-300" />
          <p>No sequence yet, click <span className="font-semibold">Write the sequence</span>.</p>
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
