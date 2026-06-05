// Supabase Edge Function: list-models
//
// Returns the chat models the user's own API key can access, per provider, so
// the app can show every available model (not just presets). BYOK; key is used
// transiently. Deploy with verify_jwt OFF (see SETUP.md).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Provider = 'gemini' | 'openai' | 'anthropic';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { provider, apiKey } = (await req.json()) as { provider?: Provider; apiKey?: string };
    const key = (apiKey ?? '').trim();
    if (!key) return json({ error: 'An API key is required.' }, 400);

    let models: string[];
    if (provider === 'openai') models = await openaiModels(key);
    else if (provider === 'anthropic') models = await anthropicModels(key);
    else if (provider === 'gemini') models = await geminiModels(key);
    else return json({ error: 'A valid provider is required.' }, 400);

    return json({ models });
  } catch (err) {
    console.error('list-models failed:', err);
    return json({ error: err instanceof Error ? err.message : 'Failed to list models.' }, 500);
  }
});
