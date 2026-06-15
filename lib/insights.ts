import type { Task, Habit, HabitLog, Goal, TimeEntry } from "./types"
import { getLocalDateKey } from "./utils"

export interface WeeklyMetrics {
  weekHours: number
  daysWorked: number
  daysOnTarget: number
  targetHours: number
  avgHoursPerDay: number
  tasksCompleted: number
  tasksPending: number
  tasksOverdue: number
  tasksCreatedThisWeek: number
  habitConsistencyPct: number
  activeGoals: number
  avgGoalProgress: number
  goalsNearingDeadline: number
}

function weekKeys(): string[] {
  const keys: string[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    keys.push(getLocalDateKey(d))
  }
  return keys
}

// A compact "week in numbers" derived from the user's data — fed to the AI coach
// and shown as metric chips. All deterministic; no AI involved here.
export function computeWeeklyMetrics(args: {
  timeEntries: TimeEntry[]
  tasks: Task[]
  habits: Habit[]
  habitLogs: HabitLog[]
  goals: Goal[]
  targetHours: number
}): WeeklyMetrics {
  const { timeEntries, tasks, habits, habitLogs, goals, targetHours } = args
  const week = weekKeys()
  const weekSet = new Set(week)
  const today = getLocalDateKey()

  const hoursByDay: Record<string, number> = {}
  for (const e of timeEntries) {
    if (!weekSet.has(e.date)) continue
    const start = new Date(e.clockIn).getTime()
    const end = e.clockOut ? new Date(e.clockOut).getTime() : Date.now()
    const ms = Math.max(0, end - start - (e.breakMinutes || 0) * 60000)
    hoursByDay[e.date] = (hoursByDay[e.date] || 0) + ms / 3_600_000
  }
  const dayHours = week.map((k) => hoursByDay[k] || 0)
  const weekHours = dayHours.reduce((a, b) => a + b, 0)
  const daysWorked = dayHours.filter((h) => h > 0).length
  const daysOnTarget = targetHours > 0 ? dayHours.filter((h) => h >= targetHours).length : 0
  const avgHoursPerDay = daysWorked ? weekHours / daysWorked : 0

  const tasksCompleted = tasks.filter((t) => t.completed).length
  const tasksPending = tasks.filter((t) => !t.completed).length
  const tasksOverdue = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < today).length
  const tasksCreatedThisWeek = tasks.filter((t) => weekSet.has((t.createdAt || "").slice(0, 10))).length

  const dailyHabits = habits.filter((h) => h.frequency === "daily")
  let metDays = 0
  for (const h of dailyHabits) {
    for (const k of week) {
      const count = habitLogs
        .filter((l) => l.habitId === h.id && l.date === k)
        .reduce((s, l) => s + (l.count || 0), 0)
      if (count >= h.targetCount) metDays++
    }
  }
  const habitConsistencyPct = dailyHabits.length ? Math.round((metDays / (dailyHabits.length * 7)) * 100) : 0

  const active = goals.filter((g) => g.status === "active")
  const avgGoalProgress = active.length ? Math.round(active.reduce((s, g) => s + g.progress, 0) / active.length) : 0
  const in7 = getLocalDateKey(new Date(Date.now() + 7 * 86_400_000))
  const goalsNearingDeadline = active.filter(
    (g) => g.targetDate && g.targetDate >= today && g.targetDate <= in7 && g.progress < 100,
  ).length

  return {
    weekHours: Math.round(weekHours * 10) / 10,
    daysWorked,
    daysOnTarget,
    targetHours,
    avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
    tasksCompleted,
    tasksPending,
    tasksOverdue,
    tasksCreatedThisWeek,
    habitConsistencyPct,
    activeGoals: active.length,
    avgGoalProgress,
    goalsNearingDeadline,
  }
}
