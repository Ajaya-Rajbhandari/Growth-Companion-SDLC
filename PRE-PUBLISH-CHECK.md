# Pre-publish check summary

**Date:** Run before deploying.

## Build

- **`npm run build`** — ✅ **Passes** (requires network for Google Fonts in CI; run with network or use cached fonts).

## Lint

- **`npx eslint .`** — Run locally (script may need `npx` if `eslint` is not in PATH).

## Tests

- **`npm run test`** — **37 pass**, 22 fail.
  - **Passing:** `lib-utils`, `tasks` store, `notes` store, `timeSafety`.
  - **Failing:** Timesheet store, integration workflow, and some edge-case tests fail with `supabase.from(...).select is not a function` because the store uses the real Supabase client and it is not mocked in those tests. Fixing this would require mocking `@/lib/supabase` (or injecting the client) in the test setup.

## Environment

- **`.env.example`** — Present with:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required for auth/data).
  - `OPENAI_API_KEY` (optional; for assistant and task title suggestions).
- **Production:** Set all required env vars in the host; do not commit `.env.local` or secrets.

## Optional before deploy

1. **CI:** Ensure the build step has network access (or pre-cached fonts) so `next build` can fetch Geist fonts.
2. **Tests:** To get the remaining 22 tests passing, add a Supabase mock used by `lib/store` (e.g. `vi.mock("@/lib/supabase")` and return a chainable mock from `from().select().eq()` etc.).
