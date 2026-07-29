"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Bug, Lightbulb, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserFeedback {
  id: string
  created_at: string
  category: "bug" | "idea" | "other"
  message: string
  page: string | null
  user_id: string | null
  email: string | null
}

const fmt = (d: string) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

const FILTERS = [
  { key: "", label: "All" },
  { key: "bug", label: "Bugs" },
  { key: "idea", label: "Ideas" },
  { key: "other", label: "Other" },
]

const ICONS = { bug: Bug, idea: Lightbulb, other: MoreHorizontal }
const TONES = {
  bug: "bg-destructive/10 text-destructive",
  idea: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  other: "bg-muted text-muted-foreground",
}

export function AdminUserFeedbackList() {
  const [items, setItems] = useState<UserFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("")

  const load = useCallback(async (categoryFilter: string) => {
    setLoading(true)
    const { data, error } = await supabase.rpc("admin_list_user_feedback", {
      limit_count: 200,
      category_filter: categoryFilter || null,
    })
    if (error) setError(error.message)
    else {
      setError("")
      setItems((data as UserFeedback[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load(filter)
  }, [filter, load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Sent from the Profile page · {items.length} in view
        </p>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm transition-colors",
                filter === f.key
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading feedback…</p>
      ) : items.length === 0 ? (
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No user feedback yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((f) => {
            const Icon = ICONS[f.category] || MoreHorizontal
            return (
              <Card key={f.id} className="border-border/70 bg-card/80">
                <CardContent className="p-4 flex items-start gap-3">
                  <div
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      TONES[f.category] || TONES.other,
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {f.email || f.user_id?.slice(0, 8) || "anon"}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{fmt(f.created_at)}</span>
                    </div>
                    <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap break-words">{f.message}</p>
                    {f.page && <p className="text-xs text-muted-foreground mt-1">from {f.page}</p>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
