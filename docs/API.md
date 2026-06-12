# API Reference

The app exposes four API routes under `app/api/`. All routes are dynamic (`force-dynamic`) and, except where noted, require an authenticated Supabase session cookie.

| Route | Method | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| `/api/assistant` | POST | Session cookie | 20/min/user | Streaming AI chat with tool calling |
| `/api/suggest-task-titles` | POST | Session cookie | 20/min/user | AI task title suggestions |
| `/api/summary` | GET | Session cookie | — | Counts and today's timesheet totals |
| `/api/seed-test-data` | POST | Bearer token | — | Seed test data (development only) |

Rate limiting is a per-user sliding window implemented in `lib/server/rate-limit.ts`. Exceeding it returns `429` with a `Retry-After` header.

---

## POST `/api/assistant`

Streams AI assistant responses with tool calling. Backed by OpenAI (`gpt-4o`, temperature 0.3, streaming). Max duration 30s.

**Auth:** authenticated Supabase session cookie required; returns `401 { "error": "Unauthorized" }` otherwise.
**Rate limit:** 20 requests/min per user (`429` when exceeded).

### Request body

```json
{
  "messages": [{ "role": "user", "content": "Clock me in for code review" }],
  "appState": {
    "tasks": [],
    "notes": [],
    "goals": [],
    "habits": [],
    "habitLogs": [],
    "currentEntry": null,
    "timeEntries": [],
    "todayKey": "2026-06-12"
  }
}
```

- `messages` (required): non-empty array of chat messages (`role`: `user` | `assistant`). Invalid format returns `400`.
- `appState` (optional): client-side store snapshot the server uses to execute tools (the server does not re-read the database for tool execution). `todayKey` (`YYYY-MM-DD`) pins "today" to the client's timezone.

### Response

`text/event-stream` of `data:` chunks, terminated by `data: [DONE]`:

- Text deltas: `{ "delta": { "content": "..." } }`
- Tool results: `{ "toolResult": "<message>", "toolName": "createTask", "toolAction": { "type": "createTask", "payload": { ... } } }`
  - The client applies `toolAction` to the Zustand store (the server only computes the action; the client persists it).
- Errors mid-stream: `{ "error": "..." }`

### Tools available to the model

- **Tasks:** `createTask`, `updateTask`, `deleteTask`, `completeTask`
- **Notes:** `createNote`, `updateNote`, `deleteNote`
- **Timesheet:** `clockIn`, `clockOut`, `startBreak`, `endBreak`, `switchTask`, `getTimesheetStatus`
- **Goals:** `createGoal`, `updateGoal`, `deleteGoal`, `updateGoalProgress`, `getGoalsSummary`
- **Habits:** `createHabit`, `updateHabit`, `deleteHabit`, `logHabit`, `getHabitsSummary`
- **Calendar/overview:** `getCalendarEvents`, `getAppSummary`

The route also loads recent `chat_feedback` and `ai_usage_analytics` rows for the user to personalize the system prompt, and records tool usage to `ai_usage_analytics`.

### Error responses

- `400` — invalid `messages`
- `401` — not authenticated
- `429` — rate limited (with `Retry-After`)
- `500` — Supabase env vars missing or unexpected error
- `503` — `OPENAI_API_KEY` not configured

---

## POST `/api/suggest-task-titles`

Returns 3–5 short, professional task title suggestions for the timesheet (OpenAI `gpt-4o-mini`). Max duration 15s.

**Auth:** authenticated session required (`401` otherwise).
**Rate limit:** 20 requests/min per user (`429` with `Retry-After` when exceeded).

### Request body

```json
{
  "draft": "meeting with john",
  "recentTitles": ["Code review", "Sprint planning"],
  "currentTask": "Deep work"
}
```

All fields optional: `draft` (string the user is typing), `recentTitles` (up to 20 strings), `currentTask` (task being ended).

### Response

```json
{ "suggestions": ["Meeting with John", "Sync with John", "1:1 with John"] }
```

- Always returns a `suggestions: string[]` array (each ≤100 chars, max 5 items).
- If `OPENAI_API_KEY` is not configured, returns `200` with `{ "suggestions": [], "error": "OPENAI_API_KEY not configured" }` so the UI degrades gracefully.
- `502` with empty suggestions on upstream OpenAI errors; `500` on unexpected failures.

---

## GET `/api/summary`

Returns counts and today's timesheet totals for the signed-in user, read directly from Supabase. Max duration 30s.

**Auth:** authenticated session required (`401` otherwise).

### Response

```json
{
  "tasks": { "total": 42, "pending": 7 },
  "notes": { "total": 18 },
  "timesheet": { "todayHours": 5.25, "sessionsToday": 2 }
}
```

- `todayHours` is rounded to 2 decimals and excludes break minutes; open sessions count up to "now".
- `500` with `{ "error": "..." }` on failure.

---

## POST `/api/seed-test-data` (development only)

Seeds a large realistic dataset for the authenticated user: 8 time categories, 500 tasks, 300 notes, ~200 days of time entries, 20 goals, 8 habits, and ~100 days of habit logs. See [TESTING.md](TESTING.md) for seeding workflows.

**Production:** returns `404 { "error": "Not available in production" }` when `NODE_ENV === "production"`.
**Auth:** `Authorization: Bearer <supabase access token>` header required; the token is verified via `supabase.auth.getUser()` (`401` if missing or invalid).

### Request

No body. Example:

```js
const response = await fetch("/api/seed-test-data", {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}` },
})
```

### Response

```json
{
  "success": true,
  "summary": {
    "categories": 8,
    "tasks": 500,
    "notes": 300,
    "timeEntries": 274,
    "goals": 20,
    "habits": 8,
    "habitLogs": 562
  },
  "message": "Test data seeded successfully!"
}
```

`500` with `{ "error": "..." }` on failure.
