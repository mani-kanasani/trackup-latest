# Ember

An AI outreach suite — one login, multiple apps:

- **TrackUp** — generate & track Upwork proposals (cover letter, workflow diagram, shareable PDF, video script).
- **LinkedIn DM Generator** — turn leads into personalized connection requests + a branching DM flow.

Bring your own AI key (Google Gemini free tier, OpenAI, or Anthropic).

> **Want to run your own copy?** Follow **[SETUP.md](SETUP.md)** — a ~15-minute,
> copy-paste self-hosting guide written for non-technical users.

## Architecture

- **Frontend:** React + Vite + TypeScript + Tailwind
- **Storage & auth:** Supabase (Postgres + Auth + Storage)
- **AI generation:** a single Supabase Edge Function (`generate-proposal`) that
  calls the user's chosen provider, renders the proposal to a PDF, and stores it
  in the public `proposals` Storage bucket. **This replaces the old n8n webhook.**

### Bring your own key

Users pick a provider and paste their **own** API key under **Settings → AI
Provider**. Supported providers:

| Provider | Default model | Cost | Get a key |
|---|---|---|---|
| Google Gemini | `gemini-2.5-flash` | **Free tier** (no card) | https://aistudio.google.com/app/apikey |
| OpenAI | `gpt-4o-mini` | Paid | https://platform.openai.com/api-keys |
| Anthropic | `claude-haiku-4-5` | Paid | https://console.anthropic.com/settings/keys |

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
the public `proposals` Storage bucket, and the three Edge Functions. It runs the
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

This is a static Vite site — build command `npm run build`, publish directory
`dist`, **no environment variables required**.

**After deploying, the site opens straight into a 3-step onboarding wizard** that
walks the user through: ① create a Supabase project → ② set up the backend
(copy-paste SQL + function, no terminal needed) → ③ connect. Then they sign up and
add a free AI key in Settings. The full click-by-click walkthrough is in
**[SETUP.md](SETUP.md)**.

> The deploy buttons build whatever is on this repo's default branch, so they only
> work once these changes are pushed. (Set `VITE_SUPABASE_*` at build time if you'd
> rather pre-connect a project and skip the wizard's connect step.)

## Local development (optional)

```bash
supabase start
supabase functions serve generate-proposal --env-file supabase/functions/.env
```
