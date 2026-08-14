/*
  # Remember where the proposal PDF lives

  `generate-proposal` uploads the PDF to the private `proposals` bucket, signs a
  URL for it, and returns only the URL. The object path died with the invocation,
  so the job row recorded a link and never the file.

  ## What that cost

  Signed URLs expire. Ours is issued for a year, and Supabase signs them against
  the project's JWT secret, so rotating that secret invalidates every one of them
  at once. Either way, every proposal PDF eventually became permanently
  unreachable with no way to produce a fresh link, because nothing knew which
  object in the bucket belonged to which job.

  The owner SELECT policy added in 20260813120000 exists so a signed-in user can
  list and re-sign their own files from the app. Without the path stored, nothing
  could use it.

  Idempotent.
*/

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS proposal_path text;

COMMENT ON COLUMN jobs.proposal_path IS
  'Object path inside the private proposals bucket. The stored proposal_document URL is a cache; re-sign from this when it expires.';
