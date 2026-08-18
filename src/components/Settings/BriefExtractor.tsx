import React, { useState } from 'react';
import { Wand2, Loader2, Check, X, AlertTriangle, FolderOpen, Paperclip } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { loadAIConfig } from '../../lib/aiConfig';
import { isStaleDeployment, outOfDateMessage } from '../../lib/deployment';
import { extractTextFromFile } from '../../lib/vertical/fileText';
import {
  reviewExtraction,
  EXTRACTION_SYSTEM,
  EXTRACTION_KEYS,
  type ExtractedBrief,
  type ReviewedBrief,
} from '../../lib/vertical/extract';

/**
 * Paste a growth sheet, get a brief.
 *
 * Nothing here saves on its own. The model reads the document, the client
 * reconciles every citation against that same document, and the person sees
 * what survived and what did not before anything is stored. An extractor that
 * wrote straight to the database would be the fastest possible way to fill the
 * evidence table with confident inventions.
 */
export const BriefExtractor: React.FC<{
  /** The review, plus the exact text it was derived from. */
  onApply: (reviewed: ReviewedBrief, document: string) => void;
}> = ({ onApply }) => {
  const [doc, setDoc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState<ReviewedBrief | null>(null);
  const [reading, setReading] = useState(false);
  const [fileNote, setFileNote] = useState('');

  /**
   * Reads the file into the box rather than straight into the extractor.
   *
   * PDF extraction reorders tables. Extracting the blueprint this was built
   * against split the failure-scenario rows from their solutions, and a model
   * handed that silently would pair the wrong problem with the wrong fix. The
   * text is put in front of the person first, every time.
   */
  const onFile = async (file: File | null) => {
    if (!file) return;
    setReading(true);
    setError('');
    setFileNote('');
    try {
      const out = await extractTextFromFile(file);
      setDoc(out.text);
      const pages = out.pages ? `${out.pages} page${out.pages === 1 ? '' : 's'}, ` : '';
      setFileNote(
        `Read ${file.name}: ${pages}${out.text.length.toLocaleString()} characters.` +
          (out.warning ? ` ${out.warning}` : ' Check it below before building.'),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.');
    } finally {
      setReading(false);
    }
  };

  const build = async () => {
    const config = loadAIConfig();
    if (!config) {
      setError('Add an AI key in Settings first. This uses your own key, once.');
      return;
    }
    if (doc.trim().length < 200) {
      setError('Paste the whole document. A couple of lines is not enough to build a brief from.');
      return;
    }

    setBusy(true);
    setError('');
    setReviewed(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('extract-brief', {
        body: {
          provider: config.provider,
          apiKey: config.apiKey,
          model: config.model,
          document: doc,
          // The instruction travels with the request for the same reason the
          // generators send their steps: the rules the model is given and the
          // rules enforced here must not drift apart.
          system: EXTRACTION_SYSTEM,
          keys: [...EXTRACTION_KEYS],
        },
      });
      if (fnError) {
        // supabase-js turns any non-2xx into a FunctionsHttpError whose message
        // is the useless "Edge Function returned a non-2xx status code", and
        // puts the real body behind `context`. Every actionable message the
        // function produces ("that is too short", "choose a model first") lives
        // in that body, so throwing the error as-is loses all of them.
        const ctx = (fnError as { context?: Response }).context;
        let detail: string | null = null;
        if (ctx?.json) {
          const body = await ctx.json().catch(() => null);
          if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') {
            detail = (body as { error: string }).error;
          }
        }
        throw new Error(detail ?? (fnError as Error).message);
      }
      if (isStaleDeployment(data)) throw new Error(outOfDateMessage(data));

      const payload = (data as { brief?: ExtractedBrief; error?: string } | null) ?? null;
      if (payload?.error) throw new Error(payload.error);
      if (!payload?.brief) throw new Error('The function returned nothing usable.');

      setReviewed(reviewExtraction(payload.brief, doc));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the brief.');
    } finally {
      setBusy(false);
    }
  };

  const kept = reviewed?.evidence.filter((e) => e.ok) ?? [];
  const rejected = reviewed?.evidence.filter((e) => !e.ok) ?? [];
  const firstParty = reviewed?.first_party_claims ?? [];
  const unsourced = reviewed?.unsourced_claims ?? [];

  return (
    <div className="mb-8 p-5 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
      <div className="flex items-center mb-2">
        <Wand2 className="w-4 h-4 mr-2 text-ember-500" />
        <h4 className="font-bold text-gray-900 dark:text-white">Build it from your growth sheet</h4>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Paste the document and this fills the fields below once, using your own AI key. It runs a single
        time, not on every generation, so the outreach prompt stays small.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="inline-flex items-center px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:border-ember-400">
          {reading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4 mr-2" />
          )}
          {reading ? 'Reading...' : 'Upload a file'}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.md,.markdown,.csv,application/pdf,text/plain"
            onChange={(e) => {
              onFile(e.target.files?.[0] ?? null);
              // Cleared so picking the same file twice still fires a change.
              e.target.value = '';
            }}
          />
        </label>
        <span className="text-xs text-gray-400">PDF, Word .docx, or plain text. Or paste below.</span>
      </div>

      {fileNote && (
        <div className="mb-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 text-xs text-blue-800 dark:text-blue-300">
          {fileNote}
        </div>
      )}

      <textarea
        rows={5}
        value={doc}
        onChange={(e) => setDoc(e.target.value)}
        placeholder="Paste your growth sheet, landing page copy, or prototype notes here..."
        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-ember-400"
      />

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={build}
          disabled={busy}
          className="btn-primary inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
          {busy ? 'Reading it...' : 'Build my brief'}
        </button>
        {doc.trim() && (
          <span className="text-xs text-gray-400">{doc.trim().length.toLocaleString()} characters</span>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {reviewed && (
        <div className="mt-5 space-y-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Read it. <span className="font-semibold">{kept.length}</span> citation
            {kept.length === 1 ? '' : 's'} checked out against your document
            {rejected.length > 0 && (
              <>
                , <span className="font-semibold text-amber-700 dark:text-amber-400">{rejected.length}</span> did
                not
              </>
            )}
            .
          </div>

          {kept.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Verified against your document
              </p>
              {kept.map((e, i) => (
                <div key={i} className="mb-1.5 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/15 flex gap-2">
                  <Check className="w-4 h-4 flex-none mt-0.5 text-green-600 dark:text-green-400" />
                  <p className="text-xs text-gray-800 dark:text-gray-200">
                    {e.claim}
                    <span className="block text-gray-500 dark:text-gray-400 mt-0.5">
                      {e.metric ? `${e.metric} · ` : ''}
                      {e.source_name}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {rejected.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-2">
                Held back
              </p>
              {rejected.map((e, i) => (
                <div key={i} className="mb-1.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/15 flex gap-2">
                  <X className="w-4 h-4 flex-none mt-0.5 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs text-gray-800 dark:text-gray-200">
                    {e.claim}
                    {e.metric ? ` (${e.metric})` : ''}
                    <span className="block text-amber-700 dark:text-amber-400 mt-0.5">{e.note}</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {firstParty.length > 0 && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/15">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300 mb-1.5 flex items-center">
                <FolderOpen className="w-3.5 h-3.5 mr-1.5" /> These read as your own results
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                They are not stored here. Your own delivered results belong in Case studies, where they are
                presented as yours and can carry a client name.
              </p>
              <ul className="text-xs text-gray-700 dark:text-gray-300 list-disc ml-4 space-y-0.5">
                {firstParty.map((c, i) => (
                  <li key={i}>
                    {c.claim}
                    {c.metric ? ` (${c.metric})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {unsourced.length > 0 && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5 flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Figures with nobody attached
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Not stored. Find who published each one and add it by hand, or leave it out of your outreach.
              </p>
              <ul className="text-xs text-gray-700 dark:text-gray-300 list-disc ml-4 space-y-0.5">
                {unsourced.map((c, i) => (
                  <li key={i}>
                    {c.claim}
                    {c.metric ? ` (${c.metric})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => onApply(reviewed, doc)}
              className="btn-primary inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold"
            >
              <Check className="w-4 h-4 mr-2" />
              Fill the fields below
            </button>
            <button
              onClick={() => setReviewed(null)}
              className="text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              Discard
            </button>
            <span className="text-xs text-gray-400">Nothing is saved until you save the vertical.</span>
          </div>
        </div>
      )}
    </div>
  );
};
