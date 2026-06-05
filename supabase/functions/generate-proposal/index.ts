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

interface GenerateInput {
  job_title?: string;
  job_summary?: string;
  context?: string;
  provider?: Provider;
  model?: string;
  apiKey?: string;
}

interface ProposalContent {
  title: string;
  cover_letter: string;
  proposal_sections: { heading: string; body: string }[];
  mermaid_code: string;
  video_script: string;
}

const DEFAULT_MODEL: Record<Provider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5',
};

const SYSTEM_PROMPT =
  'You are Mani, an expert automation & AI systems specialist writing winning proposals on Upwork. ' +
  'Your voice is professional, confident, clear, and intelligent — never casual, generic, or filler-heavy. ' +
  'You always reply with a single valid JSON object and nothing else (no markdown, no code fences).';

const buildUserPrompt = (jobTitle: string, jobSummary: string, context: string): string =>
  `Write proposal materials for this Upwork job.
${context ? `\nBackground about me / my agency (weave in for credibility, proof and specifics):\n${context}\n` : ''}
Job title:
${jobTitle}

Job description:
${jobSummary}

Return ONLY a JSON object with exactly these keys:

{
  "title": "Short, specific name for the system/solution you'd build (e.g. 'Automated Lead-Routing System'). Max 8 words.",
  "cover_letter": "The Upwork message, 150-250 words. Greet the client, show you've built something similar, mention you recorded a short Loom video and prepared a detailed proposal document, paraphrase the core need, outline your approach in 1-2 sentences, and end with a clear call to action.",
  "proposal_sections": [
    { "heading": "Section title", "body": "2-5 sentences." }
  ],
  "mermaid_code": "A Mermaid.js flowchart of the proposed workflow. MUST start with 'graph TD;'. Flowchart only. No backticks, no the word mermaid.",
  "video_script": "A 45-90 second Loom video script in Mani's voice walking the client through the approach."
}

For proposal_sections, produce 4-7 sections such as: Overview, Understanding Your Needs, Proposed Approach, How It Works, Relevant Experience, and Next Steps. Be specific to THIS job — reference concrete details from the description.`;

// --- Provider adapters -------------------------------------------------------

// OpenAI and Gemini share the OpenAI-compatible Chat Completions interface.
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  userPrompt: string,
  useJsonMode: boolean,
): Promise<string> {
  const send = (jsonMode: boolean) => {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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
      system: SYSTEM_PROMPT,
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
}): Promise<ProposalContent> {
  const userPrompt = buildUserPrompt(input.jobTitle, input.jobSummary, input.context);

  let raw: string;
  if (input.provider === 'anthropic') {
    raw = await callAnthropic(input.apiKey, input.model, userPrompt);
  } else if (input.provider === 'gemini') {
    raw = await callOpenAICompatible(
      'https://generativelanguage.googleapis.com/v1beta/openai',
      input.apiKey,
      input.model,
      userPrompt,
      true,
    );
  } else {
    raw = await callOpenAICompatible(
      'https://api.openai.com/v1',
      input.apiKey,
      input.model,
      userPrompt,
      true,
    );
  }

  return parseProposal(raw);
}

function parseProposal(raw: string): ProposalContent {
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

  return {
    title: String(parsed.title ?? 'Proposal'),
    cover_letter: String(parsed.cover_letter ?? ''),
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

    // Identify the caller (verify_jwt is on) so we can scope the file path.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? 'anonymous';

    const content = await generateContent({
      provider,
      apiKey,
      model,
      jobTitle,
      jobSummary,
      context: (input.context ?? '').trim(),
    });

    const pdfBytes = await buildProposalPDF(content);

    // Upload with the service role so the public bucket can be written regardless
    // of client RLS.
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const path = `${userId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await admin.storage
      .from('proposals')
      .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      throw new Error(`Failed to store the proposal PDF: ${uploadError.message}`);
    }

    const { data: publicUrlData } = admin.storage.from('proposals').getPublicUrl(path);

    return json({
      cover_letter: content.cover_letter,
      proposal_url: publicUrlData.publicUrl,
      mermaid_code: content.mermaid_code,
      video_script: content.video_script,
    });
  } catch (err) {
    console.error('generate-proposal failed:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error generating proposal.';
    return json({ error: message }, 500);
  }
});
