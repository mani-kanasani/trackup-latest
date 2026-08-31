/*
  # When a thing happened, not just that it happened

  The daily receipt reports counts for one local date: sends, replies and calls
  booked on that day. Three of those five numbers could not be answered.

  1. Upwork had no send date at all

     `jobs` carries a status and nothing else. `status = 'applied'` says a
     proposal went out at some point, not which day, and `updated_at` moves on
     every edit so it measures nothing. `applied_at` is set the first time a job
     leaves the drafted state.

  2. Replies and calls kept only the latest transition

     `status_changed_at` is overwritten by each change. A lead that replied on
     Monday and booked a call on Tuesday remembers only Tuesday, so Monday's
     reply is absent from Monday's receipt and can never be recovered. Each
     milestone therefore gets its own column, set once.

  3. Set once, never moved

     Every trigger here writes only when the column IS NULL. A member correcting
     a status, reopening a lead, or moving it back and forth must not rewrite
     history: the receipt for a past day has already been filed, and a number
     that changes after the fact is worse than one that was never collected.

  Deliberately not an event log. The receipt needs one date per milestone per
  record, the cohort is beginners sending a handful of messages a day, and a
  history table would be a larger surface for no answer it can give that these
  columns cannot.

  Idempotent.
*/

ALTER TABLE jobs      ADD COLUMN IF NOT EXISTS applied_at     timestamptz;
ALTER TABLE jobs      ADD COLUMN IF NOT EXISTS replied_at     timestamptz;
ALTER TABLE jobs      ADD COLUMN IF NOT EXISTS call_booked_at timestamptz;

ALTER TABLE leads     ADD COLUMN IF NOT EXISTS replied_at     timestamptz;
ALTER TABLE leads     ADD COLUMN IF NOT EXISTS call_booked_at timestamptz;

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS replied_at     timestamptz;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS call_booked_at timestamptz;

/*
  Backfill from what is already known, conservatively.

  A row already sitting in a replied-or-later state did reply, and the only
  timestamp available for when is `status_changed_at`. That is right for a row
  whose last transition WAS the reply and wrong for one that has moved on since,
  so it is applied only where the current status is exactly the milestone. Rows
  further along are left null rather than dated to a day they cannot be shown to
  belong to: an absent number is recoverable, an invented one is not.
*/
UPDATE jobs SET applied_at = COALESCE(applied_at, updated_at)
  WHERE applied_at IS NULL AND status <> 'drafted';
UPDATE jobs SET replied_at = COALESCE(replied_at, updated_at)
  WHERE replied_at IS NULL AND status = 'responded';
UPDATE jobs SET call_booked_at = COALESCE(call_booked_at, updated_at)
  WHERE call_booked_at IS NULL AND status = 'meeting';

UPDATE leads SET replied_at = COALESCE(replied_at, status_changed_at)
  WHERE replied_at IS NULL AND status = 'replied';
UPDATE leads SET call_booked_at = COALESCE(call_booked_at, status_changed_at)
  WHERE call_booked_at IS NULL AND status = 'meeting';

UPDATE prospects SET replied_at = COALESCE(replied_at, status_changed_at)
  WHERE replied_at IS NULL AND status = 'replied';
UPDATE prospects SET call_booked_at = COALESCE(call_booked_at, status_changed_at)
  WHERE call_booked_at IS NULL AND status = 'meeting';

/*
  Both functions pin their search_path.

  They run as invoker and touch nothing but NEW and now(), so there is no
  privilege-escalation path here — but a function whose search_path can be set
  by its caller is a category Supabase's own linter flags, and a later edit that
  adds a table lookup would inherit the hole silently. Cheaper to close now,
  while this migration has not run anywhere yet, than to notice later.
*/

/* Jobs: applied on leaving 'drafted', then each milestone once. */
CREATE OR REPLACE FUNCTION set_job_activity_stamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'drafted' AND NEW.applied_at IS NULL THEN
    NEW.applied_at = now();
  END IF;
  IF NEW.status IN ('responded', 'meeting', 'won') AND NEW.replied_at IS NULL THEN
    NEW.replied_at = now();
  END IF;
  IF NEW.status IN ('meeting', 'won') AND NEW.call_booked_at IS NULL THEN
    NEW.call_booked_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS jobs_activity_stamps ON jobs;
CREATE TRIGGER jobs_activity_stamps BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_job_activity_stamps();

/*
  Leads and prospects share a status vocabulary for these two milestones, so
  they share a trigger function. 'won' implies a call happened even when the
  member never clicked through that state.
*/
CREATE OR REPLACE FUNCTION set_outreach_activity_stamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status::text IN ('replied', 'meeting', 'won') AND NEW.replied_at IS NULL THEN
    NEW.replied_at = now();
  END IF;
  IF NEW.status::text IN ('meeting', 'won') AND NEW.call_booked_at IS NULL THEN
    NEW.call_booked_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS leads_activity_stamps ON leads;
CREATE TRIGGER leads_activity_stamps BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_outreach_activity_stamps();

DROP TRIGGER IF EXISTS prospects_activity_stamps ON prospects;
CREATE TRIGGER prospects_activity_stamps BEFORE INSERT OR UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION set_outreach_activity_stamps();

CREATE INDEX IF NOT EXISTS idx_jobs_applied_at ON jobs(user_id, applied_at);
CREATE INDEX IF NOT EXISTS idx_leads_replied_at ON leads(user_id, replied_at);
CREATE INDEX IF NOT EXISTS idx_prospects_replied_at ON prospects(user_id, replied_at);
