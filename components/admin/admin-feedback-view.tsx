"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { AdminUserFeedbackList } from "./admin-user-feedback-list"

function TabBar({ tab, onChange }: { tab: "user" | "ai"; onChange: (t: "user" | "ai") => void }) {
  return (
    <div className="flex gap-1.5 border-b border-border">
      {([
        { key: "user", label: "From users" },
        { key: "ai", label: "AI replies" },
      ] as const).map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "px-3 py-2 text-sm transition-colors -mb-px border-b-2",
            tab === t.key
              ? "border-primary text-foreground font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

interface Feedback {
  id: string
  created_at: string
  feedback_type: "positive" | "negative"
  feedback_text: string | null
  user_id: string | null
  email: string | null
}

const fmt = (d: string) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

const FILTERS = [
  { key: "", label: "All" },
  { key: "positive", label: "Positive" },
  { key: "negative", label: "Negative" },
]

type Tab = "user" | "ai"

export function AdminFeedbackView() {
  const [tab, setTab] = useState<Tab>("user")
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("")

  const load = useCallback(async (typeFilter: string) => {
    setLoading(true)
    const { data, error } = await supabase.rpc("admin_list_feedback", {
      limit_count: 200,
      type_filter: typeFilter || null,
    })
    if (error) setError(error.message)
    else {
      setError("")
      setItems((data as Feedback[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (tab === "ai") load(filter)
  }, [tab, filter, load])

  const positive = items.filter((i) => i.feedback_type === "positive").length
  const negative = items.filter((i) => i.feedback_type === "negative").length

  if (tab === "user") {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
          <p className="text-sm text-muted-foreground mt-1">What users are telling you about the app.</p>
        </div>
        <TabBar tab={tab} onChange={setTab} />
        <AdminUserFeedbackList />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Thumbs on assistant replies · {positive} positive · {negative} negative (in view)
        </p>
      </div>

      <TabBar tab={tab} onChange={setTab} />

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition-colors",
              filter === f.key ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading feedback…</p>
      ) : items.length === 0 ? (
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">No feedback yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((f) => (
            <Card key={f.id} className="border-border/70 bg-card/80">
              <CardContent className="p-4 flex items-start gap-3">
                <div
                  className={cn(
                    "size-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    f.feedback_type === "positive"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {f.feedback_type === "positive" ? <ThumbsUp className="size-4" /> : <ThumbsDown className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{f.email || f.user_id?.slice(0, 8) || "anon"}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{fmt(f.created_at)}</span>
                  </div>
                  {f.feedback_text ? (
                    <p className="text-sm text-foreground/80 mt-1">{f.feedback_text}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic mt-1">No comment</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
