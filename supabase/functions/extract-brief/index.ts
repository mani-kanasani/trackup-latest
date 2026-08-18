// Supabase Edge Function: extract-brief
//
// Reads a pasted growth sheet and returns a structured vertical brief, with
// every claim sorted by who produced it. BYOK; the key is used transiently.
// Deploy with verify_jwt OFF (see SETUP.md).
//
// This runs ONCE per brief, not per generation. That is the whole point: a
// growth sheet is about the same size as the entire method doctrine, so pasting
// it into every outreach prompt would halve the doctrine's share of what the
// model reads. Compressing it here means the cost is paid a single time.
//
// The model is not trusted with attribution. Whatever it returns is reconciled
// against the pasted text on the client, and any source it cannot be shown to
// have read is withheld rather than saved.

import { createClient } from 'npm:@supabase/supabase-js@2';

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

const CONTRACT = 3;

type Provider = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const OPENROUTER_HEADERS = {
  'HTTP-Referer': 'https://github.com/mani-kanasani/trackup-latest',
  'X-Title': 'Ember',
};

const json = (body: unknown, status = 200, cors: Record<string, string> = {}) =>
  new Response(
    JSON.stringify(
      body && typeof body === 'object' && !Array.isArray(body)
        ? { ...(body as Record<string, unknown>), __contract: CONTRACT }
        : body,
    ),
    { status, headers: { ...cors, 'Content-Type': 'application/json' } },
  );

async function readProviderError(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const body = JSON.parse(raw);
    const msg = body?.error?.message ?? body?.message ?? body?.error;
    if (typeof msg === 'string' && msg) return `${res.status}: ${msg}`;
  } catch {
    // Not JSON. The raw body still beats the status alone.
  }
  return `${res.status}: ${raw.slice(0, 200) || 'no detail returned'}`;
}

/**
 * The text out of a Messages response.
 *
 * Never index `content` positionally: thinking blocks precede text on Claude 5,
 * and adaptive thinking makes positional access fail intermittently.
 */
const textFrom = (data: { content?: { type: string; text?: string }[]; stop_reason?: string }): string => {
  if (data.stop_reason === 'max_tokens') {
    throw new Error(
      'The model ran out of output budget before finishing the brief. Paste a shorter document, ' +
        'or pick a model with more room.',
    );
  }
  const block = (data.content ?? []).find((b) => b.type === 'text');
  if (!block?.text) {
    throw new Error(`The model returned no text. stop_reason: ${data.stop_reason ?? 'unknown'}.`);
  }
  return block.text;
};

async function callAnthropic(apiKey: string, model: string, system: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      // Generous: a growth sheet in, a structured brief out, and thinking tokens
      // are billed against the same budget on Claude 5.
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: { type: 'json_object' } },
    }),
  });
  if (!res.ok) throw new Error(`Anthropic request failed. ${await readProviderError(res)}`);
  return textFrom(await res.json());
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  prompt: string,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const send = (withTemperature: boolean) => {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    };
    // Extraction wants faithfulness, not variety, so this runs cold. Reasoning
    // models reject temperature outright, hence the retry rather than an assumption.
    if (withTemperature && !/^(o\d|gpt-5)/.test(model)) body.temperature = 0.2;
    return fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
    });
  };
  let res = await send(true);
  if (!res.ok) res = await send(false);
  if (!res.ok) throw new Error(`Provider request failed. ${await readProviderError(res)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

/** Strip a markdown fence if the model wrapped its JSON in one. */
const unfence = (raw: string): string => {
  const t = raw.trim();
  if (!t.startsWith('```')) return t;
  return t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
};

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  const userId = await requireUser(req);
  if (!userId) return json({ error: 'Sign in to build a brief.' }, 401, cors);

  try {
    const input = (await req.json()) as {
      provider?: Provider;
      apiKey?: string;
      model?: string;
      document?: string;
      system?: string;
      keys?: string[];
    };

    const provider = input.provider;
    const apiKey = (input.apiKey ?? '').trim();
    const model = (input.model ?? '').trim();
    const document = (input.document ?? '').trim();

    if (!apiKey) return json({ error: 'An API key is required.' }, 400, cors);
    if (!model) return json({ error: 'Choose a model in Settings first.' }, 400, cors);
    if (provider !== 'gemini' && provider !== 'openai' && provider !== 'anthropic' && provider !== 'openrouter') {
      return json({ error: 'A valid provider is required.' }, 400, cors);
    }
    if (document.length < 200) {
      return json({ error: 'That is too short to build a brief from. Paste the whole document.' }, 400, cors);
    }

    // The instruction and the key list come from the client, for the same reason
    // the generators take their steps from the caller: the rules the model is
    // given and the rules the client enforces must not drift apart.
    const system = (input.system ?? '').trim();
    if (!system) {
      return json(
        { error: 'No extraction instructions were supplied. Update the app so it sends them.' },
        400,
        cors,
      );
    }
    const keys = input.keys?.length ? input.keys : [];

    const prompt =
      `Read the document below and return a single JSON object with exactly these keys:\n` +
      `${keys.map((k) => `  "${k}"`).join(',\n')}\n\n` +
      `Every key must be present. Use an empty string or an empty array where the document says nothing.\n\n` +
      `--- DOCUMENT START ---\n${document}\n--- DOCUMENT END ---`;

    let raw: string;
    if (provider === 'anthropic') {
      raw = await callAnthropic(apiKey, model, system, prompt);
    } else if (provider === 'gemini') {
      raw = await callOpenAICompatible(
        'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey, model, system, prompt,
      );
    } else if (provider === 'openrouter') {
      raw = await callOpenAICompatible(OPENROUTER_BASE, apiKey, model, system, prompt, OPENROUTER_HEADERS);
    } else {
      raw = await callOpenAICompatible('https://api.openai.com/v1', apiKey, model, system, prompt);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(unfence(raw));
    } catch {
      return json(
        {
          error: 'The model did not return usable JSON. Try again, or pick a different model in Settings.',
          sample: unfence(raw).slice(0, 200),
        },
        502,
        cors,
      );
    }

    return json({ brief: parsed }, 200, cors);
  } catch (err) {
    console.error('extract-brief failed:', err);
    return json({ error: err instanceof Error ? err.message : 'Failed to build the brief.' }, 500, cors);
  }
});
