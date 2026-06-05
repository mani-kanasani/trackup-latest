/*
  # Add job enhancements

  1. New Enum Types
    - `job_level` (entry, intermediate, expert)
    - `compensation_type` (hourly, fixed_price)

  2. New Columns
    - `job_level` (job_level enum, default 'intermediate')
    - `compensation_type` (compensation_type enum, default 'fixed_price')
    - `proposed_amount` (numeric, nullable)
    - `actual_amount` (numeric, nullable)

  3. Security
    - No changes to existing RLS policies needed
*/

-- Create job_level enum
DO $$ BEGIN
  CREATE TYPE job_level AS ENUM ('entry', 'intermediate', 'expert');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create compensation_type enum
DO $$ BEGIN
  CREATE TYPE compensation_type AS ENUM ('hourly', 'fixed_price');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'job_level'
  ) THEN
    ALTER TABLE jobs ADD COLUMN job_level job_level DEFAULT 'intermediate';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'compensation_type'
  ) THEN
    ALTER TABLE jobs ADD COLUMN compensation_type compensation_type DEFAULT 'fixed_price';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'proposed_amount'
  ) THEN
    ALTER TABLE jobs ADD COLUMN proposed_amount numeric;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'actual_amount'
  ) THEN
    ALTER TABLE jobs ADD COLUMN actual_amount numeric;
  END IF;
END $$;