# Project Overview

> Formerly `PROJECT_SUMMARY.md`. For release readiness and remaining work, see [STATUS.md](STATUS.md).

Growth Companion SDLC is a personal productivity Progressive Web App built with Next.js, React, TypeScript, Supabase, and OpenAI. It provides task management, note-taking, time tracking with safety features, goal setting, habit tracking, calendar views, and an embedded AI assistant.

## Features

0. **Progressive Web App (PWA)**
   - Installable on iOS, Android, and desktop
   - Offline support with service worker
   - App-like standalone experience with install prompts

1. **Authentication**
   - Email/password and Google OAuth (Supabase Auth)
   - Session management and protected routes

2. **Task Management**
   - Full CRUD with priority and urgency levels, due dates
   - Priority matrix (Eisenhower Matrix) view
   - Filtering and search

3. **Notes**
   - Full CRUD with categories (work, personal, ideas, meeting, other) and tags
   - Rich text content and search

4. **Time Tracking (Timesheet)**
   - Clock in/out, break management (short/lunch/custom with titles), task switching with subtask history
   - Daily/weekly/monthly/yearly views; CSV, JSON, and Excel export; time categories; work templates
   - **Time safety:** daily hour limits (9h default, configurable), grace period (10/15 min), overwork allowance (up to 1h), pre-limit warnings, auto clock-out at the cap, overtime badges, weekly catch-up hours tracking

5. **Goals**
   - Full CRUD, progress tracking (0–100%), milestones, statuses (active/completed/paused/cancelled)

6. **Habits**
   - Full CRUD, frequency settings, daily logging, streak tracking, statistics and heatmap

7. **Calendar**
   - Month/week/day views, event filtering across tasks, time entries, goals, and habits

8. **Dashboard**
   - Today's hours with progress, task stats, goals progress, habits completion, weekly trend chart, urgent items, quick actions, weekly catch-up hours
   - Live updates while a work session is open

9. **AI Assistant**
   - Streaming chat with tool calling across all features (tasks, notes, timesheet, goals, habits, calendar)
   - Markdown rendering, feedback (thumbs up/down), analytics tracking, time-limit awareness
   - Auth-required and rate-limited (see [API.md](API.md))

10. **Onboarding & Help**
    - Guided tour, help section, re-accessible onboarding

## Technical Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS, Radix UI
- **Language:** TypeScript (build runs with type checking enabled; there is no `ignoreBuildErrors` override)
- **State:** Zustand (with versioned persistence)
- **Database/Auth:** Supabase (PostgreSQL, RLS)
- **AI:** OpenAI API
- **Testing:** Vitest (unit/integration) + Playwright (E2E)
- **Deployment:** Vercel (npm as package manager)

## Project Structure

```
growth-companion-sdlc/
├── app/                    # Next.js app router
│   ├── api/               # API routes (assistant, summary, suggest-task-titles, seed-test-data)
│   ├── auth/              # Authentication pages
│   └── page.tsx           # Main app page
├── components/            # React components
│   ├── ui/               # UI primitives
│   └── [feature].tsx     # Feature components
├── lib/                   # Core utilities
│   ├── store.ts          # Zustand store
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # Utilities
├── migrations/           # Database migrations (run on Supabase, see docs/MIGRATIONS.md)
├── tests/                # Vitest + Playwright suites (see docs/TESTING.md)
├── docs/                 # Documentation
└── public/               # Static assets (PWA manifest, service worker, icons)
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key   # optional; AI features degrade gracefully without it
```

## Documentation Map

- [FEATURES.md](FEATURES.md) — component-level feature audit
- [API.md](API.md) — API route documentation
- [STATE.md](STATE.md) — state management notes
- [TESTING.md](TESTING.md) — test suites, manual script, seeding
- [DEPLOYMENT.md](DEPLOYMENT.md) — Vercel deployment guide
- [MIGRATIONS.md](MIGRATIONS.md) — database migration guide
- [STATUS.md](STATUS.md) — completion status and release gate
- [PWA_SETUP.md](PWA_SETUP.md) — PWA setup and installation
- [AI_ENHANCEMENTS_TESTING.md](AI_ENHANCEMENTS_TESTING.md) — AI feature testing

## Deployment at a Glance

1. **Supabase:** create a project, run all migrations ([MIGRATIONS.md](MIGRATIONS.md)), configure OAuth and redirect URLs.
2. **Vercel:** connect the repo, add environment variables, deploy ([DEPLOYMENT.md](DEPLOYMENT.md)).
3. **Post-deployment:** set the Supabase Site URL to the production domain, test the auth flow, verify features on mobile.
