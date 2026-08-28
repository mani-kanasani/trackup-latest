import React, { useMemo } from 'react';
import { CheckCircle2, AlertCircle, HelpCircle, ArrowRight, Loader2 } from 'lucide-react';
import { assessSetup, type SetupItem } from '../../lib/setup/completeness';
import { loadInterviewDone } from '../../lib/setup/interviewRun';
import { loadAIConfig } from '../../lib/aiConfig';
import { loadUserContext } from '../../lib/userContext';
import { useCaseStudies } from '../../lib/proof';
import { useVerticalBrief } from '../../lib/vertical/useVerticalBrief';
import type { IndustryEvidence } from '../../lib/vertical/types';

interface Props {
  /**
   * Compact hides itself entirely when nothing is missing.
   *
   * The home screen is for doing today's work, so a green tick there would be
   * one more thing to read every morning. The full meter in Settings always
   * shows, because that is where someone goes to check they are set up.
   */
  compact?: boolean;
  /** Compact mode only: how to get to Settings, where the fields actually are. */
  onOpenSettings?: () => void;
}

const ICON: Record<SetupItem['state'], typeof CheckCircle2> = {
  done: CheckCircle2,
  missing: AlertCircle,
  unknown: HelpCircle,
};

const TONE: Record<SetupItem['state'], string> = {
  done: 'text-green-600 dark:text-green-400',
  missing: 'text-amber-600 dark:text-amber-400',
  unknown: 'text-gray-400',
};

/** Scrolls to the field rather than to the page. Naming a gap is half the job. */
const goTo = (anchor: string) => {
  const el = document.getElementById(anchor);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const Line: React.FC<{ item: SetupItem; onGo?: (anchor: string) => void }> = ({ item, onGo }) => {
  const Icon = ICON[item.state];
  return (
    <li className="flex items-start gap-3">
      <Icon className={`w-4 h-4 mt-0.5 flex-none ${TONE[item.state]}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {item.label}
          {onGo && item.state !== 'done' && (
            <button
              onClick={() => onGo(item.anchor)}
              className="ml-2 text-xs font-semibold text-ember-600 hover:text-ember-700 dark:text-ember-400 underline underline-offset-2"
            >
              Fix it
            </button>
          )}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{item.detail}</p>
      </div>
    </li>
  );
};

/**
 * What is missing, named exactly, with a link to the field.
 *
 * A researched industry figure with its source counts as proof. That is the one
 * rule this component exists to get right: a member with no client result, who
 * ran the proof interview and entered one sourced statistic, reads as ready and
 * is shown no warnings at all.
 */
export const CompletenessMeter: React.FC<Props> = ({ compact = false, onOpenSettings }) => {
  const { cases, loading: vaultLoading, loadError: vaultError } = useCaseStudies();
  const { brief, evidence, loaded, loading: briefLoading, loadError: briefError } = useVerticalBrief();

  const assessment = useMemo(() => {
    const ctx = loadUserContext();
    /*
      `loaded` is null when the brief cannot be used — no vertical named, or a
      read that partly failed — and that is exactly when its evidence reaches
      no generation. Splitting the two lets the gap be named precisely instead
      of telling someone who did the research that they have nothing.
    */
    const active: IndustryEvidence[] = evidence.filter((e) => e.active);
    const usable = loaded ? loaded.evidence.filter((e) => e.active) : [];
    return assessSetup({
      aiConfigured: Boolean(loadAIConfig()),
      about: ctx.about,
      legacyProof: [ctx.wins, ctx.testimonials].filter(Boolean).join(' '),
      // Both counts use the same predicate the prompt builder uses. Anything
      // looser and the meter reports proof that no generation can find.
      caseCount: cases.filter((c) => c.active).length,
      evidenceCount: usable.length,
      strandedEvidence: loaded ? 0 : active.length,
      interviewDone: loadInterviewDone(),
      hasBrief: Boolean(brief),
      vaultUnknown: Boolean(vaultError),
      briefUnknown: Boolean(briefError),
    });
  }, [cases, evidence, loaded, brief, vaultError, briefError]);

  const loading = vaultLoading || briefLoading;

  // Nothing is said until the reads land. A meter that flashes "add a case
  // study" and then corrects itself is worse than one that waits a beat.
  if (loading) {
    return compact ? null : (
      <div className="card-modern p-8 animate-rise flex items-center text-sm text-gray-500">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking your setup...
      </div>
    );
  }

  if (compact && assessment.ready) return null;

  const heading = assessment.ready
    ? 'You are set up'
    : `${assessment.missingRequired.length} thing${assessment.missingRequired.length === 1 ? '' : 's'} to finish`;

  if (compact) {
    return (
      <div className="card-modern p-6 animate-rise border-l-4 border-l-amber-400">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{heading}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Until these are done, what Ember writes is worse than it needs to be, and it will look like
          the tool rather than the setup.
        </p>
        <ul className="space-y-3">
          {assessment.missingRequired.map((item) => (
            <Line key={item.id} item={item} />
          ))}
        </ul>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="mt-4 inline-flex items-center text-sm font-semibold text-ember-600 hover:text-ember-700 dark:text-ember-400"
          >
            Finish setting up
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card-modern p-8 animate-rise">
      <div className="flex items-center space-x-3 mb-2">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${
            assessment.ready
              ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/25'
              : 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/25'
          }`}
        >
          {assessment.ready ? (
            <CheckCircle2 className="w-4 h-4 text-white" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white" />
          )}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{heading}</h3>
      </div>
      <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
        {assessment.ready
          ? 'Everything Ember needs to write something worth sending is here.'
          : 'Ember leans hard on what you give it. These are the pieces that change whether the output is worth sending.'}
      </p>

      <ul className="space-y-4">
        {assessment.items.map((item) => (
          <Line key={item.id} item={item} onGo={goTo} />
        ))}
      </ul>

      {assessment.suggestions.length > 0 && (
        <>
          <p className="mt-6 mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
            Worth doing, not required
          </p>
          <ul className="space-y-4">
            {assessment.suggestions.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 mt-0.5 flex-none text-gray-400" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.label}
                    <button
                      onClick={() => goTo(item.anchor)}
                      className="ml-2 text-xs font-semibold text-ember-600 hover:text-ember-700 dark:text-ember-400 underline underline-offset-2"
                    >
                      Go there
                    </button>
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
