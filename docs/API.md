# API Notes

## `/api/assistant` (POST)
Streams assistant responses and tool results.

Request body:
```json
{
  "messages": [{ "role": "user|assistant", "content": "..." }],
  "appState": {
    "tasks": [],
    "notes": [],
    "currentEntry": null,
    "timeEntries": []
  }
}
```

Response:
- `text/event-stream` with `data:` chunks.
- Tool results are emitted as `{ toolResult, toolName, toolAction }`.

Auth:
- Requires an authenticated Supabase session cookie.

## `/api/summary` (GET)
Returns basic counts and timesheet totals for the signed-in user.

Response:
```json
{
  "tasks": { "total": 0, "pending": 0 },
  "notes": { "total": 0 },
  "timesheet": { "todayHours": 0, "sessionsToday": 0 }
}
```

Auth:
- Requires an authenticated Supabase session cookie.

