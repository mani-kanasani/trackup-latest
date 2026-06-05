export type LeadStatus = 'new' | 'requested' | 'connected' | 'replied' | 'meeting';

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
  connection_request?: string | null;
  dm_2?: string | null;
  dm_3?: string | null;
  status: LeadStatus;
  connection_request_sent: boolean;
  dm_2_sent: boolean;
  dm_3_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutreachResponse {
  connection_request: string;
  dm_2: string;
  dm_3: string;
}
