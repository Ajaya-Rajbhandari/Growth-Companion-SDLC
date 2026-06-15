"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { ShieldCheck, ShieldOff } from "lucide-react"

interface AdminUser {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
  email_confirmed: boolean
  is_admin: boolean
  event_count: number
  last_event_at: string | null
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"

export function AdminUsersView() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_users")
    if (error) setError(error.message)
    else setUsers((data as AdminUser[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleAdmin = async (u: AdminUser) => {
    setBusyId(u.id)
    const { error } = await supabase.rpc("admin_set_admin", { target: u.id, make_admin: !u.is_admin })
    setBusyId(null)
    if (error) {
      toast({ title: "Couldn't update role", description: error.message, variant: "destructive" })
      return
    }
    toast({ title: u.is_admin ? "Admin removed" : "Admin granted", description: u.email || u.id })
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_admin: !x.is_admin } : x)))
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading users…</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">{users.length} total · grant or revoke admin access.</p>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Last active</th>
                  <th className="px-4 py-3 font-medium text-right">Events</th>
                  <th className="px-4 py-3 font-medium text-right">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground truncate max-w-[260px]">{u.email || u.id.slice(0, 8)}</div>
                      {!u.email_confirmed && <span className="text-[10px] text-amber-600 dark:text-amber-400">unconfirmed</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(u.last_event_at || u.last_sign_in_at)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{u.event_count}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {u.is_admin && <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">Admin</Badge>}
                        <Button
                          size="sm"
                          variant={u.is_admin ? "outline" : "secondary"}
                          disabled={busyId === u.id}
                          onClick={() => toggleAdmin(u)}
                          className="h-7 text-xs"
                        >
                          {u.is_admin ? <ShieldOff className="size-3.5 mr-1" /> : <ShieldCheck className="size-3.5 mr-1" />}
                          {u.is_admin ? "Revoke" : "Make admin"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
