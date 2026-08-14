/*
  # Leads can end

  `lead_status` ran new -> requested -> connected -> replied -> meeting and
  stopped. There was no way to say a lead went nowhere, so a lead that ignores
  you stays `requested` forever.

  Two things follow from that, and both matter more than they sound:

  1. The list only ever grows. Nothing can drain, so a cadence queue built on it
     would show every lead ever added, forever.
  2. No rate has a denominator. "Replied out of what?" has no answer while
     everything is still theoretically in flight, which is why the app can count
     activity and cannot report a single conversion.

  `no_reply` and `disqualified` are separated deliberately: one is the market's
  answer and one is yours, and collapsing them would hide the difference between
  outreach that is not landing and targeting that was wrong.

  `deal_value` is on the lead rather than in a separate deals table. The table
  would be a rewrite of jobs, leads and DataContext for the same outcome.

  Idempotent.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    RAISE NOTICE 'lead_status type not found; run the earlier lead migrations first.';
  END IF;
END $$;

-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block in older
-- Postgres, and IF NOT EXISTS makes re-running safe.
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'no_reply';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'disqualified';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'won';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'lost';

ALTER TABLE leads ADD COLUMN IF NOT EXISTS close_reason text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_value numeric;

COMMENT ON COLUMN leads.close_reason IS
  'Why this lead ended, in the operator''s own words. Read alongside the terminal status.';
COMMENT ON COLUMN leads.deal_value IS
  'Set when status is won. The closing figure a funnel rate is worth anything against.';
