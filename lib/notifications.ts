import type { Task, Habit, HabitLog, Goal } from "./types"
import type { ViewId } from "./feature-flags"
import { getLocalDateKey, parseLocalDateKey } from "./utils"

export type NotifSeverity = "high" | "medium" | "low"
export type NotifType = "overdue" | "due_today" | "habit" | "goal"

export interface NotificationItem {
  id: string
  type: NotifType
  severity: NotifSeverity
  title: string
  description: string
  view: ViewId
}

const fmtDate = (dateKey: string) =>
  parseLocalDateKey(dateKey).toLocaleDateString("en-US", { month: "short", day: "numeric" })

function addDays(date: Date, n: number): Date {
  const r = new Date(date)
  r.setDate(r.getDate() + n)
  return r
}

// Derive actionable reminders from current data — no persistence. Everything
// surfaced here is something the user can act on right now; it disappears once
// handled (task completed, habit logged, etc.).
export function computeNotifications(args: {
  tasks: Task[]
  habits: Habit[]
  habitLogs: HabitLog[]
  goals: Goal[]
}): NotificationItem[] {
  const { tasks, habits, habitLogs, goals } = args
  const today = getLocalDateKey()
  const items: NotificationItem[] = []

  // Overdue tasks
  for (const t of tasks) {
    if (!t.completed && t.dueDate && t.dueDate < today) {
      items.push({
        id: `overdue-${t.id}`,
        type: "overdue",
        severity: "high",
        title: t.title,
        description: `Overdue — was due ${fmtDate(t.dueDate)}`,
        view: "tasks",
      })
    }
  }

  // Tasks due today
  for (const t of tasks) {
    if (!t.completed && t.dueDate === today) {
      items.push({
        id: `today-${t.id}`,
        type: "due_today",
        severity: "medium",
        title: t.title,
        description: "Due today",
        view: "tasks",
      })
    }
  }

  // Goals with deadlines in the next 3 days
  const in3 = getLocalDateKey(addDays(new Date(), 3))
  for (const g of goals) {
    if (g.status === "active" && g.progress < 100 && g.targetDate && g.targetDate >= today && g.targetDate <= in3) {
      items.push({
        id: `goal-${g.id}`,
        type: "goal",
        severity: "medium",
        title: g.title,
        description: `Target ${fmtDate(g.targetDate)} · ${g.progress}% done`,
        view: "goals",
      })
    }
  }

  // Daily habits not yet met today
  for (const h of habits) {
    if (h.frequency !== "daily") continue
    const todayCount = habitLogs
      .filter((l) => l.habitId === h.id && l.date === today)
      .reduce((sum, l) => sum + (l.count || 0), 0)
    if (todayCount < h.targetCount) {
      items.push({
        id: `habit-${h.id}`,
        type: "habit",
        severity: "low",
        title: h.title,
        description: todayCount === 0 ? "Not logged today" : `${todayCount}/${h.targetCount} today`,
        view: "habits",
      })
    }
  }

  const order: Record<NotifSeverity, number> = { high: 0, medium: 1, low: 2 }
  return items.sort((a, b) => order[a.severity] - order[b.severity])
}
