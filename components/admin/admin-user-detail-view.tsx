"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

interface UserDetail {
  user: {
    id: string
    email: string | null
    created_at: string
    last_sign_in_at: string | null
    email_confirmed: boolean
    is_admin: boolean
  } | null
  eventCount: number
  lastEventAt: string | null
  breakdown: { event: string; count: number }[]
  recentEvents: { id: string; created_at: string; event: string; path: string | null; properties: Record<string, unknown> }[]
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

export function AdminUserDetailView({ userId }: { userId: string }) {
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true
    supabase.rpc("admin_get_user", { target: userId }).then(({ data, error }) => {
      if (!mounted) return
      if (error) setError(error.message)
      else setData(data as UserDetail)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [userId])

  if (loading) return <p className="text-sm text-muted-foreground">Loading user…</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data?.user) return <p className="text-sm text-muted-foreground">User not found.</p>

  const u = data.user

  return (
    <div className="space-y-5">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to users
      </Link>

      <div className="flex items-center gap-3">
        <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
          {(u.email || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight truncate">{u.email || u.id.slice(0, 8)}</h1>
            {u.is_admin && <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">Admin</Badge>}
            {!u.email_confirmed && <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px]">Unconfirmed</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Joined {fmt(u.created_at)} · {data.eventCount} events · last active {fmt(data.lastEventAt || u.last_sign_in_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/70 bg-card/80 lg:col-span-1">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Activity breakdown</CardTitle></CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {data.breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity.</p>
            ) : (
              data.breakdown.map((b) => (
                <div key={b.event} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-[12px] text-foreground">{b.event}</span>
                  <span className="tabular-nums text-muted-foreground">{b.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 lg:col-span-2">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Recent events</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">When</th>
                    <th className="px-4 py-2.5 font-medium">Event</th>
                    <th className="px-4 py-2.5 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentEvents.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No events.</td></tr>
                  ) : (
                    data.recentEvents.map((e) => (
                      <tr key={e.id} className="border-b border-border/40 last:border-0 align-top">
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmt(e.created_at)}</td>
                        <td className="px-4 py-2"><Badge variant="outline" className="text-[10px] font-mono">{e.event}</Badge></td>
                        <td className="px-4 py-2 text-muted-foreground font-mono text-[11px]">
                          {Object.keys(e.properties || {}).length ? JSON.stringify(e.properties) : "—"}
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
    </div>
  )
}
