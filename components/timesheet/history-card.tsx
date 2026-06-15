"use client"

import React, { useMemo } from "react"
import { useAppStore, type TimeEntry } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn, parseLocalDateKey } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import {
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
} from "lucide-react"
import {
  type ViewPeriod,
  calculateDuration,
  calculateTotalBreakMinutes,
  calculateTotalHours,
  formatDate,
  formatTime,
  getBreakTypeBadgeColor,
  getBreakTypeLabel,
  getPeriodLabel,
  formatTimeRange,
  getSessionHeadline,
  groupEntriesByDate,
  groupEntriesByWeek,
  navigatePeriod,
} from "./helpers"
import { SessionTasks } from "./session-tasks"
import { MonthHeatmap, YearMonthsGrid } from "./month-heatmap"
import { exportToCSV, exportToExcel, exportToJSON } from "./export"
import { MobileEntryCard } from "./entry-card"
import type { SelectedBreak } from "./dialogs"

interface HistoryCardProps {
  viewPeriod: ViewPeriod
  onViewPeriodChange: (period: ViewPeriod) => void
  selectedDate: Date
  onSelectedDateChange: (date: Date) => void
  filteredEntries: TimeEntry[]
  elapsedTime: { hours: number; minutes: number }
  onClockOut: () => void
  onOpenNotes: (entry: TimeEntry) => void
  onEditBreak: (selectedBreak: SelectedBreak) => void
}

export function HistoryCard({
  viewPeriod,
  onViewPeriodChange,
  selectedDate,
  onSelectedDateChange,
  filteredEntries,
  elapsedTime,
  onClockOut,
  onOpenNotes,
  onEditBreak,
}: HistoryCardProps) {
  const { currentEntry, timeCategories, deleteTimeEntry } = useAppStore(
    useShallow((state) => ({
      currentEntry: state.currentEntry,
      timeCategories: state.timeCategories,
      deleteTimeEntry: state.deleteTimeEntry,
    })),
  )

  const groupedEntries = useMemo(() => {
    return groupEntriesByDate(filteredEntries)
  }, [filteredEntries])

  const sortedDates = useMemo(() => {
    return Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a))
  }, [groupedEntries])

  const periodStats = useMemo(() => {
    let totalHours = 0
    let totalBreakMinutes = 0
    let sessionCount = 0

    filteredEntries.forEach((entry) => {
      const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
      totalHours += duration.hours + duration.minutes / 60
      totalBreakMinutes += entry.breakMinutes || 0
      sessionCount += 1
    })

    return {
      totalHours: totalHours.toFixed(1),
      totalBreakMinutes,
      sessionCount,
    }
  }, [filteredEntries])

  const handlePrevPeriod = () => {
    onSelectedDateChange(navigatePeriod(selectedDate, viewPeriod, -1))
  }

  const handleNextPeriod = () => {
    onSelectedDateChange(navigatePeriod(selectedDate, viewPeriod, 1))
  }

  const handleToday = () => {
    onSelectedDateChange(new Date())
  }

  const handleDeleteEntry = (entryId: string) => {
    deleteTimeEntry(entryId)
      .then(() => {
        toast({
          title: "Entry deleted",
          description: "Time entry removed.",
        })
      })
      .catch((error) => {
        toast({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Unable to delete entry.",
        })
      })
  }

  return (
    <Card className="border-border bg-card w-full max-w-full overflow-hidden !px-0">
      <CardHeader className="p-2 sm:p-3 md:p-4 !px-2 sm:!px-3 md:!px-4">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-sm sm:text-base font-semibold">Time History</h3>
            <div className="text-xs sm:text-sm text-foreground/70 bg-muted/50 px-2 sm:px-3 py-1 rounded-lg">
              {viewPeriod === "daily" && "Daily view"}
              {viewPeriod === "weekly" && `${periodStats.sessionCount} sessions`}
              {viewPeriod === "monthly" && `${periodStats.totalHours}h total`}
              {viewPeriod === "yearly" && `${periodStats.sessionCount} sessions`}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <Button variant="ghost" onClick={handlePrevPeriod} className="hover:bg-secondary min-h-[44px] text-xs sm:text-sm">
                <ChevronLeft className="size-3 sm:size-4 mr-1" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              <div className="px-2 sm:px-4 py-2 bg-card border border-border rounded-lg text-center min-w-[100px] sm:min-w-48 flex-1 sm:flex-none max-w-full">
                <p className="text-xs sm:text-sm font-medium text-foreground">{getPeriodLabel(selectedDate, viewPeriod)}</p>
                <p className="text-[10px] sm:text-xs text-foreground/70 mt-1">
                  {viewPeriod.charAt(0).toUpperCase() + viewPeriod.slice(1)} View
                </p>
              </div>
              <Button variant="ghost" onClick={handleToday} className="text-primary hover:bg-primary/10 min-h-[44px] text-xs sm:text-sm">
                Today
              </Button>
              <Button variant="ghost" onClick={handleNextPeriod} className="hover:bg-secondary min-h-[44px] text-xs sm:text-sm">
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="size-3 sm:size-4 ml-1" />
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => exportToCSV(filteredEntries, viewPeriod, selectedDate)}
                variant="outline"
                className="border-border hover:bg-secondary bg-transparent w-full sm:w-auto min-h-[44px]"
              >
                <Download className="size-4 mr-2" />
                CSV
              </Button>
              <Button
                onClick={() => exportToJSON(filteredEntries, viewPeriod, selectedDate)}
                variant="outline"
                className="border-border hover:bg-secondary bg-transparent w-full sm:w-auto min-h-[44px]"
              >
                <Download className="size-4 mr-2" />
                JSON
              </Button>
              <Button
                onClick={() => exportToExcel(filteredEntries, viewPeriod, selectedDate)}
                variant="outline"
                className="border-border hover:bg-secondary bg-transparent w-full sm:w-auto min-h-[44px]"
              >
                <FileSpreadsheet className="size-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-border gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap w-full sm:w-auto">
              <div className="grid grid-cols-4 sm:flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-full sm:w-auto max-w-full">
                {(["daily", "weekly", "monthly", "yearly"] as ViewPeriod[]).map((period) => (
                  <Button
                    key={period}
                    variant={viewPeriod === period ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onViewPeriodChange(period)}
                    className={cn(
                      "capitalize text-xs px-2 sm:px-3 whitespace-nowrap transition-all duration-200 min-h-[44px] sm:min-h-0",
                      viewPeriod === period && "bg-background shadow-sm ring-1 ring-primary/20",
                    )}
                  >
                    {period === "daily" && <CalendarDays className="size-3 mr-1 sm:mr-1.5" />}
                    {period === "weekly" && <CalendarRange className="size-3 mr-1 sm:mr-1.5" />}
                    {period === "monthly" && <Calendar className="size-3 mr-1 sm:mr-1.5" />}
                    {period === "yearly" && <CalendarClock className="size-3 mr-1 sm:mr-1.5" />}
                    <span className="hidden sm:inline">{period}</span>
                    <span className="sm:hidden">{period.charAt(0).toUpperCase()}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
        {sortedDates.length === 0 ? (
          <div className="text-center py-4 text-foreground/70">
            <Clock className="size-5 sm:size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm sm:text-base">No entries for this period</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {viewPeriod === "daily" &&
              sortedDates.map((date) => {
                const dateEntries = groupedEntries[date]
                const dayTotal = calculateTotalHours(dateEntries)
                const dayBreaks = calculateTotalBreakMinutes(dateEntries)

                return (
                  <div key={date} className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="font-medium text-sm sm:text-base text-foreground">{formatDate(date)}</span>
                      <span className="text-foreground/70 text-xs sm:text-sm">
                        {dayTotal.toFixed(1)}h worked, {dayBreaks}m breaks
                      </span>
                    </div>
                    <div className="rounded-lg border border-border overflow-hidden w-full max-w-full">
                      {/* Mobile Card Layout */}
                      <div className="block sm:hidden space-y-2 p-2 sm:p-3 w-full max-w-full">
                        {dateEntries.map((entry) => (
                          <MobileEntryCard
                            key={entry.id}
                            entry={entry}
                            isCurrentEntry={currentEntry?.id === entry.id && !entry.clockOut}
                            elapsedTime={elapsedTime}
                            timeCategories={timeCategories}
                            onOpenNotes={onOpenNotes}
                            onClockOut={onClockOut}
                            onDelete={handleDeleteEntry}
                          />
                        ))}
                      </div>
                      {/* Desktop Table Layout */}
                      <div className="hidden sm:block overflow-x-auto w-full">
                        <Table className="w-full">
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-xs whitespace-nowrap">Task Description</TableHead>
                              <TableHead className="text-xs whitespace-nowrap">Clock In</TableHead>
                              <TableHead className="text-xs whitespace-nowrap">Clock Out</TableHead>
                              <TableHead className="text-xs whitespace-nowrap">Duration</TableHead>
                              <TableHead className="text-xs whitespace-nowrap">Breaks</TableHead>
                              <TableHead className="text-xs text-right whitespace-nowrap">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dateEntries.map((entry) => {
                              const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
                              const isCurrentEntry = currentEntry?.id === entry.id && !entry.clockOut

                              return (
                                <React.Fragment key={entry.id}>
                                <TableRow className={cn(isCurrentEntry ? "bg-primary/5" : "", entry.subtasks && entry.subtasks.length > 0 && "border-b-0")}>
                                  <TableCell className="font-semibold text-xs max-w-sm">
                                    <div className="flex items-start gap-2">
                                      <div className="mt-0.5">
                                        {isCurrentEntry && (
                                          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 truncate">
                                        <span className="truncate">
                                          {getSessionHeadline(entry) || (
                                            <span className="text-foreground/70 italic">No task specified</span>
                                          )}
                                        </span>
                                        {entry.category && (() => {
                                          const category = timeCategories.find((c) => c.id === entry.category)
                                          return category ? (
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] px-1.5 py-0 flex-shrink-0"
                                              style={{
                                                borderColor: category.color,
                                                color: category.color,
                                                backgroundColor: `${category.color}15`,
                                              }}
                                            >
                                              {category.name}
                                            </Badge>
                                          ) : null
                                        })()}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{formatTime(entry.clockIn)}</TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {entry.clockOut ? (
                                      formatTime(entry.clockOut)
                                    ) : (
                                      <Badge
                                        variant="secondary"
                                        className="bg-primary/20 text-primary border-primary/30"
                                      >
                                        In Progress
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {isCurrentEntry ? (
                                      <span className="text-primary font-semibold">
                                        {String(elapsedTime.hours).padStart(2, "0")}h{" "}
                                        {String(elapsedTime.minutes).padStart(2, "0")}m
                                      </span>
                                    ) : (
                                      `${String(duration.hours).padStart(2, "0")}h ${String(duration.minutes).padStart(2, "0")}m`
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {entry.breaks && entry.breaks.length > 0 ? (
                                      <div className="text-xs space-y-1.5">
                                        {entry.breaks.map((breakPeriod) => {
                                          const breakDuration = breakPeriod.endTime
                                            ? calculateDuration(breakPeriod.startTime, breakPeriod.endTime, 0)
                                            : null
                                          return (
                                            <div key={breakPeriod.id} className="flex items-center gap-2">
                                              <Badge
                                                variant="outline"
                                                className={`text-[10px] px-1.5 py-0.5 ${getBreakTypeBadgeColor(breakPeriod.type)} cursor-pointer hover:opacity-80`}
                                                onClick={() => onEditBreak({ entryId: entry.id, breakId: breakPeriod.id, currentTitle: breakPeriod.title })}
                                                title="Click to edit break title"
                                              >
                                                {getBreakTypeLabel(breakPeriod.type, breakPeriod.title)}
                                              </Badge>
                                              <span className="text-foreground/70">
                                                {formatTimeRange(breakPeriod.startTime, breakPeriod.endTime)}
                                                {breakDuration && (
                                                  <span className="ml-1 text-foreground/60">
                                                    ({breakDuration.hours}h {breakDuration.minutes}m)
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    ) : (
                                      <span className="text-foreground/70">—</span>
                                    )}
                                  </TableCell>

                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          ⋯
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onOpenNotes(entry)}>
                                          Edit Notes
                                        </DropdownMenuItem>
                                        {isCurrentEntry && (
                                          <DropdownMenuItem onClick={onClockOut} className="text-destructive">
                                            Clock Out
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteEntry(entry.id)}
                                          className="text-destructive"
                                        >
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                                {entry.subtasks && entry.subtasks.length > 0 && (
                                  <TableRow className={cn(isCurrentEntry ? "bg-primary/5" : "", "hover:bg-transparent")}>
                                    <TableCell colSpan={6} className="pt-0 pb-4">
                                      <SessionTasks entry={entry} layout="wide" />
                                    </TableCell>
                                  </TableRow>
                                )}
                                </React.Fragment>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )
              })}

            {viewPeriod === "weekly" &&
              Object.entries(groupEntriesByWeek(filteredEntries))
                .sort(([a], [b]) => b.localeCompare(a)) // Sort weeks
                .map(([weekStartKey, weekEntries]) => {
                  const weekTotalHours = calculateTotalHours(weekEntries)
                  const weekTotalBreakMinutes = calculateTotalBreakMinutes(weekEntries)
                  const weekLabel = getPeriodLabel(parseLocalDateKey(weekStartKey), "weekly")

                  return (
                    <div key={weekStartKey} className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
                        <span className="font-medium text-foreground">{weekLabel}</span>
                        <span className="text-foreground/70 text-xs sm:text-sm">
                          {weekTotalHours.toFixed(1)}h worked, {weekTotalBreakMinutes}m breaks
                        </span>
                      </div>
                      <div className="rounded-lg border border-border overflow-hidden w-full max-w-full">
                        {/* Mobile Card Layout */}
                        <div className="block sm:hidden space-y-2 p-2 sm:p-3 w-full max-w-full">
                          {Object.entries(groupEntriesByDate(weekEntries))
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([date, dateEntries]) => {
                              const dayTotal = calculateTotalHours(dateEntries)
                              const dayBreaks = calculateTotalBreakMinutes(dateEntries)
                              return (
                                <div key={date} className="space-y-2">
                                  <div className="flex items-center justify-between pb-2 border-b border-border">
                                    <span className="font-semibold text-sm text-foreground">{formatDate(date)}</span>
                                    <span className="text-xs text-foreground/70">
                                      {dayTotal.toFixed(1)}h / {dayBreaks}m
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {dateEntries.map((entry) => (
                                      <MobileEntryCard
                                        key={entry.id}
                                        entry={entry}
                                        isCurrentEntry={currentEntry?.id === entry.id && !entry.clockOut}
                                        elapsedTime={elapsedTime}
                                        timeCategories={timeCategories}
                                        onOpenNotes={onOpenNotes}
                                        onClockOut={onClockOut}
                                        onDelete={handleDeleteEntry}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                        {/* Desktop Table Layout */}
                        <div className="hidden sm:block overflow-x-auto w-full max-w-full">
                          <Table className="w-full min-w-[600px]">
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                                <TableHead className="text-xs whitespace-nowrap">Task Description</TableHead>
                                <TableHead className="text-xs whitespace-nowrap">Clock In</TableHead>
                                <TableHead className="text-xs whitespace-nowrap">Clock Out</TableHead>
                                <TableHead className="text-xs whitespace-nowrap">Duration</TableHead>
                                <TableHead className="text-xs whitespace-nowrap">Breaks</TableHead>
                                <TableHead className="text-xs text-right whitespace-nowrap">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(groupEntriesByDate(weekEntries))
                                .sort(([a], [b]) => b.localeCompare(a)) // Sort days within the week
                                .map(([date, dateEntries]) => {
                                  const dayTotal = calculateTotalHours(dateEntries)
                                  const dayBreaks = calculateTotalBreakMinutes(dateEntries)
                                  // Each entry with task switches adds a full-width detail row below it.
                                  const detailRowCount = dateEntries.filter(
                                    (e) => e.subtasks && e.subtasks.length > 0,
                                  ).length
                                  return (
                                    <React.Fragment key={date}>
                                      <TableRow className="bg-card/10">
                                        <TableCell
                                          rowSpan={dateEntries.length + detailRowCount}
                                          className="font-medium text-xs align-top"
                                        >
                                          {formatDate(date)}
                                          <div className="text-foreground/70 text-xs pt-1">
                                            {dayTotal.toFixed(1)}h / {dayBreaks}m
                                          </div>
                                        </TableCell>
                                        {/* First entry for the day */}
                                        {dateEntries.map((entry, index) => {
                                          const duration = calculateDuration(
                                            entry.clockIn,
                                            entry.clockOut,
                                            entry.breakMinutes,
                                          )
                                          const isCurrentEntry = currentEntry?.id === entry.id && !entry.clockOut

                                          return (
                                            <React.Fragment key={entry.id}>
                                              {index === 0 && (
                                                <>
                                                  <TableCell className="font-semibold text-xs max-w-sm">
                                                    <div className="flex items-start gap-2">
                                                      <div className="mt-0.5">
                                                        {isCurrentEntry && (
                                                          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                        )}
                                                      </div>
                                                      <div className="flex items-center gap-2 truncate">
                                                        <span className="truncate">
                                                          {getSessionHeadline(entry) || (
                                                            <span className="text-foreground/70 italic">
                                                              No task specified
                                                            </span>
                                                          )}
                                                        </span>
                                                        {entry.category && (() => {
                                                          const category = timeCategories.find((c) => c.id === entry.category)
                                                          return category ? (
                                                            <Badge
                                                              variant="outline"
                                                              className="text-[10px] px-1.5 py-0 flex-shrink-0"
                                                              style={{
                                                                borderColor: category.color,
                                                                color: category.color,
                                                                backgroundColor: `${category.color}15`,
                                                              }}
                                                            >
                                                              {category.name}
                                                            </Badge>
                                                          ) : null
                                                        })()}
                                                      </div>
                                                    </div>
                                                  </TableCell>
                                                  <TableCell className="font-mono text-xs">
                                                    {formatTime(entry.clockIn)}
                                                  </TableCell>
                                                  <TableCell className="font-mono text-xs">
                                                    {entry.clockOut ? (
                                                      formatTime(entry.clockOut)
                                                    ) : (
                                                      <Badge
                                                        variant="secondary"
                                                        className="bg-primary/20 text-primary border-primary/30"
                                                      >
                                                        In Progress
                                                      </Badge>
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="font-mono text-xs">
                                                    {isCurrentEntry ? (
                                                      <span className="text-primary font-semibold">
                                                        {String(elapsedTime.hours).padStart(2, "0")}h{" "}
                                                        {String(elapsedTime.minutes).padStart(2, "0")}m
                                                      </span>
                                                    ) : (
                                                      `${String(duration.hours).padStart(2, "0")}h ${String(duration.minutes).padStart(2, "0")}m`
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="text-xs">
                                                    {entry.breaks && entry.breaks.length > 0 ? (
                                                      <div className="text-xs space-y-1.5">
                                                        {entry.breaks.map((breakPeriod) => {
                                                          const breakDuration = breakPeriod.endTime
                                                            ? calculateDuration(breakPeriod.startTime, breakPeriod.endTime, 0)
                                                            : null
                                                          return (
                                                            <div key={breakPeriod.id} className="flex items-center gap-2">
                                                              <Badge
                                                                variant="outline"
                                                                className={`text-[10px] px-1.5 py-0.5 ${getBreakTypeBadgeColor(breakPeriod.type)} cursor-pointer hover:opacity-80`}
                                                                onClick={() => onEditBreak({ entryId: entry.id, breakId: breakPeriod.id, currentTitle: breakPeriod.title })}
                                                                title="Click to edit break title"
                                                              >
                                                                {getBreakTypeLabel(breakPeriod.type, breakPeriod.title)}
                                                              </Badge>
                                                              <span className="text-foreground/70">
                                                                {breakPeriod.title && breakPeriod.type !== "custom" ? (
                                                                  <>
                                                                    <span className="font-medium">{breakPeriod.title}</span>
                                                                    <span className="ml-2 text-foreground/60 text-[10px]">
                                                                      {formatTimeRange(breakPeriod.startTime, breakPeriod.endTime)}
                                                                      {null}
                                                                      {breakDuration && ` (${breakDuration.hours}h ${breakDuration.minutes}m)`}
                                                                    </span>
                                                                  </>
                                                                ) : (
                                                                  <>
                                                                    {formatTimeRange(breakPeriod.startTime, breakPeriod.endTime)}
                                                                    {null}
                                                                    {breakDuration && (
                                                                      <span className="ml-1 text-foreground/60">
                                                                        ({breakDuration.hours}h {breakDuration.minutes}m)
                                                                      </span>
                                                                    )}
                                                                  </>
                                                                )}
                                                              </span>
                                                            </div>
                                                          )
                                                        })}
                                                      </div>
                                                    ) : (
                                                      <span className="text-foreground/70">—</span>
                                                    )}
                                                  </TableCell>

                                                  <TableCell>
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                          ⋯
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => onOpenNotes(entry)}>
                                                          Edit Notes
                                                        </DropdownMenuItem>
                                                        {isCurrentEntry && (
                                                          <DropdownMenuItem
                                                            onClick={onClockOut}
                                                            className="text-destructive"
                                                          >
                                                            Clock Out
                                                          </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                          onClick={() => handleDeleteEntry(entry.id)}
                                                          className="text-destructive"
                                                        >
                                                          Delete
                                                        </DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                  </TableCell>
                                                </>
                                              )}
                                            </React.Fragment>
                                          )
                                        })}
                                      </TableRow>
                                      {/* Full-width task breakdown for the day's first entry */}
                                      {dateEntries[0]?.subtasks && dateEntries[0].subtasks.length > 0 && (
                                        <TableRow className="hover:bg-transparent">
                                          <TableCell colSpan={6} className="pt-0 pb-4">
                                            <SessionTasks entry={dateEntries[0]} layout="wide" />
                                          </TableCell>
                                        </TableRow>
                                      )}
                                      {/* Subsequent entries for the same day */}
                                      {dateEntries.slice(1).map((entry) => {
                                        const duration = calculateDuration(
                                          entry.clockIn,
                                          entry.clockOut,
                                          entry.breakMinutes,
                                        )
                                        const isCurrentEntry = currentEntry?.id === entry.id && !entry.clockOut

                                        return (
                                          <React.Fragment key={entry.id}>
                                          <TableRow className={cn(isCurrentEntry ? "bg-primary/5" : "", entry.subtasks && entry.subtasks.length > 0 && "border-b-0")}>
                                            <TableCell className="font-semibold text-xs max-w-sm">
                                              <div className="flex items-start gap-2">
                                                <div className="mt-0.5">
                                                  {isCurrentEntry && (
                                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-2 truncate">
                                                  <span className="truncate">
                                                    {getSessionHeadline(entry) || (
                                                      <span className="text-foreground/70 italic">
                                                        No task specified
                                                      </span>
                                                    )}
                                                  </span>
                                                  {entry.category && (() => {
                                                    const category = timeCategories.find((c) => c.id === entry.category)
                                                    return category ? (
                                                      <Badge
                                                        variant="outline"
                                                        className="text-[10px] px-1.5 py-0 flex-shrink-0"
                                                        style={{
                                                          borderColor: category.color,
                                                          color: category.color,
                                                          backgroundColor: `${category.color}15`,
                                                        }}
                                                      >
                                                        {category.name}
                                                      </Badge>
                                                    ) : null
                                                  })()}
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                              {formatTime(entry.clockIn)}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                              {entry.clockOut ? (
                                                formatTime(entry.clockOut)
                                              ) : (
                                                <Badge
                                                  variant="secondary"
                                                  className="bg-primary/20 text-primary border-primary/30"
                                                >
                                                  In Progress
                                                </Badge>
                                              )}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                              {isCurrentEntry ? (
                                                <span className="text-primary font-semibold">
                                                  {String(elapsedTime.hours).padStart(2, "0")}h{" "}
                                                  {String(elapsedTime.minutes).padStart(2, "0")}m
                                                </span>
                                              ) : (
                                                `${String(duration.hours).padStart(2, "0")}h ${String(duration.minutes).padStart(2, "0")}m`
                                              )}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                              {entry.breaks && entry.breaks.length > 0 ? (
                                                <div className="text-xs space-y-1">
                                                  {entry.breaks.map((breakPeriod) => {
                                                    const breakDuration = breakPeriod.endTime
                                                      ? calculateDuration(breakPeriod.startTime, breakPeriod.endTime, 0)
                                                      : null
                                                    return (
                                                      <div key={breakPeriod.id} className="flex items-center gap-2">
                                                        <Badge
                                                          variant="outline"
                                                          className={`text-[10px] px-1.5 py-0.5 ${getBreakTypeBadgeColor(breakPeriod.type)} cursor-pointer hover:opacity-80`}
                                                          onClick={() => onEditBreak({ entryId: entry.id, breakId: breakPeriod.id, currentTitle: breakPeriod.title })}
                                                          title="Click to edit break title"
                                                        >
                                                          {getBreakTypeLabel(breakPeriod.type, breakPeriod.title)}
                                                        </Badge>
                                                        <span className="text-foreground/70">
                                                          {breakPeriod.title ? (
                                                            <>
                                                              <span className="font-medium">{breakPeriod.title}</span>
                                                              <span className="ml-2 text-foreground/60 text-[10px]">
                                                                {formatTimeRange(breakPeriod.startTime, breakPeriod.endTime)}
                                                                {null}
                                                                {breakDuration && ` (${breakDuration.hours}h ${breakDuration.minutes}m)`}
                                                              </span>
                                                            </>
                                                          ) : (
                                                            <>
                                                              {formatTimeRange(breakPeriod.startTime, breakPeriod.endTime)}
                                                              {null}
                                                              {breakDuration && (
                                                                <span className="ml-1 text-foreground/60">
                                                                  ({breakDuration.hours}h {breakDuration.minutes}m)
                                                                </span>
                                                              )}
                                                            </>
                                                          )}
                                                        </span>
                                                      </div>
                                                    )
                                                  })}
                                                </div>
                                              ) : (
                                                <span className="text-foreground/70">—</span>
                                              )}
                                            </TableCell>

                                            <TableCell>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="sm">
                                                    ⋯
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onClick={() => onOpenNotes(entry)}>
                                                    Edit Notes
                                                  </DropdownMenuItem>
                                                  {isCurrentEntry && (
                                                    <DropdownMenuItem
                                                      onClick={onClockOut}
                                                      className="text-destructive"
                                                    >
                                                      Clock Out
                                                    </DropdownMenuItem>
                                                  )}
                                                  <DropdownMenuItem
                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                    className="text-destructive"
                                                  >
                                                    Delete
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </TableCell>
                                          </TableRow>
                                          {entry.subtasks && entry.subtasks.length > 0 && (
                                            <TableRow className={cn(isCurrentEntry ? "bg-primary/5" : "", "hover:bg-transparent")}>
                                              <TableCell colSpan={6} className="pt-0 pb-4">
                                                <SessionTasks entry={entry} layout="wide" />
                                              </TableCell>
                                            </TableRow>
                                          )}
                                          </React.Fragment>
                                        )
                                      })}
                                    </React.Fragment>
                                  )
                                })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )
                })}

            {viewPeriod === "monthly" && (
              <MonthHeatmap
                selectedDate={selectedDate}
                entries={filteredEntries}
                onDayClick={(date) => {
                  onSelectedDateChange(date)
                  onViewPeriodChange("daily")
                }}
              />
            )}
            {viewPeriod === "yearly" && (
              <YearMonthsGrid
                selectedDate={selectedDate}
                entries={filteredEntries}
                onMonthClick={(date) => {
                  onSelectedDateChange(date)
                  onViewPeriodChange("monthly")
                }}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
