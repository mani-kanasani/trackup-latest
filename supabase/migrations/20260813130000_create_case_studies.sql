/*
  # Case studies — the proof vault

  1. Why this is a table and not a textarea

     The method packs lean on proof harder than on anything else. Several laws
     depend on it: attach one concrete substantiating fact per claim, use at most
     ONE proof per message, match it to the reader's world, and never use a
     number that is not on record. A single free-text "wins" box cannot support
     any of that — the model gets everything at once and picks badly, or invents.

     Structured rows let the app hand the generator one matched proof, and let
     the validator check that every number in the output came from somewhere.

  2. The naming rule, encoded

     Client names are usable in proposals, discovery calls, DMs and email
     nurture, and NOT in public content or lead magnets. That is a per-case-study
     fact, not a global setting: some clients grant naming, some do not. So each
     row carries `naming` and an `anonymous_label` to fall back to
     ("a top-three consulting firm"). Generators pass the audience, and the app
     picks which form to send.

  3. Storage

     A PRIVATE `case-studies` bucket for the source document. Unlike proposals,
     these are never shared with anyone, so there is no public or signed-link
     path at all.

  Idempotent — safe to run more than once.
*/

DO $$ BEGIN
  CREATE TYPE case_naming AS ENUM ('named', 'anonymous_only');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identity
  title text NOT NULL,
  client_name text,
  -- Fallback used wherever the client cannot be named.
  anonymous_label text,
  naming case_naming DEFAULT 'anonymous_only' NOT NULL,

  -- Matching. The generator picks a case study whose world resembles the
  -- reader's, which is what "matched to the reader's world" requires.
  industry text,
  company_size text,
  buyer_role text,

  -- The substance
  problem text,
  solution text,
  outcome text,

  -- The number. Kept apart from prose so the app can refuse to let a generator
  -- state a metric that is not on record here.
  metric_value text,
  metric_label text,
  timeframe text,

  -- Provenance. Self-reported proof is still proof, but the user should know
  -- which of their claims they can actually defend if a buyer pushes.
  verified boolean DEFAULT false NOT NULL,
  source_note text,

  -- Optional uploaded document, stored at `<user_id>/<uuid>.<ext>`.
  file_path text,
  file_name text,
  file_size integer,
  extracted_text text,

  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own case studies" ON case_studies;
CREATE POLICY "Users can view own case studies"
  ON case_studies FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own case studies" ON case_studies;
CREATE POLICY "Users can insert own case studies"
  ON case_studies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own case studies" ON case_studies;
CREATE POLICY "Users can update own case studies"
  ON case_studies FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own case studies" ON case_studies;
CREATE POLICY "Users can delete own case studies"
  ON case_studies FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_case_studies_user_id ON case_studies(user_id);
CREATE INDEX IF NOT EXISTS idx_case_studies_active ON case_studies(user_id, active);
CREATE INDEX IF NOT EXISTS idx_case_studies_industry ON case_studies(user_id, industry);

DROP TRIGGER IF EXISTS update_case_studies_updated_at ON case_studies;
CREATE TRIGGER update_case_studies_updated_at BEFORE UPDATE ON case_studies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Private bucket. No public policy, no signed-link path: a case study document
-- is only ever read back by its owner.
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-studies', 'case-studies', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Owners can read their own case study files" ON storage.objects;
CREATE POLICY "Owners can read their own case study files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'case-studies' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Owners can upload their own case study files" ON storage.objects;
CREATE POLICY "Owners can upload their own case study files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'case-studies' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Owners can delete their own case study files" ON storage.objects;
CREATE POLICY "Owners can delete their own case study files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'case-studies' AND (storage.foldername(name))[1] = auth.uid()::text);
