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
      const [l, p] = await Promise.all([
        supabase.from('leads').select('*').eq('user_id', user.id),
        supabase.from('prospects').select('*').eq('user_id', user.id),
      ]);
      if (!active) return;
      if (l.error || p.error) {
        setLoadError((l.error ?? p.error)?.message ?? 'Could not read your activity.');
      } else {
        setLoadError(null);
        setLeads((l.data as Lead[]) ?? []);
        setProspects((p.data as Prospect[]) ?? []);
      }
      setLoading(false);
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
