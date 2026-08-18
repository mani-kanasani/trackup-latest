/*
  # Vertical briefs: the niche context, and the evidence that is NOT yours

  1. Why this is separate from case_studies

     The proof vault answers "what have you delivered". This answers "what is
     published about the reader's category". They look similar and they are
     opposites, and conflating them is the single most damaging thing this
     feature could do.

     `renderCase` emits "Refer to them as <client>" under a prompt header that
     reads "The sender's verified proof". Put a research firm in that table and
     the generator is told a third party is the sender's client, which produces
     a borrowed headline number presented as the member's own result. That is
     the failure the methodology calls fatal, and beginners are both the most
     likely to make it and the least likely to catch it.

     So provenance is structural here, not a flag. Two tables, two prompt
     sections, two contradictory instructions. Conflating them would require the
     model to override a header rather than merely forget a boolean.

  2. Attribution is enforced by the schema

     `source_name` is NOT NULL. A borrowed claim cannot be stored without saying
     whose it is, so the validator always has something to check the output
     against, and there is no path that produces an unattributable number.

  3. Failure scenarios are jsonb, evidence is a table

     Scenarios are read as one block and never selected individually, so they
     ride on the brief. Evidence rows are graded one by one by the validator and
     matched to the reader, so they need to be rows.

  Idempotent, safe to run more than once.
*/

DO $$ BEGIN
  CREATE TYPE evidence_scope AS ENUM ('vertical', 'generic');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS vertical_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identity
  label text NOT NULL,
  vertical text NOT NULL,
  -- The person accountable for the number, which is who outreach must speak to.
  buyer_role text,

  -- How the work is described. Functions and P&L movement, never a feature list.
  function_language text,
  -- What the prototype actually demonstrates, so outreach can offer it concretely.
  prototype_note text,
  -- Tier SHAPES only. Pricing is deliberately absent: it does not belong in
  -- outreach any more than it belongs on the landing page.
  offer_shapes text,

  /*
    Fifteen ways the reader's business loses money.
    [{ category, scenario, cost, solution, model }]
    Categories: acquisition | retention | operations | growth
  */
  failure_scenarios jsonb DEFAULT '[]'::jsonb NOT NULL,

  -- Raw pasted source, kept so a brief can be re-derived without re-pasting.
  -- Never sent to a generator: it is the 17,000 characters the brief replaces.
  source_text text,

  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

/*
  Published research about the reader's category. NOT the sender's work.

  The 3 vertical + 2 generic split from the methodology lives in `scope`: the
  vertical rows are what make someone the specialist, the generic rows are what
  let them sell across it.
*/
CREATE TABLE IF NOT EXISTS industry_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brief_id uuid NOT NULL REFERENCES vertical_briefs(id) ON DELETE CASCADE,

  claim text NOT NULL,
  -- The figure, kept apart from prose so the validator can look for it in output.
  metric text,
  -- NOT NULL on purpose. An unattributable borrowed number must not be storable.
  source_name text NOT NULL,
  source_url text,
  source_year text,

  -- Which function or failure this evidence speaks to.
  applies_to text,
  scope evidence_scope DEFAULT 'vertical' NOT NULL,

  -- False means the member could not open the source themselves. Still usable,
  -- but the generator is told to present it as reported rather than as fact.
  confirmed boolean DEFAULT false NOT NULL,

  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE vertical_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own briefs" ON vertical_briefs;
CREATE POLICY "Users can view own briefs"
  ON vertical_briefs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own briefs" ON vertical_briefs;
CREATE POLICY "Users can insert own briefs"
  ON vertical_briefs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own briefs" ON vertical_briefs;
CREATE POLICY "Users can update own briefs"
  ON vertical_briefs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own briefs" ON vertical_briefs;
CREATE POLICY "Users can delete own briefs"
  ON vertical_briefs FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own evidence" ON industry_evidence;
CREATE POLICY "Users can view own evidence"
  ON industry_evidence FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own evidence" ON industry_evidence;
CREATE POLICY "Users can insert own evidence"
  ON industry_evidence FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own evidence" ON industry_evidence;
CREATE POLICY "Users can update own evidence"
  ON industry_evidence FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own evidence" ON industry_evidence;
CREATE POLICY "Users can delete own evidence"
  ON industry_evidence FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_vertical_briefs_user ON vertical_briefs(user_id);
CREATE INDEX IF NOT EXISTS idx_industry_evidence_brief ON industry_evidence(brief_id, active);
CREATE INDEX IF NOT EXISTS idx_industry_evidence_user ON industry_evidence(user_id);

/*
  One active brief per user.

  The methodology commits a member to a single vertical for 90 days. Briefs are
  kept rather than overwritten so a pivot does not destroy the earlier work, but
  only one can be live, which is the rule expressed as a constraint.
*/
CREATE UNIQUE INDEX IF NOT EXISTS idx_vertical_briefs_one_active
  ON vertical_briefs(user_id) WHERE active;

DROP TRIGGER IF EXISTS update_vertical_briefs_updated_at ON vertical_briefs;
CREATE TRIGGER update_vertical_briefs_updated_at BEFORE UPDATE ON vertical_briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_industry_evidence_updated_at ON industry_evidence;
CREATE TRIGGER update_industry_evidence_updated_at BEFORE UPDATE ON industry_evidence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
