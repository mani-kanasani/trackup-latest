// Supabase Edge Function: generate-proposal
//
// Replaces the old n8n webhook. Given a job posting and a user-supplied API key,
// it generates the proposal materials with the chosen provider (Gemini / OpenAI /
// Anthropic), renders the written proposal to a PDF, uploads it to the public
// `proposals` Storage bucket, and returns the same shape the app already consumes.
//
// The API key is supplied per-request by the client and is used transiently — it
// is never logged or stored.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Provider = 'gemini' | 'openai' | 'anthropic';

/** One key the model must return, sent by the caller from the method pack. */
interface OutputStep {
  key: string;
  label: string;
  purpose: string;
  maxChars?: number;
  constraints?: string[];
}

interface GenerateInput {
  job_title?: string;
  job_summary?: string;
  context?: string;
  systemPrompt?: string;
  /** The output contract, derived from the pack. */
  steps?: OutputStep[];
  /** Which of those steps compose the marketplace message, in order. */
  letterKeys?: string[];
  provider?: Provider;
  model?: string;
  apiKey?: string;
}

interface ProposalContent {
  title: string;
  cover_letter: string;
  /** Every step the pack asked for, keyed by step key. Graded by the validator. */
  steps: Record<string, string>;
  proposal_sections: { heading: string; body: string }[];
  mermaid_code: string;
  video_script: string;
}

const DEFAULT_MODEL: Record<Provider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5',
};

// Fallback only. The client normally composes a full method-backed system prompt
// (src/lib/method/compose.ts) and sends it as `systemPrompt`. This must never
// name a specific person: every user of this app is a different sender.
const SYSTEM_PROMPT =
  'You are writing proposal materials that the sender will submit under their own name on a freelance marketplace. ' +
  'Write in their voice, grounded only in the background they supply. Never invent a credential, a client, a metric or an asset. ' +
  'You always reply with a single valid JSON object and nothing else (no markdown, no code fences).';

/**
 * Turns the pack's steps into the JSON contract.
 *
 * The marketplace message used to be requested as one 150-250 word blob, which
 * meant the doctrine's per-part rules — the ceiling on the hook, the demand that
 * proof be matched, the ban on claiming an asset that does not exist — had
 * nothing to attach to and the validator had nothing to grade. Asking for each
 * step separately gives every part its own job, ceiling and constraints, and the
 * letter is assembled from them afterwards.
 */
const shapeFromSteps = (steps: OutputStep[]): string =>
  steps
    .map((s) => {
      const cap = s.maxChars ? ` MAX ${s.maxChars} characters.` : '';
      const cons = s.constraints?.length ? ` ${s.constraints.join(' ')}` : '';
      return `  ${JSON.stringify(s.key)}: ${JSON.stringify(`${s.label}. ${s.purpose}${cap}${cons}`)}`;
    })
    .join(',\n');

const buildUserPrompt = (
  jobTitle: string,
  jobSummary: string,
  context: string,
  steps: OutputStep[],
): string =>
  `Write proposal materials for this marketplace job.
${context ? `\nBackground about me / my agency (weave in for credibility, proof and specifics):\n${context}\n` : ''}
Job title:
${jobTitle}

Job description:
${jobSummary}

Return ONLY a JSON object with exactly these keys, and every one of them:

{
  "title": "Short, specific name for the system you would build, for example 'Automated Lead-Routing System'. Max 8 words.",
${shapeFromSteps(steps)},
  "proposal_sections": [
    { "heading": "Section title", "body": "2-5 sentences." }
  ],
  "mermaid_code": "A Mermaid.js flowchart of the proposed workflow. MUST start with 'graph TD;'. Flowchart only. No backticks, no the word mermaid.",
  "video_script": "A 45-90 second screen-recording script in the sender's own voice, walking the client through the approach. Optional for them to record; write it so it stands alone if they do."
}

For proposal_sections, produce 4-7 sections such as: Overview, Understanding Your Needs, Proposed Approach, How It Works, Relevant Experience, and Next Steps. Be specific to THIS job, referencing concrete details from the description.`;

// --- Provider adapters -------------------------------------------------------

// OpenAI and Gemini share the OpenAI-compatible Chat Completions interface.
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  userPrompt: string,
  useJsonMode: boolean,
): Promise<string> {
  const send = (jsonMode: boolean) => {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
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

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.7,
      system: system,
      messages: [
        {
          role: 'user',
          content: `${userPrompt}\n\nRespond with ONLY the raw JSON object — no markdown fences.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic request failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  return data?.content?.[0]?.text ?? '';
}

async function generateContent(input: Required<Pick<GenerateInput, 'provider' | 'apiKey'>> & {
  model: string;
  jobTitle: string;
  jobSummary: string;
  context: string;
  system: string;
  steps: OutputStep[];
  letterKeys: string[];
}): Promise<ProposalContent> {
  const userPrompt = buildUserPrompt(input.jobTitle, input.jobSummary, input.context, input.steps);

  let raw: string;
  if (input.provider === 'anthropic') {
    raw = await callAnthropic(input.apiKey, input.model, input.system, userPrompt);
  } else if (input.provider === 'gemini') {
    raw = await callOpenAICompatible(
      'https://generativelanguage.googleapis.com/v1beta/openai',
      input.apiKey,
      input.model,
      input.system,
      userPrompt,
      true,
    );
  } else {
    raw = await callOpenAICompatible(
      'https://api.openai.com/v1',
      input.apiKey,
      input.model,
      input.system,
      userPrompt,
      true,
    );
  }

  return parseProposal(raw, input.steps, input.letterKeys);
}

function parseProposal(raw: string, steps: OutputStep[], letterKeys: string[]): ProposalContent {
  let text = (raw ?? '').trim();

  // Strip ```json ... ``` fences if the model added them.
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }
  // Fall back to the outermost { ... } if there is extra prose.
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first > 0 || last < text.length - 1) {
    if (first >= 0 && last > first) text = text.slice(first, last + 1);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The AI returned a response that was not valid JSON. Try again.');
  }

  const sections = Array.isArray(parsed.proposal_sections)
    ? (parsed.proposal_sections as { heading?: unknown; body?: unknown }[]).map((s) => ({
        heading: String(s?.heading ?? ''),
        body: String(s?.body ?? ''),
      }))
    : [];

  // Every step the pack asked for, so the client can grade the response against
  // the same doctrine that produced it.
  const stepValues: Record<string, string> = {};
  for (const step of steps) stepValues[step.key] = String(parsed[step.key] ?? '').trim();

  // The message the user actually sends, assembled from the steps that make it
  // up. Falls back to a model-supplied cover_letter only if the caller named no
  // letter steps, which keeps an older client working.
  const assembled = letterKeys
    .map((k) => stepValues[k])
    .filter((v) => v)
    .join('\n\n');

  return {
    title: String(parsed.title ?? 'Proposal'),
    cover_letter: assembled || String(parsed.cover_letter ?? ''),
    steps: stepValues,
    proposal_sections: sections,
    mermaid_code: String(parsed.mermaid_code ?? ''),
    video_script: String(parsed.video_script ?? ''),
  };
}

// --- PDF rendering -----------------------------------------------------------

// Standard PDF fonts are WinAnsi-encoded, so strip characters they cannot draw
// (emoji, etc.) and normalise smart punctuation to keep rendering crash-free.
function sanitize(text: string): string {
  return (text ?? '')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•●▪]/g, '-')
    .replace(/\t/g, '  ')
    .replace(/[^\n\x20-\x7E]/g, '');
}

async function buildProposalPDF(content: ProposalContent): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;
  const upworkGreen = rgb(0.043, 0.624, 0.314);
  const bodyColor = rgb(0.13, 0.13, 0.13);

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const wrapLine = (text: string, drawFont: typeof font, size: number): string[] => {
    const lines: string[] = [];
    for (const word of sanitize(text).split(/\s+/)) {
      if (!word) continue;
      const current = lines.length ? lines[lines.length - 1] : '';
      const candidate = current ? `${current} ${word}` : word;
      if (current && drawFont.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(word);
      } else {
        if (lines.length) lines[lines.length - 1] = candidate;
        else lines.push(candidate);
      }
    }
    return lines.length ? lines : [''];
  };

  const drawBlock = (
    text: string,
    drawFont: typeof font,
    size: number,
    gapAfter: number,
    color = bodyColor,
  ) => {
    const lineHeight = size * 1.4;
    for (const paragraph of sanitize(text).split('\n')) {
      if (!paragraph.trim()) {
        y -= lineHeight * 0.6;
        continue;
      }
      for (const line of wrapLine(paragraph, drawFont, size)) {
        newPageIfNeeded(lineHeight);
        page.drawText(line, { x: margin, y: y - size, size, font: drawFont, color });
        y -= lineHeight;
      }
    }
    y -= gapAfter;
  };

  drawBlock(content.title || 'Proposal', fontBold, 22, 14, upworkGreen);

  for (const section of content.proposal_sections) {
    if (section.heading) {
      newPageIfNeeded(40);
      drawBlock(section.heading, fontBold, 14, 6);
    }
    if (section.body) {
      drawBlock(section.body, font, 11, 12);
    }
  }

  return await pdf.save();
}

// --- Handler -----------------------------------------------------------------

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const input = (await req.json()) as GenerateInput;
    const jobTitle = (input.job_title ?? '').trim();
    const jobSummary = (input.job_summary ?? '').trim();
    const provider = input.provider;
    const apiKey = (input.apiKey ?? '').trim();

    if (!jobTitle || !jobSummary) {
      return json({ error: 'job_title and job_summary are required.' }, 400);
    }
    if (provider !== 'gemini' && provider !== 'openai' && provider !== 'anthropic') {
      return json({ error: 'A valid provider (gemini, openai, anthropic) is required.' }, 400);
    }
    if (!apiKey) {
      return json({ error: 'An API key is required. Add one in Settings.' }, 400);
    }

    const model = (input.model ?? '').trim() || DEFAULT_MODEL[provider];

    // Identify the caller and REQUIRE a real user.
    //
    // These functions deploy with verify_jwt off, which is necessary because the
    // browser calls them with the anon key. That means the platform performs no
    // auth at all, so this check is the only gate. Falling back to an
    // 'anonymous' path, as this did previously, turned an unauthenticated call
    // into a working code path that wrote unreachable files and let a
    // session-less signup burn the user's API credits before failing to save.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return json({ error: 'Sign in before generating a proposal.' }, 401);
    }

    // The contract comes from the caller's method pack. Guessing a shape here is
    // what let the generator and the validator drift apart.
    const steps = (input.steps ?? []).filter((s) => s && typeof s.key === 'string' && s.key);
    if (!steps.length) {
      return json(
        { error: 'No output steps were supplied. Update the app so it sends the method pack structure.' },
        400,
      );
    }
    const stepKeys = new Set(steps.map((s) => s.key));
    const letterKeys = (input.letterKeys ?? []).filter((k) => stepKeys.has(k));

    const system =
      ((input.systemPrompt ?? '').trim() || SYSTEM_PROMPT) +
      ' Always reply with a single valid JSON object and nothing else (no markdown, no code fences).';
    const content = await generateContent({
      provider,
      apiKey,
      model,
      jobTitle,
      jobSummary,
      context: (input.context ?? '').trim(),
      system,
      steps,
      letterKeys,
    });

    const pdfBytes = await buildProposalPDF(content);

    // Upload with the service role: the bucket is private, so client RLS would
    // otherwise block the write.
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const path = `${userId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await admin.storage
      .from('proposals')
      .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      throw new Error(`Failed to store the proposal PDF: ${uploadError.message}`);
    }

    // A signed URL, not a public one. The link still works for a client with no
    // account, which is why the bucket was public in the first place, but it no
    // longer exposes every other proposal in the bucket. One year, because the
    // link goes into an Upwork thread that can stay live for months.
    const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
    const { data: signed, error: signError } = await admin.storage
      .from('proposals')
      .createSignedUrl(path, ONE_YEAR_SECONDS);

    if (signError || !signed?.signedUrl) {
      throw new Error(`Stored the PDF but could not create a shareable link: ${signError?.message ?? 'unknown error'}`);
    }

    return json({
      cover_letter: content.cover_letter,
      // Returned alongside the assembled letter so the client can grade each
      // part against the pack instead of grading one blob against nothing.
      steps: content.steps,
      proposal_url: signed.signedUrl,
      mermaid_code: content.mermaid_code,
      video_script: content.video_script,
    });
  } catch (err) {
    console.error('generate-proposal failed:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error generating proposal.';
    return json({ error: message }, 500);
  }
});
