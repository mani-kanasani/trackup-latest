// Sends the REAL request shape to the real APIs, from here, before deploying.
//
//   node scripts/liveProviderTest.mjs
//
// Reads ANTHROPIC_API_KEY and GEMINI_API_KEY from the environment. This exists
// because every provider bug this week was found by deploying and watching it
// fail, which costs a full install cycle per attempt. The request bodies below
// are copied from the edge functions deliberately: if this passes and the
// deployed function fails, the difference is deployment, not the contract.

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
// Optional. OpenRouter's catalogue is public, so the preset check runs with or
// without a key; only the generation tests need one.
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// A realistic subset of the LinkedIn pack: enough keys to exercise the schema,
// short enough to be cheap.
const KEYS = ['connectionNote', 'openerDm', 'proofDm', 'closeFileDm'];

const SYSTEM =
  'You are writing a LinkedIn outreach flow. Your output is sent to a real buyer by a real ' +
  'operator, so it has to work, not merely read well. Write plainly. No em dashes. ' +
  'Re-read your output once and fix anything that violates that. Do all of that silently: your ' +
  'reply must contain the finished artifact and nothing else.';

const PROMPT = `Design a LinkedIn outreach flow for this lead.
Lead: Dana Reed, Head of Operations at Northbeam Freight, logistics.
Return ONLY a JSON object with exactly these keys, and every one of them:
{
  "connectionNote": "Connection request note. MAX 200 characters. No pitch.",
  "openerDm": "First DM after they accept. Earn a reply and nothing else. MAX 600 characters.",
  "proofDm": "Second DM. One reason to believe you, matched to their world. MAX 700 characters.",
  "closeFileDm": "Third DM, closing the file. Convert silence into a dated answer. MAX 500 characters."
}`;

const jsonSchemaFor = (keys) => ({
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: Object.fromEntries(keys.map((k) => [k, { type: 'string' }])),
    required: keys,
    additionalProperties: false,
  },
});

const textFrom = (data) => {
  const block = (data.content ?? []).find((b) => b.type === 'text');
  if (!block?.text) {
    throw new Error(`No text block. stop_reason=${data.stop_reason}. blocks=${(data.content ?? []).map((b) => b.type).join(',')}`);
  }
  return block.text;
};

const line = (s) => console.log(s);
const ok = (s) => console.log(`  PASS  ${s}`);
const bad = (s) => console.log(`  FAIL  ${s}`);

let failures = 0;

async function testAnthropic(model) {
  line(`\n--- Anthropic / ${model} ---`);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      // No temperature, no assistant prefill: both are rejected on Claude 5.
      system: SYSTEM,
      output_config: { format: jsonSchemaFor(KEYS) },
      messages: [{ role: 'user', content: PROMPT }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    bad(`request rejected (${res.status})`);
    line(`        ${body.slice(0, 400)}`);
    failures++;
    return;
  }

  const data = await res.json();
  ok(`request accepted (${res.status})`);
  line(`        content blocks: ${(data.content ?? []).map((b) => b.type).join(', ') || 'none'}`);

  let text;
  try {
    text = textFrom(data);
    ok('text block found by type');
  } catch (e) {
    bad(String(e.message));
    failures++;
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
    ok('response is valid JSON with no preamble');
  } catch {
    bad('response was not valid JSON');
    line(`        starts: ${text.slice(0, 160)}`);
    failures++;
    return;
  }

  const missing = KEYS.filter((k) => !String(parsed[k] ?? '').trim());
  if (missing.length) {
    bad(`missing keys: ${missing.join(', ')}`);
    failures++;
  } else {
    ok(`all ${KEYS.length} requested keys present and non-empty`);
  }
  line(`        connectionNote: "${String(parsed.connectionNote).slice(0, 90)}..."`);
  if (/[—–]/.test(text)) line('        note: output contains an em/en dash (the validator would flag it)');
}

async function testGemini(model) {
  line(`\n--- Gemini / ${model} (OpenAI compatibility) ---`);
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GEMINI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: PROMPT },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    bad(`request rejected (${res.status})`);
    line(`        ${body.slice(0, 400)}`);
    failures++;
    return;
  }

  const data = await res.json();
  ok(`request accepted (${res.status})`);
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (!text) {
    bad('no content returned');
    failures++;
    return;
  }

  let cleaned = text.trim();
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
    ok('response is valid JSON');
  } catch {
    bad('response was not valid JSON (json_object may be ignored on this endpoint)');
    line(`        starts: ${cleaned.slice(0, 160)}`);
    failures++;
    return;
  }
  const missing = KEYS.filter((k) => !String(parsed[k] ?? '').trim());
  if (missing.length) {
    bad(`missing keys: ${missing.join(', ')}`);
    failures++;
  } else {
    ok(`all ${KEYS.length} requested keys present and non-empty`);
  }
}

async function testOpenRouter(model) {
  line(`\n--- OpenRouter / ${model} ---`);
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/mani-kanasani/trackup-latest',
      'X-Title': 'Ember',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: PROMPT },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    bad(`request rejected (${res.status})`);
    line(`        ${body.slice(0, 400)}`);
    failures++;
    return;
  }

  const data = await res.json();
  ok(`request accepted (${res.status})`);
  // OpenRouter reports which upstream actually served the request, and that is
  // worth seeing: a model can be routed to a different provider than expected.
  if (data?.provider) line(`        served by: ${data.provider}`);

  const text = data?.choices?.[0]?.message?.content ?? '';
  if (!text) {
    bad('no content returned');
    failures++;
    return;
  }

  let cleaned = text.trim();
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
    ok('response is valid JSON');
  } catch {
    bad('response was not valid JSON');
    line(`        starts: ${cleaned.slice(0, 160)}`);
    failures++;
    return;
  }
  const missing = KEYS.filter((k) => !String(parsed[k] ?? '').trim());
  if (missing.length) {
    bad(`missing keys: ${missing.join(', ')}`);
    failures++;
  } else {
    ok(`all ${KEYS.length} requested keys present and non-empty`);
  }
}

async function testModelList() {
  line('\n--- Model lists (what the app offers must exist) ---');

  const a = await fetch('https://api.anthropic.com/v1/models?limit=100', {
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
  });
  if (a.ok) {
    const ids = ((await a.json()).data ?? []).map((m) => m.id);
    ok(`Anthropic lists ${ids.length} models`);
    for (const preset of ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5', 'claude-fable-5']) {
      const live = ids.some((id) => id === preset || id.startsWith(preset));
      (live ? ok : bad)(`preset ${preset} ${live ? 'exists' : 'NOT FOUND in the live list'}`);
      if (!live) failures++;
    }
  } else {
    bad(`Anthropic model list failed (${a.status})`);
    failures++;
  }

  const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`);
  if (g.ok) {
    const ids = ((await g.json()).models ?? []).map((m) => m.name.replace(/^models\//, ''));
    ok(`Gemini lists ${ids.length} models`);
    for (const preset of ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro']) {
      const live = ids.includes(preset);
      (live ? ok : bad)(`preset ${preset} ${live ? 'exists' : 'NOT FOUND in the live list'}`);
      if (!live) failures++;
    }
  } else {
    bad(`Gemini model list failed (${g.status})`);
    failures++;
  }

  // No key needed: this catalogue is public. That is exactly why the app checks
  // the key separately against /key before trusting a populated dropdown.
  const o = await fetch(`${OPENROUTER_BASE}/models`);
  if (o.ok) {
    const all = (await o.json()).data ?? [];
    const usable = all
      .filter((m) => (m.supported_parameters ?? []).includes('structured_outputs'))
      .map((m) => m.id);
    ok(`OpenRouter lists ${all.length} models, ${usable.length} of them able to honour a JSON schema`);
    for (const preset of OPENROUTER_PRESETS) {
      const live = usable.includes(preset);
      (live ? ok : bad)(`preset ${preset} ${live ? 'exists and supports structured output' : 'NOT USABLE (missing, or cannot do structured output)'}`);
      if (!live) failures++;
    }
  } else {
    bad(`OpenRouter model list failed (${o.status})`);
    failures++;
  }

  if (OPENROUTER_KEY) {
    const k = await fetch(`${OPENROUTER_BASE}/key`, { headers: { Authorization: `Bearer ${OPENROUTER_KEY}` } });
    (k.ok ? ok : bad)(`OpenRouter key ${k.ok ? 'authenticates' : `rejected (${k.status})`}`);
    if (!k.ok) failures++;
  }
}

if (!ANTHROPIC_KEY || !GEMINI_KEY) {
  console.error('Set ANTHROPIC_API_KEY and GEMINI_API_KEY in the environment.');
  process.exit(1);
}

// Every model a user can pick from the Settings dropdown.
//
// Testing one model per provider and calling it done is how "works on my
// default" ships. A user switching model must not be the thing that discovers
// that structured outputs behave differently on a 4.5-generation model, or that
// an older Gemini ignores response_format.
const ANTHROPIC_PRESETS = ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5', 'claude-fable-5'];
const GEMINI_PRESETS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];
// Must stay in step with PROVIDER_META.openrouter.modelOptions in src/lib/aiConfig.ts.
const OPENROUTER_PRESETS = [
  'moonshotai/kimi-k2-0905',
  'moonshotai/kimi-k3',
  'deepseek/deepseek-v4-flash-0731',
  'z-ai/glm-5.2',
  'openai/gpt-oss-20b:free',
];

await testModelList();
for (const m of ANTHROPIC_PRESETS) await testAnthropic(m);
for (const m of GEMINI_PRESETS) await testGemini(m);
if (OPENROUTER_KEY) {
  for (const m of OPENROUTER_PRESETS) await testOpenRouter(m);
} else {
  line('\n--- OpenRouter generation tests skipped: set OPENROUTER_API_KEY to run them ---');
}

line(failures ? `\n${failures} FAILURES\n` : '\nEverything passed. The contracts are correct; deploy with confidence.\n');
process.exit(failures ? 1 : 0);
