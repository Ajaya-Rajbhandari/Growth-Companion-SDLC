# Testing Guide

Single reference for how this project is tested: philosophy, how to run the suites, what is covered, the manual test script, and test data seeding.

> This document consolidates the former `TESTING_PLAN.md`, `TEST_AUTOMATION_SUMMARY.md`, `TEST_QUICK_CHECKLIST.md`, `TEST_SCRIPT.md`, `TEST_DATA_SEEDING.md`, `TEST_RESULTS.md`, and `tests/README.md`.

## Philosophy

- **Unit and integration tests (Vitest)** cover the Zustand store logic (tasks, notes, timesheet), time safety rules, and utility functions. Supabase is mocked in `tests/setup.ts` so no database connection is required and tests run isolated and fast.
- **End-to-end smoke tests (Playwright)** boot the real app and verify critical flows render and work.
- **Manual test script** (below) covers UI/UX, cross-feature integration, and anything automation cannot verify (visual layout, browser quirks, real AI responses).
- Every feature should have happy-path, error-path, and edge-case ("what if") coverage.

## How to Run

```bash
npm test               # Run all unit/integration tests (Vitest)
npm run test:watch     # Vitest in watch mode
npm test tests/store/tasks.test.ts   # Run a single file
npm run test:e2e       # Playwright smoke tests
npm run test:e2e:ui    # Playwright with UI mode
npm run check          # Release gate: typecheck, lint, unit/integration tests, build, diff whitespace check
npm run check:full     # Release gate including Playwright E2E
```

> Playwright needs Chromium system libraries. On Linux, run `npx playwright install --with-deps chromium` first (often requires sudo/root).

**Current status:** all 60 unit/integration tests pass. The Supabase client is fully mocked in the test setup, so the previously documented failures from an unmocked `supabase.from(...)` no longer occur.

## Automated Test Inventory

```
tests/
├── setup.ts                            # Test setup, Supabase mocks, date helpers
├── lib-utils.test.ts                   # Utility function tests
├── timeSafety.test.ts                  # Daily limit / grace period / overtime rules
├── store/
│   ├── tasks.test.ts                   # Task CRUD, validation, edge cases
│   ├── notes.test.ts                   # Note CRUD, search, categories, tags
│   └── timesheet.test.ts               # Clock in/out, breaks, task switching
├── integration/
│   └── timesheet-workflow.test.ts      # Multi-step workflows (clock in → switch → break → out)
├── edge-cases/
│   └── what-if.test.ts                 # "What if" scenarios (see below)
└── e2e/
    └── app-smoke.spec.ts               # Playwright smoke test (app boots, notes flow)
```

### Unit tests (`tests/store/`, `tests/lib-utils.test.ts`, `tests/timeSafety.test.ts`)

- **Tasks:** creation with all properties, empty/very long/special-character titles, completion toggle, deletion, non-existent task operations, duplicate titles, database errors.
- **Notes:** creation with categories and tags, empty title/content validation, updates, deletion, many tags (50+), very long content (10,000+ chars).
- **Timesheet:** clock in/out (with and without task title), double clock-in prevention, task switching with subtask creation, break management (fixed/lunch/custom, 0–480 min, titles), midnight transitions.
- **Time safety:** daily hour limits, grace period, overwork allowance, auto clock-out behavior.

### Integration tests (`tests/integration/`)

- Complete workflow: clock in → switch task → break → clock out.
- Multiple task switches and multiple breaks in one session.
- Break title persistence and subtask tracking.

### Edge-case tests (`tests/edge-cases/what-if.test.ts`)

Covers: clocking in twice, clocking out when not clocked in, starting a break when not clocked in or while already on break, rapid task switches, break duration exceeding session duration, deleting a task while clocked in on it, network failures mid-operation, empty states, unauthenticated user, malformed database responses, extremely long break titles.

### E2E smoke (`tests/e2e/`)

Playwright spec verifying the app boots and core flows (including notes) work end to end.

### Adding new tests

1. Create the test file in the matching directory.
2. Reuse the Supabase mocking pattern from `tests/setup.ts` / existing tests (`vi.mock("@/lib/supabase", ...)`).
3. Cover happy path, error cases, and edge cases.

## Manual Test Script

Run through these sections in order with the browser console and network tab open. Quick pass: ~30–45 minutes. Full pass: ~2–3 hours.

### Prerequisites

- Environment variables set (`.env.local`), dependencies installed, Supabase project configured (with Google OAuth if used), `OPENAI_API_KEY` set for AI features.
- Application running, user logged in.

### 1. Dashboard

- [ ] View loads without errors; statistics cards display (Today, This Week, Total Breaks, Tasks Completed).
- [ ] Weekly activity chart shows data points matching actual sessions, with correct date labels.
- [ ] Productivity rate, task completion percentage, and notes count are accurate.
- [ ] Dashboard updates live while a session is open (today/week hours tick without refresh).
- [ ] Responsive: cards stack on mobile, no horizontal scrolling.

### 2. Tasks

- [ ] Create a task with title, priority (high), and due date; it appears in the list, unchecked, under the High filter.
- [ ] Edit title, priority, and due date; changes persist and filters update.
- [ ] Complete/uncomplete via checkbox; task moves between Active and Completed.
- [ ] Delete a task; list and counts update.
- [ ] Filters: All/High/Medium/Low priority and Active/Completed status, including combinations; filter state persists across view switches.
- [ ] Mobile: list scrolls, filters and add button accessible.

### 3. Notes

- [ ] Create a note with title, content, category ("Meeting"), and tags; category badge and tags display.
- [ ] Edit title, content, category, and tags; updated timestamp changes.
- [ ] Delete a note; list and counts update.
- [ ] Search filters in real time by title/content; clearing restores all notes; special characters handled.
- [ ] Category filters: All/Work/Personal/Ideas/Meeting/Other.
- [ ] Formatting (bold, italic, code) persists after save, if available.

### 4. Timesheet

- [ ] **Clock in** with a task description: success toast, "In Progress" status, green indicator, elapsed time counting, entry appears in history immediately.
- [ ] **Edit current task** title; updates in the card and history.
- [ ] **Switch task**: previous task saved as a subtask with correct start/end times; current task updates; history updates immediately.
- [ ] **Breaks**: Short (15m), Lunch (60m), and Custom durations, each with optional titles. Break panel and countdown show; resume ends the break; break recorded with correct type, title, and duration.
- [ ] **Edit break title** by clicking the badge; clearing the title falls back to the type label.
- [ ] **Manual break entry** adds to total break minutes.
- [ ] **Clock out**: entry marked completed; duration calculation includes break time.
- [ ] **History views**: Daily/Weekly/Monthly/Yearly grouping, totals, breaks with titles, subtasks with times, navigation.
- [ ] **Exports**: CSV, JSON, and Excel download and contain all entries; Excel includes Summary, Detailed Entries, and Break Details sheets with break titles.
- [ ] **Templates**: save a template while clocked in; it pre-fills the description on the next clock-in.
- [ ] **Time safety**: pre-limit warnings near the daily cap, grace period/overtime allowance honored, auto clock-out at the limit, overtime badges in reports, weekly catch-up hours on the dashboard.

### 5. Profile

- [ ] Name, email, and account creation date display.
- [ ] Edit name: persists after refresh and updates in the sidebar.
- [ ] Sign out: session cleared, redirect to auth page, protected routes inaccessible.

### 6. AI Assistant (Floating Chat)

- [ ] Bubble opens/closes; history persists across close/reopen and sessions.
- [ ] Basic message receives a streamed response.
- [ ] Tool actions work and reflect in the relevant views: create task, create note, clock in/out, start/end break, switch task (verify subtask is created and the AI does NOT clock out).
- [ ] "What's my timesheet status?" returns accurate current task, elapsed time, breaks, and today's hours.
- [ ] "Give me a summary of my work" returns task/notes/time stats.
- [ ] Invalid requests are handled gracefully and the chat keeps working.
- [ ] Mobile: bubble accessible, keyboard does not cover input.

### 7. Integration

- [ ] Create via AI, then edit manually (task and note); changes sync across views.
- [ ] Data persists after refresh and after logout/login.
- [ ] Navigation: Dashboard → Tasks → Notes → Timesheet → Profile, sidebar indicator updates, browser back/forward works.

### 8. Error Handling and Edge Cases

- [ ] Network loss: creating a task shows an error; the app recovers on reconnect.
- [ ] Invalid input: empty task title rejected; very long descriptions handled; invalid break durations rejected.
- [ ] Two tabs: changes in one reflect in the other (or after refresh).
- [ ] Time edges: clock in at 11:59 PM and out after midnight; break spanning midnight recorded correctly.

### 9. Performance

- [ ] 50+ tasks/notes and 30+ time entries: lists, search/filter, and history remain responsive.
- [ ] Excel export with a large dataset completes in reasonable time without corruption.

### 10. Accessibility

- [ ] Full keyboard navigation with visible focus indicators and logical tab order.
- [ ] Buttons and form inputs have labels; content announced by screen readers where applicable.

### Recording results

Log issues with feature, description, steps to reproduce, expected vs. actual, and severity (Critical/High/Medium/Low).

## Test Data Seeding

The seeding tooling generates a realistic dataset: ~500 tasks (mixed priorities/urgency/completion over 200 days), ~300 notes (categories, tags, edit dates), ~200–300 time entries across 200 days (multiple sessions and breaks per day, weekend work, skipped days), 20 goals (statuses, progress, milestones), 8 habits with ~100 days of logs (~70% completion rate), and 8 time categories.

**Seeding is development-only.** The `/api/seed-test-data` route returns 404 in production builds.

### Methods

1. **UI button (recommended):** log in → Profile view → "Test Data Seeding" card → "Seed Test Data". Uses the browser's Supabase session; the app refreshes when done.
2. **Node script:** `npm run seed` (runs `scripts/seed-test-data.ts` via tsx). Requires `.env` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; uses the Supabase client, so you may need a service-role key for automated runs.
3. **Browser console:** paste the contents of `scripts/seed-test-data-browser.js` while logged in.
4. **API route (dev only):** `POST /api/seed-test-data` with `Authorization: Bearer <supabase access token>`. See [API.md](API.md).

### Notes and troubleshooting

- Use a test/development database; seeded data is tied to your user account. Clear it manually from the Supabase dashboard if needed.
- Seeding takes 2–5 minutes; it can be re-run safely (duplicates are handled).
- "Not authenticated": log in first (or use a service-role key for the Node script).
- Missing data: verify migrations have run and RLS policies are correct (see [MIGRATIONS.md](MIGRATIONS.md)).

## Historical Code Review (Jan 2026)

A static code review was performed in January 2026 (formerly `TEST_RESULTS.md`). Findings still relevant:

- Core CRUD, timesheet, break, and export logic were verified as correctly implemented, with consistent error handling via the `handleSupabaseError` wrapper and the global `ErrorHandler` component.
- Chat sessions use `crypto.randomUUID()` (a previous timestamp-based ID bug was fixed).
- Open recommendations that remain useful:
  - Add pagination/virtualization for large task/note/time-entry datasets (no pagination today).
  - Extract duplicated break-display code across views into a reusable component.
  - Ensure consistent empty-state UI across all views.
  - Tighten client-side validation for empty titles/content in a few inputs.

Items from that review that have since been addressed (timesheet hardening, Supabase mocking in tests, dev-only seeding) are reflected in [STATUS.md](STATUS.md).
