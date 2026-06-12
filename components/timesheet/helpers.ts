import type { TimeEntry } from "@/lib/store"
import { getLocalDateKey, parseLocalDateKey } from "@/lib/utils"

export type ViewPeriod = "daily" | "weekly" | "monthly" | "yearly"

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTimeHHMMSS(isoString: string): string {
  const d = new Date(isoString)
  const h = d.getHours()
  const m = d.getMinutes()
  const s = d.getSeconds()
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function formatDurationHHMMSS(totalMs: number): string {
  const hours = Math.floor(totalMs / (1000 * 60 * 60))
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000)
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function formatDate(dateString: string): string {
  return parseDisplayDate(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function formatFullDate(dateString: string): string {
  return parseDisplayDate(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatMinutes(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hrs}h ${mins}m`
}

export function calculateDuration(
  clockIn: string,
  clockOut?: string,
  breakMinutes = 0,
): { hours: number; minutes: number; totalMs: number } {
  const start = new Date(clockIn).getTime()
  const end = clockOut ? new Date(clockOut).getTime() : Date.now()
  const diffMs = Math.max(0, end - start - breakMinutes * 60 * 1000)
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return { hours, minutes, totalMs: diffMs }
}

function parseDisplayDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseLocalDateKey(value) : new Date(value)
}

export function getBreakTypeLabel(type?: "short" | "lunch" | "custom", title?: string): string {
  // If it's a custom break with a title, show the title instead
  if (type === "custom" && title?.trim()) {
    return title.trim()
  }

  switch (type) {
    case "short":
      return "Short"
    case "lunch":
      return "Lunch"
    case "custom":
      return "Custom"
    default:
      return "Break"
  }
}

export function getBreakTypeBadgeColor(type?: "short" | "lunch" | "custom"): string {
  switch (type) {
    case "short":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    case "lunch":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30"
    case "custom":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30"
    default:
      return "bg-muted text-foreground/70 border-border"
  }
}

export function calculateTotalHours(entries: TimeEntry[]): number {
  return entries.reduce((total, entry) => {
    if (entry.clockOut) {
      const start = new Date(entry.clockIn).getTime()
      const end = new Date(entry.clockOut).getTime()
      const diffMs = Math.max(0, end - start - entry.breakMinutes * 60 * 1000)
      return total + diffMs / (1000 * 60 * 60)
    }
    return total
  }, 0)
}

export function calculateTotalBreakMinutes(entries: TimeEntry[]): number {
  return entries.reduce((total, entry) => total + entry.breakMinutes, 0)
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function getStartOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1)
}

export function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function getEndOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999)
}

export function getPeriodLabel(date: Date, period: ViewPeriod): string {
  switch (period) {
    case "daily":
      return formatFullDate(getLocalDateKey(date))
    case "weekly": {
      const start = getStartOfWeek(date)
      const end = getEndOfWeek(date)
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    }
    case "monthly":
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    case "yearly":
      return date.getFullYear().toString()
  }
}

export function navigatePeriod(date: Date, period: ViewPeriod, direction: number): Date {
  const newDate = new Date(date)
  switch (period) {
    case "daily":
      newDate.setDate(newDate.getDate() + direction)
      break
    case "weekly":
      newDate.setDate(newDate.getDate() + direction * 7)
      break
    case "monthly":
      newDate.setMonth(newDate.getMonth() + direction)
      break
    case "yearly":
      newDate.setFullYear(newDate.getFullYear() + direction)
      break
  }
  return newDate
}

export function getPeriodRange(date: Date, period: ViewPeriod): { start: Date; end: Date } {
  switch (period) {
    case "daily": {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    case "weekly":
      return { start: getStartOfWeek(date), end: getEndOfWeek(date) }
    case "monthly":
      return { start: getStartOfMonth(date), end: getEndOfMonth(date) }
    case "yearly":
      return { start: getStartOfYear(date), end: getEndOfYear(date) }
  }
}

export function filterEntriesByPeriod(entries: TimeEntry[], date: Date, period: ViewPeriod): TimeEntry[] {
  const { start, end } = getPeriodRange(date, period)

  return entries.filter((entry) => {
    const entryDate = parseLocalDateKey(entry.date)
    return entryDate >= start && entryDate <= end
  })
}

export function groupEntriesByDate(entries: TimeEntry[]): Record<string, TimeEntry[]> {
  return entries.reduce(
    (groups, entry) => {
      const date = entry.date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(entry)
      return groups
    },
    {} as Record<string, TimeEntry[]>,
  )
}

export const groupEntriesByWeek = (entries: TimeEntry[]): Record<string, TimeEntry[]> => {
  return entries.reduce(
    (groups, entry) => {
      const date = parseLocalDateKey(entry.date)
      const weekStart = getStartOfWeek(date)
      const weekKey = getLocalDateKey(weekStart)
      if (!groups[weekKey]) {
        groups[weekKey] = []
      }
      groups[weekKey].push(entry)
      return groups
    },
    {} as Record<string, TimeEntry[]>,
  )
}

export const groupEntriesByMonth = (entries: TimeEntry[]): Record<string, Record<string, TimeEntry[]>> => {
  return entries.reduce(
    (months, entry) => {
      const date = parseLocalDateKey(entry.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (!months[monthKey]) {
        months[monthKey] = {}
      }
      const dateKey = entry.date
      if (!months[monthKey][dateKey]) {
        months[monthKey][dateKey] = []
      }
      months[monthKey][dateKey].push(entry)
      return months
    },
    {} as Record<string, Record<string, TimeEntry[]>>,
  )
}

export const groupEntriesByYear = (entries: TimeEntry[]): Record<string, Record<string, Record<string, TimeEntry[]>>> => {
  return entries.reduce(
    (years, entry) => {
      const date = parseLocalDateKey(entry.date)
      const year = date.getFullYear().toString()
      if (!years[year]) {
        years[year] = {}
      }
      const monthKey = `${String(date.getMonth() + 1).padStart(2, "0")}`
      if (!years[year][monthKey]) {
        years[year][monthKey] = {}
      }
      const dateKey = entry.date
      if (!years[year][monthKey][dateKey]) {
        years[year][monthKey][dateKey] = []
      }
      years[year][monthKey][dateKey].push(entry)
      return years
    },
    {} as Record<string, Record<string, Record<string, TimeEntry[]>>>,
  )
}
