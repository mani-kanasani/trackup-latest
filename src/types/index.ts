export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface JobMaterial {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  cover_letter: string;
  proposal_document: string;
  mermaid_code: string;
  video_script: string;
  status: JobStatus;
  job_level?: JobLevel;
  compensation_type?: CompensationType;
  proposed_amount?: number;
  actual_amount?: number;
  created_at: Date;
  updated_at: Date;
}

export type JobStatus = 'drafted' | 'applied' | 'responded' | 'meeting' | 'won' | 'lost';

export type JobLevel = 'entry' | 'intermediate' | 'expert';

export type CompensationType = 'hourly' | 'fixed_price';

export interface KPIData {
  proposalsGenerated: number;
  applied: number;
  responses: number;
  meetingsScheduled: number;
  revenueGenerated: number;
  cashCollected: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type DateFilter = 'today' | 'week' | 'month' | 'custom';

export interface GenerateRequest {
  job_title: string;
  job_summary: string;
}

export interface GenerateResponse {
  cover_letter: string;
  proposal_url: string;
  mermaid_code: string;
  video_script: string;
}