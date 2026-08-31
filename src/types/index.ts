import type { GenerationMeta } from '../apps/linkedin/types';

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
  /** Object path in the private bucket. proposal_document is a cache of a signed URL for it. */
  proposal_path?: string | null;
  mermaid_code: string;
  video_script: string;
  status: JobStatus;
  /**
   * One entry per generation, newest last. Ids only, never excerpts.
   *
   * `leads` and `prospects` have carried this since the method engine landed
   * and `jobs` did not, so Upwork graded every proposal and threw the result
   * away — leaving any count of what a member gets wrong blind to a third of
   * their work, silently.
   */
  generation_meta?: GenerationMeta[] | null;
  /* Set once, by trigger, the first time the job leaves the drafted state.
     status alone says a proposal went out, not which day, which is the one
     thing a daily receipt has to know. */
  applied_at?: string | null;
  replied_at?: string | null;
  call_booked_at?: string | null;
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
  /** The marketplace message, assembled from the pack steps that compose it. */
  cover_letter: string;
  /**
   * Every step the pack asked for, keyed by step key, so the response can be
   * graded against the same doctrine that produced it. Optional because a
   * response generated before the pack became the contract will not carry it.
   */
  steps?: Record<string, string>;
  proposal_url: string;
  /** Object path, so an expired proposal_url can be re-signed rather than lost. */
  proposal_path?: string | null;
  mermaid_code: string;
  video_script: string;
}