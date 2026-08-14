# API Reference

The app exposes these API routes under `app/api/`. All routes are dynamic (`force-dynamic`) and, except where noted, require an authenticated Supabase session cookie.

| Route | Method | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| `/api/assistant` | POST | Session cookie | 20/min/user | Streaming AI chat with tool calling |
| `/api/suggest-task-titles` | POST | Session cookie | 20/min/user | AI task title suggestions |
| `/api/extract-task-title` | POST | Session cookie | 10/min/user | Task titles read from a pasted screenshot |
| `/api/insights` | POST | Session cookie | 20/min/user | AI weekly insight from timesheet metrics |
| `/api/summary` | GET | Session cookie | — | Counts and today's timesheet totals |
| `/api/push/subscribe` | POST | Session cookie | — | Register a Web Push subscription |
| `/api/cron/push` | GET | `CRON_SECRET` bearer | — | Daily due/overdue task reminder (Vercel Cron) |
| `/api/seed-test-data` | POST | Bearer token | — | Seed test data (development only) |

Rate limiting is a per-user sliding window implemented in `lib/server/rate-limit.ts`. Exceeding it returns `429` with a `Retry-After` header.

---

## POST `/api/assistant`

Streams AI assistant responses with tool calling. Backed by Gemini (`gemini-2.5-flash`, temperature 0.3, streaming). Max duration 30s.

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

- `messages` (required): 1–40 chat messages (`role`: `user` | `assistant`), with a maximum of 4,000 characters per message.
- `appState` (optional): bounded client-side store snapshot the server uses to execute tools (the server does not re-read the database for tool execution). `todayKey` (`YYYY-MM-DD`) pins "today" to the client's timezone.
- Request bodies are limited to 1 MB. Oversized requests return `413`.

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

- `400` — invalid messages, state, or JSON
- `413` — request body too large
- `401` — not authenticated
- `429` — rate limited (with `Retry-After`)
- `500` — Supabase env vars missing or unexpected error
- `503` — `GEMINI_API_KEY` not configured

---

## POST `/api/suggest-task-titles`

Returns 3–5 short, professional task title suggestions for the timesheet (Gemini `gemini-2.5-flash`). Max duration 15s.

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
Requests are limited to 32 KB; `draft` is limited to 200 characters and each title to 100 characters.

### Response

```json
{ "suggestions": ["Meeting with John", "Sync with John", "1:1 with John"] }
```

- Always returns a `suggestions: string[]` array (each ≤100 chars, max 5 items).
- If `GEMINI_API_KEY` is not configured, returns `200` with `{ "suggestions": [], "error": "GEMINI_API_KEY not configured" }` so the UI degrades gracefully.
- `502` with empty suggestions on upstream Gemini errors; `500` on unexpected failures.

---

## POST `/api/extract-task-title`

Reads a screenshot of a task — an issue tracker, a board card, a chat message assigning work — and returns timesheet titles for it (Gemini `gemini-2.5-flash`, multimodal). Max duration 30s.

Used by the paste-a-screenshot control on the clock-in card, the dashboard clock-in dialog, and the "Log new task" dialog. The suggestions only prefill the title field; the user still confirms, and the entry is written client-side through the store under their own session. Nothing here writes to the database.

**Auth:** authenticated session required (`401` otherwise).
**Rate limit:** 10 requests/min per user — half the text routes, because every call ships an image and costs more.

### Request body

```json
{
  "image": { "mimeType": "image/jpeg", "data": "<base64, no data-URL prefix>" },
  "recentTitles": ["Code review", "Sprint planning"]
}
```

- `image.mimeType` (required): `image/jpeg`, `image/png`, or `image/webp`. SVG is refused — it is markup, not a raster image.
- `image.data` (required): base64 with the `data:...;base64,` prefix already stripped. Capped at ~2.1M characters (~1.5 MB decoded); the whole body is capped at 2.4 MB and returns `413` beyond that.
- `recentTitles` (optional): up to 20 recent titles, used only to match the user's phrasing style.

Clients should downscale before sending. `lib/screenshot.ts` fits the image to a 1920px long edge and re-encodes as JPEG, which puts a typical retina capture in the low hundreds of KB while keeping issue keys and card titles legible.

### Response

```json
{
  "summary": "Linear issue GC-142 about break panel contrast",
  "suggestions": ["Fix Break Panel Contrast", "Break Panel A11y Pass"]
}
```

- `summary` names what the model actually saw, so the user can tell it read the right thing before accepting a title.
- `suggestions` holds 0–5 titles (each ≤100 chars). An empty array with a `summary` means no task was recognisable — not an error.
- If `GEMINI_API_KEY` is not configured, returns `200` with empty suggestions and an `error` string, matching `/api/suggest-task-titles`.
- `400` names the specific problem (`"Image is too large"`, base64 format, unsupported mime type).
- `502` on upstream Gemini errors, `504` on timeout, `500` otherwise.

**The image is never stored and never logged.** Screenshots routinely carry client names and ticket contents; failures log the status and error only. The image is sent to Google's Gemini API for the single call and discarded — the UI says so at the point of use.

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
