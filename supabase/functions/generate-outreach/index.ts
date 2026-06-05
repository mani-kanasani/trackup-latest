// Supabase Edge Function: generate-outreach
//
// Generates a LinkedIn outreach sequence (connection request + two follow-up
// DMs) from a lead's details, using the user's chosen bring-your-own-key
// provider (Gemini / OpenAI / Anthropic). Replaces the Dream 100 n8n webhooks.
//
// Deploy with verify_jwt OFF (new Supabase projects enforce the new API-key
// system, which the gateway JWT check rejects). The key is supplied per-request
// and never stored.

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
  'You are an expert B2B LinkedIn outreach copywriter for an AI automation agency. ' +
  'You write concise, human, specific, non-salesy messages that get replies. ' +
  'You always reply with a single valid JSON object and nothing else.';

const buildPrompt = (lead: LeadInput): string =>
  `Write a LinkedIn outreach sequence for this lead.

Lead details:
- Name: ${lead.name ?? ''}
- Job title: ${lead.job_title ?? ''}
- Company: ${lead.company_name ?? ''}
- Industry: ${lead.industry ?? ''}
- Company website: ${lead.company_website ?? ''}
- Services we could offer them: ${lead.potential_services ?? ''}

Return ONLY a JSON object with exactly these keys:
{
  "connection_request": "LinkedIn connection-request note, MAX 280 characters. Personal, references something specific about them or their company, NO pitch.",
  "dm_2": "Follow-up DM after they accept. 2-4 sentences. Build rapport, hint at how you help companies like theirs, end with a soft question.",
  "dm_3": "Second follow-up DM. 2-4 sentences. Offer a concrete, relevant idea or resource and propose a quick call."
}

Be specific to THIS lead. Avoid generic openers like "I came across your profile".`;

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  useJsonMode: boolean,
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
  };
  if (useJsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
      max_tokens: 1500,
      temperature: 0.8,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `${prompt}\n\nRespond with ONLY the raw JSON object.` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data?.content?.[0]?.text ?? '';
}

function parseOutreach(raw: string): { connection_request: string; dm_2: string; dm_3: string } {
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
  return {
    connection_request: String(parsed.connection_request ?? ''),
    dm_2: String(parsed.dm_2 ?? ''),
    dm_3: String(parsed.dm_3 ?? ''),
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
    const prompt = buildPrompt(lead);

    let raw: string;
    if (provider === 'anthropic') {
      raw = await callAnthropic(apiKey, model, prompt);
    } else if (provider === 'gemini') {
      raw = await callOpenAICompatible(
        'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey,
        model,
        prompt,
        false,
      );
    } else {
      raw = await callOpenAICompatible('https://api.openai.com/v1', apiKey, model, prompt, true);
    }

    return json(parseOutreach(raw));
  } catch (err) {
    console.error('generate-outreach failed:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error generating outreach.';
    return json({ error: message }, 500);
  }
});
