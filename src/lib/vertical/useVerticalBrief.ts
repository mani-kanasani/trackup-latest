import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { IndustryEvidence, LoadedBrief, VerticalBrief } from './types';

export interface MutationResult {
  error?: string;
}

/**
 * The member's active vertical brief and its evidence.
 *
 * Returns `null` for the brief when there genuinely is not one, and sets
 * `loadError` when the read failed. Those are different states and the caller
 * must be able to tell them apart: a failed read rendered as "no brief" sends a
 * generation with no vertical context and no warning, which looks like the
 * toggle silently not working.
 */
export const useVerticalBrief = () => {
  const { user } = useAuth();
  const [brief, setBrief] = useState<VerticalBrief | null>(null);
  const [evidence, setEvidence] = useState<IndustryEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchBrief = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('vertical_briefs')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching vertical brief:', error);
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    setLoadError(null);
    const raw = (data as VerticalBrief | null) ?? null;
    const row = raw
      ? { ...raw, failure_scenarios: Array.isArray(raw.failure_scenarios) ? raw.failure_scenarios : [] }
      : null;
    setBrief(row);

    if (!row) {
      setEvidence([]);
      setLoading(false);
      return;
    }

    const { data: ev, error: evErr } = await supabase
      .from('industry_evidence')
      .select('*')
      .eq('brief_id', row.id)
      .order('scope', { ascending: true })
      .order('created_at', { ascending: true });

    if (evErr) {
      console.error('Error fetching industry evidence:', evErr);
      // The brief loaded but its evidence did not. Surfacing this matters more
      // than it looks: without evidence the attribution law has nothing to
      // check, so copy could carry a borrowed figure and pass clean.
      setLoadError(evErr.message);
    } else {
      setEvidence((ev as IndustryEvidence[]) ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  const saveBrief = async (patch: Partial<VerticalBrief>): Promise<MutationResult> => {
    if (!user) return { error: 'You must be signed in.' };

    if (brief) {
      const { error } = await supabase.from('vertical_briefs').update(patch).eq('id', brief.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from('vertical_briefs').insert({
        ...patch,
        user_id: user.id,
        label: patch.label || patch.vertical || 'My vertical',
        vertical: patch.vertical || '',
        active: true,
      });
      if (error) return { error: error.message };
    }
    await fetchBrief();
    return {};
  };

  const addEvidence = async (patch: Partial<IndustryEvidence>): Promise<MutationResult> => {
    if (!user) return { error: 'You must be signed in.' };
    if (!brief) return { error: 'Create the brief before adding evidence to it.' };
    // Mirrors the NOT NULL column. Checked here too so the person gets a
    // sentence rather than a Postgres constraint error.
    if (!patch.source_name?.trim()) {
      return { error: 'Every borrowed figure needs a source. That is what stops it being passed off as yours.' };
    }
    const { error } = await supabase
      .from('industry_evidence')
      .insert({ ...patch, user_id: user.id, brief_id: brief.id });
    if (error) return { error: error.message };
    await fetchBrief();
    return {};
  };

  const updateEvidence = async (id: string, patch: Partial<IndustryEvidence>): Promise<MutationResult> => {
    if (patch.source_name !== undefined && !patch.source_name?.trim()) {
      return { error: 'A borrowed figure cannot have its source removed.' };
    }
    const { error } = await supabase.from('industry_evidence').update(patch).eq('id', id);
    if (error) return { error: error.message };
    await fetchBrief();
    return {};
  };

  const deleteEvidence = async (id: string): Promise<MutationResult> => {
    const { error } = await supabase.from('industry_evidence').delete().eq('id', id);
    if (error) return { error: error.message };
    await fetchBrief();
    return {};
  };

  /**
   * Exactly what the generators want, or null when there is nothing safe to send.
   *
   * Null on ANY load error, including one where the brief itself arrived and
   * only its evidence failed. That partial state is the dangerous one: the
   * generation would carry the vertical section while the evidence list was
   * empty, so the attribution check would have nothing to enforce against and a
   * borrowed figure could go out uncited and pass clean. The UI already says a
   * failed load falls back to generic; this makes that true rather than a claim.
   *
   * Also null when the vertical is blank. A row can exist with an empty string,
   * and injecting a section headed by nothing helps no one.
   */
  const loaded: LoadedBrief | null =
    brief && !loadError && brief.vertical?.trim() ? { brief, evidence } : null;

  return {
    brief,
    evidence,
    loaded,
    loading,
    loadError,
    fetchBrief,
    saveBrief,
    addEvidence,
    updateEvidence,
    deleteEvidence,
  };
};
