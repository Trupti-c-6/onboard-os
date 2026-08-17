# CHANGELOG

This entry covers everything changed in this round, on top of the fixes and features from earlier
rounds (already reflected in `RELEASE_REPORT.md`). It does **not** claim "Phase A complete" — see
the honest gap list at the bottom.

## Added

- **`app/error.tsx`** — global App Router error boundary with a retry action and a link back to
  the dashboard. Logs to console (no error-reporting service like Sentry is wired up — that's an
  honest gap, not a silent no-op).
- **`app/not-found.tsx`** — custom branded 404 page, replacing the Next.js default.
- **`app/dashboard/loading.tsx`** and **`app/dashboard/reviews/loading.tsx`** — skeleton loading
  states shown automatically by Next.js while those routes' server data is being fetched.
- **`components/ui/skeleton.tsx`** — reusable skeleton primitive used by the loading states above.
- **`components/review-queue/ReviewFilters.tsx`** — search-by-name/email and status-filter form
  for the review queue. This closes a real gap: `app/dashboard/reviews/page.tsx` already had the
  server-side query logic for search/filtering (via `searchParams` and a PostgREST `.or()` filter)
  wired up, but the component it imports to render the filter UI didn't exist in the repo, which
  would have failed the build. It's implemented as a plain GET form (no client JS required) so
  filtering works via normal navigation.

## Fixed

- Two ESLint errors in the new `app/not-found.tsx` (unescaped apostrophes) and one warning in
  `app/error.tsx` (using `window.location.href` instead of `useRouter().push()` for internal
  navigation).

## Verified

- `npm run lint` — clean
- `npx tsc --noEmit` — clean
- `npm run test` — 17/17 passing
- `npm run build` — succeeds, all 11 routes compile

## NOT done in this round (honest gap list, not exhaustive against the full original spec)

- No drag-and-drop step/field reordering
- No dropdown/radio/multi-select **option editor** (add/delete/reorder options) — those field
  types exist in the schema but there's no UI to configure their choices
- No conditional field logic (show/hide based on previous answers)
- No signature capture field type
- No reviewer comments separate from the existing rejection-reason field
- No toast notification system (forms still show inline success/error text)
- File upload is still limited to whatever Supabase Storage accepts by default — no explicit
  file-type/size validation was added
- Still no integration tests against a live database, and still not deployed anywhere

## Required environment variables

All in `.env.local.example` — copy it to `.env.local` and fill in real values:

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | Base URL used to build portal/review links in emails |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (safe for browser; RLS enforces access) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; bypasses RLS — used for token-gated portal actions |
| `RESEND_API_KEY` | Yes | Sends invitation/reminder/rejection/completion emails |
| `RESEND_FROM_EMAIL` | Optional | Falls back to Resend's shared test sender if unset |
| `GEMINI_API_KEY` | Optional | Enables the AI review-summary feature |
| `OPENAI_API_KEY` | Optional | Fallback AI provider if `GEMINI_API_KEY` isn't set |

## Deployment instructions

Unchanged from `RELEASE_REPORT.md` §6 — still requires manual setup, since this sandbox has no
deploy credentials or live Supabase project to act on:

1. Create a Supabase project, run every file in `lib/supabase/migrations/` **in filename order**
2. Deploy the Edge Function: `supabase functions deploy dispatch-nudges`
3. Register the hourly cron per `lib/supabase/migrations/20260808000000_nudge_cron_schedule.sql`
   (fill in your project ref + anon key)
4. Create the `onboarding-assets` storage bucket per
   `lib/supabase/migrations/20260807000000_storage_bucket.sql`
5. Set the environment variables above in Vercel
6. Deploy to Vercel
