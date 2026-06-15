"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Activity, BarChart3, ShieldAlert, UserPlus, Users } from "lucide-react"

interface AdminAnalytics {
  totals: { events: number; users: number; signups: number }
  activeNow: { wau: number; mau: number }
  eventVolume: { event: string; events: number; users: number }[]
  dau: { day: string; dau: number; events: number }[]
  funnel: { signups: number; completed: number; skipped: number }
  adoption: { event: string; total: number; users: number }[]
  activeUsers: { user_id: string; email: string | null; events: number; distinct_actions: number; last_seen: string }[]
}

const EVENT_LABELS: Record<string, string> = {
  user_signed_up: "Signups",
  onboarding_completed: "Onboarding done",
  onboarding_skipped: "Onboarding skipped",
  task_created: "Tasks",
  note_created: "Notes",
  goal_created: "Goals",
  habit_created: "Habits",
  clock_in: "Clock-ins",
  clock_out: "Clock-outs",
}
const label = (e: string) => EVENT_LABELS[e] ?? e

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="border-border/70 bg-card/80 backdrop-blur">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="size-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminAnalyticsView() {
  const [data, setData] = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true
    supabase.rpc("admin_get_analytics", { days: 30 }).then(({ data, error }) => {
      if (!mounted) return
      if (error) setError(error.message)
      else setData(data as AdminAnalytics)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading analytics…</div>
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-3">
        <div className="size-12 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="size-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Admin access required</h2>
        <p className="text-sm text-muted-foreground">
          {error?.toLowerCase().includes("not authorized")
            ? "Your account isn't on the admin allowlist."
            : error || "Couldn't load analytics."}
        </p>
      </div>
    )
  }

  const completionPct = data.funnel.signups > 0 ? Math.round((100 * data.funnel.completed) / data.funnel.signups) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Admin Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Global product usage across all users — last 30 days.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Activity} label="Events (30d)" value={data.totals.events.toLocaleString()} />
        <StatCard icon={Users} label="Active users (30d)" value={data.totals.users} sub={`WAU ${data.activeNow.wau} · MAU ${data.activeNow.mau}`} />
        <StatCard icon={UserPlus} label="Signups (30d)" value={data.totals.signups} />
        <StatCard icon={BarChart3} label="Onboarding done" value={`${completionPct}%`} sub={`${data.funnel.completed} of ${data.funnel.signups} signups`} />
      </div>

      {/* DAU chart */}
      <Card className="border-border/70 bg-card/80 backdrop-blur">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <CardTitle className="text-base sm:text-lg">Daily Active Users</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2">
          {data.dau.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No activity yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.dau} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d: string) => d.slice(5)}
                  className="text-muted-foreground"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  labelFormatter={(d) => `Day ${d}`}
                />
                <Bar dataKey="dau" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Active users" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Feature adoption */}
        <Card className="border-border/70 bg-card/80 backdrop-blur">
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-base sm:text-lg">Feature adoption</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 space-y-2">
            {data.adoption.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              data.adoption.map((a) => (
                <div key={a.event} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{label(a.event)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    <span className="font-semibold text-foreground">{a.users}</span> users · {a.total} total
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Onboarding funnel */}
        <Card className="border-border/70 bg-card/80 backdrop-blur">
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-base sm:text-lg">Onboarding funnel (all time)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Signed up</span><span className="font-semibold">{data.funnel.signups}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Completed tour</span><span className="font-semibold text-green-600 dark:text-green-400">{data.funnel.completed}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Skipped tour</span><span className="font-semibold">{data.funnel.skipped}</span></div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{completionPct}% of signups finish onboarding.</p>
          </CardContent>
        </Card>
      </div>

      {/* Most active users */}
      <Card className="border-border/70 bg-card/80 backdrop-blur">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <CardTitle className="text-base sm:text-lg">Most active users (30d)</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2">
          {data.activeUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-1.5">
              {data.activeUsers.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
                  <span className="text-foreground truncate flex-1 min-w-0">{u.email || u.user_id.slice(0, 8)}</span>
                  <span className="text-muted-foreground tabular-nums ml-3 flex-shrink-0">
                    <span className="font-semibold text-foreground">{u.events}</span> events · {u.distinct_actions} actions
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
