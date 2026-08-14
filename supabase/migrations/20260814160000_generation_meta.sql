/*
  # What produced this message

  Records the conditions a generation was made under: which pack and version,
  which case study was matched and why it scored, what tier and rung the screen
  assigned, and what the validator flagged.

  ## Why it has to be stored rather than derived

  Two of those are already deliberately not stored anywhere else.

  `warnings`, `softNotes` and `proofUsed` are React state, wiped the moment the
  user selects another lead. And migration 20260814120000 states, correctly, that
  the qualification VERDICT is never stored and is re-derived at read time so a
  doctrine change re-scores the list — which means a threshold change silently
  rewrites the tier every past message was written under. Right for the screen,
  wrong for the record.

  ## What it buys

  Once step timestamps and terminal states exist, "reply rate by case study, by
  tier, by pack version" becomes a pure read over rows that already exist. That
  is the difference between an operator guessing which proof works and knowing,
  and it is the only honest input a constraint diagnostic will ever have.

  Idempotent.
*/

ALTER TABLE leads ADD COLUMN IF NOT EXISTS generation_meta jsonb;

COMMENT ON COLUMN leads.generation_meta IS
  'Conditions this outreach was generated under: pack id and version, matched case study and score, tier and rung, violation ids, timestamp. Append-only history; never re-derived.';
