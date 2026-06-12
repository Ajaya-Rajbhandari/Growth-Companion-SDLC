"use client"

import { useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, getLocalDateKey } from "@/lib/utils"
import { Coffee, ListTodo } from "lucide-react"
import { calculateDuration, formatTime, getBreakTypeLabel } from "./helpers"

// "What I did today" — chronological office day log built from today's
// entries, their subtasks, and breaks.
export function TodayTimeline() {
  const { timeEntries, currentEntry } = useAppStore(
    useShallow((state) => ({
      timeEntries: state.timeEntries,
      currentEntry: state.currentEntry,
    })),
  )

  const todayStr = useMemo(() => getLocalDateKey(), [])
  const todayTimelineItems = useMemo(() => {
    const entries = timeEntries.filter((e) => e.date === todayStr)
    const withCurrent =
      currentEntry && currentEntry.date === todayStr && !entries.some((e) => e.id === currentEntry.id)
        ? [currentEntry, ...entries]
        : entries
    const items: { start: string; end?: string; label: string; type: "work" | "break" }[] = []
    withCurrent
      .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime())
      .forEach((entry) => {
        if (entry.subtasks && entry.subtasks.length > 0) {
          entry.subtasks.forEach((sub) => {
            items.push({
              start: sub.clockIn,
              end: sub.clockOut,
              label: sub.title,
              type: "work",
            })
          })
          if (!entry.clockOut) {
            const lastEnd = entry.subtasks[entry.subtasks.length - 1].clockOut
            items.push({
              start: lastEnd || entry.clockIn,
              end: undefined,
              label: entry.title || "Working",
              type: "work",
            })
          }
        } else {
          items.push({
            start: entry.clockIn,
            end: entry.clockOut,
            label: entry.title || "Work",
            type: "work",
          })
        }
        ;(entry.breaks || []).forEach((brk) => {
          items.push({
            start: brk.startTime,
            end: brk.endTime,
            label: getBreakTypeLabel(brk.type, brk.title),
            type: "break",
          })
        })
      })
    return items.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }, [timeEntries, currentEntry, todayStr])

  if (todayTimelineItems.length === 0) return null

  return (
    <Card className="border-border bg-card w-full max-w-full overflow-hidden !px-0">
      <CardHeader className="p-2 sm:p-3 md:p-4 !px-2 sm:!px-3 md:!px-4">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <ListTodo className="size-4 sm:size-5 text-primary" />
          What I did today
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Time-to-time log for the day. Switch task when you change activity to keep this accurate.
        </p>
      </CardHeader>
      <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
        <ul className="space-y-2">
          {todayTimelineItems.map((item, idx) => {
            const duration = item.end
              ? calculateDuration(item.start, item.end, 0)
              : item.type === "work"
                ? (() => {
                    const totalMs = Math.max(0, Date.now() - new Date(item.start).getTime())
                    return {
                      hours: Math.floor(totalMs / (1000 * 60 * 60)),
                      minutes: Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60)),
                      totalMs,
                    }
                  })()
                : null
            const durationStr = duration
              ? `${duration.hours}h ${duration.minutes}m`
              : item.end
                ? ""
                : "…"
            return (
              <li
                key={`${item.start}-${idx}`}
                className={cn(
                  "flex items-center gap-2 sm:gap-3 py-2 px-3 rounded-lg text-sm",
                  item.type === "break"
                    ? "bg-amber-500/10 border border-amber-500/20"
                    : "bg-muted/40 border border-border",
                )}
              >
                <span className="font-mono text-xs text-muted-foreground whitespace-nowrap w-16 sm:w-20">
                  {formatTime(item.start)}
                </span>
                <span className="flex-1 min-w-0 font-medium truncate">{item.label}</span>
                {item.type === "break" && (
                  <Coffee className="size-4 text-amber-500 flex-shrink-0" />
                )}
                {durationStr && (
                  <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {durationStr}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
