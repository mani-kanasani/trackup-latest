/*
  # Initial Schema Creation for Job Application Tracker

  1. New Tables
    - `users` (id, email, name, created_at, updated_at)
    - `jobs`  (id, user_id, title, summary, cover_letter, proposal_document,
               mermaid_code, video_script, status, job_level, compensation_type,
               proposed_amount, actual_amount, created_at, updated_at)

  2. Enum Types
    - `job_status` (drafted, applied, responded, meeting, won, lost)
    - `job_level` (entry, intermediate, expert)
    - `compensation_type` (hourly, fixed_price)

  3. Security
    - RLS enabled on both tables; users can only read/write their own rows.

  Note: every statement here is idempotent, so this file is safe to run more
  than once (e.g. pasted into the SQL editor during setup).
*/

-- Enum types
DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('drafted', 'applied', 'responded', 'meeting', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE job_level AS ENUM ('entry', 'intermediate', 'expert');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE compensation_type AS ENUM ('hourly', 'fixed_price');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  cover_letter text NOT NULL,
  proposal_document text NOT NULL,
  mermaid_code text NOT NULL,
  video_script text NOT NULL,
  status job_status DEFAULT 'drafted' NOT NULL,
  job_level job_level DEFAULT 'intermediate',
  compensation_type compensation_type DEFAULT 'fixed_price',
  proposed_amount numeric,
  actual_amount numeric,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policies for jobs table
DROP POLICY IF EXISTS "Users can view own jobs" ON jobs;
CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own jobs" ON jobs;
CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own jobs" ON jobs;
CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own jobs" ON jobs;
CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
