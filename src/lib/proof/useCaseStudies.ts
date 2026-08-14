import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { CaseStudy } from './types';

export interface MutationResult {
  error?: string;
}

const BUCKET = 'case-studies';

export const useCaseStudies = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('case_studies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      // Never render a failed read as an empty vault: a user who sees no case
      // studies will re-upload them.
      console.error('Error fetching case studies:', error);
      setLoadError(error.message);
    } else {
      setLoadError(null);
      setCases((data as CaseStudy[]) ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const addCase = async (input: Partial<CaseStudy>): Promise<MutationResult> => {
    if (!user) return { error: 'You must be signed in.' };
    if (!input.title?.trim()) return { error: 'Give the case study a title.' };

    const { error } = await supabase
      .from('case_studies')
      .insert({ ...input, user_id: user.id });
    if (error) return { error: error.message };
    await fetchCases();
    return {};
  };

  const updateCase = async (id: string, updates: Partial<CaseStudy>): Promise<MutationResult> => {
    let previous: CaseStudy | undefined;
    setCases((prev) => {
      previous = prev.find((c) => c.id === id);
      return prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
    });

    const { error } = await supabase.from('case_studies').update(updates).eq('id', id);
    if (error) {
      if (previous) {
        const restore = previous;
        setCases((prev) => prev.map((c) => (c.id === id ? restore : c)));
      }
      return { error: error.message };
    }
    return {};
  };

  const deleteCase = async (id: string): Promise<MutationResult> => {
    const target = cases.find((c) => c.id === id);
    const { error } = await supabase.from('case_studies').delete().eq('id', id);
    if (error) return { error: error.message };

    // Remove the document too. A failure here is not worth blocking the user
    // over, but it must not pass unnoticed.
    if (target?.file_path) {
      const { error: rmError } = await supabase.storage.from(BUCKET).remove([target.file_path]);
      if (rmError) console.error('Case study row deleted but its file remains:', rmError);
    }
    await fetchCases();
    return {};
  };

  /** Uploads a source document into the caller's own folder and returns its path. */
  const uploadFile = async (
    file: File,
  ): Promise<{ path?: string; error?: string }> => {
    if (!user) return { error: 'You must be signed in.' };
    if (file.size > 10 * 1024 * 1024) return { error: 'That file is over 10 MB. Upload a smaller one.' };

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) return { error: error.message };
    return { path };
  };

  return {
    cases,
    loading,
    loadError,
    fetchCases,
    addCase,
    updateCase,
    deleteCase,
    uploadFile,
  };
};
