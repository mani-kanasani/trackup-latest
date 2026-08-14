/*
  # Lead qualification

  Stores the answers to the qualification screen — the four pillars, the bonus
  checks, the impact/complexity read, the buying-ladder rung, and the tier
  signals — as JSON on the lead.

  ## Why the answers and not the verdict

  The verdict, tier and score are all derived from these answers by
  `src/lib/qualify/score.ts`. Persisting the derived values would freeze every
  lead against the doctrine that happened to be current on the day it was
  screened; persisting the answers means a change to the thresholds re-scores
  the whole list on next read. The screen is doctrine, and doctrine moves.

  No RLS changes: the column inherits the existing owner-scoped policies on
  `leads`.

  Idempotent.
*/

ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification jsonb;

COMMENT ON COLUMN leads.qualification IS
  'Answers to the qualification screen (QualificationInput). The verdict, tier and score are derived at read time, never stored.';
