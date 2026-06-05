/*
  # LinkedIn DM Generator — leads

  1. New Table
    - `leads` (user-scoped, unlike the original Dream 100 `dream_leads`)
      with the lead's details, AI-generated outreach (connection request +
      DM 2 + DM 3), status, and per-step "sent" tracking.

  2. Security
    - RLS: users can only read/write their own leads.

  Idempotent — safe to run more than once.
*/

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'requested', 'connected', 'replied', 'meeting');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  job_title text,
  company_name text,
  industry text,
  linkedin_url text NOT NULL,
  company_linkedin_url text,
  company_website text,
  potential_services text,
  connection_request text,
  dm_2 text,
  dm_3 text,
  status lead_status DEFAULT 'new' NOT NULL,
  connection_request_sent boolean DEFAULT false NOT NULL,
  dm_2_sent boolean DEFAULT false NOT NULL,
  dm_3_sent boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own leads" ON leads;
CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
CREATE POLICY "Users can insert own leads"
  ON leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own leads" ON leads;
CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own leads" ON leads;
CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
