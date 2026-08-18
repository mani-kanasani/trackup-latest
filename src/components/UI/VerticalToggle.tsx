import React from 'react';
import { Compass, Globe, Loader2 } from 'lucide-react';
import type { VerticalMode } from '../../lib/vertical/types';

/**
 * The vertical / generic switch, shown at the point of generation.
 *
 * Deliberately here rather than only in Settings. This control changes what the
 * model is told, and context that alters output invisibly is what makes people
 * stop trusting a generator. Putting it beside the button means the choice is
 * made knowingly, and the label states what is about to be sent.
 */
export const VerticalToggle: React.FC<{
  mode: VerticalMode;
  onChange: (m: VerticalMode) => void;
  /** The saved vertical, e.g. "Personal injury law". Absent means none exists. */
  vertical?: string | null;
  loading?: boolean;
  /** Set when the brief could not be read, which is not the same as absent. */
  unavailable?: boolean;
}> = ({ mode, onChange, vertical, loading, unavailable }) => {
  if (loading) {
    return (
      <span className="inline-flex items-center text-xs text-gray-400">
        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> checking your vertical
      </span>
    );
  }

  // Nothing to offer. Rendering a dead switch invites people to flip it and
  // conclude the feature is broken.
  if (!vertical && !unavailable) {
    return (
      <span className="text-xs text-gray-400">
        Generic. Add a vertical in Settings to write niche specific outreach.
      </span>
    );
  }

  if (unavailable) {
    return (
      <span className="text-xs text-amber-600 dark:text-amber-400">
        Your vertical could not be loaded, so this will send as generic.
      </span>
    );
  }

  const base =
    'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150';
  const on = 'bg-gradient-to-r from-linkedin-500 to-linkedin-600 text-white shadow-sm';
  const off = 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200';

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex p-0.5 rounded-xl bg-gray-100 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => onChange('vertical')}
          className={`${base} ${mode === 'vertical' ? on : off}`}
          aria-pressed={mode === 'vertical'}
        >
          <Compass className="w-3.5 h-3.5 mr-1.5" />
          Vertical
        </button>
        <button
          type="button"
          onClick={() => onChange('generic')}
          className={`${base} ${mode === 'generic' ? on : off}`}
          aria-pressed={mode === 'generic'}
        >
          <Globe className="w-3.5 h-3.5 mr-1.5" />
          Generic
        </button>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[15rem]">
        {mode === 'vertical'
          ? `Writes for ${vertical}, using your failure scenarios and cited research.`
          : 'Ignores your vertical for this one.'}
      </span>
    </div>
  );
};
