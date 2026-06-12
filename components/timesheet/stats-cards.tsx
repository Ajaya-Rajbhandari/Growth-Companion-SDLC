"use client"

import { useAppStore, type TimeEntry } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getLocalDateKey, parseLocalDateKey } from "@/lib/utils"
import { Calendar, CalendarDays, CalendarRange, Coffee, Timer } from "lucide-react"
import {
  calculateTotalBreakMinutes,
  calculateTotalHours,
  formatMinutes,
  getStartOfWeek,
} from "./helpers"

interface WorkStatsLike {
  todayMinutes: number
  weeklyMinutes: number
  remainingMinutes: number
  weeklyCatchUpMinutes: number
  overtimeBadge: boolean
}

interface StatsCardsProps {
  workStats: WorkStatsLike
  filteredEntries: TimeEntry[]
}

export function StatsCards({ workStats, filteredEntries }: StatsCardsProps) {
  const { timeEntries, currentEntry, getTodayTimeEntries } = useAppStore(
    useShallow((state) => ({
      timeEntries: state.timeEntries,
      currentEntry: state.currentEntry,
      getTodayTimeEntries: state.getTodayTimeEntries,
    })),
  )

  const todayEntries = getTodayTimeEntries()
  const todayHours = workStats.todayMinutes / 60
  const weeklyHours = workStats.weeklyMinutes / 60
  const today = new Date()
  const weekStart = getStartOfWeek(today)
  const thisWeekEntries = timeEntries.filter((entry) => {
    const entryDate = parseLocalDateKey(entry.date)
    return entryDate >= weekStart
  })
  const weeklyBreakMinutes = calculateTotalBreakMinutes(thisWeekEntries)
  const weekDates = new Set(thisWeekEntries.map((entry) => entry.date))
  if (currentEntry && parseLocalDateKey(currentEntry.date) >= weekStart) {
    weekDates.add(currentEntry.date)
  }
  const activeDaysWeek = weekDates.size

  const entryDates = new Set(timeEntries.map((entry) => entry.date))
  if (currentEntry) {
    entryDates.add(currentEntry.date)
  }
  let streakDays = 0
  const streakCursor = new Date()
  while (entryDates.has(getLocalDateKey(streakCursor))) {
    streakDays += 1
    streakCursor.setDate(streakCursor.getDate() - 1)
  }

  const periodHours = calculateTotalHours(filteredEntries)
  const periodBreakMinutes = calculateTotalBreakMinutes(filteredEntries)

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full max-w-full">
        <Card className="bg-card border-border w-full max-w-full overflow-hidden !px-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-2 sm:p-3 md:p-4 !px-2 sm:!px-3 md:!px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-foreground/70">Today</CardTitle>
            <Calendar className="size-4 sm:size-5 text-primary flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{todayHours.toFixed(1)}h</div>
            <p className="text-xs text-foreground/70 mt-1">{todayEntries.length} session(s)</p>
            <p className="text-xs text-foreground/70 mt-1">
              Remaining: {formatMinutes(workStats.remainingMinutes)}
            </p>
            {workStats.overtimeBadge && <Badge variant="destructive" className="mt-1">Over limit</Badge>}
          </CardContent>
        </Card>

        <Card className="bg-card border-border w-full max-w-full overflow-hidden !px-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 md:p-5 !px-3 sm:!px-4 md:!px-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-foreground/70">This Week</CardTitle>
            <Timer className="size-4 sm:size-5 text-chart-2 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{weeklyHours.toFixed(1)}h</div>
            <p className="text-xs text-foreground/70 mt-1">{thisWeekEntries.length} session(s)</p>
            {workStats.weeklyCatchUpMinutes > 0 ? (
              <p className="text-xs text-amber-500 mt-1">
                Catch-up available: {formatMinutes(workStats.weeklyCatchUpMinutes)}
              </p>
            ) : (
              <p className="text-xs text-foreground/60 mt-1">On track for the week</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border w-full max-w-full overflow-hidden !px-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 md:p-5 !px-3 sm:!px-4 md:!px-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-foreground/70">Period Hours</CardTitle>
            <CalendarRange className="size-4 sm:size-5 text-chart-3 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{periodHours.toFixed(1)}h</div>
            <p className="text-xs text-foreground/70 mt-1">{filteredEntries.length} session(s)</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border w-full max-w-full overflow-hidden !px-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 md:p-5 !px-3 sm:!px-4 md:!px-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-foreground/70">Total Breaks</CardTitle>
            <Coffee className="size-4 sm:size-5 text-chart-4 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{periodBreakMinutes}m</div>
            <p className="text-xs text-foreground/70 mt-1">
              {Math.floor(periodBreakMinutes / 60)}h {periodBreakMinutes % 60}m total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 w-full max-w-full">
        <Card className="bg-card border-border w-full max-w-full overflow-hidden !px-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-2 sm:p-3 md:p-4 !px-2 sm:!px-3 md:!px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-foreground/70">Weekly Summary</CardTitle>
            <Timer className="size-4 sm:size-5 text-primary flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{activeDaysWeek} day(s)</div>
            <p className="text-xs text-foreground/70 mt-1">
              {weeklyHours.toFixed(1)}h, {weeklyBreakMinutes}m breaks
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border w-full max-w-full overflow-hidden !px-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-2 sm:p-3 md:p-4 !px-2 sm:!px-3 md:!px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-foreground/70">Work Streak</CardTitle>
            <CalendarDays className="size-4 sm:size-5 text-chart-2 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{streakDays} day(s)</div>
            <p className="text-xs text-foreground/70 mt-1">
              {streakDays > 0 ? "Keep it going!" : "Log time today to start"}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
