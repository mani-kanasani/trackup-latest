/*
  # Upwork was the one channel that graded its work and threw the result away

  Every generation is checked against the method pack that wrote it, and the ids
  of what fired are recorded so the member can later be told which rules they
  break most. `leads` and `prospects` have carried that since the method engine
  landed. `jobs` never did.

  The proposal screen computes the check and renders it, then saves the proposal
  without it. So an aggregate built from what exists would describe two thirds of
  a member's work as all of it — and would do so silently, which is the failure
  mode that matters. A number that is wrong and looks right is worse than one
  that is missing.

  Same shape as the other two: newest generation last, pattern ids only. The
  excerpts are the member's own copy and are deliberately not stored anywhere.

  Idempotent.
*/

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS generation_meta jsonb;

COMMENT ON COLUMN jobs.generation_meta IS
  'One entry per generation, newest last: pack id and version, the case study cited, the qualification verdict, and the ids of the doctrine violations that fired. Ids only — never excerpts, which are the user''s own copy.';
