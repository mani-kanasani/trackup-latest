// Opening a stored proposal PDF.
//
// The `proposals` bucket is private, so the app hands out signed URLs. A signed
// URL is a JWT against the project secret with an expiry, which means the link
// stored on the job row is a CACHE, not an address: it lapses after a year, and
// rotating the project's JWT secret invalidates every one at once.
//
// So the honest sequence is: try the cached link, and if it has lapsed, mint a
// new one from the stored object path. That requires the path, which is why
// `jobs.proposal_path` exists, and it works from the browser because the bucket's
// owner-scoped SELECT policy lets a signed-in user read their own objects.

import { supabase } from './supabase';

const BUCKET = 'proposals';
const FRESH_URL_SECONDS = 60 * 60; // An hour is plenty to click a link.

export interface LinkResult {
  url?: string;
  /** A fresh URL was minted, so the caller should persist it over the stale one. */
  refreshed?: boolean;
  error?: string;
}

/** Cheap liveness check. HEAD avoids pulling the whole PDF just to test the link. */
const stillWorks = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
};

export const resolveProposalUrl = async (
  cachedUrl: string | null | undefined,
  path: string | null | undefined,
): Promise<LinkResult> => {
  const cached = cachedUrl?.trim();
  const objectPath = path?.trim();

  if (cached && (await stillWorks(cached))) return { url: cached };

  if (!objectPath) {
    // Generated before the path was stored. The file is still in the bucket, but
    // nothing records which object it is, so say that rather than failing mutely.
    return {
      error: cached
        ? 'That link has expired, and this proposal was generated before Ember started recording where the file lives. Regenerate it to get a fresh document.'
        : 'No proposal document was stored for this one.',
    };
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectPath, FRESH_URL_SECONDS);

  if (error || !data?.signedUrl) {
    return { error: `Could not open the proposal: ${error?.message ?? 'no link returned'}` };
  }
  return { url: data.signedUrl, refreshed: true };
};
