# Ember — session handoff, 14 August 2026

Branch `method-engine`. Everything below verifies green:
`npm run method:test` · `npm run proof:test` · `npm run qualify:test` ·
`npm run method:check` · `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json` ·
`npm run build`.

---

## Completed

**The method engine** (`src/lib/method/`). Doctrine as data, doing two jobs: composing the system
prompt, and validating the model's output against the same rules. Three packs — cold email, LinkedIn,
Upwork — **55 laws, 33 banned patterns, 36 structure steps**, every law citing a source, 34 of them
marked `selfReported` because they are one operator's account of their own results.

- Authored in `src/lib/method/packs.source.json`, compiled by `npm run method:gen`.
  **Never hand-edit `packs/*.ts`.**
- `npm run method:check` compiles every pattern, runs it against realistic good copy, and rejects raw
  control characters. Hard false positives must be zero.
- `forChannel.ts` is the only seam the app touches.

**The four High findings** from `REVIEW.md`:

| Finding | Fix |
|---|---|
| Signup landed in a session-less app | `AuthContext` checks `data.session`; `AuthForm` shows confirmation as guidance, not error |
| Failed save silently ate a generated flow | `updateLead` rolls back one row and returns `{error}`; caller awaits and keeps the flow on screen |
| Proposals bucket was enumerable by anyone | Private bucket, owner-scoped policies, 1-year **signed** URL so client sharing still works |
| DM prompt demanded proof that was never supplied | Engine's `substantiate-or-concede` law handles the no-proof case |

Also: **"You are Mani" removed** from `generate-proposal` (every stranger's proposal was written in
Mani's name), the cover letter no longer claims a Loom the user never recorded, and the function
returns 401 instead of writing to an unreachable `anonymous/` folder.

**Rename to Ember.** `package.json` is `ember@0.1.0`, page title updated, README drift fixed.
`src/lib/storage.ts` migrates `trackup.aiConfig` → `ember.aiConfig` and `trackup.supabase` →
`ember.supabase` on first read, so no existing user loses their API key or Supabase connection.
TrackUp remains the name of the Upwork app inside the suite.

**The proof vault.** `case_studies` table + private `case-studies` bucket
(`20260813130000_create_case_studies.sql`), `src/lib/proof/` for matching and rendering, and
`src/components/Settings/CaseStudyVault.tsx` for the UI.

- The **naming rule is in the data model**: per-case `naming` plus a required `anonymous_label`, so no
  generator can leak a client name into public-facing copy.
- Selection sends **one matched proof**, not the whole vault, and shows why it was picked.
- The metric is stored apart from prose so `use verbatim, do not round` has something to point at.
- **Entirely optional.** Empty vault produces a full prompt with no proof section and no invented
  results.

**Qualification and tiering** (`src/lib/qualify/`). The screen that runs *before* generation, and the
thing that lets Ember decline a lead rather than dutifully writing to it.

- Four pillars at a **two-of-four threshold**, the bonus screen, the impact/complexity quadrant, the
  buying ladder, and A/B/C tiering. All in `doctrine.ts`, which is hand-authored — it is not
  per-channel, so it does not belong in `packs.source.json` and is not generated.
- **`no` and `not checked yet` are kept apart the whole way through.** An unresearched lead comes back
  `notYet` with the questions to go and answer, never `decline`. A screen that punishes you for not
  having done the work it is about to ask for is a screen people route around.
- Three of its outputs change the copy: the **rung** sets what job the message has to do, the **tier**
  sets a ceiling on claimed familiarity, and the **pillars** decide which angles are arguable. An
  unconfirmed pillar is a guess about their business, so the brief withholds it.
- **Tier A is earned by research done, not by the lead looking good.** Every Tier A signal with no
  written observation lands in B, because the copy would otherwise have to invent the detail.
- The **answers** are persisted, never the verdict (`20260814120000_add_lead_qualification.sql`), so
  changing a threshold re-scores the whole list instead of leaving stale verdicts behind.
- Wired into LinkedIn: `QualifyPanel` above generation, and a declined lead **disables** the generate
  button behind a separate override click.

---

## Currently in flight

Nothing half-written. The last change was the qualification screen, complete and verified — logic by
`npm run qualify:test`, rendering and interactivity checked in the browser against a temporary
harness that has been removed.

---

## Still to do, in the agreed order

1. **Cold email app** — the pack exists, the app does not. Third entry in `src/apps/registry.tsx`.
   **But see the note below: the 13 August call paused cold email and ranked Upwork first**, which
   argues for wiring `Apply.tsx` to the engine ahead of this.
2. **Cadence engine** — three touches, 2–7 day spacing, any reply halts the sequence. `sent_steps`
   already exists; this makes it due-dated.
3. **Constraint diagnostic** — the Month 6 loop. *If no stage shows a backlog, the constraint is lead
   generation.* Needs real usage data to be worth anything, so it goes last.

**Smaller, unblocked:**

- The **three** new migrations have **never been applied** to a live Supabase project: proposals
  storage, case studies, and lead qualification. Until they are, the vault and the screen have
  nowhere to persist. The app boots to the setup wizard, so none of this has been exercised against
  a real database.
- `src/pages/Apply.tsx` (Upwork) still does not use the method engine, and now also does not use the
  screen. Only LinkedIn has either.
- **`packs.source.json` contains 36 em dashes in authored doctrine**, and em dash is a *hard*-banned
  pattern. The system prompt models the exact character it forbids, which is likely feeding the
  violations the validator then catches. `qualify/doctrine.ts` was written clean and
  `qualify:test` now fails the build if any rendered brief contains a hard-banned pattern; the packs
  need the same treatment, by hand, since a blanket replace would mangle meaning.
- Text extraction from uploaded case-study files is unimplemented; `extracted_text` is always null.
- Three pre-existing lint errors in `DataContext.tsx` and `Dashboard.tsx`.
- `REVIEW.md` lists 14 more Medium findings, none addressed.

---

## Lessons worth keeping

**A truncated response looks exactly like a complete one.** A workflow reported success while its
document began mid-sentence with three of ten sections. Long generated artifacts now go through a
length-and-shape guard with retries.

**A dead regex looks exactly like a working one.** A pattern containing real `0x08` backspace
characters — because `JSON.stringify` escapes a backspace as `\b` — compiled cleanly, matched nothing,
and drove the false-positive count to zero, which read as success. ESLint caught it, not the purpose-
built checker. `method:check` now fails on raw control characters.

**A check that cries wolf is worse than no check.** A self-match probe flagged 27 of 33 patterns
spuriously. Deleted rather than shipped.

**Reviewers inflate.** 59 findings, none refuted on the facts, but 54 downgraded on severity.
Adversarial verification was worth more for calibration than for rejection.

**Naming a weakness and talking yourself down are different things**, and a regex can barely tell
them apart. "This is my first project" is doctrine-endorsed honesty; "I'm new to this" is
disqualifying. Hence a hard ban plus a separate soft nudge.

**The prompt is written in the register the output copies.** Printing the qualification brief once
showed it was full of em dashes, which every pack hard-bans. Reading a generated artifact beats
reasoning about it: 40 passing checks did not catch this, because nothing was checking the *prompt*
against the rules it imposes. Something is now.

---

## Other things worth remembering

- The **Deepgram key is in this session's history** and should be rotated. `tools/transcribe.py` in
  the Boardroom repo reads it from `DEEPGRAM_API_KEY` and never persists it.
- **355 minutes were transcribed** and none of it is committed: Cold Email Lab lessons, the $211k
  TrueHorizon deal sessions, and Maker School Months 4–5. Losing the scratchpad loses them.
- Deploy buttons in `README.md` hardcode the GitHub repo URL. **Renaming the remote breaks them**
  until updated, and Netlify may need reauthorising.
- The dev server config is `.claude/launch.json` (`npm run dev`, port 5173).
- `REVIEW.md` praises one thing specifically worth protecting: the setup wizard reads the **real**
  migrations via `import.meta.glob` and the functions via `?raw`, so the copy-paste path can never
  drift from committed code. Do not inline snapshots of that SQL.
- There is no `dangerouslySetInnerHTML` anywhere in `src/`, which is what makes holding the AI key in
  localStorage defensible. Protect that when Mermaid rendering is added.
