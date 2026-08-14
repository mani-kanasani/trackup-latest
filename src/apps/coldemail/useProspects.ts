import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Prospect } from './types';

export interface MutationResult {
  error?: string;
}

export const useProspects = () => {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchProspects = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      // A failed read must never render as an empty list: someone who sees no
      // prospects will re-import them, and now there are two of everything.
      console.error('Error fetching prospects:', error);
      setLoadError(error.message);
    } else {
      setLoadError(null);
      setProspects((data as Prospect[]) ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const addProspect = async (p: Partial<Prospect>): Promise<MutationResult> => {
    if (!user) return { error: 'You must be signed in.' };
    const { error } = await supabase.from('prospects').insert({ ...p, user_id: user.id });
    if (error) return { error: error.message };
    await fetchProspects();
    return {};
  };

  /**
   * Bulk insert, skipping anything already present.
   *
   * Leans on the (user_id, lower(email)) unique index rather than a client-side
   * check, so two tabs cannot race past it.
   */
  const importProspects = async (
    rows: Partial<Prospect>[],
  ): Promise<{ inserted: number; error?: string }> => {
    if (!user) return { inserted: 0, error: 'You must be signed in.' };
    if (!rows.length) return { inserted: 0 };
    const { data, error } = await supabase
      .from('prospects')
      .upsert(
        rows.map((r) => ({ ...r, user_id: user.id, status: 'new' })),
        { onConflict: 'user_id,email', ignoreDuplicates: true },
      )
      .select('id');
    if (error) return { inserted: 0, error: error.message };
    await fetchProspects();
    return { inserted: data?.length ?? 0 };
  };

  /** Optimistic, rolling back the single row on failure. */
  const updateProspect = async (id: string, updates: Partial<Prospect>): Promise<MutationResult> => {
    let previous: Prospect | undefined;
    setProspects((prev) => {
      previous = prev.find((p) => p.id === id);
      return prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
    });

    const { error } = await supabase
      .from('prospects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating prospect:', error);
      if (previous) {
        const restore = previous;
        setProspects((prev) => prev.map((p) => (p.id === id ? restore : p)));
      }
      return { error: error.message };
    }
    return {};
  };

  const deleteProspect = async (id: string): Promise<MutationResult> => {
    let previous: Prospect | undefined;
    let index = -1;
    setProspects((prev) => {
      index = prev.findIndex((p) => p.id === id);
      previous = index >= 0 ? prev[index] : undefined;
      return prev.filter((p) => p.id !== id);
    });

    const { error } = await supabase.from('prospects').delete().eq('id', id);
    if (error) {
      if (previous) {
        const restore = previous;
        const at = index;
        setProspects((prev) => {
          const next = [...prev];
          next.splice(at < 0 ? next.length : at, 0, restore);
          return next;
        });
      }
      return { error: error.message };
    }
    return {};
  };

  return {
    prospects, loading, loadError, fetchProspects,
    addProspect, importProspects, updateProspect, deleteProspect,
  };
};
