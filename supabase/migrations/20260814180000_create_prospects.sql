/*
  # Cold email prospects

  The cold email pack has existed since the method engine landed and the app did
  not. This is its table.

  ## Why a separate table from `leads`

  Identity differs. A LinkedIn lead is keyed on a profile URL and its sequence is
  gated on an invitation being accepted; a cold email prospect is keyed on an
  address, and the thing that stops a sequence is a reply or an opt-out, which
  has to be honoured permanently and across every future campaign.

  ## Variant, from the start

  `variant` is here on day one rather than retrofitted. Cold email is the one
  channel whose copy is split-testable end to end, the pack says so, and
  adding a variant column to a table already full of rows means every historical
  row is variant-null and the first comparison is against nothing.

  ## Opt-out is a suppression, not a status

  `opted_out` is separate from `status` deliberately. A status can be edited or
  advanced by mistake; a suppression must survive every later import of the same
  address, which is why the importer checks it independently.

  Owner-scoped RLS, matching every other table here.

  Idempotent.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prospect_status') THEN
    CREATE TYPE prospect_status AS ENUM (
      'new', 'sent', 'replied', 'meeting', 'won', 'lost', 'no_reply', 'bounced', 'disqualified'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name text NOT NULL,
  email text NOT NULL,
  job_title text,
  company_name text,
  industry text,
  company_website text,
  city_or_region text,

  /* The research that earns Tier A. Kept apart from free-text notes because the
     prompt is allowed to use this and is not allowed to invent one. */
  observation text,
  potential_services text,

  /* Which copy variant this prospect received, so a reply rate can be split. */
  variant text,

  sequence jsonb,
  sent_steps jsonb DEFAULT '{}'::jsonb NOT NULL,
  qualification jsonb,
  generation_meta jsonb,

  status prospect_status DEFAULT 'new' NOT NULL,
  status_changed_at timestamptz,
  close_reason text,
  deal_value numeric,

  /* Survives status edits and future imports. */
  opted_out boolean DEFAULT false NOT NULL,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS prospects_user_email_key ON prospects (user_id, lower(email));
CREATE INDEX IF NOT EXISTS prospects_user_status_idx ON prospects (user_id, status);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own prospects" ON prospects;
CREATE POLICY "Users read own prospects" ON prospects
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own prospects" ON prospects;
CREATE POLICY "Users insert own prospects" ON prospects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own prospects" ON prospects;
CREATE POLICY "Users update own prospects" ON prospects
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own prospects" ON prospects;
CREATE POLICY "Users delete own prospects" ON prospects
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_prospect_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status_changed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prospects_status_changed_at ON prospects;
CREATE TRIGGER prospects_status_changed_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_prospect_status_changed_at();

CREATE OR REPLACE FUNCTION set_prospects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prospects_updated_at ON prospects;
CREATE TRIGGER prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION set_prospects_updated_at();
