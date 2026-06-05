import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Lead } from './types';

export const useLeads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching leads:', error);
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const addLead = async (lead: Partial<Lead>): Promise<{ error?: string }> => {
    if (!user) return { error: 'You must be signed in.' };
    const { error } = await supabase.from('leads').insert({ ...lead, user_id: user.id });
    if (error) return { error: error.message };
    await fetchLeads();
    return {};
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    // optimistic
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    const { error } = await supabase
      .from('leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('Error updating lead:', error);
      await fetchLeads();
    }
  };

  const deleteLead = async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      console.error('Error deleting lead:', error);
      await fetchLeads();
    }
  };

  return { leads, loading, fetchLeads, addLead, updateLead, deleteLead };
};
