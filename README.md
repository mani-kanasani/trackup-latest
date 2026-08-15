# Ember

An AI outreach suite — one login, multiple apps, all driven by a shared method engine:

- **TrackUp** — generate & track Upwork proposals (cover letter, workflow diagram, shareable PDF, video script).
- **LinkedIn DM Generator** — turn leads into personalized connection requests + a branching DM flow.

Bring your own AI key (Google Gemini free tier, OpenRouter, OpenAI, or Anthropic).

> **Want to run your own copy?** Follow **[SETUP.md](SETUP.md)** — a ~15-minute,
> copy-paste self-hosting guide written for non-technical users.

## Architecture

- **Frontend:** React + Vite + TypeScript + Tailwind
- **Storage & auth:** Supabase (Postgres + Auth + Storage)
- **AI generation:** three Supabase Edge Functions. `generate-proposal` calls the
  user's chosen provider, renders the proposal to a PDF and stores it in the
  private `proposals` bucket, returning a signed link that is shareable with a
  client who has no account. `generate-outreach` produces the LinkedIn flow.
  `list-models` fetches the provider's live model list.
- **Method engine:** every generator is driven by a channel *method pack*
  (`src/lib/method/`) carrying the laws, banned patterns and structure for that
  channel, each law citing its source. The same pack validates the model's output,
  so doctrine is enforced rather than hoped for. See `npm run method:test`.

### Bring your own key

Users pick a provider and paste their **own** API key under **Settings → AI
Provider**. Supported providers:

| Provider | Default model | Cost | Get a key |
|---|---|---|---|
| Google Gemini | `gemini-3.7-flash` | **Free tier** (no card) | https://aistudio.google.com/app/apikey |
| OpenRouter | `moonshotai/kimi-k2-0905` | Paid, ~1/5 of Claude Sonnet | https://openrouter.ai/keys |
| OpenAI | `gpt-4o-mini` | Paid | https://platform.openai.com/api-keys |
| Anthropic | `claude-sonnet-5` | Paid | https://console.anthropic.com/settings/keys |

**OpenRouter** is one key for the whole field. "Load models" returns roughly 345
models across 44 labs, verified live: OpenAI 94, Qwen 50, Google 41, Anthropic
24, Mistral 17, DeepSeek 12, GLM 12, Moonshot 7, xAI 6, plus Cohere, Nvidia,
Microsoft, MiniMax and the rest. One key, one balance, switch model whenever.

On price it sits between the free Gemini tier and the expensive options: Kimi K2
runs about $0.60 in / $2.50 out per million tokens against Claude Sonnet's
$3 / $15, and DeepSeek V4 Flash about $0.14 / $0.28, none of them capped daily.

The list is filtered to models that can return JSON on request
(`response_format`), because that is what the generator sends. It is not
filtered on full json_schema support — nothing here sends a schema, and
filtering on it hid 21 usable models for no reason.

The key is stored in the browser's `localStorage` and sent to the Edge Function
only at generation time — it is never persisted in the database.

> **Free option:** A Google AI Studio key needs no credit card. The free Flash
> tier (~1,500 requests/day) is far more than enough for everyday proposal writing.

## Setup

### 1. Install

```bash
npm install
```

Connecting to Supabase happens **in the app** on first run (see step 4), so no
`.env` is required. For local convenience you can still pre-fill one:

```bash
cp .env.example .env   # optional: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

### 2. Set up the backend

```bash
npm run setup
```

This links your Supabase project and installs the `users`/`jobs`/`leads` tables,
the private `proposals` Storage bucket, and the three Edge Functions. It runs the
Supabase CLI via `npx` (downloaded on first use — no global install or Docker
needed). The functions need no extra secrets: each request carries the user's own
AI key.

### 3. Run

```bash
npm run dev
```

On first load the app shows a **setup screen**: paste your Supabase **project URL**
and **anon (public) key** (Dashboard → Project Settings → API). Then sign up and
add your AI provider + key in **Settings** before generating your first proposal.

## Deploying (1-click)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mani-kanasani/trackup-latest)
&nbsp;
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/mani-kanasani/trackup-latest)

Static Vite site — build `npm run build`, publish `dist` (set in `netlify.toml`).

**Connecting Supabase — pick one:**

- **Sharing with other people (recommended):** bake the connection in as
  **environment variables** so every visitor connects automatically. The 1-click
  button prompts for them; for a manual deploy add them in **Netlify → Site
  configuration → Environment variables** (then redeploy):
  - `VITE_SUPABASE_URL` = your project URL (`https://YOUR-REF.supabase.co`)
  - `VITE_SUPABASE_ANON_KEY` = your **publishable** key (`sb_publishable_…`)
- **Personal / quick:** leave them unset — the app opens into a 3-step onboarding
  wizard that collects the connection (stored in **that browser only**).

Either way, your Supabase project must have the backend set up first (schema + the
three Edge Functions) — the wizard's **Copy SQL** + function steps, or
`npm run setup`. Full walkthrough: **[SETUP.md](SETUP.md)**.

> Deploy buttons build this repo's default branch — they only reflect changes once
> they're pushed.

## Local development (optional)

```bash
supabase start
supabase functions serve generate-proposal --env-file supabase/functions/.env
```
