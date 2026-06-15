"use client"

import { useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { computeNotifications } from "@/lib/notifications"
import { getLocalDateKey } from "@/lib/utils"

export const REMINDERS_ENABLED_KEY = "reminders_enabled"
const NOTIFIED_KEY = "reminders_notified"
const CHECK_MS = 30 * 60 * 1000 // re-check every 30 min while the app is open

// Fires OS notifications for actionable reminders while the app is open. Each
// item notifies at most once per day (deduped in localStorage), and only
// high/medium severity items trigger a push so daily habits don't nag.
export function ReminderNotifier() {
  const { tasks, habits, habitLogs, goals } = useAppStore(
    useShallow((state) => ({
      tasks: state.tasks,
      habits: state.habits,
      habitLogs: state.habitLogs,
      goals: state.goals,
    })),
  )

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return

    const run = () => {
      if (localStorage.getItem(REMINDERS_ENABLED_KEY) !== "1") return
      if (Notification.permission !== "granted") return

      const today = getLocalDateKey()
      let record: { date: string; ids: string[] } = { date: today, ids: [] }
      try {
        const raw = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "{}")
        if (raw.date === today && Array.isArray(raw.ids)) record = raw
      } catch {
        /* ignore */
      }

      const items = computeNotifications({ tasks, habits, habitLogs, goals }).filter((i) => i.severity !== "low")
      const fresh = items.filter((i) => !record.ids.includes(i.id))
      if (fresh.length === 0) return

      const counts = {
        overdue: fresh.filter((i) => i.type === "overdue").length,
        due_today: fresh.filter((i) => i.type === "due_today").length,
        goal: fresh.filter((i) => i.type === "goal").length,
      }
      const parts: string[] = []
      if (counts.overdue) parts.push(`${counts.overdue} overdue`)
      if (counts.due_today) parts.push(`${counts.due_today} due today`)
      if (counts.goal) parts.push(`${counts.goal} goal deadline${counts.goal > 1 ? "s" : ""}`)
      const body = fresh.length === 1 ? `${fresh[0].title} — ${fresh[0].description}` : parts.join(" · ")

      try {
        const n = new Notification("Companion reminders", {
          body,
          icon: "/icon-192x192.png",
          tag: "companion-reminders",
        })
        n.onclick = () => {
          window.focus()
          n.close()
        }
      } catch {
        /* ignore notification failures */
      }

      localStorage.setItem(NOTIFIED_KEY, JSON.stringify({ date: today, ids: [...record.ids, ...fresh.map((i) => i.id)] }))
    }

    run()
    const interval = window.setInterval(run, CHECK_MS)
    return () => window.clearInterval(interval)
  }, [tasks, habits, habitLogs, goals])

  return null
}
