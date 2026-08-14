// Supabase Edge Function: generate-outreach
//
// Generates a complete LinkedIn outreach FLOW for a lead, grounded in the user's
// own context. BYOK (Gemini / OpenAI / Anthropic). Deploy with verify_jwt OFF.
//
// The SHAPE of that flow is not decided here. The caller sends `steps`, derived
// from the method pack, and this function asks the model for exactly those keys.
//
// That indirection is the fix for a real defect: this function used to hardcode
// its own eight-key JSON shape while the pack described twelve differently-named
// steps. The model was told two different structures, and the validator then
// graded the response against keys nobody had asked for — reporting every step
// as "came back empty. Regenerate." on top of perfectly good copy. One contract,
// derived from the doctrine, is the only way that stays fixed.

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
const CONTRACT = 2;

type Provider = 'gemini' | 'openai' | 'anthropic';

interface LeadInput {
  name?: string;
  job_title?: string;
  company_name?: string;
  industry?: string;
  linkedin_url?: string;
  company_website?: string;
  potential_services?: string;
}

/** One key the model must return, sent by the caller from the method pack. */
interface OutputStep {
  key: string;
  label: string;
  purpose: string;
  maxChars?: number;
  constraints?: string[];
}

interface RequestInput {
  lead?: LeadInput;
  context?: string;
  systemPrompt?: string;
  /** The output contract, derived from the pack. */
  steps?: OutputStep[];
  provider?: Provider;
  model?: string;
  apiKey?: string;
}

const DEFAULT_MODEL: Record<Provider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5',
};

const SYSTEM_PROMPT =
  'You are an expert B2B LinkedIn outreach strategist and copywriter. You write concise, human, ' +
  'specific, non-salesy messages that get replies, and you design smart multi-step flows with ' +
  'branches for how prospects respond. You always reply with a single valid JSON object and nothing else.';

/** Kept alongside the pack's steps: tactical advice, not a message to send. */
const STRATEGY_KEY = 'blank_strategy';
const STRATEGY_SPEC =
  'One sentence of advice. Blank connection requests, with no note, often accept at a higher rate. ' +
  'Say whether to send blank for this specific person, and how to open if so.';

/**
 * Turns the pack's steps into the JSON contract.
 *
 * Each key carries its own purpose, character ceiling and constraints, so the
 * model is told what every field is FOR rather than being handed one blob and
 * a word count.
 */
const shapeFromSteps = (steps: OutputStep[]): string => {
  const lines = steps.map((s) => {
    const cap = s.maxChars ? ` MAX ${s.maxChars} characters.` : '';
    const cons = s.constraints?.length ? ` ${s.constraints.join(' ')}` : '';
    return `  ${JSON.stringify(s.key)}: ${JSON.stringify(`${s.label}. ${s.purpose}${cap}${cons}`)}`;
  });
  lines.push(`  ${JSON.stringify(STRATEGY_KEY)}: ${JSON.stringify(STRATEGY_SPEC)}`);
  return `{\n${lines.join(',\n')}\n}`;
};

const buildPrompt = (lead: LeadInput, context: string, steps: OutputStep[]): string =>
  `Design a complete LinkedIn outreach FLOW for this lead.
${context ? `\nBackground about me / my agency (use for credibility, proof and specifics):\n${context}\n` : ''}
Lead details:
- Name: ${lead.name ?? ''}
- Job title: ${lead.job_title ?? ''}
- Company: ${lead.company_name ?? ''}
- Industry: ${lead.industry ?? ''}
- Company website: ${lead.company_website ?? ''}
- Services I could offer them: ${lead.potential_services ?? ''}

Return ONLY a JSON object with exactly these keys, and every one of them:
${shapeFromSteps(steps)}

Every key must be present and non-empty. Be specific to THIS lead and sound human.
Avoid generic openers like "I came across your profile".`;

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  prompt: string,
  useJsonMode: boolean,
): Promise<string> {
  const send = (jsonMode: boolean) => {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
    };
    if (jsonMode) body.response_format = { type: 'json_object' };
    return fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  // Ask for strict JSON; if the model rejects response_format, retry without it.
  let res = await send(useJsonMode);
  if (!res.ok && useJsonMode) res = await send(false);
  if (!res.ok) throw new Error(`Provider request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(apiKey: string, model: string, system: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      // Twelve steps, several with a 400-700 character ceiling, plus JSON
      // structure. At 2000 the response was truncated mid-object and every step
      // came back empty, which the app then reported as twelve things to fix.
      max_tokens: 8000,
      temperature: 0.8,
      system: system,
      // Prefilling the assistant turn with an opening brace is Anthropic's
      // equivalent of OpenAI's json_object mode: the reply continues from "{",
      // so there is no position in which a preamble can be written. Without it,
      // a 17,000-character system prompt of prose doctrine reliably produces a
      // sentence or two before the JSON, and the parse fails.
      messages: [
        { role: 'user', content: `${prompt}\n\nRespond with ONLY the raw JSON object.` },
        { role: 'assistant', content: '{' },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  // Put back the brace the prefill consumed.
  return `{${data?.content?.[0]?.text ?? ''}`;
}

function parseFlow(raw: string, steps: OutputStep[]): Record<string, string> {
  let text = (raw ?? '').trim();
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) text = text.slice(first, last + 1);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      // The raw reply, trimmed. Without it "not valid JSON" is unactionable:
      // a refusal, a preamble and a truncation all look identical from outside.
      `The model did not return usable JSON. It replied with: ${text.slice(0, 300)}${text.length > 300 ? '…' : ''}`,
    );
  }
  const out: Record<string, string> = {};
  let filled = 0;
  for (const step of steps) {
    const v = String(parsed[step.key] ?? '').trim();
    out[step.key] = v;
    if (v) filled++;
  }
  out[STRATEGY_KEY] = String(parsed[STRATEGY_KEY] ?? '');

  // A response that parses but carries none of the requested keys is a failure,
  // and it used to be saved as a full set of empty strings — which the app then
  // reported as twelve separate things to fix, with no hint that the real problem
  // was upstream. Say what actually came back instead.
  if (filled === 0) {
    const got = Object.keys(parsed).slice(0, 8).join(', ') || 'nothing';
    throw new Error(
      `The model replied but used none of the requested fields. It returned: ${got}. ` +
        'This usually means the response was cut short or the model ignored the format. ' +
        'Try again, or pick a stronger model in Settings.',
    );
  }
  // A partial response is worth keeping, but the user should know it is partial
  // rather than discover it as a list of empty steps.
  if (filled < steps.length) {
    out.__partial = `${filled} of ${steps.length} steps came back. The rest were left empty by the model.`;
  }
  return out;
}

const json = (body: unknown, status = 200, cors: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  const userId = await requireUser(req);
  if (!userId) return json({ error: 'Sign in before generating outreach.' }, 401, cors);

  try {
    const input = (await req.json()) as RequestInput;
    const lead = input.lead ?? {};
    const provider = input.provider;
    const apiKey = (input.apiKey ?? '').trim();

    if (!lead.name || !lead.linkedin_url) {
      return json({ error: 'Lead name and LinkedIn URL are required.' }, 400, cors);
    }
    if (provider !== 'gemini' && provider !== 'openai' && provider !== 'anthropic') {
      return json({ error: 'A valid provider (gemini, openai, anthropic) is required.' }, 400, cors);
    }
    if (!apiKey) return json({ error: 'An API key is required. Add one in Settings.' }, 400, cors);

    // The contract comes from the caller's method pack. Without it there is no
    // honest shape to ask for, and guessing one is what produced the drift this
    // parameter exists to end.
    const steps = (input.steps ?? []).filter((s) => s && typeof s.key === 'string' && s.key);
    if (!steps.length) {
      return json(
        { error: 'No output steps were supplied. Update the app so it sends the method pack structure.' },
        400,
        cors,
      );
    }

    const model = (input.model ?? '').trim() || DEFAULT_MODEL[provider];
    const system =
      ((input.systemPrompt ?? '').trim() || SYSTEM_PROMPT) +
      ' Always reply with a single valid JSON object and nothing else.';
    const prompt = buildPrompt(lead, (input.context ?? '').trim(), steps);

    let raw: string;
    if (provider === 'anthropic') {
      raw = await callAnthropic(apiKey, model, system, prompt);
    } else if (provider === 'gemini') {
      raw = await callOpenAICompatible(
        'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey,
        model,
        system,
        prompt,
        true,
      );
    } else {
      raw = await callOpenAICompatible('https://api.openai.com/v1', apiKey, model, system, prompt, true);
    }

    return json({ ...parseFlow(raw, steps), __contract: String(CONTRACT) }, 200, cors);
  } catch (err) {
    console.error('generate-outreach failed:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error generating outreach.';
    return json({ error: message }, 500, cors);
  }
});
