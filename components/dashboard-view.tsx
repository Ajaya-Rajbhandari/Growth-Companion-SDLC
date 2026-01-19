"use client"

import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

export function DashboardView() {
  const { tasks, notes, currentEntry, timeEntries, user } = useAppStore(
    useShallow((state) => ({
      tasks: state.tasks,
      notes: state.notes,
      currentEntry: state.currentEntry,
      timeEntries: state.timeEntries,
      user: state.user,
    })),
  )

  const completedTasks = tasks.filter((t) => t.completed).length
  const pendingTasks = tasks.filter((t) => !t.completed).length
  const highPriorityTasks = tasks.filter((t) => t.priority === "high" && !t.completed)

  const today = new Date().toISOString().split("T")[0]
  const todayEntries = timeEntries.filter((entry) => entry.date === today)
  const todayHours = todayEntries.reduce((total, entry) => {
    const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now()
    const start = new Date(entry.clockIn).getTime()
    const diffMs = end - start - entry.breakMinutes * 60 * 1000
    return total + diffMs / (1000 * 60 * 60)
  }, 0)

  let todayHoursWithCurrent = todayHours
  if (currentEntry && currentEntry.date === today && !currentEntry.clockOut) {
    const start = new Date(currentEntry.clockIn).getTime()
    const now = Date.now()
    const breakMs = (currentEntry.breakMinutes || 0) * 60 * 1000
    const diffMs = Math.max(0, now - start - breakMs)
    const currentSessionHours = diffMs / (1000 * 60 * 60)
    todayHoursWithCurrent += currentSessionHours
  }

  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  // Calculate weekly stats
  const weekStart = new Date()
  const dayOfWeek = weekStart.getDay()
  weekStart.setDate(weekStart.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0)

  const weekEntries = timeEntries.filter((e) => new Date(e.date) >= weekStart)
  const weeklyHours = weekEntries.reduce((total, entry) => {
    const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now()
    const start = new Date(entry.clockIn).getTime()
    const diffMs = Math.max(0, end - start - entry.breakMinutes * 60 * 1000)
    return total + diffMs / (1000 * 60 * 60)
  }, 0)

  if (currentEntry && currentEntry.date === today && !currentEntry.clockOut) {
    const start = new Date(currentEntry.clockIn).getTime()
    const now = Date.now()
    const breakMs = (currentEntry.breakMinutes || 0) * 60 * 1000
    const diffMs = Math.max(0, now - start - breakMs)
  }

  // Daily breakdown
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split("T")[0]
  })

  const dailyHours = last7Days.map((date) => {
    const dayEntries = timeEntries.filter((e) => e.date === date)
    return dayEntries.reduce((total, entry) => {
      const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now()
      const start = new Date(entry.clockIn).getTime()
      const diffMs = Math.max(0, end - start - entry.breakMinutes * 60 * 1000)
      return total + diffMs / (1000 * 60 * 60)
    }, 0)
  })

  const avgDailyHours =
    dailyHours.length > 0 ? (dailyHours.reduce((a, b) => a + b, 0) / dailyHours.length).toFixed(1) : "0"
  const maxDailyHours = dailyHours.length > 0 ? Math.max(...dailyHours).toFixed(1) : "0"

  const dailyChartData = last7Days.map((date, index) => ({
    dateLabel: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
    hours: Number(dailyHours[index].toFixed(2)),
  }))

  const hasOverdueTasks = highPriorityTasks.length > 0

  const aiInsights = []
  if (completionRate > 80) {
    aiInsights.push({
      type: "positive",
      icon: TrendingUp,
      title: "Great Productivity!",
      description: `You've completed ${completionRate}% of your tasks. Keep up the momentum!`,
    })
  } else if (completionRate < 30 && tasks.length > 5) {
    aiInsights.push({
      type: "warning",
      icon: AlertCircle,
      title: "Backlog Building Up",
      description: "Consider breaking down large tasks or scheduling focused work sessions.",
    })
  }

  if (hasOverdueTasks) {
    aiInsights.push({
      type: "action",
      icon: Zap,
      title: "High Priority Items",
      description: `You have ${highPriorityTasks.length} high priority task(s) pending.`,
    })
  }

  if (todayHoursWithCurrent < 1 && !currentEntry) {
    aiInsights.push({
      type: "tip",
      icon: Clock,
      title: "Work Session Tip",
      description: "Consider starting your work session to track time accurately.",
    })
  }

  const stats = [
    {
      title: "Total Tasks",
      value: tasks.length,
      icon: CheckCircle2,
      description: `${completedTasks} completed`,
      color: "text-primary",
    },
    {
      title: "Pending",
      value: pendingTasks,
      icon: Clock,
      description: "tasks remaining",
      color: "text-chart-3",
    },
    {
      title: "Notes",
      value: notes.length,
      icon: FileText,
      description: "saved notes",
      color: "text-accent",
    },
    {
      title: "Today's Hours",
      value: todayHoursWithCurrent.toFixed(1),
      icon: TrendingUp,
      description: currentEntry ? "Currently working" : "hours logged",
      color: "text-chart-2",
    },
  ]

  const joinDate = user
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : ""

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
      </div>

      {user && (
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Mail className="size-4" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="size-4" />
                    <span>Since {joinDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {aiInsights.length > 0 && (
        <div className="space-y-2">
          {aiInsights.map((insight, idx) => (
            <Card
              key={idx}
              className={cn("bg-card border-l-4", {
                "border-l-chart-2": insight.type === "positive",
                "border-l-chart-3": insight.type === "warning",
                "border-l-primary": insight.type === "action",
                "border-l-accent": insight.type === "tip",
              })}
            >
              <CardContent className="py-3 flex items-start gap-3">
                <insight.icon className="size-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm text-card-foreground">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            Last 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              hours: {
                label: "Hours",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[220px] w-full"
          >
            <AreaChart data={dailyChartData} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="var(--color-hours)"
                fill="var(--color-hours)"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`size-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-card-foreground">
                {stat.value}
                {stat.title === "Today's Hours" && "h"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Hours</span>
              <span className="text-2xl font-bold text-primary">{weeklyHours.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Daily</span>
              <span className="text-lg font-semibold text-accent">{avgDailyHours}h</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Peak Day</span>
              <span className="text-lg font-semibold text-chart-2">{maxDailyHours}h</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="size-5 text-accent" />
              Productivity Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Task Completion</span>
                <span className="text-sm font-semibold text-foreground">{completionRate}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Overall Score</span>
              <span className="font-bold text-lg text-primary">{Math.max(completionRate, 50)}/100</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="size-5 text-chart-2" />
              Weekly Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Sessions</span>
              <span className="text-lg font-bold text-foreground">{weekEntries.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Days Worked</span>
              <span className="text-lg font-bold text-foreground">{dailyHours.filter((h) => h > 0).length}/7</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Consistency</span>
              <span className="text-lg font-bold text-accent">
                {Math.round((dailyHours.filter((h) => h > 0).length / 7) * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {currentEntry && (
        <Card className="bg-chart-2/5 border-chart-2/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-3 rounded-full bg-chart-2 animate-pulse" />
              <span className="text-sm font-medium text-card-foreground">
                Currently working since{" "}
                {new Date(currentEntry.clockIn).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">High Priority Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {highPriorityTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No high priority tasks pending.</p>
            ) : (
              <ul className="space-y-3">
                {highPriorityTasks.slice(0, 5).map((task) => (
                  <li key={task.id} className="flex items-center gap-3">
                    <Circle className="size-4 text-destructive" />
                    <span className="text-sm text-card-foreground">{task.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No notes yet. Start writing!</p>
            ) : (
              <ul className="space-y-3">
                {notes.slice(0, 3).map((note) => (
                  <li key={note.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="font-medium text-sm text-card-foreground">{note.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{note.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
