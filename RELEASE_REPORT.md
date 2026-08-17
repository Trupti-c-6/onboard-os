# OnboardOS — Release Report

*Generated after two rounds of real, verified work. "Verified" means: I ran `npm install`,
`npm run lint`, `npx tsc --noEmit`, and `npm run build` and all four passed clean — not that I
assumed correctness. Anything not in this document was not implemented; this list does not
pretend to match the full commercial-SaaS spec it was measured against.*

---

## 1. Round 1 — Launch blockers fixed

| # | Issue | Fix |
|---|---|---|
| 1 | Production build failed outright (missing export) | Implemented `notifyProviderOfCompletion` in `lib/portal/shared.ts`, which was imported but never written |
| 2 | Cross-tenant file exposure (IDOR) | `registerSubmissionAsset` now verifies the uploaded `storagePath` actually belongs to that instance's own folder before recording it |
| 3 | `completed` / `in_review` statuses never set | Wired real transitions into `approveSubmission` |
| 4 | Invitation & completion emails never sent | Wired `clientInvitedEmail` and `onboardingSubmittedEmail` into the actual flows that were supposed to trigger them |
| 5 | Nudge cron ignored per-org `max_nudges` config (hardcoded to 3) | Removed the hardcoded filter; loop now respects each instance's real setting |
| 6 | `tsc --noEmit` unusable as a CI gate | Excluded the Deno Edge Function directory from the Next.js TS project; removed a duplicate copy of the function |

## 2. Round 2 — Feature additions

**Company branding** (`/dashboard/settings`)
- Edit company name, logo URL, brand color, support email
- Portal now actually renders the logo/brand color (previously `logo_url` existed in the DB but was never read anywhere)
- Expired-link screen shows the org's real support email when configured

**Audit trail**
- New `instance_status_history` table, populated by a DB trigger on every status change — not app code, so it can't be silently skipped the way `completed`/`in_review` was before
- Timeline rendered on the review detail page

**AI review summary**
- Provider-agnostic (`Gemini` → falls back to `OpenAI`), implemented with plain `fetch`, no SDK dependency added
- Runs automatically when a client finishes submitting; result stored on the instance and shown on the review page
- **Genuinely optional**: with no API key configured, it silently does nothing — no fake/mocked summary is ever shown

All of the above passed `lint`, `tsc --noEmit`, and `next build` after each batch.

## 3. Round 3 — Automated tests + a hygiene fix

**Test suite added** (`vitest`, 17 tests, `npm run test`)
- `lib/portal/__tests__/shared.test.ts` — the exact "does every required step have a matching row" logic that caused the `completed`/`in_review` bug from Round 1. Includes a named regression test for it.
- `lib/email/__tests__/templates.test.ts` — verifies template output and the new HTML-escaping fix below.
- `lib/ai/__tests__/provider.test.ts` — verifies the AI provider genuinely no-ops (zero fetch calls) with no key configured, parses well-formed responses correctly, and returns `null` rather than throwing on network errors, non-OK responses, or malformed JSON.

**Honest scope of this test suite**: these are unit tests against mocked Supabase clients and mocked `fetch` — they verify our own logic, not real database behavior, RLS enforcement, or actual network calls to Gemini/OpenAI. There is still no integration test that runs against a live Supabase instance (would require real project credentials this sandbox doesn't have).

**HTML-escaping fix in email templates**
- Org name, client name, and rejection-reason text are now escaped before being interpolated into email HTML.
- Correction from an earlier draft of this report: on inspection, none of these values are actually attacker-controlled in the current app (org name and client name are provider-entered, rejection reason is reviewer-entered) — so this was not an active vulnerability, just a latent one worth closing before any future feature lets end-clients influence those fields.

Verified after this round: `lint` clean, `tsc --noEmit` clean, `npm run test` → 17/17 passing, `next build` succeeds.

---

## 4. What was asked for but is NOT in this repo

Being direct about this, because claiming otherwise would be exactly the kind of false "done" the original prompts explicitly said not to do:

- **Template builder**: no drag-and-drop reordering, no template versioning/cloning/archiving, no conditional-logic/nested-condition builder, no live preview mode
- **Field types**: still the original 7 (`short_text`, `long_text`, `single_select`, `multi_select`, `file_upload`, `credential`, `e_sign`) — not the full Typeform-style set (phone, currency, signature-as-a-distinct-type, rich text, image/PDF-specific upload, etc.)
- **Validation**: no regex/min/max/length rule builder beyond what already existed
- **Review system**: no free-text reviewer comments separate from the rejection reason, no filters/search on the review queue
- **Automations**: no Slack, Notion, ClickUp, GitHub, CRM, or calendar integrations — none were started
- **Billing**: no subscription flow, no Stripe/billing integration, no plan/feature-flag system
- **Marketing site**: no landing page, pricing page, FAQ, blog, docs, ToS/Privacy pages
- **Admin analytics**: no conversion-rate/completion-rate dashboard beyond the two existing counters
- **UX polish**: no dark mode, no toast notification system, no skeleton loaders, no error boundaries beyond Next.js defaults
- **Testing**: unit tests now exist for the highest-risk logic (17 tests, see Round 3), but there's still no integration test suite running against a real database — RLS, actual query filtering, and end-to-end flows (submit → notify → approve → complete → email) are unverified by anything other than manual code reading
- **Deployment**: not deployed anywhere; no live Supabase project, no Vercel project, no DNS, no CI/CD pipeline was set up (I have no credentials or network access to do this from this sandbox)

## 5. Recommended next increment

Realistically, the highest-value next steps in order:
1. A real test suite (auth, RLS, the submit→approve→complete flow) — nothing above has behavioral test coverage, only static checks
2. Reviewer comments + review-queue filters, since that's a small, contained addition to a system that already exists
3. Template versioning/duplication, since providers will want to iterate on templates without breaking in-flight client instances

## 6. Deployment (unchanged from before — still requires you to do this manually)
1. Create a Supabase project, run the SQL files in `lib/supabase/migrations/` **in filename order**
2. Deploy the Edge Function: `supabase functions deploy dispatch-nudges`
3. Register the hourly cron per `lib/supabase/migrations/20260808000000_nudge_cron_schedule.sql` (fill in your project ref + anon key)
4. Create the `onboarding-assets` storage bucket per `lib/supabase/migrations/20260807000000_storage_bucket.sql`
5. Set environment variables in Vercel (see `.env.local.example` for the full list, including the now-optional `GEMINI_API_KEY`/`OPENAI_API_KEY`)
6. Deploy to Vercel
