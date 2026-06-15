"use client"

import { useMemo } from "react"
import { cn, getLocalDateKey, parseLocalDateKey } from "@/lib/utils"
import type { TimeEntry } from "@/lib/store"
import { calculateDuration } from "./helpers"

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const pad = (n: number) => String(n).padStart(2, "0")

// Sum worked hours per local date key (YYYY-MM-DD) across the given entries.
function hoursByDay(entries: TimeEntry[]): Record<string, number> {
  const map: Record<string, number> = {}
  entries.forEach((e) => {
    const d = calculateDuration(e.clockIn, e.clockOut, e.breakMinutes)
    map[e.date] = (map[e.date] || 0) + d.hours + d.minutes / 60
  })
  return map
}

// Tailwind background by how a day's hours compare to the busiest day of the period.
function intensityClass(hours: number, maxHours: number): string {
  if (hours <= 0) return "bg-muted/20"
  const ratio = maxHours > 0 ? hours / maxHours : 0
  if (ratio <= 0.25) return "bg-primary/15"
  if (ratio <= 0.5) return "bg-primary/30"
  if (ratio <= 0.75) return "bg-primary/50"
  return "bg-primary/75"
}

interface MonthHeatmapProps {
  selectedDate: Date
  entries: TimeEntry[]
  onDayClick: (date: Date) => void
}

// Month calendar where each day is shaded by hours worked. Click a worked day to
// drill into its Daily view.
export function MonthHeatmap({ selectedDate, entries, onDayClick }: MonthHeatmapProps) {
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth()

  const { byDay, maxHours, totalHours, sessionCount } = useMemo(() => {
    const byDay = hoursByDay(entries)
    const prefix = `${year}-${pad(month + 1)}`
    const monthDays = Object.entries(byDay).filter(([k]) => k.startsWith(prefix))
    const maxHours = monthDays.reduce((m, [, h]) => Math.max(m, h), 0)
    const totalHours = monthDays.reduce((sum, [, h]) => sum + h, 0)
    return { byDay, maxHours, totalHours, sessionCount: entries.length }
  }, [entries, year, month])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = new Date(year, month, 1).getDay()
  const todayKey = getLocalDateKey()

  const cells: Array<{ day: number; dateKey: string; hours: number } | null> = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`
    cells.push({ day, dateKey, hours: byDay[dateKey] || 0 })
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3 sm:p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm sm:text-base font-semibold">
          {MONTHS[month]} {year}
        </h3>
        <span className="text-xs text-muted-foreground">
          {totalHours.toFixed(1)}h · {sessionCount} session{sessionCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`blank-${idx}`} />
          const hasWork = cell.hours > 0
          const isToday = cell.dateKey === todayKey
          return (
            <button
              key={cell.dateKey}
              type="button"
              disabled={!hasWork}
              onClick={() => onDayClick(parseLocalDateKey(cell.dateKey))}
              title={hasWork ? `${cell.hours.toFixed(1)}h worked — open day` : undefined}
              className={cn(
                "h-12 sm:h-14 rounded-md flex flex-col items-center justify-center p-0.5 transition-all",
                intensityClass(cell.hours, maxHours),
                isToday && "ring-1 ring-primary",
                hasWork ? "cursor-pointer hover:ring-1 hover:ring-primary" : "cursor-default",
              )}
            >
              <span className={cn("text-xs leading-none", hasWork ? "font-semibold text-foreground" : "text-foreground/40")}>
                {cell.day}
              </span>
              {hasWork && (
                <span className="text-[10px] leading-tight text-foreground/70 mt-0.5 tabular-nums">{cell.hours.toFixed(1)}h</span>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-[10px] text-muted-foreground mt-3">Shaded by hours worked · click a day for its task breakdown</p>
    </div>
  )
}

interface YearMonthsGridProps {
  selectedDate: Date
  entries: TimeEntry[]
  onMonthClick: (date: Date) => void
}

// Twelve month cards for the selected year. Click a month to open its Monthly view.
export function YearMonthsGrid({ selectedDate, entries, onMonthClick }: YearMonthsGridProps) {
  const year = selectedDate.getFullYear()

  const months = useMemo(() => {
    return MONTHS.map((name, month) => {
      const prefix = `${year}-${pad(month + 1)}`
      const monthEntries = entries.filter((e) => e.date.startsWith(prefix))
      const hours = monthEntries.reduce((sum, e) => {
        const d = calculateDuration(e.clockIn, e.clockOut, e.breakMinutes)
        return sum + d.hours + d.minutes / 60
      }, 0)
      return { name, month, hours, sessions: monthEntries.length }
    })
  }, [entries, year])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {months.map((m) => {
        const hasWork = m.hours > 0
        return (
          <button
            key={m.name}
            type="button"
            disabled={!hasWork}
            onClick={() => onMonthClick(new Date(year, m.month, 1))}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              hasWork
                ? "border-border bg-card/50 cursor-pointer hover:border-primary/50 hover:bg-card"
                : "border-border/40 bg-card/20 cursor-default",
            )}
          >
            <div className={cn("text-sm font-semibold", hasWork ? "text-foreground" : "text-foreground/40")}>
              {m.name} {year}
            </div>
            <div className={cn("text-2xl font-bold mt-1", hasWork ? "text-foreground" : "text-foreground/30")}>
              {m.hours.toFixed(1)}h
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {m.sessions} session{m.sessions !== 1 ? "s" : ""}
            </div>
          </button>
        )
      })}
    </div>
  )
}
