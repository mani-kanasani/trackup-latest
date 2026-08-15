// The real thing, end to end: the actual cold-email doctrine prompt and the
// actual 13-key contract, sent to a real model, graded by the real validator.
//
//   OPENROUTER_API_KEY=sk-or-... npx esbuild scripts/smokeColdEmailLive.ts --bundle --platform=node --format=esm --outfile=node_modules/.cache/celive.mjs && node node_modules/.cache/celive.mjs [model]
//
// liveProviderTest.mjs proves a provider can return four keys from a toy
// prompt. That is not the shape this app sends. This sends the composed pack
// (17k characters of doctrine) and asks for every key the pack defines,
// including the subject line, which is the combination that actually ships.

import { buildChannelPrompt, checkAgainstMethod, outputSteps } from '../src/lib/method/forChannel';
import { getPack } from '../src/lib/method/packs';
import { subjectKey } from '../src/lib/method/types';

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) {
  console.error('Set OPENROUTER_API_KEY.');
  process.exit(1);
}
const MODEL = process.argv[2] ?? 'moonshotai/kimi-k2-0905';

let failures = 0;
const ok = (m: string, d = '') => console.log(`  PASS  ${m}${d ? `  ${d}` : ''}`);
const bad = (m: string, d = '') => {
  console.log(`  FAIL  ${m}${d ? `  ${d}` : ''}`);
  failures++;
};

// Mirrors shapeFromSteps/buildPrompt in supabase/functions/generate-outreach.
const STRATEGY_KEY = 'blank_strategy';
const shapeFromSteps = (steps: ReturnType<typeof outputSteps>): string => {
  const lines = steps.map((s) => {
    const cap = s.maxChars ? ` MAX ${s.maxChars} characters.` : '';
    const cons = s.constraints?.length ? ` ${s.constraints.join(' ')}` : '';
    return `  ${JSON.stringify(s.key)}: ${JSON.stringify(`${s.label}. ${s.purpose}${cap}${cons}`)}`;
  });
  lines.push(`  ${JSON.stringify(STRATEGY_KEY)}: ${JSON.stringify('One sentence of tactical advice.')}`);
  return `{\n${lines.join(',\n')}\n}`;
};

const built = buildChannelPrompt('coldEmail');
const steps = built.steps;
const pack = getPack('coldEmail');

const prompt = `Design a complete cold email FLOW for this lead.

Lead details:
- Name: Dana Whitfield
- Job title: Managing Partner
- Company: Whitfield & Roe CPAs
- Industry: Accounting
- Company website: whitfieldroe.com
- Services I could offer them: an AI SDR that books calls with local business owners

Return ONLY a JSON object with exactly these keys, and every one of them:
${shapeFromSteps(steps)}

Every key must be present and non-empty. Be specific to THIS lead and sound human.`;

console.log(`\n--- cold email, full doctrine, via OpenRouter / ${MODEL} ---`);
console.log(`        system prompt: ${built.systemPrompt.length} chars`);
console.log(`        keys requested: ${steps.length} + strategy`);

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/mani-kanasani/trackup-latest',
    'X-Title': 'Ember',
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: `${built.systemPrompt}\n\nAlways reply with a single valid JSON object and nothing else.` },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' },
  }),
});

if (!res.ok) {
  bad(`request rejected (${res.status})`, (await res.text()).slice(0, 400));
  process.exit(1);
}
const data = await res.json();
ok(`request accepted (${res.status})`, `served by ${data?.provider ?? 'unknown'}`);
console.log(`        tokens: ${data?.usage?.prompt_tokens} in / ${data?.usage?.completion_tokens} out`);

let text: string = data?.choices?.[0]?.message?.content ?? '';
if (text.trim().startsWith('```')) text = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '');

let parsed: Record<string, string>;
try {
  parsed = JSON.parse(text);
  ok('response is valid JSON');
} catch {
  bad('response was not valid JSON', text.slice(0, 200));
  process.exit(1);
}

const missing = steps.map((s) => s.key).filter((k) => !String(parsed[k] ?? '').trim());
if (missing.length) bad(`missing keys: ${missing.join(', ')}`);
else ok(`all ${steps.length} pack keys present and non-empty`);

// The point of the exercise.
const SK = subjectKey('openingEmail');
const subject = String(parsed[SK] ?? '').trim();
if (subject) ok('a subject line came back', JSON.stringify(subject));
else bad('NO SUBJECT LINE — the bug is not fixed');

const cap = pack.structure.find((s) => s.key === 'openingEmail')?.subject?.maxChars ?? 0;
if (subject && subject.length <= cap) ok(`subject is within its ${cap}-char ceiling`, `${subject.length} chars`);
else if (subject) bad(`subject is ${subject.length} chars against a ${cap} ceiling`);

if (subject && !/subject\s*:/i.test(String(parsed.openingEmail ?? ''))) {
  ok('the body does not repeat the subject');
} else if (subject) {
  bad('the body still writes "Subject:" inline');
}

const verdict = checkAgainstMethod('coldEmail', parsed);
(verdict.ok ? ok : bad)(
  `validator: ${verdict.ok ? 'passes' : 'fails'}`,
  `${verdict.hardCount} hard, ${verdict.softCount} soft`,
);
for (const v of verdict.violations.slice(0, 8)) {
  console.log(`        ${v.level === 'hard' ? 'HARD' : 'soft'} ${v.stepKey}: ${v.message.slice(0, 110)}`);
}

console.log(`\n        SUBJECT: ${subject}`);
console.log(`        EMAIL 1: ${String(parsed.openingEmail ?? '').replace(/\n/g, '\n                 ').slice(0, 420)}`);

console.log(failures ? `\n${failures} FAILURES\n` : '\nAll checks passed.\n');
process.exit(failures ? 1 : 0);
