"use client"

import { useMemo, useState } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Clock, Target, Flame, AlertCircle, Lightbulb } from "lucide-react"
import { computeWeeklyMetrics } from "@/lib/insights"
import { trackEvent } from "@/lib/analytics"

export function AICoachCard() {
  const { timeEntries, tasks, habits, habitLogs, goals, officeHours, user } = useAppStore(
    useShallow((state) => ({
      timeEntries: state.timeEntries,
      tasks: state.tasks,
      habits: state.habits,
      habitLogs: state.habitLogs,
      goals: state.goals,
      officeHours: state.officeHours,
      user: state.user,
    })),
  )

  const metrics = useMemo(
    () => computeWeeklyMetrics({ timeEntries, tasks, habits, habitLogs, goals, targetHours: officeHours }),
    [timeEntries, tasks, habits, habitLogs, goals, officeHours],
  )

  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState("")

  const generate = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Couldn't generate insights.")
        return
      }
      setInsight(data.insight || "")
      setSuggestions(data.suggestions || [])
      trackEvent("ai_insight_generated", user?.id)
    } catch {
      setError("Couldn't reach the coach. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const chips = [
    { icon: Clock, label: `${metrics.weekHours}h this week`, tone: "text-primary" },
    { icon: Target, label: `${metrics.daysOnTarget}/7 days on target`, tone: "text-primary" },
    { icon: AlertCircle, label: `${metrics.tasksOverdue} overdue`, tone: metrics.tasksOverdue ? "text-destructive" : "text-muted-foreground" },
    { icon: Flame, label: `${metrics.habitConsistencyPct}% habit consistency`, tone: "text-amber-600 dark:text-amber-400" },
  ]

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">AI Coach</h2>
              <p className="text-xs text-muted-foreground">Your last 7 days, coached</p>
            </div>
          </div>
          <Button onClick={generate} disabled={loading} size="sm">
            {loading ? "Thinking…" : insight ? "Refresh" : "Get insights"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/50 px-3 py-1 text-xs">
              <c.icon className={`size-3.5 ${c.tone}`} />
              {c.label}
            </span>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {insight && (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-foreground leading-relaxed">{insight}</p>
            {suggestions.length > 0 && (
              <ul className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Lightbulb className="size-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!insight && !error && (
          <p className="text-xs text-muted-foreground">
            Tap “Get insights” for a quick, personalized read on your week and what to focus on next.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
