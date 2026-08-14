/*
  # One row per person

  There are no UNIQUE constraints anywhere in this schema. With one-at-a-time
  entry that was survivable; with paste-a-list import it is not. Re-importing an
  overlapping export would silently double every lead in it, and the second copy
  would carry none of the qualification answers or sent history of the first.

  Scoped to (user_id, linkedin_url) so two operators can work the same prospect.

  The duplicate check runs first and raises with an instruction, because a bare
  unique-index violation on an existing table tells the installer nothing about
  what to do next.

  Idempotent.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM leads
    GROUP BY user_id, linkedin_url
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'leads already contains duplicate (user_id, linkedin_url) rows. Merge or delete them, then re-run this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS leads_user_linkedin_url_key
  ON leads (user_id, linkedin_url);
