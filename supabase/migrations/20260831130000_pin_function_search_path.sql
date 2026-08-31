/*
  # Pin the search_path on the trigger functions that shipped without one

  Three functions created before this convention existed run with whatever
  search_path their caller happens to have set:

    set_lead_status_changed_at      20260814130000_sent_steps_timestamps.sql
    set_prospect_status_changed_at  20260814180000_create_prospects.sql
    set_prospects_updated_at        20260814180000_create_prospects.sql

  None of them is exploitable as written. All three are SECURITY INVOKER, so they
  hold no privileges the caller does not already have, and the only function they
  call is now(), which resolves out of pg_catalog and cannot be shadowed.

  It is closed anyway, for two reasons. It is a category Supabase's own linter
  reports, so leaving it means a member who runs the advisor sees warnings on
  their own project with no way to tell them from something that matters. And a
  later edit that adds a table lookup to any of these would inherit the hole
  without anyone noticing, which is exactly how this class of bug arrives.

  The bodies below are copied verbatim from the migrations above; only the
  search_path is added. CREATE OR REPLACE keeps the existing triggers bound to
  these functions, so nothing is dropped and nothing stops firing.

  The guard first is the point of the file as much as the pin is. CREATE OR
  REPLACE on a name that does not exist SUCCEEDS — it just creates a new function
  nobody calls, leaving the real one exactly as unpinned as before while the
  migration reports success. The third name here is `set_prospects_updated_at`,
  plural, and it was very nearly written singular. So the names are checked
  against the catalog before anything is replaced, and a typo fails loudly.

  Idempotent.
*/

DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(name, ', ')
    INTO missing
    FROM unnest(ARRAY[
      'set_lead_status_changed_at',
      'set_prospect_status_changed_at',
      'set_prospects_updated_at'
    ]) AS name
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = name
   );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot pin search_path: % not found in public. Run the earlier migrations first.', missing;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_lead_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status_changed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION set_prospect_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status_changed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION set_prospects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;
