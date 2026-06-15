"use client"

import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, ClipboardList, Coffee, Square, Timer } from "lucide-react"
import {
  calculateDuration,
  formatMinutes,
  formatTime,
  getBreakTypeBadgeColor,
  getBreakTypeLabel,
} from "./helpers"
import type { SelectedBreak } from "./dialogs"
import { SessionTasks } from "./session-tasks"

interface ActiveSessionCardProps {
  elapsedTime: { hours: number; minutes: number; seconds: number }
  remainingMinutes: number
  overtimeBadge: boolean
  onEditTask: () => void
  onSwitchTask: () => void
  onTakeBreak: () => void
  onRequestOverwork: () => void
  onClockOut: () => void
  onEditBreak: (selectedBreak: SelectedBreak) => void
}

export function ActiveSessionCard({
  elapsedTime,
  remainingMinutes,
  overtimeBadge,
  onEditTask,
  onSwitchTask,
  onTakeBreak,
  onRequestOverwork,
  onClockOut,
  onEditBreak,
}: ActiveSessionCardProps) {
  const { currentEntry, activeBreak, overworkMinutesRequested, allowOverworkMinutes } = useAppStore(
    useShallow((state) => ({
      currentEntry: state.currentEntry,
      activeBreak: state.activeBreak,
      overworkMinutesRequested: state.overworkMinutesRequested,
      allowOverworkMinutes: state.allowOverworkMinutes,
    })),
  )

  if (!currentEntry) return null

  return (
    <Card className="border-l-4 border-l-green-500 bg-card w-full max-w-full">
      <CardContent className="p-2 sm:p-3 md:p-4 w-full max-w-full">
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 text-foreground">
              <div className="h-3 w-3 animate-pulse rounded-full bg-green-500 flex-shrink-0" />
              <div className="truncate max-w-[200px] sm:max-w-none font-semibold text-base sm:text-lg">
                {currentEntry.title || "Working"}
              </div>
              <Badge variant="secondary" className="text-xs">In Progress</Badge>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-foreground/70 mb-1">
                Working since {formatTime(currentEntry.clockIn)}
              </p>
              <div className="text-2xl sm:text-4xl font-bold text-foreground font-mono">
                {elapsedTime.hours}h {elapsedTime.minutes}m
                <span className="text-base sm:text-xl text-foreground/70 ml-1">
                  {String(elapsedTime.seconds).padStart(2, "0")}s
                </span>
              </div>
              <p className="text-xs sm:text-sm text-foreground/70 mt-1">
                Remaining today: {formatMinutes(remainingMinutes)}
              </p>
              {overtimeBadge && (
                <Badge variant="destructive" className="mt-1">
                  Overtime
                </Badge>
              )}
              {currentEntry.breakMinutes > 0 && (
                <p className="text-xs sm:text-sm text-foreground/70 mt-2">
                  Total break: {currentEntry.breakMinutes} minutes ({(currentEntry.breaks || []).length} break
                  {(currentEntry.breaks || []).length !== 1 ? "s" : ""})
                </p>
              )}
            </div>
          </div>

          {/* Show breaks taken if any */}
          {currentEntry.breaks && currentEntry.breaks.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3 border border-muted">
              <p className="text-xs font-medium text-foreground/90 mb-2">Breaks taken:</p>
              <div className="space-y-1.5">
                {currentEntry.breaks.map((breakPeriod) => {
                  const breakDuration = breakPeriod.endTime
                    ? calculateDuration(breakPeriod.startTime, breakPeriod.endTime, 0)
                    : null
                  return (
                    <div
                      key={breakPeriod.id}
                      className="flex items-center justify-between text-xs bg-background/50 rounded px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0.5 ${getBreakTypeBadgeColor(breakPeriod.type)} cursor-pointer hover:opacity-80`}
                          onClick={() => onEditBreak({ entryId: currentEntry.id, breakId: breakPeriod.id, currentTitle: breakPeriod.title })}
                          title="Click to edit break title"
                        >
                          {getBreakTypeLabel(breakPeriod.type, breakPeriod.title)}
                        </Badge>
                        {breakPeriod.title && breakPeriod.type !== "custom" ? (
                          <>
                            <span className="text-foreground/90 font-medium truncate">{breakPeriod.title}</span>
                            <span className="text-foreground/60 text-[10px]">
                              {formatTime(breakPeriod.startTime)} → {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : "ongoing"}
                            </span>
                          </>
                        ) : (
                          <span className="text-foreground/70 text-[10px]">
                            {formatTime(breakPeriod.startTime)} → {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : "ongoing"}
                          </span>
                        )}
                      </div>
                      {breakDuration && (
                        <span className="text-foreground/70 font-mono text-[10px] whitespace-nowrap ml-2">
                          {breakDuration.hours}h {breakDuration.minutes}m
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full ordered task breakdown for this session (incl. the current task) */}
          <SessionTasks entry={currentEntry} />

          {!activeBreak && (
            <>
              <p className="text-xs text-muted-foreground">
                Log each activity when you switch so your day log stays accurate.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                <Button onClick={onEditTask} variant="outline" className="gap-2 bg-transparent w-full sm:w-auto min-h-[44px]">
                  <Clock className="h-4 w-4" />
                  Edit Task
                </Button>
                <Button onClick={onSwitchTask} variant="default" className="gap-2 w-full sm:w-auto min-h-[44px]">
                  <ClipboardList className="h-4 w-4" />
                  Log new task
                </Button>
                {allowOverworkMinutes > 0 && (
                  <Button
                    onClick={onRequestOverwork}
                    variant="outline"
                    className="gap-2 w-full sm:w-auto min-h-[44px]"
                    disabled={overworkMinutesRequested >= allowOverworkMinutes}
                  >
                    <Timer className="h-4 w-4" />
                    {overworkMinutesRequested > 0 ? `Overwork: ${overworkMinutesRequested}m` : "Add Overwork"}
                  </Button>
                )}
                <Button onClick={onTakeBreak} variant="outline" className="gap-2 w-full sm:w-auto min-h-[44px]">
                  <Coffee className="h-4 w-4" />
                  Take Break
                </Button>
                <Button onClick={onClockOut} variant="destructive" className="gap-2 w-full sm:w-auto sm:ml-auto min-h-[44px]">
                  <Square className="h-4 w-4" />
                  Clock Out
                </Button>
              </div>
            </>
          )}

          {activeBreak && (
            <div className="bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-lg p-4 text-center">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Break in progress</p>
              <p className="text-xs text-foreground/70 mt-1">All work activities are paused</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
