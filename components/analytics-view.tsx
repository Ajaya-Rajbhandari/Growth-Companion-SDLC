"use client"

import { useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"
import { calculateDuration } from "@/components/timesheet/helpers"
import { getLocalDateKey, parseLocalDateKey } from "@/lib/utils"
import { Clock, CheckSquare, Target, Flame, TrendingUp, CalendarRange } from "lucide-react"

const WINDOW_DAYS = 30
const MS_PER_HOUR = 1000 * 60 * 60
const UNCATEGORIZED_COLOR = "#94a3b8"

export function AnalyticsView() {
  const { timeEntries, currentEntry, timeCategories, tasks, goals, habits, habitLogs, getHabitStreak } =
    useAppStore(
      useShallow((state) => ({
        timeEntries: state.timeEntries,
        currentEntry: state.currentEntry,
        timeCategories: state.timeCategories,
        tasks: state.tasks,
        goals: state.goals,
        habits: state.habits,
        habitLogs: state.habitLogs,
        getHabitStreak: state.getHabitStreak,
      })),
    )

  // Rolling 30-day window of local date keys (oldest -> newest).
  const dayKeys = useMemo(() => {
    const keys: string[] = []
    const today = new Date()
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      keys.push(getLocalDateKey(d))
    }
    return keys
  }, [])
  const windowSet = useMemo(() => new Set(dayKeys), [dayKeys])

  const windowEntries = useMemo(() => {
    const arr = timeEntries.filter((e) => windowSet.has(e.date))
    if (
      currentEntry &&
      !currentEntry.clockOut &&
      windowSet.has(currentEntry.date) &&
      !arr.some((e) => e.id === currentEntry.id)
    ) {
      arr.unshift(currentEntry)
    }
    return arr
  }, [timeEntries, currentEntry, windowSet])

  const entryHours = (e: (typeof windowEntries)[number]) =>
    calculateDuration(e.clockIn, e.clockOut, e.breakMinutes).totalMs / MS_PER_HOUR

  // 30-day daily hours trend.
  const dailyHours = useMemo(
    () =>
      dayKeys.map((key) => {
        const hours = windowEntries
          .filter((e) => e.date === key)
          .reduce((sum, e) => sum + entryHours(e), 0)
        return {
          date: key,
          label: parseLocalDateKey(key).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          hours: Number(hours.toFixed(2)),
        }
      }),
    [dayKeys, windowEntries],
  )

  const totalHours = useMemo(() => dailyHours.reduce((s, d) => s + d.hours, 0), [dailyHours])
  const activeDays = useMemo(() => dailyHours.filter((d) => d.hours > 0).length, [dailyHours])
  const avgDaily = activeDays > 0 ? totalHours / activeDays : 0

  // Hours by category over the window.
  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    windowEntries.forEach((e) => {
      const key = e.category || "uncategorized"
      map.set(key, (map.get(key) || 0) + entryHours(e))
    })
    return Array.from(map.entries())
      .map(([id, hours]) => {
        const cat = timeCategories.find((c) => c.id === id)
        return {
          name: cat?.name || "Uncategorized",
          color: cat?.color || UNCATEGORIZED_COLOR,
          hours: Number(hours.toFixed(2)),
        }
      })
      .filter((c) => c.hours > 0)
      .sort((a, b) => b.hours - a.hours)
  }, [windowEntries, timeCategories])

  // Task completion, overall and by priority.
  const taskStats = useMemo(() => {
    const completed = tasks.filter((t) => t.completed).length
    const rate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
    const byPriority = (["high", "medium", "low"] as const).map((p) => ({
      priority: p[0].toUpperCase() + p.slice(1),
      completed: tasks.filter((t) => t.priority === p && t.completed).length,
      pending: tasks.filter((t) => t.priority === p && !t.completed).length,
    }))
    return { completed, total: tasks.length, rate, byPriority }
  }, [tasks])

  // Per-habit consistency over the window + current streak.
  const habitRows = useMemo(
    () =>
      habits
        .map((h) => {
          const done = habitLogs.filter(
            (l) => l.habitId === h.id && windowSet.has(l.date) && l.count > 0,
          ).length
          return {
            id: h.id,
            title: h.title,
            color: h.color,
            rate: Math.round((done / WINDOW_DAYS) * 100),
            streak: getHabitStreak(h.id),
          }
        })
        .sort((a, b) => b.rate - a.rate),
    [habits, habitLogs, windowSet, getHabitStreak],
  )
  const avgConsistency =
    habitRows.length > 0 ? Math.round(habitRows.reduce((s, r) => s + r.rate, 0) / habitRows.length) : 0
  const bestStreak = habitRows.reduce((m, r) => Math.max(m, r.streak), 0)

  // Goal progress.
  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals])
  const avgGoalProgress =
    activeGoals.length > 0
      ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length)
      : 0

  const kpis = [
    { label: "Hours (30d)", value: `${totalHours.toFixed(1)}h`, sub: `${activeDays} active days`, icon: Clock },
    { label: "Avg / active day", value: `${avgDaily.toFixed(1)}h`, sub: "time logged", icon: CalendarRange },
    { label: "Task completion", value: `${taskStats.rate}%`, sub: `${taskStats.completed}/${taskStats.total} done`, icon: CheckSquare },
    { label: "Goal progress", value: `${avgGoalProgress}%`, sub: `${activeGoals.length} active`, icon: Target },
    { label: "Habit consistency", value: `${avgConsistency}%`, sub: `${habits.length} habits`, icon: TrendingUp },
    { label: "Best streak", value: `${bestStreak}d`, sub: "current", icon: Flame },
  ]

  const cardCls = "border-border/70 bg-card/80 shadow-sm backdrop-blur"

  return (
    <div className="space-y-3 sm:space-y-4 w-full max-w-full">
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Cross-feature trends over the last {WINDOW_DAYS} days.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={cardCls}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                <kpi.icon className="size-4 text-primary shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-bold mt-1">{kpi.value}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hours trend + hours by category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className={`lg:col-span-2 ${cardCls}`}>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 sm:size-5 text-primary" />
              Hours — last {WINDOW_DAYS} days
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {totalHours > 0 ? (
              <ChartContainer
                config={{ hours: { label: "Hours", theme: { light: "#3b82f6", dark: "#60a5fa" } } }}
                className="h-[220px] sm:h-[260px] w-full"
              >
                <AreaChart data={dailyHours} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(WINDOW_DAYS / 6)}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="var(--color-hours)"
                    fill="var(--color-hours)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <EmptyState text="No time logged in the last 30 days." />
            )}
          </CardContent>
        </Card>

        <Card className={cardCls}>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Clock className="size-4 sm:size-5 text-primary" />
              Hours by category
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {byCategory.length > 0 ? (
              <ChartContainer config={{ hours: { label: "Hours" } }} className="h-[220px] sm:h-[260px] w-full">
                <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                    {byCategory.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyState text="No categorized time yet." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks by priority + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card className={cardCls}>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <CheckSquare className="size-4 sm:size-5 text-primary" />
              Tasks by priority
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {taskStats.total > 0 ? (
              <ChartContainer
                config={{
                  completed: { label: "Completed", theme: { light: "#22c55e", dark: "#4ade80" } },
                  pending: { label: "Pending", theme: { light: "#f59e0b", dark: "#fbbf24" } },
                }}
                className="h-[220px] w-full"
              >
                <BarChart data={taskStats.byPriority} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="priority" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis hide allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyState text="No tasks yet." />
            )}
          </CardContent>
        </Card>

        <Card className={cardCls}>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Target className="size-4 sm:size-5 text-primary" />
              Active goals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
            {activeGoals.length > 0 ? (
              activeGoals.slice(0, 6).map((g) => (
                <div key={g.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{g.title}</span>
                    <span className="text-muted-foreground tabular-nums">{g.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${g.progress}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text="No active goals." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Habit consistency */}
      <Card className={cardCls}>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Flame className="size-4 sm:size-5 text-primary" />
            Habit consistency — last {WINDOW_DAYS} days
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {habitRows.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {habitRows.map((h) => (
                <div key={h.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                      <span className="truncate font-medium">{h.title}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {h.streak > 0 && (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Flame className="size-3" />
                          {h.streak}d
                        </Badge>
                      )}
                      <span className="text-muted-foreground tabular-nums">{h.rate}%</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${h.rate}%`, backgroundColor: h.color }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No habits yet." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground text-center px-4">
      {text}
    </div>
  )
}
