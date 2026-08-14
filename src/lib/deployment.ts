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

/** What version a response claims to be, or null when it carries no marker. */
export const contractOf = (payload: unknown): number | null => {
  if (!payload || typeof payload !== 'object') return null;
  const raw = (payload as Record<string, unknown>).__contract;
  const version = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return Number.isFinite(version) ? version : null;
};

/**
 * Names the version it actually got.
 *
 * "Your functions are out of date" with no number is only marginally better
 * than a blank result: it cannot distinguish a redeploy that silently did not
 * take from one that landed on a different project, and the user has no way to
 * tell which without asking.
 */
export const outOfDateMessage = (payload: unknown): string => {
  const got = contractOf(payload);
  const seen = got === null
    ? 'The function that answered carries no version at all, so it is running code from before this check existed.'
    : `The function that answered reports version ${got}; this app needs ${EXPECTED_CONTRACT}.`;
  return (
    `${seen} Redeploy generate-outreach and generate-proposal from THIS build. ` +
    'Settings shows the exact source to paste, and Test this key will tell you which version is live once you have. ' +
    'If you copied the source from a deployed site, make sure that site has rebuilt from the latest commit first.'
  );
};

export const OUT_OF_DATE =
  'Your Supabase edge functions are an older version than this app expects. Redeploy all three, then try again.';

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

/**
 * Which revision of each function is actually live.
 *
 * Every response is stamped, including errors, so this deliberately sends an
 * EMPTY body: each function rejects it with a 400 that still carries its
 * version. No model call, no tokens, and it works even when generation is the
 * thing that is broken.
 */
export interface FunctionVersion {
  name: string;
  version: number | null;
  reachable: boolean;
  /**
   * The platform rejected the call before the function ran.
   *
   * Distinguishable because our own 401 carries a version stamp and the
   * gateway's does not. That difference is the only way to tell "Verify JWT is
   * still on" from "this function is old", and they need opposite fixes.
   */
  gatewayRejected: boolean;
}

export const probeFunctionVersions = async (
  invoke: (name: string) => Promise<{ data: unknown; error: unknown }>,
): Promise<FunctionVersion[]> => {
  const names = ['generate-proposal', 'generate-outreach', 'list-models'];
  const out: FunctionVersion[] = [];
  for (const name of names) {
    try {
      const { data, error } = await invoke(name);
      // A rejected call still answers the question, as long as the body came
      // back. supabase-js puts a non-2xx body behind error.context.
      let payload: unknown = data;
      let status = 200;
      if (!payload && error && typeof error === 'object' && 'context' in error) {
        const ctx = (error as { context?: Response }).context;
        if (ctx) {
          status = ctx.status ?? 0;
          if (ctx.json) payload = await ctx.json().catch(() => null);
        }
      }
      const version = contractOf(payload);
      out.push({
        name,
        version,
        reachable: payload !== null && payload !== undefined,
        // Our own 401 is stamped. An unstamped one came from the platform,
        // which means the request never reached the function at all.
        gatewayRejected: status === 401 && version === null,
      });
    } catch {
      out.push({ name, version: null, reachable: false, gatewayRejected: false });
    }
  }
  return out;
};
