# Ember — Code and Product Review
Repo: `C:\Users\manik\trackup-latest` · ~5,100 lines · React + Vite + TS + Supabase · reviewed 2026-08-13
All paths below are relative to that root.

---

## 1. THE VERDICT

Ember is a working two-app outreach suite with a genuinely good self-hosting story and a defensible security foundation — RLS is correct on every table, the migrations are idempotent, and the setup script is better than most commercial onboarding. It is roughly 80% of a product and 40% of a methodology. The single most important thing to understand: **the code is in better shape than the prompts, and the prompts are the product.** A stranger who completes setup gets a well-engineered pipeline that generates a proposal claiming they recorded a Loom video they did not record, in the voice of a person named Mani, citing wins the model invented — and a LinkedIn sequence that asks four times and gives zero times. Fixing the code makes it safe. Fixing the prompts makes it worth using.

---

## 2. WHAT IS GENUINELY GOOD

Protect these while changing things.

**The wizard reads the real migrations.** `src/components/Setup/SupabaseSetup.tsx:27-36` pulls SQL via `import.meta.glob` and the three Edge Functions via `?raw`. The copy-paste path can never drift from the committed code. This is the smartest decision in the repo. Anyone who inlines a snapshot of the SQL for build speed destroys the property that makes the no-terminal path trustworthy.

**`scripts/setup.mjs`.** One command, `npx` so nothing installs globally, no Docker, and a specific recovery instruction on every failure branch (lines 70, 80, 88, 100). The comment at 91-93 explaining *why* `--no-verify-jwt` is required is exactly the note that stops a future maintainer from "fixing" it and breaking every install.

**Runtime Supabase connection.** `src/lib/supabaseConfig.ts:26-30` lets a stranger point a static build at their own project with no rebuild, and build-time env deliberately beats cached localStorage so a stale entry can never wedge a configured deploy. The reasoning is in the comment and it is correct.

**RLS does real defensive work, not decoration.** `supabase/migrations/20251007175759_create_initial_schema.sql:85-104` and `20260605000000_create_leads.sql:45-59` scope all four verbs to `auth.uid()`. This matters because the client forgets: `src/contexts/DataContext.tsx:143` updates a job by `.eq('id', id)` with no user filter. The UPDATE policy is the only thing stopping one user flipping another's job status. It holds.

**The signup trigger is hardened.** `20251007182217_create_user_on_signup_trigger.sql:22-23` is `SECURITY DEFINER` **with** `SET search_path = public`. A definer function without a pinned search_path is a classic escalation path. This one is closed.

**Edge-function error unwrapping.** `src/pages/Apply.tsx:54-63` and `src/apps/linkedin/LinkedInApp.tsx:161-166` reach into `fnError.context.json()` so the user sees "Incorrect API key provided" instead of "FunctionsHttpError". Very few BYOK apps do this. It is what makes key and model failures self-service.

**`sanitize()` in the PDF path.** `supabase/functions/generate-proposal/index.ts:223-232` strips non-WinAnsi characters before `drawText`. pdf-lib throws on a curly apostrophe with StandardFonts, and LLMs emit them constantly. Someone hit that in production and fixed it properly.

**The 4-second session race.** `src/contexts/AuthContext.tsx:33-36` races `getSession()` against a timeout so a token pointing at a deleted or paused project cannot wedge the loading screen forever. Real failure mode, real fix, comment names it.

**The prompt-override seam.** `src/lib/prompts.ts:53-57` resolves the user's prompt or a default, and both functions re-append the JSON contract server-side (`generate-outreach/index.ts:176-178`). The user can replace the whole strategy without breaking parsing. Every strategic gap in section 4 is fixable through this seam. That is why they are gaps and not dead ends.

**`blank_strategy`.** `generate-outreach/index.ts:59`, surfaced in its own callout at `LinkedInApp.tsx:232-237`. The one piece of genuine non-obvious method in the app, and it is presented as strategy rather than smuggled into copy the user pastes unread. This is the shape everything else in section 4 should take.

**No XSS surface.** `dangerouslySetInnerHTML` appears nowhere in `src/`. The AI-generated `mermaid_code` — the obvious vector, since real Mermaid emits HTML labels — is inert text in a textarea (`Apply.tsx:340`) and a `<pre>` (`Track.tsx:360`). This is what makes holding the API key in localStorage defensible rather than reckless. **Protect it when you add diagram rendering.**

---

## 3. THE THINGS THAT MUST BE FIXED BEFORE A STRANGER USES THIS

| # | Finding | Sev | File |
|---|---|---|---|
| 1 | Signup lands in a session-less app where nothing saves | High | `src/contexts/AuthContext.tsx:156` |
| 2 | Every proposal PDF on the deployment is listable and downloadable | High | `supabase/migrations/20260604000000_create_proposals_storage.sql:15,19` |
| 3 | The DM prompt orders a concrete proof point with no proof supplied | High | `supabase/functions/generate-outreach/index.ts:62` |
| 4 | A failed LinkedIn save silently deletes the flow the user just paid for | High | `src/apps/linkedin/useLeads.ts:43` |
| 5 | All three Edge Functions ship open to the internet; one writes with the service role | Medium | `scripts/setup.mjs:98` |
| 6 | Generated proposal lives only in component state | Medium | `src/pages/Apply.tsx:19` |
| 7 | Every cover letter claims a Loom video; every script is "in Mani's voice" | Medium | `generate-proposal/index.ts:65,70` |
| 8 | Malformed AI output returns HTTP 200 with empty fields | Medium | `generate-proposal/index.ts:210` |
| 9 | Win Rate mixes all-time wins with date-filtered applications | Medium | `src/pages/Dashboard.tsx:181` |
| 10 | "Proposals Generated" counts old rows whose status you touched today | Medium | `src/contexts/DataContext.tsx:192` |
| 11 | Failed reads render as confident empty states | Medium | `src/apps/linkedin/useLeads.ts:19`, `DataContext.tsx:49` |
| 12 | A wrong Supabase URL wedges the app with no in-product escape | Medium | `src/App.tsx:59` |
| 13 | "Show Preview" renders a placeholder sentence | Medium | `src/pages/Apply.tsx:335` |
| 14 | No password reset anywhere | Medium | `src/components/Auth/AuthForm.tsx:124` |
| 15 | The model dropdown offers `o3-mini`, which 400s every time | Medium | `src/lib/aiConfig.ts:40` |
| 16 | Context and prompts are localStorage-only; a second device generates ungrounded | Medium | `src/lib/userContext.ts:10` |
| 17 | No timeout on edge-function calls | Medium | `src/pages/Apply.tsx:39` |
| 18 | Every auth event re-creates `user`, causing duplicate fetches | Medium | `src/contexts/AuthContext.tsx:57` |

### 1. Signup logs the user into an app where nothing can be saved — High
`signup` treats a non-null `data.user` as success and never reads `data.session` (`AuthContext.tsx:156-160`). Supabase ships new projects with **Confirm email ON**, and in that mode `signUp` returns a populated user with `session === null`. `App.tsx:40` sees a truthy user and renders the whole app with no JWT.

What happens: the stranger finishes all 28 setup steps, signs up, lands on a normal Home screen. Generation *works* — the functions run with `--no-verify-jwt` and fall back to `userId = 'anonymous'` (`generate-proposal/index.ts:352`) — so they burn their own API credits and get a real cover letter and a real PDF. Then Save Materials fails and prints the raw Postgres string `new row violates row-level security policy for table "jobs"` (`DataContext.tsx:114` → `Apply.tsx:100-103`). The dashboard stays at zero. One refresh silently logs them out. Nothing anywhere says "check your email." A repo-wide grep for confirm/emailRedirect turns up nothing but JWT hits.

Fix: branch on the session. `if (data.user && !data.session) return { success: true, pendingConfirmation: true }` and have AuthForm render a "check your email" state without calling `setUser`. Add a step to SETUP.md between 3 and 5 telling the deployer to turn Confirm email OFF, and say why (the free sender is rate-limited to a couple of messages an hour and lands in spam).

### 2. Anyone can list and download every proposal PDF on the deployment — High
Two separate facts, both needed. The bucket is created `public = true` (line 15), and lines 19-22 additionally grant `CREATE POLICY ... FOR SELECT TO public`. In Postgres `TO public` includes `anon`, and Storage's list endpoint is a SELECT over `storage.objects`. Public-bucket alone would be tolerable — paths are `<user_uuid>/<random_uuid>.pdf` and unguessable. **The SELECT policy is what converts unguessable into enumerable.** A POST to `/storage/v1/object/list/proposals` with `{"prefix":"","limit":1000}` returns every top-level folder, which is the user_id of every account. Re-list per prefix for every filename. Each file then downloads with no key and no auth.

The PDF body is built from `proposal_sections`, which the model writes from the user's `about`, `wins` and `testimonials` (`userContext.ts:34-39` → `index.ts:54`), plus the client job being bid on. So the leak is: who each user is pitching, what proof they claim, which named clients they cite. For your own use that is precisely the name-restricted material.

Fix: drop the public SELECT policy — "for completeness" in the file comment is not a reason. Set `public = false`. Replace `getPublicUrl(path)` (line 381) with `createSignedUrl(path, 60*60*24*30)` and store the *path* on the `jobs` row so the app can re-mint an expired link. Signed URLs stay shareable on Upwork, which was the requirement.

### 3. The DM prompt orders a proof point the user may not have — High
`generate-outreach/index.ts:62`: `"value": "Follow-up DM with a concrete, relevant proof point or result (use my wins/testimonials if provided)"`. The parenthetical is conditional; the instruction is not. When context is empty the whole Background block is dropped (line 48) and the model is still told to produce a concrete result. `generate-proposal/index.ts:65` has the twin defect — "show you've built something similar" with no check that anything similar exists.

`src/lib/userContext.ts:42` exports `hasUserContext` **precisely to detect this state, and it is never called anywhere in the repo.** The guard was written and never wired.

The chain to real damage: new user skips Settings → model invents a metric rather than hedging → user hits Copy and pastes into LinkedIn. Nothing auto-sends, so a human is in the loop, but the empty-Settings user is the target user and fast paste-and-send is the intended workflow.

Fix: branch `buildPrompt` on context presence. With no wins, forbid numbers, named clients and outcome claims outright. Call `hasUserContext` at `LinkedInApp.tsx:140` and `Apply.tsx:23` and block generation with a link to Settings until `about` is filled. An empty-context generation has no path to a good outcome, so failing loudly costs the user nothing they were going to get.

### 4. A failed save silently deletes the LinkedIn flow — High
`useLeads.ts:43`: `updateLead` applies optimistically, then on failure does `console.error(...); await fetchLeads();` and returns `void`. `LinkedInApp.tsx:168` calls it without awaiting or checking. The generated flow renders for a fraction of a second, then the refetch overwrites it with the server row and the whole sequence vanishes. The button returns to "Generate outreach flow" with no error. The user assumes the app is broken and regenerates, burning another API call each time. Same silence on every Sent checkbox.

Worse: `useLeads.ts:20` does `setLeads((data as Lead[]) ?? [])`. On a failed refetch that **wipes an already-populated list** — 40 leads collapse to "No leads yet."

Fix: `updateLead` returns `{ error?: string }`, rolls back the optimistic patch instead of refetching, and `handleGenerate` throws on it. Widen the `onUpdate` prop type at `LinkedInApp.tsx:122` so the compiler enforces it.

### 5. All three Edge Functions ship unauthenticated with wildcard CORS — Medium
`scripts/setup.mjs:98` deploys all three with `--no-verify-jwt`; SETUP.md:80 says the same for the dashboard path, justified in `SupabaseSetup.tsx:221-225` with "These functions use your own AI key (safe to expose)." That reasoning is wrong — the key is the *attacker's*, so it was never the asset at risk. CORS is `'*'` in all three. The comment at `generate-proposal/index.ts:345` claims "verify_jwt is on"; it is false on every deployment, and line 352's `?? 'anonymous'` silently converts the broken assumption into a working code path.

Real damage is quota and billing abuse plus junk files under `anonymous/` that no code path can delete. Not exfiltration — the service-role client is used only for upload and getPublicUrl.

Fix: reject at line 352 (`if (!userData?.user) return json({error:'Sign in to generate a proposal.'}, 401)`), add the same check to the other two functions, delete the false comment, and pin CORS to the deployment origin from an env var. Note that turning `verify_jwt` back on does *not* fix this — the anon key is itself a valid JWT and ships in the bundle. Only the in-function check closes it.

### 6. A generated proposal lives only in component state — Medium
`Apply.tsx:19` is the only home for the result until Save Materials. `TrackUpApp.tsx:14-27` is a bare `switch`, so one sidebar click unmounts Apply and drops it. No draft persistence, no `beforeunload` (zero hits repo-wide), no confirmation. The user pays for the LLM call, edits the cover letter in the textarea at line 298, clicks Track to check something, comes back to nothing.

It is worse than it looks: the PDF only contains title and sections, so the **cover letter and video script exist nowhere but component state** and are unrecoverable. Every generation also leaves an orphaned PDF in the bucket — including a second Generate click, not just navigation.

Fix: cheapest version is to auto-save the row as `drafted` the moment generation succeeds and make Save Materials an update.

### 7. Every cover letter claims a Loom video; every script is in Mani's voice — Medium
`generate-proposal/index.ts:65` hardcodes "mention you recorded a short Loom video and prepared a detailed proposal document." Line 70 asks for the script "in Mani's voice." Both sit in `buildUserPrompt`, not `SYSTEM_PROMPT`, so they fire unconditionally and **no amount of editing in Settings can reach them** — while `Settings.tsx:265` tells the user those prompts control "its voice, strategy, and what to emphasize."

Two nuances worth being precise about. The proposal-document half is *true* — the PDF is always built. And `userContext.ts` has no name field at all, so a user who leaves context blank gives the model no proper noun for the sender except "Mani," which makes the leak more likely, not less. There is a second instance at `Settings.tsx:245` (testimonial placeholder).

Fix: make the Loom sentence conditional on a `has_video` flag defaulting to off. Replace line 70 with "in the sender's own voice, drawing on the Background above." Delete "You are Mani" from line 48. Then either move the cover-letter spec into the editable layer or correct the Settings copy.

### 8. Malformed AI output returns 200 with empty strings — Medium
`parseProposal` (lines 196-216) validates only JSON-parseability, then coerces every field with `String(x ?? '')` and `proposal_sections` to `[]`. Any well-formed JSON with different keys yields an all-empty proposal, a one-line PDF, and HTTP 200. `addMaterial` writes the empty strings to `jobs` — `''` satisfies NOT NULL. `parseFlow` has the identical hole for all eight DM fields, and the lead is then badged "Flow ready" over eight empty steps.

Truncation is already handled (cut-off JSON fails `JSON.parse`), so the realistic trigger is a weak or unusual model from the model picker.

Fix: three lines. Throw if `cover_letter` is empty, if `proposal_sections` is empty, or if `mermaid_code` lacks "graph". In `parseFlow`, throw if `connection_note` or `opener` is empty. The message already reaches the user through existing plumbing — make it name the cause and point at Reset to default.

### 9-10. The Dashboard reports numbers that are wrong — Medium each
**Win Rate** (`Dashboard.tsx:181`) divides `statusCounts.won` — computed from the full materials array with no date filter — by `kpiData.applied`, which *is* date-filtered. The other three rings correctly use two `kpiData` values. With the default "today" filter, 12 lifetime wins over 2 applications touched today prints **600%**. (The ring then renders empty, not full — negative `strokeDashoffset` aliases against the dash period. The geometry is garbage in the other direction.) The mirror case is equally wrong: nothing touched today reads "0%" over the sub-label "12/0."

**Proposals Generated** (`DataContext.tsx:192`) buckets every non-drafted row by `updated_at`, which both `updateMaterialStatus` and a DB trigger rewrite on any status change. Marking a March proposal Won today adds one to *today's* Proposals Generated. It can also fall retroactively: a proposal generated this month but first marked applied next month drops out of this month's count. The headline throughput number measures status edits, not generation.

Fix: add `won` to KPIData computed from the same filtered array; clamp the geometry in `CircularProgress` while still printing the raw number. Bucket `proposalsGenerated` on `created_at` — that needs no migration, `created_at` is already there. Only the per-stage funnel counts would need new `applied_at`/`won_at` columns.

### 11-18, briefly

**Failed reads render as success states.** `useLeads.ts:19` logs the error and sets `[]`; `DataContext.tsx:49` returns early. Neither exposes an error field. A paused free-tier project — auto-pause is normal — leaves a cached session that renders a fully signed-in app with zero data and "No leads yet. Click Add lead." Add `error` to both and never show the empty state on a failed fetch.

**A wrong URL wedges the app.** `App.tsx:59` gates only on "any config stored"; the wizard's validation is `/^https?:\/\/.+/` and `length > 20`, and `handleSave` never reads `result.ok`. Paste the dashboard URL instead of the API URL and the wizard is skipped forever while login fails — and the only Reconfigure button lives behind the login. SETUP.md:151's troubleshooting row describes the opposite symptom. Fix: refuse to save without a passing test (with an explicit "Save anyway"), and put a "Connected to {url} · Change database" line on AuthForm.

**"Show Preview" is a placeholder.** `Apply.tsx:335` renders the literal sentence "Mermaid diagram preview would be rendered here" — and it *replaces* the only real content, the code textarea. No mermaid dependency exists. The diagram is not in the PDF either (`buildProposalPDF` draws title and sections only). One of four advertised deliverables is never viewable as a diagram anywhere in the product, and nothing mentions mermaid.live. Render it or delete the button; a control whose only function is to say "would be rendered here" is the clearest unfinished signal in the app.

**No password reset.** `resetPasswordForEmail` appears nowhere in the repo. Sessions persist in localStorage, so months pass before a password is needed — which is exactly when it has been forgotten. There is no operator to ask. Worse than filed: the project's Site URL is never configured by setup, so even an owner-sent recovery link would not redirect to the deployed site.

**`o3-mini` in the dropdown.** `aiConfig.ts:40` offers it; both functions set `temperature` unconditionally (`index.ts:93`, `86`); the retry ladder drops `response_format`, not temperature. Reasoning models reject any non-default temperature, so this fails 100% of the time on a model the app recommended. `list-models/index.ts:29` admits `^(gpt-|o\d|chatgpt)`, which pulls the gpt-5 family in too. Add a capability map keyed on model prefix, or remove them from the picker until you have one.

**Config is localStorage-only.** Context, prompts and key are three separate keys with no server counterpart, while leads and materials sync. Second device or cleared site data means re-entry — and the missing key errors loudly while the missing context fails silently into the fabrication path above.

**No timeout on `functions.invoke`.** `Apply.tsx:39`, `LinkedInApp.tsx:149`, `Settings.tsx:58`. `loading` clears only in `finally`. A slow model plus a long job description means "Generating…" forever with no cancel. Race a 120s abort and say "try a faster model or a shorter description."

**Auth churn.** `mapSupabaseUser` builds a new object every call and `onAuthStateChange` fires `setUser` on INITIAL_SESSION and each hourly TOKEN_REFRESHED. `DataContext.tsx:36` and `useLeads.ts:22` key on object identity, so every page load issues two identical queries and a mid-session refresh can refetch over an in-flight optimistic write. Compare `session.user.id` before setting, key effects on `user?.id`.

---

## 4. THE REAL GAP

The AI layer is where this product either earns its price or doesn't, and it is the weakest part of the codebase by a wide margin. Judged against `playbooks/` and `client-acquisition-plan/02-outbound-email/cold-email-sequence.md`, the prompts are a competent generic outreach generator with none of the method in them.

| Method element | Source | In Ember |
|---|---|---|
| Observation line from real research | `cold-email-sequence.md:53,397` | Absent. No field, no input, no prompt slot |
| Free give before any ask | `30-day-first-client-playbook.md:313` ("up to 10x reply rate") | Absent. `value` is a boast about the sender |
| Referral ask as the easier yes | `nate-herk-acquisition.md:449` | Absent |
| Fixed cadence, Days 0/3/7/12/18 | `cold-email-sequence.md:69` | Absent. One untimed bump |
| Breakup that converts dead into dated | `cold-email-sequence.md:226,253` | Absent |
| 2-follow-up ceiling until 2% reply rate | `30-day-first-client-playbook.md:260` | Absent |
| Four reply branches | `cold-email-sequence.md:286-348` | Two. Wrong-person/referral missing; not-now lacks the dated return |
| Banned-opener class | `cold-email-sequence.md:63` | One instance banned, not the class |
| Format discipline (no em dashes, no emoji, no negations) | `cold-email-sequence.md:439-455` | None. `sanitize` strips em dashes from the *PDF* only; the cover letter the user pastes keeps every one |
| Scope of Work, Pricing last | `30-day-first-client-playbook.md:351,355` | No scope section, no pricing |
| Budget before the call | `mani-proven-mechanics.md:57-66` | `proposedAmount` is collected, saved, and dropped before the prompt |

**How big is the gap.** Structural, not cosmetic. `generate-outreach/index.ts:69` says "Be specific to THIS lead" while the only lead data supplied is name, title, company, industry, a website URL that is never dereferenced, and the user's own services. `linkedin_url` is validated at line 167 and never even enters the prompt. The model is instructed to be specific while holding nothing specific. The only way to satisfy that is to generalise plausibly — which is the exact failure the playbook names as the most common and most expensive.

Read the five outbound slots as a sequence: two warm-ups, one boast, one meeting ask, one nudge. Nothing is ever given. On LinkedIn, where switching cost is zero, that is the shape everyone recognises and mutes. And because it reads *well*, the user will blame the market rather than the structure.

**The finding that should sting.** `src/lib/method/` exists — `types.ts`, `compose.ts`, `validate.ts` — with a MethodPack model, structure steps, laws, banned-pattern regexes, and a `checkLength` implementation. It is untracked, ships no pack, and **grep returns zero imports across `src/` and `supabase/`.** The machinery for exactly this is written and unwired. So is `hasUserContext`. So is `getApp`. The pattern in this codebase is not that the thinking is missing; it is that the last wire is never run.

**What closing it is worth.** Everything above routes through one seam that already works: `effectivePrompt` plus the server-side JSON contract re-append. You can ship a real MethodPack without touching parsing. Concretely, the highest-value order is: (a) a required `observation` field on the Lead model, form and request body, with generation refused when it is empty — the ninety-second research visit *is* the work and a tool that lets people skip it sells them a worse outcome faster; (b) an `offer` field in user context and repoint `value` at delivering it; (c) `day_offset` per step, a `breakup` key, and `sent_steps` as `Record<string, ISO>` so a "due today" list becomes derivable; (d) `reply_wrong_person` plus the dated return in the not-now branch; (e) a dozen lines of format contract in both prompts. That last one is the cheapest quality gain available anywhere in this repo — a dozen lines of prompt against a change in how every generated message reads.

That work is what separates "an LLM wrapper for proposals" from "the outreach method, operationalised." The engineering to support it is already built. Nobody has put the method in.

---

## 5. ARCHITECTURE: WHAT HOLDS AND WHAT WILL NOT

**Holds.** The runtime-config layer, the migration discipline, the RLS shape, the prompt-override seam, the provider fallback ladder (`send(jsonMode)` retried without it), and the defensive parsing. These are load-bearing and well done.

**Breaks first, in order:**

**1. The data model has no notion of when anything happened.** `sent_steps jsonb` is a bare array of step keys (`20260605010000_add_lead_outreach.sql:13`) — it records *that* a bump went out, never *when*. `updated_at` is clobbered by every unrelated write. Status is one enum column with no history. So the one screen an outreach product needs — "these 14 leads are due today" — cannot be built on this schema. Related and sharper: `outreach jsonb` is overwritten wholesale on Regenerate (`LinkedInApp.tsx:168`) with no confirm and no versions, so the message that got the reply is destroyed and nothing can ever be A/B'd. This gets more expensive with every user who has data. Because the column is jsonb, moving to `{key: ISO}` needs no type migration, only a tolerant read.

**2. No router.** Navigation is four independent `useState` values (`App.tsx:29-30`, `TrackUpApp.tsx:11`, `LinkedInApp.tsx:28`, `Track.tsx:12`). Zero uses of the History API besides `window.location.reload()`. Nothing is bookmarkable, nothing is deep-linkable, Back exits the site, and every remount discards state — including the unsaved generated proposal in finding 6. Adding `react-router-dom` and making the URL the source of navigation state deletes that state-loss class for free.

**3. The registry describes apps but does not mount them.** `App.tsx:47-52` is a hardcoded ladder; `AppDef` has no `component`; `AppId` is a hand-maintained union; `available` and `accent` are written and read nowhere; `Home.tsx:35-38` returns the LinkedIn lead count for anything that isn't TrackUp. A third app is a card that shows someone else's stat and does nothing when clicked. TypeScript catches the union edit and nothing else. Put `component` and `useStat` on `AppDef`, derive `AppId` from the array, render by lookup.

**4. Three data-access patterns and no cache.** Global context for jobs (`select('*')`, no limit, mounted for every signed-in user even one who only opens LinkedIn), a local hook for leads, and a third inline count query at `Home.tsx:24` that duplicates what `useLeads` already fetched. A third app has three inconsistent patterns to choose from. Also select the list columns only; the body columns are read exclusively in the Track detail pane.

**5. The provider adapter is copy-pasted three times and has diverged.** `corsHeaders`, `json()`, the `Provider` type and the two callers exist in triplicate; defaults exist a fourth time client-side in `aiConfig.ts` and a fifth in the README. Temperature is 0.7 vs 0.8, max_tokens 4096 vs 2000. Nothing user-facing breaks today, but the next provider or auth-header change must land in three bodies and the person making it will miss one. One `_shared/providers.ts` fixes it.

**6. Type honesty.** `src/lib/supabase.ts:11` exports a non-nullable client that can be null, with the guarantee living in a comment about render order. `DataContext.tsx:62` maps rows as `(item: any)`. Neither causes a failure today — the reload-on-config-change keeps the null cast honest, and the Date conversion is explicit — but `supabase gen types typescript` removes the `any` and makes the one hand-written step checkable.

---

## 6. THE ONBOARDING PATH

**5 external accounts** (GitHub, Supabase, Netlify, Google AI Studio, plus an account inside their own app) and **roughly 28 discrete actions across 9 phases**: install Node+git → fork → clone → `npm install` → create Supabase project (name, DB password, region, 2-minute wait) → copy 2 credentials → `npm run setup` (browser OAuth, paste token, re-enter DB password) → Netlify import + deploy → open URL → 3-step wizard → paste the same 2 credentials again → sign up → leave the app for a Gemini key → paste it in Settings → paste a job and generate. The README's "~15 minutes" is optimistic but not dishonest for someone with a terminal open.

**Where people are lost — not the terminal step, which is the best-built part.**

1. **Sign-up.** Finding 1. It loses the most people, and it loses them *after* all the work, which is the worst possible place.
2. **The credential paste.** The docs name the key three different ways (SETUP.md:49-50 says publishable, :111 says anon public, :101 says publishable, :151's troubleshooting row says "starts with `eyJ`" — contradicting :49-50 for exactly the users who hit the problem). The wizard field hedges: "Publishable key (or anon key)." Two troubleshooting rows exist to clean up after this, which is evidence real users landed here. Then finding 12 makes a wrong pick permanent.
3. **The first proposal.** Even when everything works, the output is not sendable: it claims a Loom video, it is in Mani's voice, and with the never-mentioned "Your context" fields blank the model was told to demonstrate experience it knows nothing about. SETUP.md goes straight from "paste your Gemini key" (:113-114) to "Go to Apply, paste a job, and click Generate Proposal. 🎉" (:115). Grep for "context" across README.md and SETUP.md returns zero matches. The single field that most determines output quality is the one field onboarding never mentions.

Also: nothing tells the user a key is needed until they have filled in an entire job form and clicked Generate. In the LinkedIn app the error is a *written instruction to navigate elsewhere* (`LinkedInApp.tsx:143`) with no link, and there is no routing to restore their place when they come back. The BYO-key model itself is explained well — four places, always the same three facts. The gap is discovery, not explanation.

---

## 7. WHAT I WOULD DO, IN ORDER

**Makes it safe (do all of this before anyone else touches a deployment).**

| # | Work | Effort | Why here |
|---|---|---|---|
| 1 | Drop the public SELECT policy, flip the bucket private, switch to signed URLs, persist the path | 2-3 h | The only finding where a stranger with no account reads other people's business content. Nothing else on this list is reachable without an invite |
| 2 | Branch signup on `data.session`; add the Confirm-email step to SETUP.md and the wizard | 1-2 h | Cheapest fix on the list and it unblocks the single highest-loss step in onboarding |
| 3 | Reject unauthenticated callers inside all three functions; pin CORS; delete the false comment at `index.ts:345` | 2 h | Closes quota abuse and removes a comment that will mislead the next person to read it |
| 4 | `updateLead` returns errors and rolls back instead of refetching; stop `?? []` wiping a loaded list | 2-3 h | Currently deletes paid-for work with no message. Highest silent-damage-per-user of anything here |
| 5 | Auto-save the generated proposal as `drafted`; add a `beforeunload` guard | 2 h | Same class as 4 on the TrackUp side |
| 6 | Field-presence validation in `parseProposal` and `parseFlow` | 1 h | Three lines. Stops "Flow ready" over eight empty steps |

Subtotal: about **two days**. After this the app is safe to hand to a stranger.

**Makes it correct.**

| # | Work | Effort | Why here |
|---|---|---|---|
| 7 | Fix Win Rate and bucket `proposalsGenerated` on `created_at`; clamp the ring | 2 h | The Dashboard exists to answer one question and currently prints 600%. No migration needed |
| 8 | Error state + retry on both fetchers; surface write failures in `updateMaterialStatus` | 3-4 h | "Your data failed to load" vs "you have no data" is the worst ambiguity a pipeline tool can have |
| 9 | Require a passing connection test before saving; add "Change database" to AuthForm | 2 h | Removes the only permanent dead end in the product |
| 10 | Add password reset + an update-password view; set the project Site URL in setup | 3-4 h | Table stakes, and there is no support desk on a self-host |
| 11 | Capability map for model params; drop `o\d` from the list-models regex until it exists | 2 h | The app should never offer a model it cannot call |
| 12 | Timeouts + cancel on all three `functions.invoke` calls | 2 h | Turns an indefinite hang into an actionable message |
| 13 | Delete the Mermaid placeholder — either render it with `mermaid` and embed it in the PDF, or replace the panel with a working mermaid.live instruction | 2 h render-only / 1 day with PDF embed | A control that says "would be rendered here" is worse than no control |

**Makes it good** — this is the part that decides whether anyone keeps using it.

| # | Work | Effort | Why here |
|---|---|---|---|
| 14 | Remove the Loom claim (gate on a `video_url` input), delete "in Mani's voice" and "You are Mani", grep for other identity leaks | 2 h | Every first proposal currently contains a false statement in a stranger's name |
| 15 | Wire `hasUserContext`: block generation on empty context, add "Your context" to SETUP.md with a worked example, and make the prompts non-specific when it is empty | 3-4 h | The fabrication path, closed at both ends. The helper is already written |
| 16 | Format contract in both prompts: no em/en dashes, no emoji, no rhetorical triples, short sentences, normalise company suffixes | 2 h | Best value-per-line in the entire codebase |
| 17 | Required `observation` field — model, form, request body, prompt — with generation refused when empty | 1 day | The observation line is the campaign. Everything else in the DM is scaffolding around it |
| 18 | `offer` field in user context; repoint `value` at delivering a give; add the referral ask | 1 day | Converts a ladder that only asks into one that gives first |
| 19 | `day_offset` per step, `breakup` key, `sent_steps` → `{key: ISO}`, and a "due today" view | 2-3 days | Turns a generator into the thing that actually closes deals. Do the schema part before adding a third app |
| 20 | `reply_wrong_person`; dated-return mechanic in the not-now branch | 3-4 h | Two of the four replies that actually arrive |
| 21 | Add `proposedAmount`/`compensationType` to the request body and prompt | 2 h | The number is already collected and saved. Free calibration |
| 22 | Scope of Work section in the proposal spec | 2 h | Skip pricing — Upwork's own rate field is the right place for the number on a marketplace first engagement |

**Then architecture,** in this order, once the above is done: react-router (1-2 days, deletes a whole state-loss class), registry-driven app mounting (half a day, before a third app exists), `_shared/providers.ts` (half a day), server-synced user_settings (1 day), generated DB types (2 h).

**The one thing I would not do yet:** a third app. Items 3, 19 and the registry work all get harder with a third consumer, and none of them are done.

---

## 8. WHAT I DELIBERATELY LEFT OUT

These were raised, investigated, and either refuted or reduced. Listing them so you know they were considered.

- **"The connect wizard lets an attacker steal your password over cleartext http."** Refuted. Ember deploys over HTTPS and mixed-content blocking kills an `http://` fetch before it leaves the browser. The `http://` hole is reachable only on a localhost deploy. What survives is a phishing-assist, not an exploitable flaw, and the cheap correct half of the fix is just rendering the parsed destination hostname above the Save button. An allowlist would break self-hosted Supabase.
- **"The open functions give attackers free phishing hosting on your supabase.co domain."** Refuted on the artifact. `sanitize()` strips everything outside `\n` and `\x20-\x7E` and `buildProposalPDF` only calls `drawText` with Helvetica — no HTML, no scripts, no link annotations. The attacker gets an ASCII text PDF. Also "fills the 1 GB free tier" ignores that each file costs the attacker one paid LLM completion capped at 4096 tokens — roughly 10^5 paid calls per GB. Invocation burn is the cheap abuse; storage exhaustion is not.
- **"The Gemini key in a URL query string leaks to proxies and logs."** Mostly refuted. Under TLS the query string is encrypted exactly like a header, Supabase does not log outbound fetch URLs, and Gemini's *error body* — the thing at line 44 that gets logged — never contains the key. One narrow path survives: a transport-level failure makes Deno's `fetch` throw a TypeError embedding the full URL, which reaches `console.error` at :71 and the 500 body at :72. Worth the one-line header fix (the other two functions already send this same key via `Authorization: Bearer`), not worth ranking.
- **"Raw provider error bodies leak key fragments."** Downgraded. OpenAI only echoes a masked key on a 401 — a partial rendering of an already-invalid credential. Provider error bodies return structured field paths, not prompt content, so the user's `context` never comes back. And the key-validation oracle is a consequence of the missing auth, not of `res.text()`; it survives the proposed fix untouched.
- **"Proposal PDFs cannot be deleted by anyone, ever."** Title is false. `jobs` has a working DELETE policy; the owner can clear objects from the Supabase dashboard in three clicks; and the account-deletion flow described does not exist in the app. The real defect underneath is different and I kept it: there is no way to delete or retract a proposal from the UI, so a test run permanently skews the KPIs.
- **"Anthropic truncates at max_tokens and every retry fails identically."** Refuted on the numbers. The prompt caps its own output — 250-word letter, 4-7 sections, 45-90s script — at roughly 2,000-2,400 tokens against 4096, about 40-50% headroom; generate-outreach has 3x headroom. "Longer job posts" is a category error: job text is *input*, and nothing scales section count with it. And `temperature: 0.7` means retries resample, so "deterministic" is wrong. What survives is that *if* truncation happens the error misdiagnoses it — a cheap `stop_reason` guard, not a ranked finding.
- **"Apply Rate is deflated by the updated_at bucketing."** Directionally backwards. Any row pulled in by `updated_at` is non-drafted by definition, so it increments numerator and denominator together and moves the rate *toward* 100%. The metric is wrong, just optimistically wrong.
- **"The 600% ring draws a full circle."** Wrong direction. With a single-value `strokeDasharray` the period is 2c, so -5c aliases to +c and renders an **empty** arc. Garbage either way; I corrected the description rather than the finding.
- **"Track and Dashboard sorting the shared array in place corrupts the other's output."** Downgraded to a latent note. I checked every consumer of `materials`: only the two sorters are order-sensitive, each re-sorts from scratch with a total comparator, `TrackUpApp` is a switch so they are never mounted together, and `setMaterials` allocates a new array on every update. Zero incorrect output today. Still worth the one-token `[...]` fix because it becomes wrong the moment someone adds `React.memo` or a router that keeps pages mounted — which item 19 above will do.
- **"The registry's dead `available` flag is a high-severity defect."** Downgraded to low. Both shipped apps are wired correctly; no user today sees a dead card. The consequence is entirely conditional on adding a third app, at which point the compiler stops you at the `AppId` union and the dead click surfaces on the first manual test.
- **"The duplicated provider adapters create a live Anthropic truncation risk."** Refuted. The function with the 2000-token ceiling is the one asking for ~650 tokens of output; the drift runs the *safe* direction. Also `DEFAULT_MODEL` and the fence-stripping parser are not in `list-models` at all. The duplication is real and worth fixing; the asserted harm is not.
- **"'Not now' is unhandled and reads as pressure."** Half wrong. The branch is titled "Objection / not now" and specified as "reframe gracefully, zero pressure, keep the door open" — the opposite of the claimed consequence. What is genuinely missing is the dated-return mechanic, which is what I kept.
- **"The generated flow will be auto-sent to prospects."** Nothing in this app sends anything. The only egress is `navigator.clipboard.writeText`; the "Sent" checkbox is a manual self-report. Every message is read by a human before it reaches a prospect. That is why the fabrication findings are high and not critical — and it is also the reason a status-gated checkbox is a nicety rather than a safeguard.
- **"Types will crash Track.tsx on a renamed column."** Refuted. `DataContext.tsx:66-67` explicitly converts both timestamps, so a missing column yields `Invalid Date` and `getTime()` returns NaN — the sort degrades, it does not throw. Also `useLeads.ts:30` puts `user_id` *after* the spread, which is a correct defence against a caller overriding the row owner. Do not "fix" that ordering.
- **"The proposal needs a pricing section."** Dropped deliberately. This is an Upwork bid generator and the amount goes in Upwork's own field; the same playbook warns against sending an off-platform proposal with payment functionality to a marketplace client on a first engagement. Scope of Work I kept; pricing I did not.
- **Clipboard error handling, the inert Reconfigure button on env deploys, provider-switch keeping the stale key, and the 280-char connection note.** All confirmed, all low. Each is a real one-line fix; none changes whether the product is safe or worth using. The right wording for the clipboard case already exists in the codebase at `SupabaseSetup.tsx:57-61` — reuse it.