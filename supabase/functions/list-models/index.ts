// Supabase Edge Function: list-models
//
// Returns the chat models the user's own API key can access, per provider, so
// the app can show every available model (not just presets). BYOK; key is used
// transiently. Deploy with verify_jwt OFF (see SETUP.md).

import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Origins allowed to call this function.
 *
 * Set ALLOWED_ORIGINS as a comma-separated list of your deployed app's origins
 * to lock this down. Left unset it allows any origin, which is safe enough only
 * because requireUser below rejects anyone without a valid session for THIS
 * project — but setting it is worth the thirty seconds.
 */
const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((o) => o.trim()).filter(Boolean);

const corsFor = (req: Request) => {
  const origin = req.headers.get('Origin') ?? '';
  const allow = ALLOWED.length === 0 ? '*' : ALLOWED.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
};

/**
 * Identify the caller and REQUIRE a real signed-in user.
 *
 * These functions deploy with verify_jwt off, because the browser calls them
 * with the anon key. The platform therefore performs no auth at all and this is
 * the only gate. Without it the function is an open relay: anyone who finds the
 * URL can post an arbitrary provider, key and prompt and have someone else's
 * project make the outbound call, burning their invocation quota and lending
 * their domain to whatever the caller is doing.
 *
 * Deliberately duplicated rather than shared: the setup wizard hands these
 * sources to the user as copy-paste text, so a cross-file import would not
 * survive the install.
 */
async function requireUser(req: Request): Promise<string | null> {
  try {
    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data } = await client.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}


type Provider = 'gemini' | 'openai' | 'anthropic';

const json = (body: unknown, status = 200, cors: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

async function openaiModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data?.data ?? [])
    .map((m: { id: string }) => m.id)
    .filter((id: string) => /^(gpt-|o\d|chatgpt)/i.test(id) && !/(audio|realtime|transcribe|tts|image|embedding|moderation)/i.test(id))
    .sort();
}

async function anthropicModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
  });
  if (!res.ok) throw new Error(`Anthropic: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data?.data ?? []).map((m: { id: string }) => m.id).sort();
}

async function geminiModels(apiKey: string): Promise<string[]> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`);
  if (!res.ok) throw new Error(`Gemini: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data?.models ?? [])
    .filter((m: { supportedGenerationMethods?: string[] }) =>
      (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m: { name: string }) => m.name.replace(/^models\//, ''))
    .filter((n: string) => n.startsWith('gemini'))
    .sort();
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  const userId = await requireUser(req);
  if (!userId) return json({ error: 'Sign in to list models.' }, 401, cors);

  try {
    const { provider, apiKey } = (await req.json()) as { provider?: Provider; apiKey?: string };
    const key = (apiKey ?? '').trim();
    if (!key) return json({ error: 'An API key is required.' }, 400, cors);

    let models: string[];
    if (provider === 'openai') models = await openaiModels(key);
    else if (provider === 'anthropic') models = await anthropicModels(key);
    else if (provider === 'gemini') models = await geminiModels(key);
    else return json({ error: 'A valid provider is required.' }, 400, cors);

    return json({ models }, 200, cors);
  } catch (err) {
    console.error('list-models failed:', err);
    return json({ error: err instanceof Error ? err.message : 'Failed to list models.' }, 500, cors);
  }
});
