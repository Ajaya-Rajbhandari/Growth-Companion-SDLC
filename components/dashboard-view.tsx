"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { isViewEnabled, type ViewId } from "@/lib/feature-flags"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  Circle,
  Clock,
  Zap,
  AlertCircle,
  Calendar,
  BarChart3,
  Activity,
  Plus,
  Play,
  Square,
  Coffee,
  Target,
  Flame,
  ArrowRight,
  CalendarDays,
  Timer,
  Bell,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { cn, getLocalDateKey, parseLocalDateKey } from "@/lib/utils"
import { format, isToday, isTomorrow, parseISO, differenceInDays } from "date-fns"
import { BreakDialog, type BreakType } from "@/components/timesheet/dialogs"

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const mins = Math.round(totalMinutes % 60)
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

function getDailyLimitStatusLabel(status: "normal" | "warning" | "grace" | "overwork" | "hardCap"): string {
  switch (status) {
    case "normal": return "On track"
    case "warning": return "Almost at target"
    case "grace": return "In grace"
    case "overwork": return "Overwork"
    case "hardCap": return "At daily limit"
    default: return "On track"
  }
}

export function DashboardView() {
  const { 
    tasks, 
    notes, 
    currentEntry,
    activeBreak,
    timeEntries,
    user,
    fetchInitialData,
    activeView,
    goals,
    habits,
    habitLogs,
    clockIn,
    clockOut,
    endBreak,
    setActiveView,
    officeHours,
    graceMinutes,
    allowOverworkMinutes,
    overworkMinutesRequested,
    getTodayWorkStats,
  } = useAppStore(
    useShallow((state) => ({
      tasks: state.tasks,
      notes: state.notes,
      currentEntry: state.currentEntry,
      activeBreak: state.activeBreak,
      timeEntries: state.timeEntries,
      user: state.user,
      fetchInitialData: state.fetchInitialData,
      activeView: state.activeView,
      goals: state.goals,
      habits: state.habits,
      habitLogs: state.habitLogs,
      clockIn: state.clockIn,
      clockOut: state.clockOut,
      endBreak: state.endBreak,
      setActiveView: state.setActiveView,
      officeHours: state.officeHours,
      graceMinutes: state.graceMinutes,
      allowOverworkMinutes: state.allowOverworkMinutes,
      overworkMinutesRequested: state.overworkMinutesRequested,
      getTodayWorkStats: state.getTodayWorkStats,
    })),
  )

  // Refresh data when dashboard view becomes active (only if no data exists)
  const hasData = timeEntries.length > 0 || tasks.length > 0
  useEffect(() => {
    if (activeView === "dashboard" && user && !hasData) {
      fetchInitialData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, user?.id, hasData])

  // Keep live Today/status cards fresh while a session is open.
  // Without this ticking value, Date.now() inside memoized calculations only updates
  // when another state change happens, so the dashboard can look stale after clock-in.
  const [breakDialogOpen, setBreakDialogOpen] = useState(false)
  const [breakType, setBreakType] = useState<BreakType>("custom")
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!currentEntry) return
    setNowMs(Date.now())
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [currentEntry])

  const completedTasks = useMemo(() => tasks.filter((t) => t.completed).length, [tasks])
  const pendingTasks = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks])
  const highPriorityTasks = useMemo(() => tasks.filter((t) => t.priority === "high" && !t.completed), [tasks])
  
  // Overdue and upcoming tasks
  const todayStr = useMemo(() => getLocalDateKey(), [])
  const overdueTasks = useMemo(() => 
    tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr),
    [tasks, todayStr]
  )
  const upcomingTasks = useMemo(() => {
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    return tasks.filter((t) => 
      !t.completed && 
      t.dueDate && 
      t.dueDate >= todayStr && 
      t.dueDate <= getLocalDateKey(nextWeek)
    )
  }, [tasks, todayStr])

  const todayEntries = useMemo(() => timeEntries.filter((entry) => entry.date === todayStr), [timeEntries, todayStr])
  const todayHours = useMemo(() => {
    return todayEntries.reduce((total, entry) => {
      // Open/current entries are calculated separately with nowMs so they update live
      // and are not double-counted when currentEntry is also present in timeEntries.
      if (!entry.clockOut) return total
      const end = new Date(entry.clockOut).getTime()
      const start = new Date(entry.clockIn).getTime()
      const diffMs = Math.max(0, end - start - (entry.breakMinutes || 0) * 60 * 1000)
      return total + diffMs / (1000 * 60 * 60)
    }, 0)
  }, [todayEntries])

  const todayHoursWithCurrent = useMemo(() => {
    let hours = todayHours
    if (currentEntry && currentEntry.date === todayStr && !currentEntry.clockOut) {
      const start = new Date(currentEntry.clockIn).getTime()
      const breakMs = (currentEntry.breakMinutes || 0) * 60 * 1000
      const diffMs = Math.max(0, nowMs - start - breakMs)
      const currentSessionHours = diffMs / (1000 * 60 * 60)
      hours += currentSessionHours
    }
    return hours
  }, [todayHours, currentEntry, todayStr, nowMs])

  // Live elapsed time for the open session (excludes break minutes), ticking via nowMs.
  const currentSessionElapsed = useMemo(() => {
    if (!currentEntry || currentEntry.clockOut) return ""
    const start = new Date(currentEntry.clockIn).getTime()
    const breakMs = (currentEntry.breakMinutes || 0) * 60 * 1000
    const totalSeconds = Math.floor(Math.max(0, nowMs - start - breakMs) / 1000)
    const pad = (n: number) => String(n).padStart(2, "0")
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }, [currentEntry, nowMs])

  // Live elapsed time for the CURRENT task only (since the last task switch), ticking via nowMs.
  // Null until you've switched at least once — before that, the session timer already covers it.
  const currentTaskElapsed = useMemo(() => {
    if (!currentEntry || currentEntry.clockOut || activeBreak) return null
    const subs = currentEntry.subtasks || []
    if (subs.length === 0) return null
    const startMs = new Date(subs[subs.length - 1].clockOut || currentEntry.clockIn).getTime()
    const taskBreakMs = (currentEntry.breaks || []).reduce((sum, b) => {
      if (b.endTime && new Date(b.startTime).getTime() >= startMs) {
        return sum + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime())
      }
      return sum
    }, 0)
    const diffMs = Math.max(0, nowMs - startMs - taskBreakMs)
    return `${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m`
  }, [currentEntry, activeBreak, nowMs])

  // Live break status (countdown for timed breaks, elapsed for open-ended), ticking via nowMs.
  const breakStatus = useMemo(() => {
    if (!activeBreak) return null
    const pad = (n: number) => String(n).padStart(2, "0")
    const fmt = (totalSec: number) => `${pad(Math.floor(totalSec / 60))}:${pad(totalSec % 60)}`
    const startedAt = new Date(activeBreak.startTime).getTime()
    const elapsedSec = Math.max(0, Math.floor((nowMs - startedAt) / 1000))
    const duration = activeBreak.durationMinutes
    if (duration && duration > 0) {
      const remainingSec = duration * 60 - elapsedSec
      if (remainingSec > 0) return { ended: false, timer: fmt(remainingSec), suffix: "left" }
      return { ended: true, timer: "", suffix: "" }
    }
    return { ended: false, timer: fmt(elapsedSec), suffix: "elapsed" }
  }, [activeBreak, nowMs])

  const completionRate = useMemo(() => {
    return tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
  }, [tasks.length, completedTasks])

  // Recompute on each render; the live nowMs ticker triggers renders while active.
  const workStats = getTodayWorkStats()

  // Calculate weekly stats
  const { weekEntries, weeklyHours } = useMemo(() => {
    const start = new Date()
    const dayOfWeek = start.getDay()
    start.setDate(start.getDate() - dayOfWeek)
    start.setHours(0, 0, 0, 0)

    const entries = timeEntries.filter((e) => {
      return parseLocalDateKey(e.date) >= start
    })
    
    let hours = entries.reduce((total, entry) => {
      if (!entry.clockOut) return total
      const end = new Date(entry.clockOut).getTime()
      const start = new Date(entry.clockIn).getTime()
      const diffMs = Math.max(0, end - start - (entry.breakMinutes || 0) * 60 * 1000)
      return total + diffMs / (1000 * 60 * 60)
    }, 0)

    if (currentEntry && currentEntry.date >= getLocalDateKey(start) && !currentEntry.clockOut) {
      const sessionStart = new Date(currentEntry.clockIn).getTime()
      const breakMs = (currentEntry.breakMinutes || 0) * 60 * 1000
      const diffMs = Math.max(0, nowMs - sessionStart - breakMs)
      hours += diffMs / (1000 * 60 * 60)
    }

    return { weekStart: start, weekEntries: entries, weeklyHours: hours }
  }, [timeEntries, currentEntry, nowMs])

  // Daily breakdown
  const { last7Days, dailyHours } = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      date.setHours(0, 0, 0, 0)
      return getLocalDateKey(date)
    })

    const hours = days.map((date) => {
      const dayEntries = timeEntries.filter((e) => {
        return e.date === date
      })
      let dayHours = dayEntries.reduce((total, entry) => {
        if (!entry.clockOut) return total
        const end = new Date(entry.clockOut).getTime()
        const start = new Date(entry.clockIn).getTime()
        const diffMs = Math.max(0, end - start - (entry.breakMinutes || 0) * 60 * 1000)
        return total + diffMs / (1000 * 60 * 60)
      }, 0)

      if (currentEntry && currentEntry.date === date && !currentEntry.clockOut) {
        const start = new Date(currentEntry.clockIn).getTime()
        const breakMs = (currentEntry.breakMinutes || 0) * 60 * 1000
        const diffMs = Math.max(0, nowMs - start - breakMs)
        dayHours += diffMs / (1000 * 60 * 60)
      }

      return dayHours
    })

    return { last7Days: days, dailyHours: hours }
  }, [timeEntries, currentEntry, nowMs])

  const { avgDailyHours, maxDailyHours, dailyChartData } = useMemo(() => {
    const avg = dailyHours.length > 0 ? (dailyHours.reduce((a, b) => a + b, 0) / dailyHours.length).toFixed(1) : "0"
    const max = dailyHours.length > 0 ? Math.max(...dailyHours).toFixed(1) : "0"
    const chartData = last7Days.map((date, index) => ({
      dateLabel: parseLocalDateKey(date).toLocaleDateString("en-US", { weekday: "short" }),
      hours: Number(dailyHours[index].toFixed(2)),
    }))
    return { avgDailyHours: avg, maxDailyHours: max, dailyChartData: chartData }
  }, [dailyHours, last7Days])

  // Goals progress
  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals])
  const goalsProgress = useMemo(() => {
    if (activeGoals.length === 0) return 0
    const totalProgress = activeGoals.reduce((sum, g) => sum + g.progress, 0)
    return Math.round(totalProgress / activeGoals.length)
  }, [activeGoals])

  // Habits today
  const todayHabits = useMemo(() => {
    return habits.filter((h) => {
      const logs = habitLogs.filter((log) => log.habitId === h.id && log.date === todayStr)
      return logs.length > 0
    })
  }, [habits, habitLogs, todayStr])

  const habitsCompletionRate = useMemo(() => {
    if (habits.length === 0) return 0
    return Math.round((todayHabits.length / habits.length) * 100)
  }, [habits.length, todayHabits.length])

  // Get greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }, [])

  const handleQuickAction = (action: string) => {
    if (action === "clock-in") {
      clockIn()
    } else if (action === "clock-out") {
      clockOut()
    } else if (action === "take-break") {
      setBreakDialogOpen(true)
    } else if (action === "resume") {
      void endBreak()
    } else if (isViewEnabled(action as ViewId)) {
      setActiveView(action as any)
    }
  }

  const hoursProgress = officeHours > 0 ? Math.min(100, (todayHoursWithCurrent / officeHours) * 100) : 0

  return (
    <div className="space-y-5 sm:space-y-7">
      <BreakDialog
        open={breakDialogOpen}
        onOpenChange={setBreakDialogOpen}
        breakType={breakType}
        onBreakTypeChange={setBreakType}
        onBeforeStart={() => {}}
      />
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/80 p-5 sm:p-7 shadow-xl shadow-black/5 backdrop-blur dark:shadow-black/25">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,var(--primary),transparent_26rem)] opacity-20" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="min-w-0">
            {activeBreak ? (
              <div className={cn(
                "mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                breakStatus?.ended
                  ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
              )}>
                <Coffee className="size-3.5" />
                {breakStatus?.ended ? (
                  "Break ended — tap Resume Work"
                ) : (
                  <span>
                    On break
                    {breakStatus?.timer && (
                      <span className="ml-1.5 tabular-nums font-semibold">{breakStatus.timer} {breakStatus.suffix}</span>
                    )}
                  </span>
                )}
              </div>
            ) : (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Activity className="size-3.5 text-accent" />
                {currentEntry ? (
                  <span>
                    Active focus session
                    {currentSessionElapsed && (
                      <span className="ml-1.5 tabular-nums font-semibold text-foreground">{currentSessionElapsed}</span>
                    )}
                  </span>
                ) : (
                  "Ready for today's plan"
                )}
              </div>
            )}
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {greeting}{user ? `, ${user.name.split(" ")[0]}` : ""}!
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl">
              A focused snapshot of your time, tasks, goals, and habits for today.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            onClick={() => handleQuickAction("clock-in")}
            size="sm"
            variant={currentEntry ? "outline" : "default"}
            className="min-h-[44px] sm:min-h-0 rounded-xl shadow-sm"
            disabled={!!currentEntry}
          >
            <Play className="size-4 mr-2" />
            Clock In
          </Button>
          <Button
            onClick={() => handleQuickAction("clock-out")}
            size="sm"
            variant="destructive"
            className="min-h-[44px] sm:min-h-0 rounded-xl"
            disabled={!currentEntry}
          >
            <Square className="size-4 mr-2" />
            Clock Out
          </Button>
          {currentEntry && !activeBreak && (
            <Button
              onClick={() => handleQuickAction("take-break")}
              size="sm"
              variant="outline"
              className="min-h-[44px] sm:min-h-0 rounded-xl bg-background/50"
            >
              <Coffee className="size-4 mr-2" />
              Take Break
            </Button>
          )}
          {activeBreak && (
            <Button
              onClick={() => handleQuickAction("resume")}
              size="sm"
              variant="default"
              className="min-h-[44px] sm:min-h-0 rounded-xl shadow-sm"
            >
              <Play className="size-4 mr-2" />
              Resume Work
            </Button>
          )}
          {isViewEnabled("tasks") && (
            <Button
              onClick={() => handleQuickAction("tasks")}
              size="sm"
              variant="outline"
              className="min-h-[44px] sm:min-h-0 rounded-xl bg-background/50"
            >
              <Plus className="size-4 mr-2" />
              Add Task
            </Button>
          )}
          {isViewEnabled("notes") && (
            <Button
              onClick={() => handleQuickAction("notes")}
              size="sm"
              variant="outline"
              className="min-h-[44px] sm:min-h-0 rounded-xl bg-background/50"
            >
              <Plus className="size-4 mr-2" />
              Add Note
            </Button>
          )}
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="overflow-hidden border-primary/25 bg-card/80 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Today's Hours</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {todayHoursWithCurrent.toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {officeHours > 0 ? `of ${officeHours}h target` : "logged"}
                </p>
              </div>
              <div className="size-12 sm:size-14 rounded-2xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center">
                <Timer className="size-5 sm:size-6 text-primary" />
              </div>
            </div>
            {officeHours > 0 && (
              <>
                <div className="mt-3 w-full bg-secondary/70 rounded-full h-1.5">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      workStats.status === "hardCap" && "bg-destructive",
                      workStats.status === "overwork" && "bg-amber-500",
                      workStats.status === "grace" && "bg-amber-500/80",
                      (workStats.status === "normal" || workStats.status === "warning") && "bg-primary",
                    )}
                    style={{ width: `${Math.min(100, hoursProgress)}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded",
                      workStats.status === "hardCap" && "bg-destructive/20 text-destructive",
                      workStats.status === "overwork" && "bg-amber-500/20 text-amber-700 dark:text-amber-300",
                      workStats.status === "grace" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                      workStats.status === "warning" && "bg-primary/20 text-primary",
                      workStats.status === "normal" && "bg-primary/10 text-primary",
                    )}
                  >
                    {getDailyLimitStatusLabel(workStats.status)}
                  </span>
                  {workStats.remainingMinutes > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {formatMinutes(workStats.remainingMinutes)} left today
                    </span>
                  )}
                  {workStats.status === "hardCap" && (
                    <span className="text-xs text-muted-foreground">Daily limit reached</span>
                  )}
                  {workStats.overtimeBadge && (
                    <span className="text-xs text-muted-foreground">
                      {formatMinutes(Math.max(0, workStats.todayMinutes - workStats.baseLimitMinutes))} over {officeHours}h target
                    </span>
                  )}
                </div>
                {(graceMinutes > 0 || allowOverworkMinutes > 0) && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Limit: {officeHours}h
                    {graceMinutes > 0 && ` + ${graceMinutes}m grace`}
                    {overworkMinutesRequested > 0 && ` + ${overworkMinutesRequested}m overwork`}
                    {allowOverworkMinutes > 0 && (
                      overworkMinutesRequested === 0 ? (
                        <Button
                          variant="link"
                          className="h-auto p-0 text-[10px] text-muted-foreground underline"
                          onClick={() => setActiveView("timesheet")}
                        >
                          Add overwork in Timesheet
                        </Button>
                      ) : null
                    )}
                  </p>
                )}
                {officeHours > 0 && (
                  <Button
                    variant="link"
                    className="h-auto p-0 text-[10px] text-muted-foreground underline mt-0.5"
                    onClick={() => setActiveView("profile")}
                  >
                    Set daily target & grace in Profile
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-amber-500/25 bg-card/80 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Weekly catch-up</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {(workStats.weeklyCatchUpMinutes / 60).toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {officeHours > 0
                    ? `Hours short this week to reach ${officeHours}h/day target`
                    : "Hours under target this week (set daily target in Profile)"}
                </p>
              </div>
              <div className="size-12 sm:size-14 rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/20 flex items-center justify-center">
                <Clock className="size-5 sm:size-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {isViewEnabled("tasks") && (
          <Card className="overflow-hidden border-chart-2/25 bg-card/80 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-chart-2/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pending Tasks</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{pendingTasks}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completedTasks} completed
                  </p>
                </div>
                <div className="size-12 sm:size-14 rounded-2xl bg-chart-2/15 ring-1 ring-chart-2/20 flex items-center justify-center">
                  <CheckCircle2 className="size-5 sm:size-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isViewEnabled("goals") && (
          <Card className="overflow-hidden border-accent/25 bg-card/80 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Active Goals</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{activeGoals.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {goalsProgress}% avg progress
                  </p>
                </div>
                <div className="size-12 sm:size-14 rounded-2xl bg-accent/15 ring-1 ring-accent/20 flex items-center justify-center">
                  <Target className="size-5 sm:size-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isViewEnabled("habits") && (
          <Card className="overflow-hidden border-chart-3/25 bg-card/80 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-chart-3/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Habits Today</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {todayHabits.length}/{habits.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {habitsCompletionRate}% completed
                  </p>
                </div>
                <div className="size-12 sm:size-14 rounded-2xl bg-chart-3/15 ring-1 ring-chart-3/20 flex items-center justify-center">
                  <Flame className="size-5 sm:size-6 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Urgent Items Section */}
      {isViewEnabled("tasks") && (overdueTasks.length > 0 || upcomingTasks.length > 0 || highPriorityTasks.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
              <Bell className="size-5 text-destructive" />
              Urgent Items
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView("tasks")}
              className="text-xs sm:text-sm"
            >
              View All
              <ArrowRight className="size-3 sm:size-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {overdueTasks.length > 0 && (
              <Card className="border-destructive/25 bg-card/80 shadow-sm backdrop-blur">
                <CardHeader className="pb-3 p-4 sm:p-6">
                  <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-destructive">
                    <AlertCircle className="size-4 sm:size-5" />
                    Overdue ({overdueTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <ul className="space-y-2">
                    {overdueTasks.slice(0, 3).map((task) => (
                      <li key={task.id} className="flex items-start gap-2 text-xs sm:text-sm">
                        <Circle className="size-3 sm:size-4 text-destructive flex-shrink-0 mt-0.5" />
                        <span className="text-foreground line-clamp-2">{task.title}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {highPriorityTasks.length > 0 && (
              <Card className="border-chart-3/25 bg-card/80 shadow-sm backdrop-blur">
                <CardHeader className="pb-3 p-4 sm:p-6">
                  <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-chart-3">
                    <Zap className="size-4 sm:size-5" />
                    High Priority ({highPriorityTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <ul className="space-y-2">
                    {highPriorityTasks.slice(0, 3).map((task) => (
                      <li key={task.id} className="flex items-start gap-2 text-xs sm:text-sm">
                        <Circle className="size-3 sm:size-4 text-chart-3 flex-shrink-0 mt-0.5" />
                        <span className="text-foreground line-clamp-2">{task.title}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {upcomingTasks.length > 0 && (
              <Card className="border-primary/25 bg-card/80 shadow-sm backdrop-blur">
                <CardHeader className="pb-3 p-4 sm:p-6">
                  <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-primary">
                    <CalendarDays className="size-4 sm:size-5" />
                    Upcoming ({upcomingTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <ul className="space-y-2">
                    {upcomingTasks.slice(0, 3).map((task) => {
                      const dueDate = task.dueDate ? parseISO(task.dueDate) : null
                      const daysUntil = dueDate ? differenceInDays(dueDate, new Date()) : null
                      return (
                        <li key={task.id} className="flex items-start gap-2 text-xs sm:text-sm">
                          <Calendar className="size-3 sm:size-4 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-foreground line-clamp-1">{task.title}</span>
                            {dueDate && (
                              <p className="text-muted-foreground text-xs mt-0.5">
                                {isToday(dueDate) ? "Today" : isTomorrow(dueDate) ? "Tomorrow" : `In ${daysUntil} days`}
                              </p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="lg:col-span-2 border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="size-4 sm:size-5 text-primary" />
              Weekly Hours Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <ChartContainer
              config={{
                hours: {
                  label: "Hours",
                  theme: {
                    light: "#3b82f6",
                    dark: "#60a5fa",
                  },
                },
              }}
              className="h-[200px] sm:h-[250px] md:h-[300px] w-full"
            >
              <AreaChart data={dailyChartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid 
                  vertical={false} 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
                <XAxis 
                  dataKey="dateLabel" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  hide
                  domain={[
                    0,
                    officeHours > 0
                      ? Math.max(officeHours, Number(maxDailyHours || 0) + 0.5)
                      : Number(maxDailyHours || 0) + 0.5 || 1,
                  ]}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                {officeHours > 0 && (
                  <ReferenceLine
                    y={officeHours}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    strokeOpacity={0.8}
                    label={{ value: `${officeHours}h target`, position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="var(--color-hours)"
                  fill="var(--color-hours)"
                  fillOpacity={0.6}
                  strokeWidth={3}
                />
              </AreaChart>
            </ChartContainer>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/70">
              <div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="text-lg font-bold text-foreground">{weeklyHours.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Daily</p>
                <p className="text-lg font-bold text-foreground">{avgDailyHours}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Peak Day</p>
                <p className="text-lg font-bold text-foreground">{maxDailyHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Activity className="size-4 sm:size-5 text-accent" />
              Productivity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            {isViewEnabled("tasks") && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">Task Completion</span>
                  <span className="text-xs sm:text-sm font-semibold text-foreground">{completionRate}%</span>
                </div>
                <div className="w-full bg-secondary/70 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-border/70">
              <span className="text-xs sm:text-sm text-muted-foreground">Weekly Sessions</span>
              <span className="text-base sm:text-lg font-bold text-foreground">{weekEntries.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-muted-foreground">Days Worked</span>
              <span className="text-base sm:text-lg font-bold text-foreground">
                {dailyHours.filter((h) => h > 0).length}/7
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-muted-foreground">Consistency</span>
              <span className="text-base sm:text-lg font-bold text-accent">
                {Math.round((dailyHours.filter((h) => h > 0).length / 7) * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Work Session / Break */}
      {currentEntry && (
        activeBreak ? (
          <Card className={cn(
            "backdrop-blur shadow-lg",
            breakStatus?.ended
              ? "border-red-500/40 bg-red-500/5 shadow-red-500/10"
              : "border-amber-500/40 bg-amber-500/5 shadow-amber-500/10",
          )}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-3 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-foreground truncate">
                      {breakStatus?.ended ? "Break time has ended!" : "On Break"}
                      {activeBreak.title?.trim() ? ` · ${activeBreak.title.trim()}` : ""}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {breakStatus?.ended ? (
                        "Tap Resume to get back to work — work activity is paused."
                      ) : (
                        <>
                          <span className="tabular-nums font-semibold text-foreground">{breakStatus?.timer}</span>{" "}
                          {breakStatus?.suffix} · work activity is paused
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleQuickAction("resume")}
                  size="sm"
                  variant="default"
                  className="min-h-[44px] sm:min-h-0 flex-shrink-0"
                >
                  <Play className="size-4 mr-2" />
                  Resume Work
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-chart-2/30 bg-card/80 shadow-lg shadow-chart-2/10 backdrop-blur">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-3 rounded-full bg-chart-2 animate-pulse flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-foreground truncate">
                      {currentEntry.title?.trim() || "Currently Working"}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Started at {new Date(currentEntry.clockIn).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {currentSessionElapsed && (
                        <>
                          {" · "}
                          <span className="tabular-nums font-semibold text-foreground">{currentSessionElapsed}</span> elapsed
                        </>
                      )}
                    </p>
                    {currentTaskElapsed && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        On this task: <span className="tabular-nums font-semibold text-foreground">{currentTaskElapsed}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={() => handleQuickAction("take-break")}
                    size="sm"
                    variant="outline"
                    className="min-h-[44px] sm:min-h-0"
                  >
                    <Coffee className="size-4 mr-2" />
                    Take Break
                  </Button>
                  <Button
                    onClick={() => handleQuickAction("clock-out")}
                    size="sm"
                    variant="destructive"
                    className="min-h-[44px] sm:min-h-0"
                  >
                    <Square className="size-4 mr-2" />
                    Clock Out
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Goals and Habits Progress */}
      {(isViewEnabled("goals") || isViewEnabled("habits")) && (activeGoals.length > 0 || habits.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {activeGoals.length > 0 && (
            <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Target className="size-4 sm:size-5 text-accent" />
                    Active Goals
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView("goals")}
                    className="text-xs"
                  >
                    View All
                    <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
                {activeGoals.slice(0, 3).map((goal) => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-medium text-foreground line-clamp-1">
                        {goal.title}
                      </span>
                      <span className="text-xs font-semibold text-accent">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary/70 rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full transition-all"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {habits.length > 0 && (
            <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Flame className="size-4 sm:size-5 text-chart-3" />
                    Today's Habits
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView("habits")}
                    className="text-xs"
                  >
                    View All
                    <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
                {habits.slice(0, 3).map((habit) => {
                  const isCompleted = habitLogs.some(
                    (log) => log.habitId === habit.id && log.date === todayStr
                  )
                  return (
                    <div key={habit.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="size-4 sm:size-5 text-chart-2" />
                        ) : (
                          <Circle className="size-4 sm:size-5 text-muted-foreground" />
                        )}
                        <span className="text-xs sm:text-sm text-foreground">{habit.title}</span>
                      </div>
                      <span className={cn(
                        "text-xs font-semibold",
                        isCompleted ? "text-chart-2" : "text-muted-foreground"
                      )}>
                        {isCompleted ? "Done" : "Pending"}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {isViewEnabled("notes") && (
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-semibold">Recent Notes</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView("notes")}
                  className="text-xs"
                >
                  View All
                  <ArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {notes.length === 0 ? (
                <p className="text-muted-foreground text-xs sm:text-sm">No notes yet. Start writing!</p>
              ) : (
                <ul className="space-y-3">
                  {notes.slice(0, 4).map((note) => (
                    <li key={note.id} className="border-b border-border/70 pb-3 last:border-0 last:pb-0">
                      <p className="font-medium text-xs sm:text-sm text-card-foreground line-clamp-1">
                        {note.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {note.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(note.updatedAt), "MMM d, yyyy")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg font-semibold">Quick Stats</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            {isViewEnabled("notes") && (
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Total Notes</span>
                <span className="text-base sm:text-lg font-bold text-foreground">{notes.length}</span>
              </div>
            )}
            {isViewEnabled("tasks") && (
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Total Tasks</span>
                <span className="text-base sm:text-lg font-bold text-foreground">{tasks.length}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-muted-foreground">Time Entries</span>
              <span className="text-base sm:text-lg font-bold text-foreground">{timeEntries.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-muted-foreground">Member Since</span>
              <span className="text-base sm:text-lg font-bold text-foreground">
                {user?.createdAt ? format(parseISO(user.createdAt), "MMM yyyy") : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
