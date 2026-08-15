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



/**
 * The deployed-code version.
 *
 * These functions are pasted into someone's own Supabase project, so the app has
 * no way to know which revision is actually running — and "did you redeploy?"
 * is unanswerable by looking at the screen. A response that does not carry this
 * marker is an old deployment, and the app now says so instead of leaving the
 * user to interpret a blank result.
 */
const CONTRACT = 3;

type Provider = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

/** OpenRouter speaks the OpenAI wire format, so only the base URL differs. */
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

/**
 * Optional attribution headers. OpenRouter uses them for its public model
 * rankings and shows the title in the user's own activity log, which is how
 * someone tells an Ember generation apart from everything else on the key.
 */
const openRouterHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://github.com/mani-kanasani/trackup-latest',
  'X-Title': 'Ember',
});

/**
 * Every response carries the deployed version, including errors.
 *
 * Stamping only the success path meant a function could only be identified by
 * generating successfully, which is exactly what you cannot do when something is
 * wrong. Now a 400 answers "which revision is live?" just as well as a 200, so
 * the app can check all three functions without spending a single token.
 */
const json = (body: unknown, status = 200, cors: Record<string, string> = {}) =>
  new Response(
    JSON.stringify(
      body && typeof body === 'object' && !Array.isArray(body)
        ? { ...(body as Record<string, unknown>), __contract: CONTRACT }
        : body,
    ),
    { status, headers: { ...cors, 'Content-Type': 'application/json' } },
  );

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

/**
 * OpenRouter's catalogue, narrowed to models that can actually do this job.
 *
 * Two things are different here from every other provider.
 *
 * First, /models is PUBLIC. It answers 200 with the full catalogue for a key
 * that is expired, revoked or simply wrong, so unlike the others this call
 * proves nothing about the key on its own — hence the explicit /key check
 * before it. Without that, a bad key populates a healthy-looking dropdown and
 * the failure surfaces later as a broken generation.
 *
 * Second, the catalogue is 400+ entries and not all of them can be asked for
 * JSON at all, so offering those means selling a choice that fails halfway
 * through a sequence.
 *
 * The filter is `response_format`, matching what the generator actually sends:
 * response_format: { type: 'json_object' }. It is deliberately NOT
 * `structured_outputs`, which is the flag for full json_schema support. Nothing
 * here sends a schema, so filtering on it hid 21 perfectly usable models and
 * narrowed the catalogue for no reason — the opposite of the point of adding a
 * provider that fronts every lab at once.
 */
async function openrouterModels(apiKey: string): Promise<string[]> {
  const auth = await fetch(`${OPENROUTER_BASE}/key`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!auth.ok) throw new Error(`OpenRouter: ${await readProviderError(auth)}`);

  const res = await fetch(`${OPENROUTER_BASE}/models`, { headers: openRouterHeaders(apiKey) });
  if (!res.ok) throw new Error(`OpenRouter: ${res.status} ${await res.text()}`);
  const data = await res.json();

  return (data?.data ?? [])
    .filter((m: { supported_parameters?: string[] }) =>
      (m.supported_parameters ?? []).includes('response_format'))
    .map((m: { id: string }) => m.id)
    // A leading '~' marks a floating alias whose target changes underneath you.
    // Fine for experimenting, wrong for a saved setting someone relies on.
    .filter((id: string) => typeof id === 'string' && id && !id.startsWith('~'))
    .sort();
}


/**
 * The smallest real generation the provider will accept.
 *
 * Listing models proves the key authenticates. It does not prove the CHOSEN
 * model exists, that the account has credit, or that generation is enabled —
 * and those are the failures people actually hit, discovered halfway through a
 * proposal. So this asks for one word and caps the response at a handful of
 * tokens: enough to be a true end-to-end test, cheap enough to run freely.
 */
async function probeModel(provider: Provider, apiKey: string, model: string): Promise<string> {
  const prompt = 'Reply with exactly one word: ready';

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      // Thinking tokens count toward max_tokens on Claude 5, so a tiny cap can be
      // consumed before any text is produced. 64 leaves room for one word.
      body: JSON.stringify({ model, max_tokens: 64, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) throw new Error(await readProviderError(res));
    const data = await res.json();
    // By type, never by position: thinking blocks precede text on Claude 5.
    const block = (data?.content ?? []).find((b: { type: string }) => b.type === 'text');
    return String(block?.text ?? '').trim();
  }

  const baseUrl = provider === 'openai'
    ? 'https://api.openai.com/v1'
    : provider === 'openrouter'
    ? OPENROUTER_BASE
    : 'https://generativelanguage.googleapis.com/v1beta/openai';

  // OpenAI took max_completion_tokens and deprecated max_tokens; OpenRouter
  // documents max_tokens and normalises it across every upstream lab it fronts.
  // The cap is 64 there rather than 16 because OpenRouter serves reasoning
  // models whose thinking is billed against this same budget, and a cap spent
  // before any visible text reads as a dead model rather than a small cap.
  const cap = provider === 'openrouter'
    ? { max_tokens: 64 }
    // 16 rather than 8 because on a reasoning model the cap covers reasoning
    // tokens too, and 8 can be spent before any visible text exists.
    : { max_completion_tokens: 16 };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: provider === 'openrouter'
      ? openRouterHeaders(apiKey)
      : { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, ...cap, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(await readProviderError(res));
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content ?? '').trim();
}

/** Providers put the useful sentence in different places; dig it out. */
async function readProviderError(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const body = JSON.parse(raw);
    const msg = body?.error?.message ?? body?.message ?? body?.error;
    if (typeof msg === 'string' && msg) return `${res.status}: ${msg}`;
  } catch {
    // Not JSON. The raw body is still better than the status alone.
  }
  return `${res.status}: ${raw.slice(0, 200) || 'no detail returned'}`;
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  const userId = await requireUser(req);
  if (!userId) return json({ error: 'Sign in to list models.' }, 401, cors);

  try {
    const { provider, apiKey, action, model } = (await req.json()) as {
      provider?: Provider; apiKey?: string; action?: 'list' | 'test'; model?: string;
    };
    const key = (apiKey ?? '').trim();
    if (!key) return json({ error: 'An API key is required.' }, 400, cors);
    if (provider !== 'openai' && provider !== 'anthropic' && provider !== 'gemini' && provider !== 'openrouter') {
      return json({ error: 'A valid provider is required.' }, 400, cors);
    }

    if (action === 'test') {
      const target = (model ?? '').trim();
      if (!target) return json({ error: 'Choose a model to test.' }, 400, cors);
      const reply = await probeModel(provider, key, target);
      return json({ ok: true, model: target, reply, __contract: CONTRACT }, 200, cors);
    }

    let models: string[];
    if (provider === 'openai') models = await openaiModels(key);
    else if (provider === 'anthropic') models = await anthropicModels(key);
    else if (provider === 'openrouter') models = await openrouterModels(key);
    else models = await geminiModels(key);

    return json({ models }, 200, cors);
  } catch (err) {
    console.error('list-models failed:', err);
    return json({ error: err instanceof Error ? err.message : 'Failed to list models.' }, 500, cors);
  }
});
