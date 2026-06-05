/*
  # LinkedIn outreach flow

  Stores the full generated outreach flow (connection note, blank-request
  strategy, opener/value/CTA/bump, and positive/objection reply branches) as
  JSON, plus which steps have been marked sent. Replaces the flat
  connection_request / dm_2 / dm_3 columns for new generations.

  Idempotent.
*/

ALTER TABLE leads ADD COLUMN IF NOT EXISTS outreach jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sent_steps jsonb DEFAULT '[]'::jsonb NOT NULL;
