# Growth Companion SDLC

Personal productivity assistant built with Next.js (App Router) and Supabase, installable as a PWA. Track your time safely, manage tasks, notes, goals, and habits, and drive it all through an embedded AI assistant.

## Features

- **Tasks** — CRUD, priority/urgency, due dates, Eisenhower priority matrix
- **Notes** — categories, tags, search
- **Timesheet** — clock in/out, breaks with titles, task switching with subtask history, CSV/JSON/Excel export, work templates
- **Time safety** — daily hour limits, grace period, overtime allowance, auto clock-out, weekly catch-up hours
- **Goals & Habits** — progress, milestones, streaks, heatmaps
- **Calendar & Dashboard** — month/week/day views, live stats during open sessions
- **AI assistant** — streaming chat with tool calling across all features (auth-required, rate-limited)
- **PWA** — installable on iOS/Android/desktop with offline support

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript · Supabase (auth + data) · Zustand · Tailwind CSS + Radix UI · OpenAI · Vitest + Playwright

## Quick Start

1. Install dependencies: `npm ci --include=optional`
2. Create `.env.local` with the variables below.
3. Run database migrations on your Supabase project — see [docs/MIGRATIONS.md](docs/MIGRATIONS.md).
4. Start the dev server: `npm run dev`

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Run the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run typecheck` | TypeScript check without emitting files |
| `npm run lint` | Lint with ESLint |
| `npm test` | Unit/integration tests (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright smoke tests |
| `npm run check` | Release gate: typecheck, lint, tests, build, diff check |
| `npm run check:full` | Release gate including Playwright E2E |
| `npm run seed` | Seed test data (development only) |

> Playwright E2E needs Chromium system libraries. On Linux, run `npx playwright install --with-deps chromium` first (often requires sudo/root).

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `OPENAI_API_KEY` | Optional | AI assistant and task title suggestions (degrade gracefully without it) |

## Google OAuth Setup

1. Enable the Google provider in Supabase Auth.
2. Add redirect URLs: `http://localhost:3000/auth/callback` and your production URL (e.g. `https://your-domain.com/auth/callback`).
3. Set the Supabase **Site URL** to your production domain — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Project Structure

- `app/` — Next.js routes, layout, and API routes
- `components/` — feature components (`components/ui/` for primitives)
- `hooks/` — shared React hooks
- `lib/` — Zustand store, Supabase client, utilities
- `migrations/` — SQL migrations for Supabase
- `tests/` — Vitest and Playwright suites
- `docs/` — all project documentation

## Documentation

| Doc | Contents |
|---|---|
| [docs/OVERVIEW.md](docs/OVERVIEW.md) | Full feature and architecture overview |
| [docs/TESTING.md](docs/TESTING.md) | Test suites, manual test script, data seeding |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel deployment and OAuth configuration |
| [docs/MIGRATIONS.md](docs/MIGRATIONS.md) | Database migration guide |
| [docs/API.md](docs/API.md) | API route reference |
| [docs/STATUS.md](docs/STATUS.md) | Completion status and release gate |
| [docs/FEATURES.md](docs/FEATURES.md) | Component-level feature audit |

See [CHANGELOG.md](CHANGELOG.md) for recent changes.
