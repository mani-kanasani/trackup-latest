import React, { useMemo, useState } from 'react';
import { Send, ExternalLink, Copy, FileText, Video, BarChart3, DollarSign, Briefcase, AlertTriangle, CheckCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { GenerateResponse, JobLevel, CompensationType, JobStatus } from '../types';
import { supabase } from '../lib/supabase';
import { loadAIConfig } from '../lib/aiConfig';
import { loadUserContext, senderAbout } from '../lib/userContext';
import { buildChannelPrompt, checkAgainstMethod } from '../lib/method/forChannel';
import { useVerticalBrief } from '../lib/vertical/useVerticalBrief';
import { useVerticalMode } from '../lib/vertical/useVerticalMode';
import type { IndustryEvidence } from '../lib/vertical/types';
import { VerticalToggle } from '../components/UI/VerticalToggle';
import { useCaseStudies } from '../lib/proof';
import { QualifyPanel } from '../components/Qualify/QualifyPanel';
import { qualify, isBlocked } from '../lib/qualify/score';
import { isStaleDeployment, outOfDateMessage } from '../lib/deployment';
import type { QualificationInput } from '../lib/qualify/types';

/**
 * The pack steps that compose the message actually pasted into the marketplace.
 *
 * The rest of the pack — the supporting assets and the reply branches — are
 * still generated and still graded, they just are not part of the letter. The
 * function assembles the letter from these, in this order.
 */
const LETTER_KEYS = ['hook', 'diagnosis', 'demonstration', 'proof', 'roiFrame', 'scopeAndPrice', 'close'];

export const Apply: React.FC = () => {
  const { addMaterial } = useData();
  const { cases, loadError: vaultError } = useCaseStudies();
  const [jobTitle, setJobTitle] = useState('');
  const [jobSummary, setJobSummary] = useState('');
  const [jobLevel, setJobLevel] = useState<JobLevel>('intermediate');
  const [compensationType, setCompensationType] = useState<CompensationType>('fixed_price');
  const [proposedAmount, setProposedAmount] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [loading, setLoading] = useState(false);
  /** Which save is in flight, so only the button that was pressed spins. */
  const [savingAs, setSavingAs] = useState<JobStatus | null>(null);
  const [generatedData, setGeneratedData] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState('');

  // --- the method engine and the screen --------------------------------------
  const [qual, setQual] = useState<QualificationInput | null>(null);
  const [override, setOverride] = useState(false);
  const verdict = useMemo(() => qualify(qual ?? {}), [qual]);
  const declined = isBlocked(verdict);
  const { loaded: brief, loading: briefLoading, loadError: briefError } = useVerticalBrief();
  // Upwork defaults to generic: most jobs are not vertical work. The control is
  // still here because a vertical Upwork job is a real case, and a switch that
  // exists on two apps out of three reads as a missing feature.
  const { mode, setMode } = useVerticalMode('upwork');
  const [sentEvidence, setSentEvidence] = useState<IndustryEvidence[]>([]);
  // Derived, not latched. Same reason as the LinkedIn app: a check that fires
  // once and disappears has nothing to say about the letter you actually send.
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
    () => (generatedData?.steps ? checkAgainstMethod('upwork', generatedData.steps, evidenceToGrade) : null),
    [generatedData, evidenceToGrade],
  );
  const describeViolation = (v: NonNullable<typeof check>['violations'][number]) =>
    `${v.message}${v.excerpt ? `, "${v.excerpt}"` : ''}`;
  const warnings = (check?.violations ?? []).filter((v) => v.level === 'hard').map(describeViolation);
  const softNotes = (check?.violations ?? []).filter((v) => v.level === 'soft').map(describeViolation);
  const [proofUsed, setProofUsed] = useState<string | null>(null);
  const [noProof, setNoProof] = useState(false);

  const handleGenerate = async () => {
    if (!jobTitle.trim() || !jobSummary.trim()) {
      setError('Please fill in both job title and summary');
      return;
    }

    const aiConfig = loadAIConfig();
    if (!aiConfig) {
      setError('Add your AI provider and API key in Settings before generating.');
      return;
    }
    // A vault that could not be READ is not an empty vault. See LinkedInApp.
    if (vaultError) {
      setError(
        `Your case studies could not be loaded, so this would be written as if you had none: ${vaultError}. ` +
          'Reload, or check the connection in Settings.',
      );
      return;
    }

    setLoading(true);
    setError('');
    setProofUsed(null);
    setNoProof(false);

    // Match one case study to THIS job rather than sending the whole vault, and
    // carry the screen's verdict so the copy knows what job it has to do and
    // what it is allowed to claim about them.
    const method = buildChannelPrompt('upwork', {
      cases,
      vaultUnavailable: Boolean(vaultError),
      target: { notes: `${jobTitle}\n\n${jobSummary}` },
      qualification: verdict,
      brief,
      verticalMode: mode,
    });
    setSentEvidence(method.evidence);
    setProofUsed(method.chosen ? method.chosen.caseStudy.title : null);
    setNoProof(method.proofEmpty);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<GenerateResponse>(
        'generate-proposal',
        {
          body: {
            job_title: jobTitle,
            job_summary: jobSummary,
            // Only who they are. Proof comes from the vault, through the system
            // prompt, where the naming rule and the do-not-round framing apply.
            context: senderAbout(loadUserContext()),
            systemPrompt: method.systemPrompt,
            // The output contract, straight from the pack.
            steps: method.steps,
            letterKeys: LETTER_KEYS,
            provider: aiConfig.provider,
            model: aiConfig.model,
            apiKey: aiConfig.apiKey,
          },
        }
      );

      if (fnError) {
        // Our function returns { error } as JSON on failure — surface that message.
        let message = fnError.message;
        const context = (fnError as { context?: Response }).context;
        if (context && typeof context.json === 'function') {
          const body = await context.json().catch(() => null);
          if (body?.error) message = body.error;
        }
        throw new Error(message);
      }

      if (!data) {
        throw new Error('No response from the proposal generator.');
      }
      // Old deployment. Without this the letter arrives assembled from steps
      // that were never returned, which renders as an empty textarea and looks
      // like the app simply did nothing.
      if (isStaleDeployment(data)) {
        throw new Error(outOfDateMessage(data));
      }
      if (!data.cover_letter?.trim()) {
        throw new Error(
          'The generator returned an empty proposal. Nothing was written, so there is nothing to save. ' +
            'Check Test this key in Settings, then try again.',
        );
      }

      setGeneratedData(data);
    } catch (err) {
      console.error('Generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate proposal';
      setError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save it, and say whether it went out.
   *
   * Everything used to save as a draft and nothing else, so recording that a
   * proposal was actually submitted meant leaving this page for the tracker and
   * finding the row. That is three interactions and a screen change at the exact
   * moment the member is mid-send, which is why the Upwork numbers were the
   * emptiest of the three channels. `applied` is stamped with a date by the
   * database, so this is also the only thing that puts Upwork on the receipt.
   */
  const handleSaveMaterials = async (status: JobStatus = 'drafted') => {
    if (!generatedData) return;

    setLoading(true);
    setSavingAs(status);
    setError('');

    const result = await addMaterial({
      title: jobTitle,
      summary: jobSummary,
      cover_letter: generatedData.cover_letter,
      proposal_document: generatedData.proposal_url,
      proposal_path: generatedData.proposal_path,
      mermaid_code: generatedData.mermaid_code,
      video_script: generatedData.video_script,
      status,
      job_level: jobLevel,
      compensation_type: compensationType,
      proposed_amount: proposedAmount ? parseFloat(proposedAmount) : undefined,
      actual_amount: actualAmount ? parseFloat(actualAmount) : undefined
    });

    setLoading(false);
    setSavingAs(null);

    if (!result.success) {
      setError(result.error || 'Failed to save materials');
      return;
    }

    // Reset form
    setJobTitle('');
    setJobSummary('');
    setJobLevel('intermediate');
    setCompensationType('fixed_price');
    setProposedAmount('');
    setActualAmount('');
    setGeneratedData(null);
    // The screen was answered about the job just saved. Carrying those answers
    // onto the next one would silently qualify a job nobody looked at.
    setQual(null);
    setOverride(false);
    setProofUsed(null);
    setNoProof(false);

    // Show success message
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50 transition-opacity duration-200';
    toast.textContent =
      status === 'applied'
        ? 'Saved and counted on today\u2019s numbers.'
        : 'Saved as a draft. It counts once you mark it applied.';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 200);
    }, 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg z-50 transition-opacity duration-200';
      toast.textContent = 'Copied to clipboard!';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 200);
      }, 2000);
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Job Input Card */}
      <div className="card-modern p-8 animate-rise">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-upwork-400 to-upwork-600 flex items-center justify-center shadow-lg shadow-upwork-500/25 mr-3">
            <Send className="w-4 h-4 text-white" />
          </div>
          Job Details
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-8">
          Paste the Upwork job details and generate your first draft materials.
        </p>

        <div className="space-y-6">
          <div>
            <label htmlFor="jobTitle" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Job Title
            </label>
            <input
              id="jobTitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="input-modern"
              placeholder="Enter the job title from Upwork"
            />
          </div>

          <div>
            <label htmlFor="jobSummary" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Job Summary
            </label>
            <textarea
              id="jobSummary"
              value={jobSummary}
              onChange={(e) => setJobSummary(e.target.value)}
              rows={6}
              className="input-modern resize-none"
              placeholder="Paste the complete job description and requirements"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="jobLevel" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Job Level
              </label>
              <select
                id="jobLevel"
                value={jobLevel}
                onChange={(e) => setJobLevel(e.target.value as JobLevel)}
                className="input-modern"
              >
                <option value="entry">Entry Level</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div>
              <label htmlFor="compensationType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Compensation Type
              </label>
              <select
                id="compensationType"
                value={compensationType}
                onChange={(e) => setCompensationType(e.target.value as CompensationType)}
                className="input-modern"
              >
                <option value="fixed_price">Fixed Price</option>
                <option value="hourly">Hourly Rate</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="proposedAmount" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-upwork-500" />
                Proposed Amount
              </label>
              <input
                id="proposedAmount"
                type="number"
                step="0.01"
                min="0"
                value={proposedAmount}
                onChange={(e) => setProposedAmount(e.target.value)}
                className="input-modern"
                placeholder={compensationType === 'hourly' ? 'Rate per hour' : 'Total project amount'}
              />
            </div>

            <div>
              <label htmlFor="actualAmount" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <Briefcase className="w-4 h-4 mr-2 text-upwork-500" />
                Actual Amount
              </label>
              <input
                id="actualAmount"
                type="number"
                step="0.01"
                min="0"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                className="input-modern"
                placeholder={compensationType === 'hourly' ? 'Final rate per hour' : 'Final project amount'}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <VerticalToggle
            mode={mode}
            onChange={setMode}
            vertical={brief?.brief.vertical}
            loading={briefLoading}
            unavailable={Boolean(briefError)}
          />

          <button
            onClick={handleGenerate}
            disabled={loading || !jobTitle.trim() || !jobSummary.trim() || (declined && !override)}
            title={declined && !override ? 'The qualification screen declined this job.' : undefined}
            className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Generating...' : 'Generate Proposal'}
          </button>

          {/* A declined job is blocked rather than warned about. Applying costs
              connects and an hour; declining is the cheapest instrument here. */}
          {declined && (
            <div className="text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
              <p className="font-semibold text-red-800 dark:text-red-300 mb-1 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                The screen says not to apply for this one
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
                  I disagree, write it anyway
                </button>
              )}
            </div>
          )}

          {noProof && !proofUsed && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No case studies yet, so this will be written from your background alone and will claim no
              results. Add one in Settings and Ember will cite a matched, real outcome.
            </p>
          )}

          {proofUsed && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Proof used: <span className="font-medium text-gray-700 dark:text-gray-300">{proofUsed}</span>
            </p>
          )}

          {warnings.length > 0 && (
            <div className="text-sm bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                {warnings.length} thing{warnings.length === 1 ? '' : 's'} to fix before you send
              </p>
              <ul className="list-disc pl-5 space-y-1 text-amber-700 dark:text-amber-300">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {softNotes.length > 0 && (
            <div className="text-sm bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {softNotes.length} thing{softNotes.length === 1 ? '' : 's'} worth a look, your call
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
                {softNotes.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* The screen sits between the job and the generation, which is where the
          decision actually is: whether this job is worth an application at all. */}
      <QualifyPanel
        value={qual}
        onChange={(update) => { setOverride(false); setQual((prev) => update(prev ?? {})); }}
      />

      {/* Outputs Card */}
      {generatedData && (
        <div className="card-modern p-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-upwork-400 to-upwork-600 flex items-center justify-center shadow-lg shadow-upwork-500/25 mr-3">
                <FileText className="w-4 h-4 text-white" />
              </div>
              Generated Materials
            </h2>
            {/* Two saves, because there are two things that can have happened
                and only one of them is worth counting. Marking it applied is
                the primary action: it is what the member has usually just
                done, and the numbers depend on it being the easy click. */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSaveMaterials('drafted')}
                disabled={loading}
                className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-5 h-5 mr-2" />
                {savingAs === 'drafted' ? 'Saving...' : 'Save as draft'}
              </button>
              <button
                onClick={() => handleSaveMaterials('applied')}
                disabled={loading}
                title="Records it as submitted today, which is what puts it on your daily numbers."
                className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {savingAs === 'applied' ? 'Saving...' : 'Save and mark applied'}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Cover Letter */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-3 h-3 text-upwork-600 dark:text-upwork-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Cover Letter</h3>
                </div>
                {/* The one thing on this screen that gets pasted somewhere else,
                    and it was the only panel with no way to copy it. */}
                <button
                  onClick={() => copyToClipboard(generatedData.cover_letter)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-upwork-600 dark:text-upwork-400 hover:text-upwork-700 bg-upwork-50 dark:bg-upwork-900/20 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </button>
              </div>
              <textarea
                value={generatedData.cover_letter}
                onChange={(e) => setGeneratedData(prev => prev ? { ...prev, cover_letter: e.target.value } : null)}
                rows={8}
                className="input-modern text-sm resize-none"
              />
              {/* The letter is assembled from the pack's steps, and the check
                  grades the steps. Editing here changes what you send but not
                  what was graded, so say so rather than letting a cleared
                  warning look like a fixed one. */}
              {check && warnings.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The checks below were run on the generated text. Edits here are not re-checked.
                </p>
              )}
            </div>

            {/* Workflow diagram source.

                There is no renderer here and there deliberately isn't one: the
                library is ~500KB and the diagram never appears in the PDF the
                buyer receives. What was here before was a button labelled "Show
                Preview" that revealed the sentence "Mermaid diagram preview
                would be rendered here", a promise the app could not keep. The
                source is a real deliverable to paste into a doc tool, so it is
                labelled as exactly that. */}
            {generatedData.mermaid_code && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-3 h-3 text-upwork-600 dark:text-upwork-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Workflow diagram source</h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedData.mermaid_code)}
                    className="flex items-center px-3 py-2 text-sm text-upwork-600 dark:text-upwork-400 hover:text-upwork-700 dark:hover:text-upwork-300 bg-upwork-50 dark:bg-upwork-900/20 rounded-lg transition-all duration-200 font-medium"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </button>
                </div>
                <textarea
                  value={generatedData.mermaid_code}
                  readOnly
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono resize-none focus:ring-2 focus:ring-upwork-500 focus:border-upwork-500 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Mermaid source. Paste it into Notion, GitHub, or mermaid.live to render it. It is not
                  in the PDF above.
                </p>
              </div>
            )}

            {/* Proposal Document */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                  <ExternalLink className="w-3 h-3 text-upwork-600 dark:text-upwork-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Proposal Document</h3>
              </div>
              <a
                href={generatedData.proposal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-6 py-8 border-2 border-dashed border-upwork-300 dark:border-upwork-600 rounded-xl hover:border-upwork-500 dark:hover:border-upwork-400 transition-all duration-300 text-upwork-600 dark:text-upwork-400 hover:text-upwork-700 dark:hover:text-upwork-300 bg-upwork-50/50 dark:bg-upwork-900/10 hover:bg-upwork-100 dark:hover:bg-upwork-900/20 font-medium"
              >
                <ExternalLink className="w-6 h-6 mr-3" />
                Open Proposal Document
              </a>
            </div>

            {/* Video Script */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-upwork-100 dark:bg-upwork-900/30 rounded-lg flex items-center justify-center">
                    <Video className="w-3 h-3 text-upwork-600 dark:text-upwork-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Video Script</h3>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedData.video_script)}
                  className="flex items-center px-3 py-2 text-sm text-upwork-600 dark:text-upwork-400 hover:text-upwork-700 dark:hover:text-upwork-300 bg-upwork-50 dark:bg-upwork-900/20 rounded-lg transition-all duration-200 font-medium"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </button>
              </div>
              <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600">
                <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                  {generatedData.video_script}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};