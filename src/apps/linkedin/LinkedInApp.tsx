import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Linkedin, Plus, Sparkles, Copy, Check, Trash2, Loader2, ExternalLink, X,
  ThumbsUp, ThumbsDown, Lightbulb, Upload,
} from 'lucide-react';
import { useLeads, type MutationResult } from './useLeads';
import { Lead, LeadStatus, OutreachFlow, GenerationMeta, migrateFlow, readSentSteps, isTerminal } from './types';
import { getPack } from '../../lib/method/packs';
import { cadenceFor, dueQueue, pendingInvitationDays, scheduledSteps, STALE_INVITATION_DAYS } from '../../lib/cadence';
import { funnelFor, closedCount, revenueFrom, MIN_SAMPLE } from '../../lib/funnel';
import { supabase } from '../../lib/supabase';
import { loadAIConfig } from '../../lib/aiConfig';
import { loadUserContext, senderAbout } from '../../lib/userContext';
import { buildChannelPrompt, checkAgainstMethod } from '../../lib/method/forChannel';
import { useVerticalBrief } from '../../lib/vertical/useVerticalBrief';
import { useVerticalMode } from '../../lib/vertical/useVerticalMode';
import type { IndustryEvidence } from '../../lib/vertical/types';
import { VerticalToggle } from '../../components/UI/VerticalToggle';
import { useCaseStudies } from '../../lib/proof';
import { QualifyPanel } from '../../components/Qualify/QualifyPanel';
import { AppBar } from '../../components/Layout/AppBar';
import { ImportLeadsModal } from './ImportLeadsModal';
import { StarterList } from '../../components/Setup/StarterList';
import { ReplyLog } from '../../components/Activity/ReplyLog';
import { advanceTo, statusAfterSend } from '../../lib/activity/milestones';
import { qualify, isBlocked } from '../../lib/qualify/score';
import { isStaleDeployment, stripContract, outOfDateMessage } from '../../lib/deployment';
import type { QualificationInput } from '../../lib/qualify/types';
import type { ValidationResult } from '../../lib/method/types';

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New', requested: 'Requested', connected: 'Connected', replied: 'Replied', meeting: 'Meeting',
  won: 'Won', lost: 'Lost', no_reply: 'No reply', disqualified: 'Disqualified',
};
const STATUS_ORDER: LeadStatus[] = [
  'new', 'requested', 'connected', 'replied', 'meeting',
  'won', 'lost', 'no_reply', 'disqualified',
];

/**
 * What gets rendered comes from the pack, grouped by its own `group` field.
 *
 * The previous hardcoded five-step list is what let the app and the doctrine
 * drift apart: the pack described twelve steps and the UI showed five, so seven
 * of them had nowhere to appear even once generated.
 */
const LINKEDIN_PACK = getPack('linkedin');

const GROUPED_STEPS = LINKEDIN_PACK.structure.reduce<{ group: string; steps: typeof LINKEDIN_PACK.structure }[]>(
  (acc, step) => {
    const group = step.group ?? 'The sequence';
    const bucket = acc.find((g) => g.group === group);
    if (bucket) bucket.steps.push(step);
    else acc.push({ group, steps: [step] });
    return acc;
  },
  [],
);

/** Only the outbound steps are things you send on a schedule and tick off. */
const TRACKED_GROUPS = new Set(['The sequence']);

/**
 * The connection request, taken from the pack rather than named here.
 *
 * Marking it sent means an invitation went out; marking anything after it means
 * a direct message did, which the sequence only sends to a connection. A pack
 * that reorders its opening step must not silently mis-stage every lead.
 */
const FIRST_STEP_KEY: string | null = scheduledSteps(LINKEDIN_PACK)[0]?.key ?? null;

export const LinkedInApp: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { leads, loading, addLead, importLeads, updateLead, deleteLead } = useLeads();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [starterSeed, setStarterSeed] = useState<string | undefined>(undefined);
  const [showImport, setShowImport] = useState(false);
  const [showDue, setShowDue] = useState(true);
  const selected = leads.find((l) => l.id === selectedId) ?? null;

  // "Who do I message today" is the question an operator actually has every
  // morning, and until now the app could not answer it: the steps were ordered
  // and never dated, so the only way to know was to remember.
  const funnel = useMemo(() => funnelFor(leads), [leads]);
  const closed = useMemo(() => closedCount(leads), [leads]);
  const revenue = useMemo(() => revenueFrom(leads), [leads]);

  const due = useMemo(() => {
    const now = new Date();
    return dueQueue(
      leads.map((l) => cadenceFor(l, LINKEDIN_PACK, readSentSteps(l.sent_steps), now)),
    );
  }, [leads]);

  return (
    <div className="min-h-screen flex flex-col app-canvas accent-linkedin">
      <AppBar title="LinkedIn DM Generator" icon={Linkedin} gradient="from-linkedin-400 to-linkedin-600" onExit={onExit}>
        <button onClick={() => setShowImport(true)} className="btn-secondary !py-2 !px-4 text-sm">
          <Upload className="w-4 h-4 mr-1.5" /> Import
        </button>
        <button onClick={() => setShowAdd(true)} className="btn-primary !py-2 !px-4 text-sm">
          <Plus className="w-4 h-4 mr-1.5" /> Add lead
        </button>
      </AppBar>

      {leads.length > 0 && (
        <div className="max-w-6xl w-full mx-auto px-6 pt-5">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {funnel.map((st) => (
              <div key={st.key} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{st.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{st.count}</p>
                {/* A rate or the reason there isn't one. Never a percentage over
                    a handful of leads: three connections and one reply is not a
                    33% reply rate, and printing one is how somebody talks
                    themselves into keeping a message that is not working. */}
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {st.rate != null
                    ? `${Math.round(st.rate * 100)}% of previous`
                    : st.note ?? ''}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
            {closed} closed{revenue > 0 ? ` · ${revenue.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} won` : ''}
            {closed === 0 && ' · rates only mean something once leads start closing, so mark the dead ones dead'}
            {closed > 0 && leads.length < MIN_SAMPLE && ' · still a small sample'}
          </p>
        </div>
      )}

      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 grid lg:grid-cols-[320px_1fr] gap-6 overflow-hidden">
        <div className="overflow-y-auto pr-1">
          {due.length > 0 && showDue && (
            <div className="mb-4 rounded-xl border border-linkedin-200 dark:border-linkedin-800 bg-linkedin-50/60 dark:bg-linkedin-900/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-linkedin-700 dark:text-linkedin-300">
                  Due now ({due.length})
                </h2>
                <button onClick={() => setShowDue(false)} className="text-xs text-gray-500 hover:text-gray-700">Hide</button>
              </div>
              <div className="space-y-1.5">
                {due.slice(0, 8).map((c) => (
                  <button
                    key={c.lead.id}
                    onClick={() => setSelectedId(c.lead.id)}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{c.lead.name}</span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                      {c.next?.step.label}
                      {c.daysOverdue > 0
                        ? ` · ${c.daysOverdue} day${c.daysOverdue === 1 ? '' : 's'} late`
                        : c.next?.dueAt
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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Leads ({leads.length})</h2>
          {loading ? (
            <div className="text-sm text-gray-400 p-4">Loading…</div>
          ) : leads.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 card-modern p-6 text-center">
              No leads yet. Click <span className="font-semibold">Add lead</span>.
            </div>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedId(lead.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedId === lead.id
                      ? 'border-linkedin-400 bg-linkedin-50 dark:bg-linkedin-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-linkedin-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white truncate">{lead.name}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-linkedin-100 text-linkedin-700 dark:bg-linkedin-900/40 dark:text-linkedin-300">
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {[lead.job_title, lead.company_name].filter(Boolean).join(' · ') || lead.linkedin_url}
                  </p>
                  {lead.outreach && (
                    <p className="text-[11px] text-linkedin-600 dark:text-linkedin-400 mt-1 flex items-center">
                      <Sparkles className="w-3 h-3 mr-1" /> Flow ready
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto">
          {selected ? (
            <LeadDetail
              key={selected.id}
              lead={selected}
              onUpdate={updateLead}
              onDelete={async (id) => { await deleteLead(id); setSelectedId(null); }}
            />
          ) : (
            leads.length === 0 ? (
              /* A member with no list cannot hit any number however motivated,
                 and this empty pane is exactly where that stall happens. */
              <StarterList
                onUseTemplate={(csv) => {
                  setStarterSeed(csv);
                  setShowImport(true);
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center text-gray-400 card-modern p-10">
                <div>
                  <Linkedin className="w-10 h-10 mx-auto mb-3 text-linkedin-300" />
                  <p>Select a lead to generate and manage their outreach flow.</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onAdd={addLead} />}
      {showImport && (
        <ImportLeadsModal
          existingUrls={leads.map((l) => l.linkedin_url)}
          seed={starterSeed}
          onClose={() => { setShowImport(false); setStarterSeed(undefined); }}
          onImport={importLeads}
        />
      )}
    </div>
  );
};

// --- Lead detail + flow ------------------------------------------------------

const LeadDetail: React.FC<{
  lead: Lead;
  // Returns the failure so the caller can surface it. A `void` signature here is
  // what let a failed save silently eat a freshly generated flow.
  onUpdate: (id: string, updates: Partial<Lead>) => Promise<MutationResult>;
  onDelete: (id: string) => void;
}> = ({ lead, onUpdate, onDelete }) => {
  const { cases, loadError: vaultError } = useCaseStudies();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  // Holds a generation that could not be persisted, so it survives on screen.
  const [localFlow, setLocalFlow] = useState<OutreachFlow | null>(null);
  const [proofUsed, setProofUsed] = useState<string | null>(null);
  const { loaded: brief, loading: briefLoading, loadError: briefError } = useVerticalBrief();
  const { mode, setMode } = useVerticalMode('linkedin');
  // Graded against what was actually sent, not against the vault as it stands now.
  const [sentEvidence, setSentEvidence] = useState<IndustryEvidence[]>([]);
  const lastGeneration = lead.generation_meta?.[lead.generation_meta.length - 1] ?? null;
  const [noProof, setNoProof] = useState(false);
  const flow = useMemo(() => migrateFlow(lead.outreach ?? localFlow), [lead.outreach, localFlow]);
  // Deliberately NOT state.
  //
  // Latched at generation time, the check fired once against text the user could
  // not edit, and vanished the moment they clicked another lead — so the copy
  // they actually send tomorrow carries no warning at all. validateOutput is
  // pure, so recomputing from whatever is on screen costs nothing and means
  // fixing a violation visibly clears it.
  /**
   * A stored flow with no content in it at all.
   *
   * This is a failed generation that was saved before the functions learned to
   * refuse one. Grading it produces twelve identical "came back empty,
   * regenerate" violations, which reads as twelve problems with the copy when
   * it is one problem with the generation — and none of them can ever be
   * cleared by editing. It gets its own state.
   */
  const flowIsEmpty = useMemo(
    () => Boolean(flow) && LINKEDIN_PACK.structure.every((st) => !flow?.[st.key]?.trim()),
    [flow],
  );

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
    () => (flow && !flowIsEmpty ? checkAgainstMethod('linkedin', flow, evidenceToGrade) : null),
    [flow, flowIsEmpty, evidenceToGrade],
  );
  const describeViolation = (v: ValidationResult['violations'][number]) =>
    `${v.message}${v.excerpt ? `, "${v.excerpt}"` : ''}`;
  const warnings = (check?.violations ?? []).filter((v) => v.level === 'hard').map(describeViolation);
  const softNotes = (check?.violations ?? []).filter((v) => v.level === 'soft').map(describeViolation);
  // Read through the tolerant reader: rows written before steps carried times
  // hold a bare array, and their tick marks must not vanish.
  const sentSteps = useMemo(() => readSentSteps(lead.sent_steps), [lead.sent_steps]);
  const cadence = useMemo(
    () => cadenceFor(lead, LINKEDIN_PACK, sentSteps, new Date()),
    [lead, sentSteps],
  );
  const dueByKey = useMemo(
    () => Object.fromEntries(cadence.steps.map((d) => [d.step.key, d])),
    [cadence],
  );
  const pendingDays = useMemo(
    () => pendingInvitationDays(lead, sentSteps, new Date()),
    [lead, sentSteps],
  );

  // --- the screen, which runs before anything is written ---------------------
  //
  // Answers are held locally and saved on a debounce. A failed save leaves them
  // on screen with the error, for the same reason a failed flow save does: the
  // user did the thinking, and losing it silently is the worst outcome.
  const [qual, setQual] = useState<QualificationInput | null>(lead.qualification ?? null);
  const [qualError, setQualError] = useState('');
  const [override, setOverride] = useState(false);
  const verdict = useMemo(() => qualify(qual ?? {}), [qual]);
  const declined = isBlocked(verdict);

  // `onUpdate` is a fresh function on every parent render, so it goes through a
  // ref. In the dependency array it would reset the debounce timer on each
  // render and the save would never fire.
  const updateRef = useRef(onUpdate);
  updateRef.current = onUpdate;
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(async () => {
      const res = await updateRef.current(lead.id, { qualification: qual });
      setQualError(res.error ? `The screen could not be saved: ${res.error}` : '');
    }, 800);
    return () => clearTimeout(timer);
  }, [qual, lead.id]);

  const changeQual = (update: (prev: QualificationInput) => QualificationInput) => {
    dirty.current = true;
    setOverride(false);
    setQual((prev) => update(prev ?? {}));
  };

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch { /* */ }
  };

  const toggleSent = async (key: string) => {
    const next = { ...sentSteps };
    // Stamped at the moment the user ticks it. This is the only record of WHEN
    // anything went out, and the whole cadence is derived from it.
    const marking = !(key in next);
    if (marking) next[key] = new Date().toISOString();
    else delete next[key];

    const patch: Partial<Lead> = { sent_steps: next };
    /*
      The stage moves with the send, so one click is the whole record.

      Before this, ticking four steps left the lead reading "New", and the
      funnel — which counts nothing but status — told an operator who had sent
      forty invitations that they had sent none. Forwards only, and only from
      an earlier stage: unticking never demotes anything, and a lead the member
      has already moved on by hand is left where they put it.
    */
    if (marking) {
      const advanced = advanceTo('lead', lead.status, statusAfterSend('lead', key, FIRST_STEP_KEY));
      if (advanced) patch.status = advanced as LeadStatus;
    }

    const res = await onUpdate(lead.id, patch);
    if (res.error) setError(`Could not save that change: ${res.error}`);
  };

  const handleGenerate = async () => {
    const cfg = loadAIConfig();
    if (!cfg) {
      setError('Add your AI provider and key first (Settings, top-right on the Ember home screen).');
      return;
    }
    // A vault that could not be READ is not an empty vault. Generating anyway
    // spends the user's money and then tells someone with saved case studies
    // that they have none.
    if (vaultError) {
      setError(
        `Your case studies could not be loaded, so this would be written as if you had none: ${vaultError}. ` +
          'Reload, or check the connection in Settings.',
      );
      return;
    }
    setError('');
    setProofUsed(null);
    setNoProof(false);
    setGenerating(true);
    // Match a case study to THIS lead's world rather than sending the whole
    // vault. "One proof, matched to the reader" is a law in every pack.
    const method = buildChannelPrompt('linkedin', {
      cases,
      vaultUnavailable: Boolean(vaultError),
      target: {
        industry: lead.industry,
        buyer_role: lead.job_title,
        notes: [lead.company_name, lead.industry, lead.potential_services].filter(Boolean).join(' · '),
      },
      // The screen's verdict travels into the prompt: it decides what job the
      // message has to do, and caps what the copy may claim to know about them.
      qualification: verdict,
      brief,
      verticalMode: mode,
    });
    setSentEvidence(method.evidence);
    setProofUsed(method.chosen ? method.chosen.caseStudy.title : null);
    setNoProof(method.proofEmpty);
    try {
      const { data, error: fnError } = await supabase.functions.invoke<OutreachFlow>('generate-outreach', {
        body: {
          lead: {
            name: lead.name, job_title: lead.job_title, company_name: lead.company_name,
            industry: lead.industry, linkedin_url: lead.linkedin_url,
            company_website: lead.company_website, potential_services: lead.potential_services,
          },
          // Only who they are. Proof comes from the vault, through the system
          // prompt, where the naming rule and the do-not-round framing apply.
          context: senderAbout(loadUserContext()),
          systemPrompt: method.systemPrompt,
          // The output contract, straight from the pack. Without this the
          // generator invents its own shape and the validator grades keys
          // nobody asked for.
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
      // An old deployment answers with content this build cannot use. Say that,
      // rather than letting it land as an empty flow the user has to interpret.
      if (isStaleDeployment(data)) throw new Error(outOfDateMessage(data));
      const flowData = stripContract(data as unknown as Record<string, string>) as unknown as OutreachFlow;

      // The function marks a partial response rather than letting the missing
      // steps arrive as a silent list of blanks. Lift it out of the payload so it
      // is not stored as a phantom step, and tell the user plainly.
      const partial = (flowData as Record<string, string>).__partial;
      if (partial) {
        delete (flowData as Record<string, string>).__partial;
        setError(`${partial} You can regenerate, or write the missing ones yourself.`);
      }

      // Grade the output against the same doctrine that wrote it. Generation is
      // probabilistic; the laws are not.
      // Everything worth recording is already in scope on this line, and all of
      // it is otherwise transient: the validator's findings live in component
      // state, and the qualification verdict is re-derived at read time.
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
        // Ids only. The excerpts are the user's own copy and have no business
        // being duplicated into a log.
        violation_ids: checkAgainstMethod('linkedin', flowData as Record<string, string>, method.evidence)
          .violations.map((v) => v.patternId ?? v.lawId ?? 'empty-step'),
      };

      // The generation is already paid for. If the save fails, say so and keep
      // the flow on screen so it can be copied out rather than regenerated.
      const saved = await onUpdate(lead.id, {
        outreach: flowData,
        generation_meta: [...(lead.generation_meta ?? []), meta],
      });
      if (saved.error) {
        setLocalFlow(flowData);
        throw new Error(
          `Generated, but saving failed: ${saved.error}. The flow is shown below, copy anything you need before leaving this page.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate outreach.');
    } finally {
      setGenerating(false);
    }
  };

  /** Persists one edited step back onto the stored flow. */
  const saveStep = async (key: string, value: string) => {
    if (!flow || flow[key] === value) return;
    const next = { ...flow, [key]: value };
    setLocalFlow(next);
    const res = await onUpdate(lead.id, { outreach: next });
    if (res.error) setError(`That edit is on screen but did not save: ${res.error}`);
  };

  const Step: React.FC<{ id: string; title: string; text: string; track?: boolean; timing?: string; tone?: 'positive' | 'objection' }> = ({ id, title, text, track = true, timing, tone }) => (
    <div className={`card-modern p-4 ${tone === 'positive' ? 'border-l-4 border-l-green-400' : tone === 'objection' ? 'border-l-4 border-l-amber-400' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center">
          {tone === 'positive' && <ThumbsUp className="w-4 h-4 mr-1.5 text-green-500" />}
          {tone === 'objection' && <ThumbsDown className="w-4 h-4 mr-1.5 text-amber-500" />}
          {title}
          {timing && (
            <span className={`ml-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
              /overdue/.test(timing)
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : /due today/.test(timing)
                  ? 'bg-linkedin-100 text-linkedin-700 dark:bg-linkedin-900/40 dark:text-linkedin-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {timing}
            </span>
          )}
        </h4>
        <div className="flex items-center gap-3">
          {track && (
            <label className="flex items-center text-xs text-gray-500 cursor-pointer select-none">
              <input type="checkbox" className="mr-1.5 accent-linkedin-600" checked={id in sentSteps} onChange={() => toggleSent(id)} />
              Sent
            </label>
          )}
          {text && (
            <button onClick={() => copy(text, id)} className="text-xs font-medium text-linkedin-600 hover:text-linkedin-700 inline-flex items-center">
              {copied === id ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied === id ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
      {/* A textarea, not a paragraph. The validator points at a specific phrase;
          without somewhere to change it the warning is an observation the user
          can only act on by regenerating and hoping. Saved on blur so every
          keystroke is not a write. */}
      <textarea
        defaultValue={text}
        key={`${id}:${text}`}
        onBlur={(e) => saveStep(id, e.target.value)}
        rows={Math.min(10, Math.max(2, Math.ceil((text.length || 1) / 70)))}
        className="w-full text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-linkedin-400 rounded-lg p-2 -m-2 resize-y focus:outline-none"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="card-modern p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{lead.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{[lead.job_title, lead.company_name].filter(Boolean).join(' · ')}</p>
            <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-medium text-linkedin-600 hover:text-linkedin-700 mt-2">
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> LinkedIn profile
            </a>
          </div>
          <button onClick={() => onDelete(lead.id)} className="p-2 text-gray-400 hover:text-red-500" aria-label="Delete lead">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {/* What came back, one click from the lead. The dropdown below still
            exists for every other stage, but the three answers that actually
            happen should not cost a menu. */}
        <div className="mt-4">
          <ReplyLog
            kind="lead"
            row={lead}
            onLog={(patch) => onUpdate(lead.id, patch as Partial<Lead>)}
            onError={setError}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <select value={lead.status} onChange={(e) => onUpdate(lead.id, { status: e.target.value as LeadStatus })} className="input-modern !py-2 !w-auto text-sm">
            <optgroup label="In flight">
              {STATUS_ORDER.filter((s) => !isTerminal(s)).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </optgroup>
            <optgroup label="Closed">
              {STATUS_ORDER.filter(isTerminal).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
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
            disabled={generating || (declined && !override)}
            title={declined && !override ? 'The qualification screen declined this lead.' : undefined}
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-linkedin-500 to-linkedin-700 hover:from-linkedin-600 hover:to-linkedin-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            {generating ? 'Generating…' : flow ? 'Regenerate flow' : 'Generate outreach flow'}
          </button>
        </div>

        {/* A declined lead is blocked rather than warned about, because a warning
            beside an enabled button is a warning nobody reads. The override is
            deliberately a second, separate click: the screen is advice, not a
            cage, but disagreeing with it should be a decision. */}
        {declined && (
          <div className="mt-3 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
              The screen says not to write to this one
            </p>
            {verdict.blockers.map((b, i) => (
              <p key={i} className="text-red-700 dark:text-red-300 text-xs">{b}</p>
            ))}
            {override ? (
              <p className="text-xs text-red-700 dark:text-red-300 mt-2 font-medium">
                Overridden. The generator has been told the screen failed, so it will not imply a fit.
              </p>
            ) : (
              <button
                onClick={() => setOverride(true)}
                className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300 underline underline-offset-2"
              >
                I disagree, write to them anyway
              </button>
            )}
          </div>
        )}

        {/* Only once it is closed. A "why did you lose this" field beside a live
            lead is noise; beside a closed one it is the only record of what
            happened, and the deal value is the number every rate needs. */}
        {isTerminal(lead.status) && (
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                What happened
              </label>
              <input
                defaultValue={lead.close_reason ?? ''}
                key={`reason:${lead.id}:${lead.status}`}
                onBlur={(e) => onUpdate(lead.id, { close_reason: e.target.value })}
                placeholder="Went with someone in-house. Never opened. Budget pulled."
                className="input-modern !py-2 text-sm"
              />
            </div>
            {lead.status === 'won' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Deal value
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={lead.deal_value ?? ''}
                  key={`value:${lead.id}`}
                  onBlur={(e) => onUpdate(lead.id, { deal_value: e.target.value ? parseFloat(e.target.value) : null })}
                  className="input-modern !py-2 text-sm"
                />
              </div>
            )}
          </div>
        )}

        {error && <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">{error}</div>}

        {noProof && !proofUsed && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            No case studies yet, so this was written from your background alone and claims no results.
            Add one in Settings and Ember will cite a matched, real outcome.
          </p>
        )}

        {proofUsed && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Proof used: <span className="font-medium text-gray-700 dark:text-gray-300">{proofUsed}</span>
          </p>
        )}

        {/* Survives a lead switch, unlike the live banners above it. */}
        {!proofUsed && lastGeneration && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Written {new Date(lastGeneration.at).toLocaleDateString()} under {lastGeneration.pack_id}{' '}
            {lastGeneration.pack_version}
            {lastGeneration.tier ? `, tier ${lastGeneration.tier}` : ''}
            {lastGeneration.case_study_title ? `, citing “${lastGeneration.case_study_title}”` : ', citing no proof'}.
          </p>
        )}

        {flowIsEmpty && (
          <div className="mt-3 text-sm bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
            <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
              This generation came back empty
            </p>
            <p className="text-amber-700 dark:text-amber-400">
              Nothing was written, so there is nothing here to fix. This usually means the edge
              functions need redeploying, or the model returned an unusable response. Check
              <span className="font-semibold"> Test this key</span> in Settings, then regenerate.
            </p>
            <button
              onClick={async () => {
                setLocalFlow(null);
                const res = await onUpdate(lead.id, { outreach: null });
                if (res.error) setError(`Could not clear it: ${res.error}`);
              }}
              className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300 underline underline-offset-2"
            >
              Clear this empty flow
            </button>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-3 text-sm bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
              {warnings.length} thing{warnings.length === 1 ? '' : 's'} to fix before you send
            </p>
            <ul className="list-disc pl-5 space-y-1 text-amber-700 dark:text-amber-300">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {softNotes.length > 0 && (
          <div className="mt-3 text-sm bg-gray-50 dark:bg-gray-800/60 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {softNotes.length} thing{softNotes.length === 1 ? '' : 's'} worth a look, your call
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
              {softNotes.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {cadence.haltedBecause && (
        <div className="flex items-start text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-green-800 dark:text-green-300">
          <ThumbsUp className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
          <span>{cadence.haltedBecause}</span>
        </div>
      )}

      {/* The pack makes withdrawing invitations pending past three weeks a law,
          and nothing in the app could compute that age until steps carried a time. */}
      {pendingDays !== null && pendingDays > STALE_INVITATION_DAYS && (
        <div className="flex items-start text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-amber-800 dark:text-amber-300">
          <Lightbulb className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
          <span>
            This invitation has been pending {pendingDays} days. Past {STALE_INVITATION_DAYS} it is worth
            withdrawing: pending invitations count against your weekly limit and a stale one is not coming back.
          </span>
        </div>
      )}

      <QualifyPanel value={qual} onChange={changeQual} error={qualError} />

      {flow && !flowIsEmpty ? (
        <>
          {flow.blank_strategy && (
            <div className="flex items-start text-sm bg-linkedin-50 dark:bg-linkedin-900/20 border border-linkedin-200 dark:border-linkedin-800 rounded-xl p-4 text-linkedin-800 dark:text-linkedin-200">
              <Lightbulb className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span><span className="font-semibold">Strategy:</span> {flow.blank_strategy}</span>
            </div>
          )}
          {GROUPED_STEPS.map(({ group, steps }) => {
            // A group with nothing in it is hidden rather than shown empty: an
            // older saved flow legitimately has no chase branch, and a column of
            // blank cards reads as a broken generation.
            const present = steps.filter((s) => flow[s.key]?.trim());
            if (!present.length) return null;
            return (
              <React.Fragment key={group}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-1">{group}</h3>
                {present.map((s, i) => (
                  <Step
                    key={s.key}
                    id={s.key}
                    title={TRACKED_GROUPS.has(group) ? `${i + 1} · ${s.label}` : s.label}
                    timing={(() => {
                      // The pack has always carried the day. Rendering the index
                      // and dropping it told the operator the order of four
                      // touches and never the spacing.
                      const d = dueByKey[s.key];
                      if (!d) return undefined;
                      if (d.sent) return d.sentAt ? `sent ${new Date(d.sentAt).toLocaleDateString()}` : 'sent';
                      if (d.daysUntilDue == null) return typeof s.day === 'number' ? `day ${s.day}` : undefined;
                      if (d.daysUntilDue < 0) return `${-d.daysUntilDue} day${d.daysUntilDue === -1 ? '' : 's'} overdue`;
                      if (d.daysUntilDue === 0) return 'due today';
                      return `in ${d.daysUntilDue} day${d.daysUntilDue === 1 ? '' : 's'}`;
                    })()}
                    text={flow[s.key]}
                    track={TRACKED_GROUPS.has(group)}
                    tone={group === 'If they are interested' ? 'positive' : group === 'Other replies' ? 'objection' : undefined}
                  />
                ))}
              </React.Fragment>
            );
          })}
        </>
      ) : (
        <div className="card-modern p-8 text-center text-gray-400">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-linkedin-300" />
          <p>No flow yet, click <span className="font-semibold">Generate outreach flow</span>.</p>
        </div>
      )}
    </div>
  );
};

// --- Add lead modal ----------------------------------------------------------

const AddLeadModal: React.FC<{ onClose: () => void; onAdd: (lead: Partial<Lead>) => Promise<{ error?: string }> }> = ({ onClose, onAdd }) => {
  const [form, setForm] = useState<Partial<Lead>>({ status: 'new' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof Lead, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.linkedin_url?.trim()) { setError('Name and LinkedIn URL are required.'); return; }
    setSaving(true);
    const { error: err } = await onAdd(form);
    setSaving(false);
    if (err) setError(err); else onClose();
  };

  const field = (k: keyof Lead, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <input type={type} value={(form[k] as string) ?? ''} onChange={(e) => set(k, e.target.value)} className="input-modern" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add lead</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Name *</label><input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} className="input-modern" /></div>
            {field('job_title', 'Job title')}
          </div>
          <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">LinkedIn URL *</label><input type="url" value={form.linkedin_url ?? ''} onChange={(e) => set('linkedin_url', e.target.value)} className="input-modern" /></div>
          <div className="grid grid-cols-2 gap-4">
            {field('company_name', 'Company')}
            {field('industry', 'Industry')}
          </div>
          {field('company_website', 'Company website', 'url')}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Services you could offer them</label>
            <textarea value={form.potential_services ?? ''} onChange={(e) => set('potential_services', e.target.value)} rows={2} className="input-modern resize-none" />
          </div>
          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
          <button type="submit" disabled={saving} className="w-full px-6 py-3 rounded-xl font-semibold text-white bg-linkedin-600 hover:bg-linkedin-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Add lead'}
          </button>
        </form>
      </div>
    </div>
  );
};
