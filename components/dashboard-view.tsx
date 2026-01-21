"use client"

import { useEffect, useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  Circle,
  FileText,
  Clock,
  TrendingUp,
  Zap,
  AlertCircle,
  Mail,
  Calendar,
  BarChart3,
  Activity,
  Plus,
  Play,
  Square,
  Target,
  Flame,
  ArrowRight,
  CalendarDays,
  Timer,
  Award,
  Bell,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { format, isToday, isTomorrow, parseISO, differenceInDays } from "date-fns"
import { useRouter } from "next/navigation"

export function DashboardView() {
  const router = useRouter()
  const { 
    tasks, 
    notes, 
    currentEntry, 
    timeEntries, 
    user, 
    fetchInitialData, 
    activeView,
    goals,
    habits,
    habitLogs,
    clockIn,
    clockOut,
    setActiveView,
    officeHours,
    getTodayWorkStats,
  } = useAppStore(
    useShallow((state) => ({
      tasks: state.tasks,
      notes: state.notes,
      currentEntry: state.currentEntry,
      timeEntries: state.timeEntries,
      user: state.user,
      fetchInitialData: state.fetchInitialData,
      activeView: state.activeView,
      goals: state.goals,
      habits: state.habits,
      habitLogs: state.habitLogs,
      clockIn: state.clockIn,
      clockOut: state.clockOut,
      setActiveView: state.setActiveView,
      officeHours: state.officeHours,
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

  const completedTasks = useMemo(() => tasks.filter((t) => t.completed).length, [tasks])
  const pendingTasks = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks])
  const highPriorityTasks = useMemo(() => tasks.filter((t) => t.priority === "high" && !t.completed), [tasks])
  
  // Overdue and upcoming tasks
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], [])
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
      t.dueDate <= nextWeek.toISOString().split("T")[0]
    )
  }, [tasks, todayStr])

  const todayEntries = useMemo(() => timeEntries.filter((entry) => entry.date === todayStr), [timeEntries, todayStr])
  const todayHours = useMemo(() => {
    return todayEntries.reduce((total, entry) => {
      const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now()
      const start = new Date(entry.clockIn).getTime()
      const diffMs = end - start - (entry.breakMinutes || 0) * 60 * 1000
      return total + diffMs / (1000 * 60 * 60)
    }, 0)
  }, [todayEntries])

  const todayHoursWithCurrent = useMemo(() => {
    let hours = todayHours
    if (currentEntry && currentEntry.date === todayStr && !currentEntry.clockOut) {
      const start = new Date(currentEntry.clockIn).getTime()
      const now = Date.now()
      const breakMs = (currentEntry.breakMinutes || 0) * 60 * 1000
      const diffMs = Math.max(0, now - start - breakMs)
      const currentSessionHours = diffMs / (1000 * 60 * 60)
      hours += currentSessionHours
    }
    return hours
  }, [todayHours, currentEntry, todayStr])

  const completionRate = useMemo(() => {
    return tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
  }, [tasks.length, completedTasks])

  const workStats = useMemo(() => getTodayWorkStats(), [timeEntries, currentEntry, getTodayWorkStats])

  // Calculate weekly stats
  const { weekStart, weekEntries, weeklyHours } = useMemo(() => {
    const start = new Date()
    const dayOfWeek = start.getDay()
    start.setDate(start.getDate() - dayOfWeek)
    start.setHours(0, 0, 0, 0)

    const entries = timeEntries.filter((e) => {
      const entryDate = new Date(e.date)
      entryDate.setHours(0, 0, 0, 0)
      return entryDate >= start
    })
    
    const hours = entries.reduce((total, entry) => {
      const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now()
      const start = new Date(entry.clockIn).getTime()
      const diffMs = Math.max(0, end - start - (entry.breakMinutes || 0) * 60 * 1000)
      return total + diffMs / (1000 * 60 * 60)
    }, 0)

    return { weekStart: start, weekEntries: entries, weeklyHours: hours }
  }, [timeEntries])

  // Daily breakdown
  const { last7Days, dailyHours } = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      date.setHours(0, 0, 0, 0)
      return date.toISOString().split("T")[0]
    })

    const hours = days.map((date) => {
      const dayEntries = timeEntries.filter((e) => {
        const entryDate = new Date(e.date)
        entryDate.setHours(0, 0, 0, 0)
        return entryDate.toISOString().split("T")[0] === date
      })
      return dayEntries.reduce((total, entry) => {
        const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now()
        const start = new Date(entry.clockIn).getTime()
        const diffMs = Math.max(0, end - start - (entry.breakMinutes || 0) * 60 * 1000)
        return total + diffMs / (1000 * 60 * 60)
      }, 0)
    })

    return { last7Days: days, dailyHours: hours }
  }, [timeEntries])

  const { avgDailyHours, maxDailyHours, dailyChartData } = useMemo(() => {
    const avg = dailyHours.length > 0 ? (dailyHours.reduce((a, b) => a + b, 0) / dailyHours.length).toFixed(1) : "0"
    const max = dailyHours.length > 0 ? Math.max(...dailyHours).toFixed(1) : "0"
    const chartData = last7Days.map((date, index) => ({
      dateLabel: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
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
    const today = new Date().toISOString().split("T")[0]
    return habits.filter((h) => {
      const logs = habitLogs.filter((log) => log.habitId === h.id && log.date === today)
      return logs.length > 0
    })
  }, [habits, habitLogs])

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
    } else {
      setActiveView(action as any)
    }
  }

  const joinDate = user
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : ""

  const hoursProgress = officeHours > 0 ? Math.min(100, (todayHoursWithCurrent / officeHours) * 100) : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            {greeting}{user ? `, ${user.name.split(" ")[0]}` : ""}!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Here's what's happening today
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {currentEntry ? (
            <Button
              onClick={() => handleQuickAction("clock-out")}
              size="sm"
              variant="destructive"
              className="min-h-[44px] sm:min-h-0"
            >
              <Square className="size-4 mr-2" />
              Clock Out
            </Button>
          ) : (
            <Button
              onClick={() => handleQuickAction("clock-in")}
              size="sm"
              className="min-h-[44px] sm:min-h-0"
            >
              <Play className="size-4 mr-2" />
              Clock In
            </Button>
          )}
          <Button
            onClick={() => handleQuickAction("tasks")}
            size="sm"
            variant="outline"
            className="min-h-[44px] sm:min-h-0"
          >
            <Plus className="size-4 mr-2" />
            Add Task
          </Button>
          <Button
            onClick={() => handleQuickAction("notes")}
            size="sm"
            variant="outline"
            className="min-h-[44px] sm:min-h-0"
          >
            <Plus className="size-4 mr-2" />
            Add Note
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
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
              <div className="size-12 sm:size-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Timer className="size-5 sm:size-6 text-primary" />
              </div>
            </div>
            {officeHours > 0 && (
              <div className="mt-3 w-full bg-secondary rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${hoursProgress}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Catch-up Hours</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {(workStats.weeklyCatchUpMinutes / 60).toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Remaining this week to reach {officeHours}h/day average.
                </p>
              </div>
              <div className="size-12 sm:size-14 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Clock className="size-5 sm:size-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pending Tasks</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{pendingTasks}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedTasks} completed
                </p>
              </div>
              <div className="size-12 sm:size-14 rounded-full bg-chart-2/20 flex items-center justify-center">
                <CheckCircle2 className="size-5 sm:size-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Active Goals</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{activeGoals.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {goalsProgress}% avg progress
                </p>
              </div>
              <div className="size-12 sm:size-14 rounded-full bg-accent/20 flex items-center justify-center">
                <Target className="size-5 sm:size-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border-chart-3/20">
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
              <div className="size-12 sm:size-14 rounded-full bg-chart-3/20 flex items-center justify-center">
                <Flame className="size-5 sm:size-6 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Items Section */}
      {(overdueTasks.length > 0 || upcomingTasks.length > 0 || highPriorityTasks.length > 0) && (
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
              <Card className="bg-destructive/5 border-destructive/20">
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
              <Card className="bg-chart-3/5 border-chart-3/20">
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
              <Card className="bg-primary/5 border-primary/20">
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
        <Card className="lg:col-span-2 bg-card border-border">
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
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
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
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
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

        <Card className="bg-card border-border">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Activity className="size-4 sm:size-5 text-accent" />
              Productivity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Task Completion</span>
                <span className="text-xs sm:text-sm font-semibold text-foreground">{completionRate}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
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

      {/* Current Work Session */}
      {currentEntry && (
        <Card className="bg-chart-2/10 border-chart-2/30">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-chart-2 animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-sm sm:text-base font-semibold text-foreground">
                    Currently Working
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Started at {new Date(currentEntry.clockIn).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
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
          </CardContent>
        </Card>
      )}

      {/* Goals and Habits Progress */}
      {(activeGoals.length > 0 || habits.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {activeGoals.length > 0 && (
            <Card className="bg-card border-border">
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
                    <div className="w-full bg-secondary rounded-full h-2">
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
            <Card className="bg-card border-border">
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
                  const today = new Date().toISOString().split("T")[0]
                  const isCompleted = habitLogs.some(
                    (log) => log.habitId === habit.id && log.date === today
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
        <Card className="bg-card border-border">
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
                  <li key={note.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
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

        <Card className="bg-card border-border">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg font-semibold">Quick Stats</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-muted-foreground">Total Notes</span>
              <span className="text-base sm:text-lg font-bold text-foreground">{notes.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-muted-foreground">Total Tasks</span>
              <span className="text-base sm:text-lg font-bold text-foreground">{tasks.length}</span>
            </div>
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
