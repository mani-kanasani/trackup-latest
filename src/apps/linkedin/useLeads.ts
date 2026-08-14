import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Lead } from './types';

export interface MutationResult {
  error?: string;
}

export const useLeads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      // A failed read must never look like an empty account. Keep whatever is
      // already on screen and surface the failure instead of rendering
      // "No leads yet" over a list the user knows exists.
      console.error('Error fetching leads:', error);
      setLoadError(error.message);
    } else {
      setLoadError(null);
      setLeads((data as Lead[]) ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const addLead = async (lead: Partial<Lead>): Promise<MutationResult> => {
    if (!user) return { error: 'You must be signed in.' };
    const { error } = await supabase.from('leads').insert({ ...lead, user_id: user.id });
    if (error) return { error: error.message };
    await fetchLeads();
    return {};
  };

  /**
   * Applies optimistically, then rolls back to the exact prior row on failure.
   *
   * The previous version refetched on error, which silently replaced a freshly
   * generated outreach flow with the untouched server row — the user watched
   * their generation vanish with no message and regenerated, paying for the
   * model call again. Rolling back only the row we touched keeps everything
   * else on screen, and the error is returned so the caller can show it.
   */
  const updateLead = async (id: string, updates: Partial<Lead>): Promise<MutationResult> => {
    let previous: Lead | undefined;
    setLeads((prev) => {
      previous = prev.find((l) => l.id === id);
      return prev.map((l) => (l.id === id ? { ...l, ...updates } : l));
    });

    const { error } = await supabase
      .from('leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating lead:', error);
      if (previous) {
        const restore = previous;
        setLeads((prev) => prev.map((l) => (l.id === id ? restore : l)));
      }
      return { error: error.message };
    }
    return {};
  };

  const deleteLead = async (id: string): Promise<MutationResult> => {
    let previous: Lead | undefined;
    let index = -1;
    setLeads((prev) => {
      index = prev.findIndex((l) => l.id === id);
      previous = index >= 0 ? prev[index] : undefined;
      return prev.filter((l) => l.id !== id);
    });

    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      console.error('Error deleting lead:', error);
      if (previous) {
        const restore = previous;
        const at = index;
        setLeads((prev) => {
          const next = [...prev];
          next.splice(at < 0 ? next.length : at, 0, restore);
          return next;
        });
      }
      return { error: error.message };
    }
    return {};
  };

  return { leads, loading, loadError, fetchLeads, addLead, updateLead, deleteLead };
};
