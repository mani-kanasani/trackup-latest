import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { JobMaterial, KPIData, DateRange, DateFilter } from '../types';

interface DataContextType {
  materials: JobMaterial[];
  addMaterial: (material: Omit<JobMaterial, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>;
  updateMaterialStatus: (id: string, status: JobMaterial['status']) => void;
  /**
   * Edit a saved proposal after the fact.
   *
   * actual_amount was written once at DRAFT time and had no update path
   * anywhere, so Cash Collected could never move after creation — the one KPI
   * that is supposed to change when a deal actually closes.
   */
  updateMaterial: (id: string, patch: Partial<JobMaterial>) => Promise<{ success: boolean; error?: string }>;
  getKPIData: (dateRange: DateRange) => KPIData;
  getDateRange: (filter: DateFilter, customRange?: DateRange) => DateRange;
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [materials, setMaterials] = useState<JobMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchMaterials();
    } else {
      setMaterials([]);
    }
  }, [user]);

  const fetchMaterials = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching materials:', error);
        return;
      }

      if (!data) {
        console.log('No data returned from database');
        setMaterials([]);
        return;
      }

      console.log(`Fetched ${data.length} materials from database`);

      // The four fields this mapper actually touches. Postgres returns numerics
      // as strings and timestamps as ISO strings, which is the whole reason the
      // mapper exists; the rest of the row passes through untouched.
      type MaterialRow = Omit<
        JobMaterial,
        'proposed_amount' | 'actual_amount' | 'created_at' | 'updated_at'
      > & {
        proposed_amount?: string | number | null;
        actual_amount?: string | number | null;
        created_at: string;
        updated_at: string;
      };

      const formattedMaterials = data.map((item: MaterialRow) => ({
        ...item,
        proposed_amount: item.proposed_amount ? Number(item.proposed_amount) : undefined,
        actual_amount: item.actual_amount ? Number(item.actual_amount) : undefined,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at)
      }));

      setMaterials(formattedMaterials);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMaterial = async (material: Omit<JobMaterial, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to save materials' };
    }

    try {
      console.log('Adding material for user:', user.id);

      const insertData = {
        user_id: user.id,
        title: material.title,
        summary: material.summary,
        cover_letter: material.cover_letter,
        proposal_document: material.proposal_document,
        proposal_path: material.proposal_path,
        mermaid_code: material.mermaid_code,
        video_script: material.video_script,
        status: material.status,
        job_level: material.job_level || 'intermediate',
        compensation_type: material.compensation_type || 'fixed_price',
        proposed_amount: material.proposed_amount !== undefined ? material.proposed_amount : null,
        actual_amount: material.actual_amount !== undefined ? material.actual_amount : null
      };

      console.log('Inserting material:', insertData);

      const { error } = await supabase
        .from('jobs')
        .insert(insertData);

      if (error) {
        console.error('Error adding material:', error);
        let errorMessage = 'Failed to save materials';

        if (error.code === '23503') {
          errorMessage = 'User account not properly set up. Please try logging out and back in.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        return { success: false, error: errorMessage };
      }

      console.log('Material added successfully');

      // Refetch materials to update the state
      await fetchMaterials();

      return { success: true };
    } catch (error) {
      console.error('Error adding material:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      return { success: false, error: errorMessage };
    }
  };

  const updateMaterialStatus = async (id: string, status: JobMaterial['status']) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating material status:', error);
        return;
      }

      // Update local state immediately for better UX
      setMaterials(prevMaterials =>
        prevMaterials.map(m =>
          m.id === id ? { ...m, status, updated_at: new Date() } : m
        )
      );
    } catch (error) {
      console.error('Error updating material status:', error);
    }
  };

  const updateMaterial = async (id: string, patch: Partial<JobMaterial>) => {
    if (!user) return { success: false, error: 'You must be signed in.' };

    const previous = materials.find((m) => m.id === id);
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch, updated_at: new Date() } : m)));

    const { error } = await supabase
      .from('jobs')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating material:', error);
      // Roll back only the row we touched, so nothing else on screen is lost.
      if (previous) setMaterials((prev) => prev.map((m) => (m.id === id ? previous : m)));
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const getDateRange = (filter: DateFilter, customRange?: DateRange): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case 'week': {
        // Braced: a bare `case` shares one scope with its siblings, so this
        // const is visible (and in its temporal dead zone) inside every other
        // branch of the switch.
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          start: weekStart,
          end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
        };
      }
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        };
      case 'custom':
        return customRange || { start: today, end: today };
      default:
        return { start: today, end: today };
    }
  };

  const getKPIData = (dateRange: DateRange): KPIData => {
    const filtered = materials.filter(m => {
      const dateToCompare = m.status === 'drafted' ? m.created_at : m.updated_at;
      return dateToCompare >= dateRange.start && dateToCompare <= dateRange.end;
    });

    const wonJobs = filtered.filter(m => m.status === 'won');
    const revenueGenerated = wonJobs.reduce((sum, job) => {
      const amount = job.actual_amount || job.proposed_amount || 0;
      return sum + amount;
    }, 0);
    const cashCollected = wonJobs.reduce((sum, job) => {
      return sum + (job.actual_amount || 0);
    }, 0);

    const kpiData = {
      proposalsGenerated: filtered.length,
      applied: filtered.filter(m => ['applied', 'responded', 'meeting', 'won', 'lost'].includes(m.status)).length,
      // 'lost' is deliberately absent. Most lost proposals were never replied
      // to at all, so counting them as responses inflated the rate with exactly
      // the proposals that went nowhere.
      responses: filtered.filter(m => ['responded', 'meeting', 'won'].includes(m.status)).length,
      meetingsScheduled: filtered.filter(m => ['meeting', 'won'].includes(m.status)).length,
      revenueGenerated,
      cashCollected
    };

    return kpiData;
  };

  return (
    <DataContext.Provider value={{ 
      materials, 
      addMaterial, 
      updateMaterialStatus,
      updateMaterial,
      getKPIData,
      getDateRange,
      loading
    }}>
      {children}
    </DataContext.Provider>
  );
};