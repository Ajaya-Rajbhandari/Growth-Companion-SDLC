"use client"

import type { TimeEntry, TimeCategory } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { calculateDuration, formatTime, formatTimeRange, getBreakTypeBadgeColor, getBreakTypeLabel, getSessionHeadline } from "./helpers"
import { SessionTasks } from "./session-tasks"

interface MobileEntryCardProps {
  entry: TimeEntry
  isCurrentEntry: boolean
  elapsedTime: { hours: number; minutes: number }
  timeCategories: TimeCategory[]
  onOpenNotes: (entry: TimeEntry) => void
  onClockOut: () => void
  onDelete: (entryId: string) => void
}

// Mobile card layout for a single time entry (shared by daily and weekly views).
export function MobileEntryCard({
  entry,
  isCurrentEntry,
  elapsedTime,
  timeCategories,
  onOpenNotes,
  onClockOut,
  onDelete,
}: MobileEntryCardProps) {
  const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
  const breakDuration =
    entry.breaks?.reduce(
      (total, b) =>
        total +
        (new Date(b.endTime || Date.now()).getTime() - new Date(b.startTime).getTime()),
      0,
    ) || 0
  const breakMinutesCount = Math.round(breakDuration / (1000 * 60))

  return (
    <Card className={cn("bg-card border-border", isCurrentEntry && "bg-primary/5 border-primary/20")}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isCurrentEntry && (
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              )}
              <span className="font-semibold text-sm truncate">
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
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">In:</span> {formatTime(entry.clockIn)}
              </div>
              <div>
                <span className="font-medium">Out:</span>{" "}
                {entry.clockOut ? (
                  formatTime(entry.clockOut)
                ) : (
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                    In Progress
                  </Badge>
                )}
              </div>
              <div>
                <span className="font-medium">Duration:</span>{" "}
                {isCurrentEntry ? (
                  <span className="text-primary font-semibold">
                    {String(elapsedTime.hours).padStart(2, "0")}h{" "}
                    {String(elapsedTime.minutes).padStart(2, "0")}m
                  </span>
                ) : (
                  `${String(duration.hours).padStart(2, "0")}h ${String(duration.minutes).padStart(2, "0")}m`
                )}
              </div>
              <div>
                <span className="font-medium">Breaks:</span>{" "}
                {entry.breaks && entry.breaks.length > 0 ? (
                  <span>{breakMinutesCount}m</span>
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
            {entry.breaks && entry.breaks.length > 0 && (
              <div className="pt-2 border-t border-border space-y-1.5">
                {entry.breaks.map((breakPeriod) => {
                  const periodDuration = breakPeriod.endTime
                    ? calculateDuration(breakPeriod.startTime, breakPeriod.endTime, 0)
                    : null
                  return (
                    <div key={breakPeriod.id} className="flex items-center gap-2 text-xs">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0.5 ${getBreakTypeBadgeColor(breakPeriod.type)}`}
                      >
                        {getBreakTypeLabel(breakPeriod.type, breakPeriod.title)}
                      </Badge>
                      <span className="text-foreground/70">
                        {formatTimeRange(breakPeriod.startTime, breakPeriod.endTime)}
                        {periodDuration && (
                          <span className="ml-1 text-foreground/60">
                            ({periodDuration.hours}h {periodDuration.minutes}m)
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            <SessionTasks entry={entry} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px]">
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
                onClick={() => onDelete(entry.id)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}
