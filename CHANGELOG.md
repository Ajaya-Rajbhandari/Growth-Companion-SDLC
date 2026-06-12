# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Live dashboard updates while a work session is open (today/week hours tick in real time).
- Local release gate: `npm run check` (typecheck, lint, tests, build, diff check) and `npm run check:full` (adds Playwright E2E).
- Playwright end-to-end smoke tests covering app boot and the notes flow.
- Per-user rate limiting (20 requests/min) on AI endpoints (`/api/assistant`, `/api/suggest-task-titles`).
- Vercel Speed Insights tracking.
- Consolidated documentation under `docs/` (testing, status, API, overview, deployment, migrations).

### Changed

- Hardened AI endpoints: authentication is now required on `/api/assistant` and `/api/suggest-task-titles`.
- Hardened timesheet logic (clock in/out, breaks, task switching edge cases).
- Zustand persisted state is now versioned to survive schema changes across releases.
- Test data seeding is development-only; `/api/seed-test-data` returns 404 in production.
- PWA updates: improved manifest/service worker handling and mobile navigation.
- Vercel builds standardized on npm (`packageManager` set to npm; `pnpm-lock.yaml` removed).

### Fixed

- Supabase test mocking: all 60 unit/integration tests now pass (previously 22 integration tests failed against the unmocked client).
- PWA route conflicts with the custom app icon.
