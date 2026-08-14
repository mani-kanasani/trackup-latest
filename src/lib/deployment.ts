// Is the deployed backend the one this build expects?
//
// The edge functions live in the user's own Supabase project, pasted or pushed
// there by hand. The app therefore has no idea which revision is actually
// running, and when an old one answers, the failure arrives as a blank result
// rather than as "your functions are out of date" — which is the single most
// confusing thing a self-hosted app can do to somebody.
//
// So every function stamps its contract version and the client checks it.

export const EXPECTED_CONTRACT = 2;

export const OUT_OF_DATE =
  'Your Supabase edge functions are an older version than this app expects, which is why the result came ' +
  'back empty. Redeploy all three functions (Settings has the source, or run `npm run setup`), then try again.';

/** True when the response came from a deployment older than this build. */
export const isStaleDeployment = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') return false;
  const raw = (payload as Record<string, unknown>).__contract;
  const version = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return !Number.isFinite(version) || version < EXPECTED_CONTRACT;
};

/** Strips the marker so it is never stored alongside real content. */
export const stripContract = <T extends Record<string, unknown>>(payload: T): T => {
  const copy = { ...payload };
  delete copy.__contract;
  return copy;
};
