export type LeadStatus = 'new' | 'requested' | 'connected' | 'replied' | 'meeting';

export interface OutreachFlow {
  connection_note: string;
  blank_strategy: string;
  opener: string;
  value: string;
  cta: string;
  bump: string;
  reply_positive: string;
  reply_objection: string;
}

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  industry?: string | null;
  linkedin_url: string;
  company_linkedin_url?: string | null;
  company_website?: string | null;
  potential_services?: string | null;
  outreach?: OutreachFlow | null;
  sent_steps?: string[] | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}
