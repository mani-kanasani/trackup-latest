<!--
  Produced by a six-lens audit of this repo against one question: what does a
  STRANGER need, who arrives with their own offer, their own niche, possibly no
  case studies, and their own API key.

  42 findings went through adversarial verification. 20 were confirmed, 22 were
  downgraded as overstated or already mitigated. Only the confirmed ones are
  ranked below; three of the downgraded ones survive as one-liners in section 5.

  Every item cites file:line. Verify before building — the audit was thorough,
  not infallible, and two of its claims were already wrong on inspection.

  PHASE 1 IS COMPLETE. Every item below in section 1, plus two of the three
  one-liners in section 5, shipped on 14 August:

    1.1  wins blob overriding curated proof          319a52a
    1.2  failed vault read rendered as empty vault   27fd2c2
    1.3  the fake Mermaid preview                    27fd2c2
    1.4  setup proving the backend is installed      b3849fd, e571892
    1.5  unauthenticated edge functions              27fd2c2
    1.6  proposal storage path                       0da831d
    1.7  sent_steps carrying timestamps              ddea1d4
    1.8  the authorship cluster                      2f91406
    S5.1 'lost' counted as a response                2f91406
    S5.2 tier telling the model how many touches     319a52a
    S5.3 "worth automating" wording                  2f91406

  Not done from section 1: orphaned-object cleanup (deleteJob, and removing the
  prior file in CaseStudyVault.save) — the path is stored now, so this is
  unblocked but unbuilt. Not done from section 5: the Home readiness checklist.

  NEXT UP is section 2, in its stated order, starting with 2.1 the proof
  self-interview.

  Every item cites file:line. Verify before building — the audit was thorough,
  not infallible, and two of its claims were wrong on inspection.
-->

# Ember build plan

## 0. What the audit changes about the roadmap

The agreed order was **cold email → cadence → constraint diagnostic**. The audit says two things must go in front of it, and one thing in it should be cut.

- **Cold email should not be next.** The findings show a stranger cannot reliably get the *two shipped channels* to work: setup passes a test that proves nothing, the AI key says "Saved" when it isn't, an empty vault gets a shrug, and the wins/testimonials blob overrides the curated proof on every generation. Adding a third channel multiplies those defects across one more surface. Ship channel #3 after the shared spine is honest.
- **The cadence engine's schema half must move earlier and get cheaper.** Three findings converge on one line: `sent_steps` stores step keys with no timestamps (`20260605010000_add_lead_outreach.sql:13`). Fixing that shape while a stranger's data is empty costs a 5-line shim; fixing it after leads carry a year of `[]` arrays does not. Do the migration in phase 1, the queue UI in phase 2.
- **The constraint diagnostic stays last, and probably stays unbuilt.** It needs usage data that does not exist, `HANDOFF.md:88-89` already says so, and the one real defect in that neighbourhood is a one-line denominator bug.

---

## 1. Fix now — small and blocking

Ordered by (silently wrong output) > (blocks a stranger) > (cheap correctness).

### 1.1 Stop sending the legacy wins/testimonials blob alongside curated proof
**What:** Both call sites send `context: contextToPrompt(loadUserContext())` (`LinkedInApp.tsx:239`, `Apply.tsx:84`), which concatenates about + wins + testimonials (`userContext.ts:34-39`) into the *user* prompt as "use for credibility, proof and specifics" — while the *system* prompt in the same call says "Never use a number that does not appear below, and never round one up" over exactly one matched case study (`compose.ts:84-86`, `forChannel.ts:118`).
**Why it matters:** This is the only finding where the app actively teaches the model to break its own law. It bypasses `renderProof` (`proof/render.ts:52-67`), which is where the named-vs-anonymous audience rule and the do-not-round framing live. A stranger's outreach can carry a number nobody vetted, attributed to a client who was never cleared for naming.
**Touches:** two one-line edits at the call sites; export a `senderAbout()` helper from `userContext.ts` so the cold email app can't reintroduce it; one smoke assertion that the `context` string never contains `ctx.wins`. Leave `forChannel.ts:123-128` (the capped fallback) alone — it is correct.
**Size:** small.

### 1.2 Refuse to generate when the proof vault read failed
**What:** `LinkedInApp.tsx:148` is `const { cases } = useCaseStudies();` — it drops `loadError`, which the hook exports specifically to prevent this (`useCaseStudies.ts:30-34`). On a failed read, `cases` stays `[]`, `forChannel.ts:139` sets `proofEmpty`, and `LinkedInApp.tsx:368-373` tells a user with three saved case studies that they have none — after the API call is paid for.
**Why it matters:** A false statement about the user's own data, made at the moment money is spent. `CaseStudyVault.tsx:132-136` already handles it correctly, so the app contradicts itself.
**Touches:** destructure `loadError`, block generation with the DB error and a Settings link. Then make it structural: change `BuildOptions.cases` to carry a status (`{ status: 'ok' | 'failed', cases }`) so `buildChannelPrompt` sets a distinct `proofUnknown` rather than `proofEmpty`, and wire `Apply.tsx` the same way when its in-flight work lands.
**Size:** small.

### 1.3 Kill the fake mermaid preview and validate the diagram source
**What:** `Apply.tsx:453` renders the literal string "Mermaid diagram preview would be rendered here" behind a button labelled *Show Preview*. `package.json:19-24` has no mermaid dependency and none is installed. `generate-proposal/index.ts:111` demands `graph TD;` and `:272` coerces whatever comes back with no check.
**Why it matters:** Product dishonesty with nothing mitigating it — a stranger clicks a button that promises a render and gets a sentence, then has no way to know the source is valid before it reaches a buyer.
**Touches:** in `parseProposal`, drop `mermaid_code` unless it matches `/^\s*(graph|flowchart)\s+(TD|TB|LR|RL|BT)/i`; delete the `showPreview` toggle and relabel the panel "Diagram source — paste into your doc tool"; hide the panels when empty (`Track.tsx:350-362`). Adding the ~500KB renderer is not worth it. **Also drop `mermaid_code` from `buildUserPrompt` (`generate-proposal/index.ts:111`)** — no pack step asks for a diagram (`upwork.ts:297-442`), and the PDF builder never uses it (`:292-340`), so it is wasted tokens on every generation.
**Size:** small. ~9 lines net plus the prompt line.

### 1.4 Make the setup wizard prove the backend is actually installed
**What:** `testSupabaseConnection` (`supabaseConfig.ts:66-79`) fetches only `/auth/v1/settings`, a platform endpoint that exists before any migration or function runs. And `handleSave` (`SupabaseSetup.tsx:77-85`) never reads the result — Save & continue works with the test unrun or red (`canSubmit` at `:53` accepts any https URL plus any 20+ char string).
**Why it matters:** This is the widest first-run failure. A stranger whose SQL paste half-failed gets: signup appears to work (`AuthContext.tsx:86-89` swallows a missing `users` table to console.error), Home shows 0 leads (`Home.tsx:24-28`), and the first real signal is a raw Postgres error inside the Add-lead modal. Functions-not-deployed surfaces separately as "Failed to send a request to the Edge Function". Nothing in the wizard checks either.
**Touches:** a readiness probe run against the pasted credentials — `select id from leads limit 0` and the same for `case_studies` (42P01 = SQL never ran; permission error = RLS/grants wrong, and the two are distinguishable), plus `functions.invoke` on `generate-proposal`, `generate-outreach`, `list-models` with `{}` (any JSON body, including the 400 at `list-models/index.ts:60-61`, proves deployed; `FunctionsFetchError` proves missing; 401 proves Verify JWT is still on). One checklist row per check with the exact remediation beside each red one. Expose the same probe as a **Check backend** button in `Settings.tsx:305-325`, which today shows only the URL string.
**Size:** medium — the largest item in phase 1, and the one that converts "install silently broken" into "install diagnosable".

### 1.5 Add auth to `generate-outreach` and `list-models`
**What:** `generate-proposal/index.ts:409-418` builds a user client from the caller's JWT and 401s without one, with a comment stating the reason. Its two siblings have no auth code at all, both set `Access-Control-Allow-Origin: '*'`, and `scripts/setup.mjs:98` deploys all three `--no-verify-jwt`.
**Why it matters:** A stranger's project becomes an open anonymizing relay to `api.openai.com` / `api.anthropic.com` accepting an arbitrary `systemPrompt` and an arbitrary key — the shape abusers want for laundering stolen keys — plus uncapped invocation against their quota. Both call sites are already authenticated (`Settings.tsx:59`, `LinkedInApp.tsx:232`), so nothing working breaks.
**Touches:** lift `:409-418` verbatim into both siblings after input validation; add the `createClient` import `generate-outreach` lacks; replace the wildcard CORS with an origin allowlist in all three. No redeploy plumbing needed — `SupabaseSetup.tsx:2-4` imports the sources with `?raw`, so the wizard hands out the patched code. Already flagged at `REVIEW.md:219` and not landed.
**Size:** small.

### 1.6 Persist the proposal storage path
**What:** `generate-proposal/index.ts:438` builds the object path, `:451-454` signs it for a year, `:460-465` returns only `proposal_url` — the path dies with the invocation. Migration `20260813120000:26-30` documents the owner SELECT policy's whole purpose as "so a signed-in user can list and re-sign their OWN files from the app," and nothing can, because the job→object mapping was never written down.
**Why it matters:** Every proposal PDF becomes permanently unreachable at expiry — or sooner, since Supabase signed URLs are JWTs against the project secret and a rotation kills all of them at once. Compounding: `DataContext.tsx` has no delete of any kind, so unsaved generations leave orphaned PDFs, and `CaseStudyVault.tsx:84-93` overwrites `file_path` without removing the prior object.
**Touches:** `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS proposal_path text`; return and store it (`Apply.tsx:89`, `DataContext.tsx:91`); treat `proposal_document` as a cache in `Track.tsx` and re-sign on 400/404; remove the prior object in `CaseStudyVault.save`; add `deleteJob` that removes the object alongside the row (both DELETE policies already exist). Half of `REVIEW.md:219` shipped; this is the other half.
**Size:** small.

### 1.7 Migrate `sent_steps` to carry timestamps — now, while it is cheap
**What:** `sent_steps jsonb DEFAULT '[]'` stores bare step keys (`20260605010000:13`, `types.ts:53`, written at `LinkedInApp.tsx:198-202`). `updated_at` cannot substitute — the trigger at `create_leads.sql:64-66` fires on every write and the 800ms qualification autosave (`LinkedInApp.tsx:179-186` → `useLeads.ts:68`) touches it constantly.
**Why it matters:** Nothing shipped is broken by this. It is here purely because it is the schema decision that forecloses the cadence engine, and doing it before strangers accumulate legacy arrays is strictly cheaper than after.
**Touches:** migrate to `Record<string, string>` (key → ISO8601); `ALTER COLUMN sent_steps SET DEFAULT '{}'::jsonb` (leaving `'[]'` means new rows arrive legacy forever); a tolerant `readSentSteps` beside the existing `migrateFlow` precedent (`types.ts:30-37`), mapping legacy arrays to `{ key: '' }` = sent, time unknown; update the two consumers. Add `status_changed_at timestamptz` with a trigger guarded `WHEN (OLD.status IS DISTINCT FROM NEW.status)` — the guard is load-bearing or the autosave resets it.
**Size:** small.

### 1.8 The authorship cluster — four small edits, one commit
- **`DEFAULT_PROMPTS` asserts an offer the stranger doesn't have.** `prompts.ts:24-31` hardcodes "expert automation & AI systems specialist"; `Settings.tsx:41-44` puts it in the textarea as `value`, not placeholder; clicking *Save prompts* persists it, and `compose.ts:89-92` injects it as "The sender's own direction." Same class as the removed "You are Mani" persona. Render `DEFAULT_PROMPTS[key]` as `placeholder`, drop the `|| DEFAULT_PROMPTS.x` fallback at `:42-43`, rewrite both entries offer-neutral, strip the em dash at `prompts.ts:26` (it is itself a hard-banned pattern), and delete the dead `effectivePrompt` (`prompts.ts:54-57`, zero callers).
- **The author's first name ships as the example testimonial** (`Settings.tsx:250` — the last literal "Mani" in `src/`), plus automation-agency placeholders at `:226`/`:236` and "your agency" at `:215`/`:220`. Flagged at `REVIEW.md:111` and survived the last cleanup. The one string here that *reaches the model* is `userContext.ts:36`'s header "About me / my agency:" — change it to "About the sender:", matching `forChannel.ts:130`.
- **`SETUP.md:111` names the anon key** where the app requires the publishable key (`SETUP.md:49-50`, `.env.example:10-12`, `SupabaseSetup.tsx:299-304`) — and `SETUP.md:150` documents the resulting 401 that its own step 5 causes. `:151` says "the anon key starts with eyJ", which is actively wrong for a correct `sb_publishable_` key. Fix the doc, correct `:67` (one function named, three deployed), then move authority into code: have `testSupabaseConnection` classify the pasted key and warn inline on a legacy anon key.
- **Surface `contextEmpty`.** `forChannel.ts:138` computes it and nothing reads it. Consume it beside `proofEmpty` at `LinkedInApp.tsx:368-373` so the two states are one correct sentence — which also repairs the current copy, which says "this was written from your background alone" when there *is* no background on file.

**Size:** small, all four together.

---

## 2. The next substantial build, in order

### 2.1 The proof self-interview
**What:** Replace the two-sentence empty state (`CaseStudyVault.tsx:144-151`) with a guided intake: the seven ordered questions from `playbooks/30-day-first-client-playbook.md:295` as static data, asked one at a time, each "yes" opening the existing add form pre-filled onto title / client_name / industry / outcome / metric_value / timeframe. Put the specificity hierarchy inline on "The number" (dollar figures beat percentages beat associations). End seven no's on the playbook's tier-4 fallback stated explicitly — implement it in your own business and claim the measured delta — so nobody leaves with zero rows.
**Why it matters to a stranger:** Proof is the single input the packs lean on hardest, and the doctrine's diagnosis is that people *have* proof and don't recognise it. The add form is already well-scaffolded — every field carries an example. What's missing is not guidance on filling a row; it's guidance on believing you have a row to fill. This is the highest-leverage first-run gap in the audit.
**Touches:** `CaseStudyVault.tsx` empty state and a new question-list module. No document extraction needed for any of it.
**Size:** medium.

### 2.2 Persistent validator output over editable text
**What:** `warnings` is component state written in exactly one place (`LinkedInApp.tsx:154`, `:264-265`), and `LeadDetail` is keyed by lead id (`:118`), so switching leads wipes it. The stored flow then re-renders through `Step`, whose body is a read-only `<p>` (`:305`) with only a Copy button. `Apply.tsx` has the same shape (`:117-118`, cleared at `:171-172`).
**Why it matters:** The check fires once, against text the user cannot change, and is permanently invisible on the copy they actually send tomorrow. `validateOutput` is pure (`validate.ts:52-72`) — recomputing costs nothing, so this is not a performance trade-off.
**Touches:** replace the state with `useMemo(() => flow ? checkAgainstMethod('linkedin', flow) : null, [flow])`; make `Step`'s body a textarea whose `onBlur` calls `onUpdate`, so fixing a violation visibly clears it; mirror in `Apply.tsx` over `generatedData.steps`. No new API calls, no schema change — `outreach` is already `Record<string,string>`.
**Size:** medium.

### 2.3 Cadence engine — the queue (schema already landed in 1.7)
**What:** Three parts, smallest first. **(a)** Render the day the pack already carries: `LinkedInApp.tsx:431` builds `${i + 1} · ${s.label}` and throws away `s.day`, which is in memory (`linkedin.ts:291/307/322/339` carry day 0/1/4/9). Zero schema change, and it is the difference between a list and a sequence. **(b)** Derive each step's due date from first `sent_at + (step.day − first step.day)`, read through `forChannel.ts` so the cadence moves when a pack version does; surface a **Due/Overdue queue as the LinkedIn app's default view** — lead, step, days late, and the already-generated copy inline so acting is one Copy and one Sent. **(c)** Add pending-invitation age to the same queue: `linkedin.ts:193-199` makes withdrawing invitations pending past three weeks a law, and nothing can currently compute that age. Halt on `replied`/`meeting` (states that already exist at `types.ts:3`) — grey the untouched outbound steps and surface reply-branch groups first, making `replyStopsEverything` (`linkedin.ts:153-155`) visible rather than merely instructed.
**Why it matters:** The app tells a stranger the order of four touches and never the spacing. Nothing auto-sends (every step is copy-to-clipboard at `:298-301`), so the exposure is an operator with no due dates, not an automated misfire — but "who is due today" is the daily-work question the app currently cannot answer.
**Touches:** `LinkedInApp.tsx` render + a new queue view; read-side derivation only.
**Size:** medium.

### 2.4 Terminal lead states, and a revenue field that can be set after the sale
**What:** `lead_status` (`create_leads.sql:16`, `types.ts:3`) has no terminal value — a lead that ignores you stays `requested` forever, so the list only grows and any funnel has no closing denominator. Add `no_reply`, `disqualified`, `won`, `lost`, plus `close_reason text` and `deal_value numeric`; add to `STATUS_ORDER`/`STATUS_LABELS` (`LinkedInApp.tsx:19-22`); treat the terminals as skip-conditions for 2.3's queue. **In the same session**, make `actual_amount` editable from Track — it is written once at `Apply.tsx:96` at *draft* time and grep shows no update path anywhere, so Dashboard's Cash Collected KPI cannot move after creation on the Upwork side either.
**Why it matters:** Without a terminal state the cadence queue never drains and no rate ever closes. The `actual_amount` half is the identical defect already shipped, on the channel that supposedly works.
**Touches:** one migration, `types.ts`, `LinkedInApp.tsx` status maps, `Track.tsx` + `DataContext.updateMaterial`. **Skip the channel-agnostic `deals` table** — a much larger rewrite than the problem needs first.
**Size:** medium.

### 2.5 Generation provenance
**What:** Add `generation_meta jsonb` to leads and write it in the same `onUpdate` call at `LinkedInApp.tsx:268` that already saves the flow: `{ pack_id, pack_version, case_study_id + match score, tier + rung, violation ids, generated_at }`. Every value is already in scope on that line. Today `warnings`, `softNotes` and `proofUsed` are React state (`:154-156`) that a lead switch wipes, and migration `20260814120000:8-14` states the qualification verdict is deliberately never stored and re-derived at read time — so a threshold change silently rewrites the tier every past message was written under.
**Why it matters:** Once step timestamps (1.7) and terminal states (2.4) exist, a retrospective slicing reply rate by case study, by tier, and by pack version is a pure read. That is what turns the incumbent/challenger ladder from prose into something the app runs — and it is the only honest input the constraint diagnostic will ever have.
**Touches:** one migration, one write at an existing call site.
**Size:** small (plus a migration).

### 2.6 LinkedIn funnel metrics
**What:** `DataContext.tsx:43-47`/`:190-216` query `jobs` and nothing else; Dashboard mounts only inside `TrackUpApp.tsx:16-21`; `App.tsx:50-52` mounts `LinkedInApp` bare. Give it a metrics strip computed from `leads.status` alone: requested → connected → replied → meeting, each a count and a rate against the prior stage, windowed by the existing `DateFilter`. Lift `getKPIData` out of `DataContext` into a channel-agnostic funnel helper.
**Why it matters:** Half a stranger's work is invisible to the app's only reporting surface.
**One correction to carry into the build:** annotate **acceptance rate**, not reply rate, with pack guidance (`linkedin.ts:194-199`) — that is LinkedIn's native number. The 4–5% figures at `packs.source.json:544`/`:1068` are *cold email reply rates against emails sent*, and `:571` records an explicit `knownTension` that the sources disagree (one sets the floor at 1%). Printing a cold-email benchmark under a LinkedIn chart would be worse than printing nothing.
**Size:** medium. Does **not** depend on 2.3 — `leads.status` already spans the five stages.

### 2.7 Lead import
**What:** `AddLeadModal` (`LinkedInApp.tsx:453-505`) is the only creation path; `useLeads.ts:42-48` does one insert per call; a repo-wide grep for csv/bulk/import returns zero hits; and there are **no UNIQUE constraints anywhere in the schema** — all ten migrations. Add a paste-and-map importer: textarea taking CSV/TSV from a sheet, header auto-detect, column mapping onto the existing Lead fields, five-row preview, one batched insert. Normalize `linkedin_url`, dedupe within the batch and against existing rows, add `UNIQUE (user_id, linkedin_url)` with `onConflict` ignore so collisions report per-row. Extend the mapping to the qualification columns a scraped list already carries so `leads.qualification` starts pre-filled.
**Why it matters:** The doctrine's daily quota is not reachable through a one-at-a-time modal.
**Size:** medium. Placed here, not earlier, because importing 200 leads into an app that can't tell you who is due or which one closed makes the pile worse.

### 2.8 Cold email app
**What:** Third entry in `src/apps/registry.tsx`. The pack exists and is unusually complete; the app does not.
**Why here:** Everything above is shared spine — proof intake, validator persistence, cadence, terminal states, provenance — and cold email inherits all of it. Building it first would fork three of those problems instead of solving them once. Note also that several audit findings were downgraded *specifically because* no cold email app exists (the `two-versions-of-email-one` law, the `preflight` step, 19 unreachable thresholds); shipping the app activates them, so build it against the fixed spine, and put **variant identity in its schema from the start** rather than retrofitting later.
**Size:** large.

---

## 3. Deliberately deferred, with the reason

| Item | Reason |
|---|---|
| **Constraint diagnostic** | Needs real usage data; `HANDOFF.md:88-89` already ranks it last for this reason. It becomes buildable only after 2.5 (provenance) and 2.4 (terminal states) have produced a few months of rows. Until then it would diagnose noise. |
| **Mermaid rendering** | ~500KB dependency the app has deliberately avoided, for a deliverable the buyer's PDF never contains (`generate-proposal/index.ts:292-340`). Item 1.3 removes the false promise for ~9 lines. |
| **Channel-agnostic `deals` table** | 2.4 gets the closing denominator from four enum values and two columns. The table is a rewrite of `jobs`, `leads` and `DataContext` for the same outcome. |
| **Structured `SenderProfile` / offer object** | The shipped channels don't demand it. LinkedIn captures the offer per-lead at the right altitude ("Services you could offer them", `LinkedInApp.tsx:493-496` → `target.notes` → the edge prompt), and `about` reaches the model under an explicit no-invention guard (`compose.ts:76-79`). Revisit only if the cold email app's `preflight` genuinely needs it. |
| **Server-side user context** | The asymmetry is real — identity in localStorage, leads and case studies server-side — but disclosure exists at the point of entry (`Settings.tsx:216`, `:272`) and item 1.8's `contextEmpty` wiring adds the signal at the point of spend, which is the half that actually costs a generation. The `user_context jsonb` column is a clean follow-on whenever multi-device comes up; the API key stays local (BYOK, moving it would be a regression). |
| **A/B variant infrastructure** | Both shipped channels produce bespoke per-lead copy — n=1 per artifact. The pack's own `knownTensions` concedes users sit an order of magnitude below the sample floor. Belongs in cold email's schema (2.8) or nowhere. |
| **ROI worksheet / pricing calculator** | The doctrine already routes around missing inputs mechanically: `roiFrame` says skip the arithmetic entirely (`upwork.ts:356-361`), `never-fabricate` is a law, `guaranteedReturn` is a hard-banned regex, and the qualification licences cap claims to hours the prospect stated. `proposed_amount` is user-entered. There is no hallucinated price to fix. |
| **Dropping the six dead lead columns / `extracted_text` / `source_note`** | Cosmetic. The upload control says "Stored privately. Only you can ever read it." so it doesn't overclaim, and the `verified` checkbox already delivers the provenance outcome through `render.ts`. |
| **`BannedPattern` step scoping** | The accommodation already exists: `linkBeforeReply` is level `soft` (`linkedin.ts:281`), soft hits render in the separate grey "your call" panel, and `validate.ts:31` puts the explanation inline. The schema change would only formalise what levelling handles. |
| **`describePack` / `knownTensions` / `evidence` "show your work" panel** | The resolved trade-offs already reach the model — the blank-invite resolution at `linkedin.ts:520-521` is duplicated verbatim into the step constraints at `:297-299`, which `compose.ts:66` renders. This is an unbuilt UI panel, not doctrine failing to land. |

---

## 4. Not worth building at all

- **A mermaid renderer.** See above. The honest label costs nothing and the diagram isn't in the buyer's document anyway.
- **The `two-versions` / incumbent-challenger testing mechanic for LinkedIn and Upwork.** Statistically meaningless at n=1 per artifact and at the volumes these channels support. The pack itself concedes it.
- **`preflight`-driven offer modelling before cold email exists.** A grep for `coldEmail` outside `src/lib/method` returns zero hits in `src/`. Nobody reaches it.

---

## 5. From the overstated pile — three that still deserve a line each

Fold these into phase 1; none justifies its own item.

1. **`DataContext.tsx:208` counts `'lost'` as a response.** A proposal ghosted and then marked lost inflates Response Rate on the Dashboard. One line. (The auditor's actual claim — that the denominator was wrong — was false; the denominator is correct. This is the real bug in those lines.) Add a sample-size caption under `CircularProgress` suppressing the percentage below small n.
2. **`forChannel.ts:72-79` `outputSteps` ignores the tier.** For a Tier C lead the prompt says "Short sequence only: an opener, one follow-up, and a close" (`qualify/render.ts:40-45` ← `doctrine.ts:189-191`) while the output contract in the same request demands all twelve keys. The prompt contradicts itself. Filter `pack.structure` by tier. Small, and it belongs beside 1.1 as a prompt-coherence fix. *(Check this doesn't collide with the in-flight key-mismatch work.)*
3. **Two "worth automating" strings a stranger actually reads** — `score.ts:178` and `QualifyPanel.tsx:142`. The qualification screen does *not* block anyone (default is `notYet`, `decline` needs three active no's, and there is a one-click override) — but a designer answering honestly reads a red panel telling them there is no process worth automating. Copy edit only. The seller-model refactor the auditor proposed is not justified.

Also worth a single line in phase 1, alongside 1.8: a three-row readiness checklist on `Home.tsx` driven by `loadAIConfig() !== null`, context present, and `cases.length > 0`. Not the gate the auditor wanted — TrackUp already has a labelled Settings nav item and `Apply.tsx:29-32` refuses before spending — but the stranger who signs up on someone else's env-configured deploy never sees the wizard and lands on a launcher that tells them nothing.