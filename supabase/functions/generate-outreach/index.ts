// Supabase Edge Function: generate-outreach
//
// Generates a complete LinkedIn outreach FLOW for a lead — connection note + a
// blank-request strategy, an opener/value/CTA DM sequence, a bump, and two
// conditional reply branches (positive vs objection) — grounded in the user's
// own context. BYOK (Gemini / OpenAI / Anthropic). Deploy with verify_jwt OFF.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

interface RequestInput {
  lead?: LeadInput;
  context?: string;
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

const buildPrompt = (lead: LeadInput, context: string): string =>
  `Design a complete LinkedIn outreach FLOW for this lead.
${context ? `\nBackground about me / my agency (use for credibility, proof and specifics):\n${context}\n` : ''}
Lead details:
- Name: ${lead.name ?? ''}
- Job title: ${lead.job_title ?? ''}
- Company: ${lead.company_name ?? ''}
- Industry: ${lead.industry ?? ''}
- Company website: ${lead.company_website ?? ''}
- Services I could offer them: ${lead.potential_services ?? ''}

Return ONLY a JSON object with exactly these keys:
{
  "connection_note": "Connection-request note, MAX 280 chars. Personal, specific to them, NO pitch.",
  "blank_strategy": "One sentence of advice: blank (no-note) requests often accept higher — say whether to send blank for this person and how to open if so.",
  "opener": "First DM once they accept. Warm, references them, no pitch. 2-3 sentences.",
  "value": "Follow-up DM with a concrete, relevant proof point or result (use my wins/testimonials if provided). 2-4 sentences.",
  "cta": "Follow-up DM proposing a specific next step (a quick call). 1-3 sentences.",
  "bump": "A light, friendly nudge to send if they haven't replied. 1-2 sentences.",
  "reply_positive": "What to send if they reply POSITIVELY / show interest — move toward booking a call. 2-3 sentences.",
  "reply_objection": "What to send if they push back, hesitate, or say no — reframe gracefully, zero pressure, keep the door open. 2-3 sentences."
}

Be specific to THIS lead and sound human. Avoid generic openers like "I came across your profile".`;

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  useJsonMode: boolean,
): Promise<string> {
  const send = (jsonMode: boolean) => {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.8,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `${prompt}\n\nRespond with ONLY the raw JSON object.` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data?.content?.[0]?.text ?? '';
}

function parseFlow(raw: string): Record<string, string> {
  let text = (raw ?? '').trim();
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) text = text.slice(first, last + 1);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The AI returned a response that was not valid JSON. Try again.');
  }
  const s = (k: string) => String(parsed[k] ?? '');
  return {
    connection_note: s('connection_note'),
    blank_strategy: s('blank_strategy'),
    opener: s('opener'),
    value: s('value'),
    cta: s('cta'),
    bump: s('bump'),
    reply_positive: s('reply_positive'),
    reply_objection: s('reply_objection'),
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const input = (await req.json()) as RequestInput;
    const lead = input.lead ?? {};
    const provider = input.provider;
    const apiKey = (input.apiKey ?? '').trim();

    if (!lead.name || !lead.linkedin_url) {
      return json({ error: 'Lead name and LinkedIn URL are required.' }, 400);
    }
    if (provider !== 'gemini' && provider !== 'openai' && provider !== 'anthropic') {
      return json({ error: 'A valid provider (gemini, openai, anthropic) is required.' }, 400);
    }
    if (!apiKey) return json({ error: 'An API key is required. Add one in Settings.' }, 400);

    const model = (input.model ?? '').trim() || DEFAULT_MODEL[provider];
    const prompt = buildPrompt(lead, (input.context ?? '').trim());

    let raw: string;
    if (provider === 'anthropic') {
      raw = await callAnthropic(apiKey, model, prompt);
    } else if (provider === 'gemini') {
      raw = await callOpenAICompatible(
        'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey,
        model,
        prompt,
        true,
      );
    } else {
      raw = await callOpenAICompatible('https://api.openai.com/v1', apiKey, model, prompt, true);
    }

    return json(parseFlow(raw));
  } catch (err) {
    console.error('generate-outreach failed:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error generating outreach.';
    return json({ error: message }, 500);
  }
});
