"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { FEATURE_FLAGS, type FeatureName, type FlagOverrides } from "@/lib/feature-flags"

const FEATURES = Object.entries(FEATURE_FLAGS) as [FeatureName, (typeof FEATURE_FLAGS)[FeatureName]][]

export function AdminFlagsView() {
  const [overrides, setOverrides] = useState<FlagOverrides>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<FeatureName | null>(null)

  useEffect(() => {
    let mounted = true
    supabase
      .from("feature_flags")
      .select("name, enabled")
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) setError(error.message)
        else {
          const map: FlagOverrides = {}
          for (const row of (data as { name: string; enabled: boolean }[]) || []) {
            map[row.name as FeatureName] = row.enabled
          }
          setOverrides(map)
        }
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const toggle = async (name: FeatureName, next: boolean) => {
    setBusy(name)
    const { error } = await supabase.rpc("admin_set_feature_flag", { flag_name: name, is_enabled: next })
    setBusy(null)
    if (error) {
      toast({ title: "Couldn't update flag", description: error.message, variant: "destructive" })
      return
    }
    setOverrides((prev) => ({ ...prev, [name]: next }))
    toast({ title: `${name} ${next ? "enabled" : "disabled"}`, description: "Applies to all users on their next load." })
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading flags…</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Toggle features live. Changes apply to all users on their next page load.
        </p>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardContent className="p-0 divide-y divide-border/50">
          {FEATURES.map(([name, flag]) => {
            const overridden = name in overrides
            const enabled = overrides[name] ?? flag.enabled
            return (
              <div key={name} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground font-mono text-sm">{name}</span>
                    {overridden && enabled !== flag.enabled && (
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                        overridden
                      </Badge>
                    )}
                    {flag.beta && <Badge variant="outline" className="text-[10px]">beta</Badge>}
                  </div>
                  {flag.description && <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>}
                </div>
                <Switch
                  checked={enabled}
                  disabled={busy === name}
                  onCheckedChange={(v) => toggle(name, v)}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Default values come from <code className="font-mono">lib/feature-flags.ts</code>; a toggle here stores an
        override in the database that wins over the code default.
      </p>
    </div>
  )
}
