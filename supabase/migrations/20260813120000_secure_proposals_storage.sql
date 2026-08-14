/*
  # Close public read on the proposals bucket

  The bucket was created public with a bucket-wide `SELECT ... TO public` policy
  on `storage.objects`. That does more than make a known URL fetchable: it makes
  the object list readable, so any anonymous client pointed at the deployment
  could enumerate every path under `proposals/` and download every user's PDF.
  Generated proposals carry client names, scope and pricing.

  The bucket was public for a real reason, the returned link has to be
  shareable with a client who has no account. Signed URLs keep that property
  without exposing the rest of the bucket, so the fix is to switch the link
  type rather than remove the capability. The Edge Function now issues a
  long-lived signed URL; see `generate-proposal/index.ts`.

  Idempotent, safe to run more than once.
*/

-- Private from here on. Existing objects are unaffected except that they now
-- require a signed URL, which is the point.
UPDATE storage.buckets SET public = false WHERE id = 'proposals';

-- Remove the enumeration surface.
DROP POLICY IF EXISTS "Public read access to proposal PDFs" ON storage.objects;

-- Signed URLs do not consult RLS, so this policy is not what serves shared
-- links. It exists so a signed-in user can list and re-sign their OWN files
-- from the app. Paths are `<user_id>/<uuid>.pdf`, so the first folder segment
-- is the owner.
DROP POLICY IF EXISTS "Owners can read their own proposal PDFs" ON storage.objects;
CREATE POLICY "Owners can read their own proposal PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proposals'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owners can delete their own proposal PDFs" ON storage.objects;
CREATE POLICY "Owners can delete their own proposal PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proposals'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
