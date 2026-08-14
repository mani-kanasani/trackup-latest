/*
  # Proposals storage bucket

  SUPERSEDED by 20260813120000_secure_proposals_storage.sql, which makes this
  bucket private and replaces the public link with a signed one. The public
  policy created here allowed anonymous enumeration of every user's PDFs. This
  file is left intact because it has already been applied; read the later
  migration for the current state.

  1. Storage
    - Create a public `proposals` bucket to hold the generated proposal PDFs.
      Each file lives under `<user_id>/<uuid>.pdf`.

  2. Security
    - The Edge Function uploads with the service role (bypasses RLS).
    - Bucket is public so the returned link is shareable with clients on Upwork.
    - Add an explicit public read policy on the objects for completeness.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('proposals', 'proposals', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read access to proposal PDFs" ON storage.objects;
CREATE POLICY "Public read access to proposal PDFs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'proposals');
