/*
  # Sent steps carry a time

  `sent_steps` stored a bare array of step keys: `["connectionNote","openerDm"]`.
  It recorded THAT a step was sent and never WHEN, which is the one fact a
  cadence needs. Without it nothing can answer "who is due today", which is the
  question an operator actually has every morning.

  ## Why now, when nothing is broken

  This is the schema decision that forecloses the cadence engine, and it is
  strictly cheaper before people accumulate rows than after. Doing it now costs a
  tolerant reader; doing it later costs a data migration across every install.

  ## Why `updated_at` could not have substituted

  The trigger on `leads` fires on every write, and the qualification screen
  autosaves on an 800ms debounce, so `updated_at` moves constantly and has no
  relationship to when anything was sent.

  ## Shape

  From `["key", ...]` to `{"key": "2026-08-14T09:00:00.000Z", ...}`.

  Legacy arrays are left in place rather than converted: the app reads them
  through `readSentSteps`, which maps an array entry to an empty timestamp
  meaning "sent, time unknown". Converting here would have to invent times.

  The DEFAULT is changed too. Leaving it as '[]' would mean every NEW row arrives
  in the legacy shape forever, which is how a migration quietly fails to migrate.

  Also adds `status_changed_at`, guarded so that only a real status change moves
  it. Without the guard the qualification autosave would reset it several times a
  minute and it would measure nothing.

  Idempotent.
*/

ALTER TABLE leads ALTER COLUMN sent_steps SET DEFAULT '{}'::jsonb;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

COMMENT ON COLUMN leads.sent_steps IS
  'Step key -> ISO8601 timestamp of when it was sent. Legacy rows may hold a JSON array of keys with no times; read through readSentSteps.';

UPDATE leads SET status_changed_at = COALESCE(status_changed_at, created_at)
WHERE status_changed_at IS NULL;

CREATE OR REPLACE FUNCTION set_lead_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status_changed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_status_changed_at ON leads;

CREATE TRIGGER leads_status_changed_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_lead_status_changed_at();
