// Runtime Supabase connection config.
//
// Lets anyone who deploys this app (Netlify, Cloudflare Pages, etc.) point it at
// their own Supabase project by entering the URL + anon key in the app itself —
// no rebuild and no env vars required. Build-time env vars are still honoured as
// a fallback, so local `.env` development keeps working unchanged.
//
// The anon key is public by design (access is controlled by Row Level Security),
// so storing it in the browser is safe.

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const STORAGE_KEY = 'trackup.supabase';

const normalizeUrl = (url: string): string => url.trim().replace(/\/+$/, '');

const envConfig = (): SupabaseConfig | null => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && anonKey ? { url: normalizeUrl(url), anonKey: anonKey.trim() } : null;
};

export const getSupabaseConfig = (): SupabaseConfig | null => {
  // Build-time env (a developer's .env, or a pre-connected deploy) wins, so a
  // stale browser-cached connection can never override it or wedge the app.
  const env = envConfig();
  if (env) return env;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SupabaseConfig>;
      if (parsed.url && parsed.anonKey) {
        return { url: normalizeUrl(parsed.url), anonKey: parsed.anonKey.trim() };
      }
    }
  } catch {
    // ignore
  }
  return null;
};

export const isSupabaseConfigured = (): boolean => getSupabaseConfig() !== null;

export const saveSupabaseConfig = (config: SupabaseConfig): void => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ url: normalizeUrl(config.url), anonKey: config.anonKey.trim() }),
  );
};

export const clearSupabaseConfig = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const looksLikeSupabaseUrl = (url: string): boolean => /^https?:\/\/.+/.test(url.trim());

// Lightweight connectivity check: a valid URL + anon key returns 200 from the
// auth settings endpoint.
export const testSupabaseConnection = async (
  config: SupabaseConfig,
): Promise<{ ok: boolean; message: string }> => {
  try {
    const res = await fetch(`${normalizeUrl(config.url)}/auth/v1/settings`, {
      headers: { apikey: config.anonKey.trim() },
    });
    if (res.ok) return { ok: true, message: 'Connected to Supabase successfully.' };
    if (res.status === 401) return { ok: false, message: 'That anon key is not valid for this project.' };
    return { ok: false, message: `Supabase responded with status ${res.status}.` };
  } catch {
    return { ok: false, message: 'Could not reach that URL. Double-check the project URL.' };
  }
};
