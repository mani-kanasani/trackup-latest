// Seven questions, one at a time.
//
// One at a time is the whole design. A list of seven is scanned and dismissed;
// a single question with nothing else on screen gets answered. Most people say
// no to the first three and yes to something further down that they had never
// thought to count as proof.
//
// "No" is a first-class answer here, not a failure — it advances. Getting to the
// end having said no seven times is a real outcome with its own screen, and that
// screen is the fallback rather than an apology.

import React, { useState } from 'react';
import { ArrowRight, Check, Lightbulb, X } from 'lucide-react';
import { INTERVIEW, CAPTURE_FIELDS, SPECIFICITY, FALLBACK, draftFromAnswer } from '../../lib/proof/interview';
import type { CaseStudy } from '../../lib/proof/types';

export const ProofInterview: React.FC<{
  /** Called with a seeded draft when the user says yes and names something. */
  onFound: (draft: Partial<CaseStudy>) => void;
  onClose: () => void;
}> = ({ onFound, onClose }) => {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [saidNo, setSaidNo] = useState(0);

  const done = index >= INTERVIEW.length;
  const q = done ? null : INTERVIEW[index];

  const next = () => {
    setAnswer('');
    setIndex((i) => i + 1);
  };

  const skip = () => {
    setSaidNo((n) => n + 1);
    next();
  };

  const take = () => {
    if (!q || !answer.trim()) return;
    onFound(draftFromAnswer(q, answer));
  };

  return (
    <div className="border border-ember-200 dark:border-ember-800 bg-ember-50/50 dark:bg-ember-900/10 rounded-xl p-5 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Lightbulb className="w-4 h-4 text-ember-600 dark:text-ember-400 flex-shrink-0" />
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {done ? 'That is all seven' : `Finding your proof, ${index + 1} of ${INTERVIEW.length}`}
          </h4>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {q ? (
        <>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{q.question}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{q.because}</p>

          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') take();
            }}
            placeholder="Name it here, or skip if there is nothing"
            className="input-modern !py-2 text-sm mb-3"
            autoFocus
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={take}
              disabled={!answer.trim()}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-ember-600 hover:bg-ember-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" /> Yes, write this one up
            </button>
            <button
              onClick={skip}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800"
            >
              Nothing here <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>
          </div>

          {index === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Most people answer no to the first few and yes to one further down. That is the point of
              asking them separately.
            </p>
          )}
        </>
      ) : (
        <>
          {saidNo >= INTERVIEW.length ? (
            <>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{FALLBACK.heading}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{FALLBACK.body}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">{FALLBACK.warning}</p>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Go back through any of them whenever something surfaces. Proof tends to arrive days after
              the question does.
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Capture before writing</p>
              <ul className="list-disc pl-4 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                {CAPTURE_FIELDS.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Strongest to weakest</p>
              <ol className="list-decimal pl-4 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                {SPECIFICITY.map((f) => <li key={f}>{f}</li>)}
              </ol>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onFound({})}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-ember-600 hover:bg-ember-700"
            >
              Write one up now
            </button>
            <button
              onClick={() => { setIndex(0); setSaidNo(0); }}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800"
            >
              Start over
            </button>
          </div>
        </>
      )}
    </div>
  );
};
