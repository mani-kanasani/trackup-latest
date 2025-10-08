import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { JobMaterial, KPIData, DateRange, DateFilter } from '../types';

interface DataContextType {
  materials: JobMaterial[];
  addMaterial: (material: Omit<JobMaterial, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>;
  updateMaterialStatus: (id: string, status: JobMaterial['status']) => void;
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

      const formattedMaterials = data.map((item: any) => ({
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

  const getDateRange = (filter: DateFilter, customRange?: DateRange): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          start: weekStart,
          end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
        };
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
      responses: filtered.filter(m => ['responded', 'meeting', 'won', 'lost'].includes(m.status)).length,
      meetingsScheduled: filtered.filter(m => ['meeting', 'won'].includes(m.status)).length,
      revenueGenerated,
      cashCollected
    };

    console.log('KPI Data calculated:', kpiData, 'from', filtered.length, 'filtered materials');
    return kpiData;
  };

  return (
    <DataContext.Provider value={{ 
      materials, 
      addMaterial, 
      updateMaterialStatus, 
      getKPIData,
      getDateRange,
      loading
    }}>
      {children}
    </DataContext.Provider>
  );
};