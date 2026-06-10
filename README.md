# Growth Companion SDLC

Personal productivity assistant built with Next.js (App Router) and Supabase. The app focuses on task management, notes, timesheets, and an embedded AI assistant.

## Tech Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Supabase (auth + data)
- Zustand (client state)
- Tailwind CSS + Radix UI primitives

## Local Setup
1. Install dependencies: `npm ci --include=optional`
2. Create `.env.local` with the required variables (see below).
3. Run the dev server: `npm run dev`

## Scripts
- `npm run dev` - Run the development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript without emitting files
- `npm run lint` - Lint
- `npm test` - Run unit/integration tests
- `npm run test:e2e` - Run Playwright smoke tests
- `npm run check` - Run the local release gate: typecheck, lint, unit/integration tests, build, and diff whitespace check
- `npm run check:full` - Run the full release gate including Playwright E2E

> Playwright E2E needs Chromium system libraries. On Linux, run `npx playwright install --with-deps chromium` before `npm run test:e2e`. This requires sudo/root on many systems.

## Environment Variables
Required for local development:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

## Google OAuth Setup
1. Enable Google provider in Supabase Auth.
2. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - Your production URL, e.g. `https://your-domain.com/auth/callback`
3. Ensure your Supabase URL and anon key are set in `.env`.

## Project Structure
- `app/` - Next.js routes, layout, and API routes
- `components/` - Feature components and layouts
- `components/ui/` - Reusable UI primitives
- `hooks/` - Shared React hooks
- `lib/` - State store, Supabase client, and utilities
- `styles/` - Global styles

## Feature Map
See `docs/FEATURES.md` for a component-level audit and usage notes.

## API
See `docs/API.md` for endpoint notes and payloads.
