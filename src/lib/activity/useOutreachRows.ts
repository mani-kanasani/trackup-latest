// Leads and prospects, loaded once for the home screen.
//
// Two things on that screen read the same rows: the receipt counts them, and the
// unmarked-drafts prompt writes to them. Fetching twice would mean the prompt
// could mark a message sent and the receipt beside it would still be counting
// the row it fetched before the click — the exact class of "the number on screen
// is not the number in the database" that the receipt exists to avoid.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Lead } from '../../apps/linkedin/types';
import type { Prospect } from '../../apps/coldemail/types';

export interface OutreachRows {
  leads: Lead[];
  prospects: Prospect[];
  loading: boolean;
  /** Set when the read failed. Never treat as an empty account. */
  loadError: string | null;
  patchLead: (id: string, patch: Partial<Lead>) => Promise<{ error?: string }>;
  patchProspect: (id: string, patch: Partial<Prospect>) => Promise<{ error?: string }>;
}

export const useOutreachRows = (): OutreachRows => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) { setLoading(false); return; }
      try {
        const [l, p] = await Promise.all([
          supabase.from('leads').select('*').eq('user_id', user.id),
          supabase.from('prospects').select('*').eq('user_id', user.id),
        ]);
        if (!active) return;
        /*
          Whatever arrived is kept, and the failure is reported alongside it.

          Discarding both halves because one failed turns a partial outage
          into an empty account: somebody who has worked for a month gets an
          empty queue and a clean receipt, which is demoralising and false in
          the same breath. Every screen reading this already checks
          `loadError` before believing a zero.
        */
        const failed = [l.error, p.error].filter(Boolean);
        setLoadError(failed.length ? failed.map((e) => e!.message).join('; ') : null);
        setLeads((l.data as Lead[]) ?? []);
        setProspects((p.data as Prospect[]) ?? []);
      } catch (err) {
        /*
          A REJECTED promise, as opposed to one that resolves carrying an
          error. Without this the line below never runs and the screen sits on
          a spinner forever — the worst of the three outcomes, because it
          looks like the app is still working on it. Analytics carried a
          comment saying it had fixed exactly this; pointing it at this hook
          would have handed the bug straight back to it.
        */
        if (active) setLoadError(err instanceof Error ? err.message : 'Could not reach the database.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  /**
   * Optimistic, and rolled back to the exact prior row on failure.
   *
   * Same shape as the mutation in each channel app, and for the same reason: a
   * refetch on error replaces everything on screen, including whatever else the
   * member had just done.
   */
  const patch = useCallback(
    async <T extends { id: string }>(
      table: 'leads' | 'prospects',
      setRows: React.Dispatch<React.SetStateAction<T[]>>,
      id: string,
      updates: Partial<T>,
    ): Promise<{ error?: string }> => {
      let previous: T | undefined;
      setRows((prev) => {
        previous = prev.find((r) => r.id === id);
        return prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
      });

      const { error } = await supabase
        .from(table)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        if (previous) {
          const restore = previous;
          setRows((prev) => prev.map((r) => (r.id === id ? restore : r)));
        }
        return { error: error.message };
      }
      return {};
    },
    [],
  );

  const patchLead = useCallback(
    (id: string, updates: Partial<Lead>) => patch<Lead>('leads', setLeads, id, updates),
    [patch],
  );
  const patchProspect = useCallback(
    (id: string, updates: Partial<Prospect>) => patch<Prospect>('prospects', setProspects, id, updates),
    [patch],
  );

  return { leads, prospects, loading, loadError, patchLead, patchProspect };
};
