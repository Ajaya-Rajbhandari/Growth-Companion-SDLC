# State Management Notes

This project uses a single Zustand store in `lib/store.ts` as the source of truth
for tasks, notes, timesheet entries, chat sessions, and auth-related UI state.

## Data Flow Summary
- Auth is managed by Supabase; session state is hydrated in `components/auth-provider.tsx`.
- On login, `fetchInitialData()` pulls tasks, notes, time entries, templates, and chat sessions.
- UI views (Dashboard, Tasks, Notes, Timesheet, Profile, AI Assistant) read directly from the store.
- Mutations (create/update/delete) are handled in the store and sync to Supabase.

## UI State vs Server State
- Server-backed state: tasks, notes, time entries, templates, chat sessions.
- UI-only state: active view, chat panel open state, onboarding progress.

## Access Pattern
Components should prefer `useAppStore(selector)` with shallow comparison to avoid
re-rendering on unrelated state changes.

