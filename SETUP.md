# Self-hosting Ember

This guide walks you through running your **own** copy of Ember — your own
database, your own deployment. It takes about **15 minutes**. You'll use the
command line for one step, but every command is copy-paste.

When you're done you'll have:
- A free Supabase project holding your data
- The app deployed to a public URL (Netlify)
- Proposals generated with **your own AI key** (a free Google Gemini key works)

---

## What you need

- **Node.js 18 or newer** — check with `node -v`. Install from [nodejs.org](https://nodejs.org) if needed.
- **git** — check with `git --version`.
- A free **GitHub** account ([github.com](https://github.com))
- A free **Supabase** account ([supabase.com](https://supabase.com))
- A free **Google Gemini** API key — get one later at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

> You do **not** need Docker, and you don't pay for anything on the free tiers.

---

## Step 1 — Get the code

1. Open the Ember repo on GitHub and click **Fork** (top-right) to copy it into your account.
2. Clone your fork to your computer and open it:

   ```bash
   git clone https://github.com/YOUR-USERNAME/trackup-latest.git
   cd trackup-latest
   npm install
   ```

   The setup script runs the Supabase CLI via `npx` (downloaded on first use), so
   there's nothing else to install globally.

---

## Step 2 — Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click **New project**.
2. Give it a name (e.g. `trackup`), and **set a database password** — write it down, you'll need it in Step 3.
3. Pick a region near you and click **Create new project**. Wait ~2 minutes for it to finish setting up.
4. Once ready, go to **Project Settings → API** and keep this tab open. You'll need two values shortly:
   - **Project URL** (looks like `https://abcd1234efgh5678.supabase.co`)
   - **API key** — for **newer projects** use the **publishable** key (`sb_publishable_…`); the AI
     functions reject the legacy anon key. Older projects can use the **anon** key (`eyJ…`).

---

## Step 3 — Set up the backend (one command)

From inside the project folder, run:

```bash
npm run setup
```

It will:

1. **Ask for your project URL** — paste the Project URL from Step 2.
2. **Log you in** — a browser window opens; approve it and paste the token back if asked.
3. **Ask for your database password** — the one you set in Step 2.
4. Install everything: the database tables, the `proposals` storage bucket, and the `generate-proposal` function.

When it prints **✓ Backend ready!**, this step is done.

<details>
<summary><b>Prefer no command line? Do it from the dashboard instead.</b></summary>

1. **Database:** In Supabase, open **SQL Editor → New query**. Open each file in
   `supabase/migrations/` (in date order), paste its contents, and click **Run**.
2. **Functions:** Open **Edge Functions → Deploy a new function → Via editor** and
   create **three** functions — `generate-proposal`, `generate-outreach`, and `list-models`. For each:
   change the dashboard's random name (e.g. `swift-handler`) to the exact name, paste
   the contents of the matching `supabase/functions/<name>/index.ts`, **turn OFF
   "Verify JWT"**, and click **Deploy**. (New Supabase projects reject the gateway JWT
   check, so it must be off or every call returns 401.)

</details>

---

## Step 4 — Deploy the app (Netlify)

The easiest path uses your GitHub fork — no commands:

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Connect **GitHub** and pick your `trackup-latest` fork.
3. Confirm the build settings (Netlify usually detects these):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Click **Deploy**. After a minute you'll get a public URL like `https://your-app.netlify.app`.

> **Sharing this with other people?** Bake your connection in as environment
> variables so every visitor connects automatically — the in-app wizard only saves
> it in *your* browser. In **Netlify → Site configuration → Environment variables**,
> add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (your **publishable** key),
> then redeploy. The 1-click "Deploy to Netlify" button prompts for these. Skip them
> for personal use and connect via the wizard (Step 5). (Cloudflare Pages and Vercel
> work the same way.)

---

## Step 5 — First run

1. Open your deployed URL. You'll see a **"Connect Supabase"** screen.
2. Paste your **Project URL** and **anon public** key from Step 2, click **Test connection**, then **Save & continue**.
3. **Sign up** with an email + password — this creates your account in *your* Supabase project.
4. Go to **Settings → AI Provider**, choose **Google Gemini (free tier)**, and paste your Gemini key
   (get one at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)). Click **Save AI Settings**.
5. Go to **Apply**, paste a job, and click **Generate Proposal**. 🎉

That's it — you're self-hosted.

---

## Sharing it with your own users

Anyone you give your Netlify URL to will see the same **Connect Supabase** screen.
If you want them on *your* database, either tell them your Project URL + anon key,
or pre-fill it so the screen is skipped: in Netlify, go to **Site settings →
Environment variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and
redeploy. Each person still adds their own AI key in Settings.

---

## Updating later

When the code changes, pull and redeploy:

```bash
git pull
npm install
npm run setup   # only needed if the database or function changed
```

Netlify automatically rebuilds when you push to your GitHub fork.

---

## Troubleshooting

| Symptom | Cause & fix |
|---|---|
| **"Failed to send a request to the Edge Function"** | The function isn't on the project you're connected to, or it has the wrong name. It must be named exactly `generate-proposal` / `generate-outreach`. If the dashboard created it as `swift-handler` (or similar), delete that and recreate with the correct name. Or re-run `npm run setup`. |
| **401 / "Invalid credentials" / "Invalid JWT" when generating** | On newer Supabase projects: (a) use the **publishable** key (`sb_publishable_…`), not the legacy anon key — the Functions gateway rejects the anon key; and (b) turn **OFF "Verify JWT"** on both functions. |
| **Blank page / "Connect Supabase" keeps showing** | The URL or anon key is wrong. In the app, the URL must start with `https://` and end in `.supabase.co`; the anon key starts with `eyJ`. |
| **`npm run setup` fails at "Linking"** | Wrong project ref or database password. The ref is the part of your URL before `.supabase.co`. Reset the DB password under **Project Settings → Database** if you forgot it. |
| **"permission denied" / login issues** | Run `npx supabase login` on its own, finish the browser flow, then re-run `npm run setup`. |
| **Generate fails with a 401 / quota error** | Your AI key is wrong or out of quota. Re-check it in **Settings**. For Gemini, free limits reset daily. |

---

## What it costs

- **Supabase** free tier: plenty for a personal proposal tool (2 free projects per account).
- **Google Gemini** free tier: ~1,500 requests/day — far more than you'll need.
- **Netlify** free tier: more than enough for this app.
