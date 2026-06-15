"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AdminEvent {
  id: string
  created_at: string
  event: string
  user_id: string | null
  email: string | null
  path: string | null
  properties: Record<string, unknown>
}

const EVENT_OPTIONS = [
  "",
  "user_signed_up",
  "onboarding_completed",
  "onboarding_skipped",
  "task_created",
  "note_created",
  "goal_created",
  "habit_created",
  "clock_in",
  "clock_out",
]

const fmtTime = (d: string) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

export function AdminEventsView() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("")

  const load = useCallback(async (eventFilter: string) => {
    setLoading(true)
    const { data, error } = await supabase.rpc("admin_recent_events", {
      limit_count: 200,
      event_filter: eventFilter || null,
    })
    if (error) setError(error.message)
    else {
      setError("")
      setEvents((data as AdminEvent[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load(filter)
  }, [filter, load])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground mt-1">Recent product events across all users (latest 200).</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
        >
          {EVENT_OPTIONS.map((e) => (
            <option key={e} value={e}>
              {e === "" ? "All events" : e}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="border-border/70 bg-card/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No events yet.</td>
                  </tr>
                ) : (
                  events.map((e) => (
                    <tr key={e.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 align-top">
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtTime(e.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-[10px] font-mono">{e.event}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[200px]">
                        {e.email || e.user_id?.slice(0, 8) || "anon"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]">
                        {Object.keys(e.properties || {}).length > 0 ? JSON.stringify(e.properties) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
