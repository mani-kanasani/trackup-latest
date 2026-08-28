import React, { useState } from 'react';
import { Compass, Copy, Check, ListPlus } from 'lucide-react';
import { STARTER_VERTICALS, templateCsv, type StarterVertical } from '../../lib/starter/verticals';

/**
 * Getting a member from no list to a real list.
 *
 * The stall this removes is not effort, it is not knowing what to type into a
 * search box. Every string here is copy-ready and every source is a public
 * directory, so a member builds a list of real businesses they have themselves
 * looked at, rather than being handed contacts somebody invented for them.
 *
 * `onUseTemplate` hands the CSV straight to the existing importer, which is the
 * one action the brief asks for: the member checks their columns land correctly
 * on two rows that cannot be sent anywhere before pasting fifty real ones.
 */
export const StarterList: React.FC<{
  onUseTemplate?: (csv: string) => void;
}> = ({ onUseTemplate }) => {
  const [id, setId] = useState<string>(STARTER_VERTICALS[0].id);
  const [copied, setCopied] = useState<string | null>(null);
  const v: StarterVertical = STARTER_VERTICALS.find((x) => x.id === id) ?? STARTER_VERTICALS[0];

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard refused. The text is on screen and selectable, which is the
      // fallback everywhere else in the app too.
    }
  };

  return (
    <div className="card-modern p-6">
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-linkedin-400 to-linkedin-600 flex items-center justify-center shadow-lg shadow-linkedin-500/25">
          <Compass className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Build your first list</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Twenty minutes to enough prospects for your first week.
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 mb-4">
        No contacts are bundled with Ember, on purpose. A list somebody else invented is a list of people
        who never agreed to hear from you, and half of it will not exist. These are the public places your
        buyers are already listed, and the exact searches that find them.
      </p>

      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        Your vertical
      </label>
      <select
        value={id}
        onChange={(e) => setId(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-ember-400"
      >
        {STARTER_VERTICALS.map((x) => (
          <option key={x.id} value={x.id}>{x.label}</option>
        ))}
      </select>

      <div className="mt-5">
        <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">Where they are listed</h4>
        <ul className="space-y-1">
          {v.sources.map((s) => (
            <li key={s} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
              <span className="text-ember-500 flex-none">·</span>{s}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">
          Paste these in, one at a time
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Replace anything in angle brackets with your own city or category first.
        </p>
        {v.searches.map((s) => (
          <div key={s} className="mb-2 flex items-start gap-2">
            <code className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-[12.5px] font-mono text-gray-800 dark:text-gray-200 break-all">
              {s}
            </code>
            <button
              onClick={() => copy(s, s)}
              className="flex-none inline-flex items-center px-2.5 py-2 rounded-lg text-xs font-semibold text-ember-600 hover:text-ember-700"
            >
              {copied === s ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 grid sm:grid-cols-2 gap-4">
        <div>
          <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Capture this per row</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{v.capture}</p>
        </div>
        <div>
          <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Your opening observation</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{v.angle}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {onUseTemplate && (
          <button
            onClick={() => onUseTemplate(templateCsv(v))}
            className="btn-primary inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold"
          >
            <ListPlus className="w-4 h-4 mr-2" />
            Load the template into the importer
          </button>
        )}
        <button
          onClick={() => copy(templateCsv(v), 'csv')}
          className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
        >
          {copied === 'csv' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          Copy the spreadsheet header
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        The two rows in the template are examples on example.com, a domain reserved so that test data can
        never reach a real inbox. Import them first to check your columns landed in the right places, then
        delete them and paste your own.
      </p>
    </div>
  );
};
