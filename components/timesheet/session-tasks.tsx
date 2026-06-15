"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TimeEntry } from "@/lib/store"
import { calculateDuration, formatTimeRange, getSessionTaskSegments } from "./helpers"

interface SessionTasksProps {
  entry: TimeEntry
  // "compact" — stacked rows for narrow contexts (active-session card).
  // "wide" — a distinct, full-width panel with aligned columns that fills the
  //          open horizontal space (the history table's detail row).
  layout?: "compact" | "wide"
}

// Unified, ordered list of every task worked in a session — the tasks you switched
// away from plus the current/final task, all as equal segments (no parent/child).
// The in-progress task is badged "Current" and runs to "now" with a live duration.
// Renders nothing until at least one task switch has happened.
export function SessionTasks({ entry, layout = "compact" }: SessionTasksProps) {
  const segments = getSessionTaskSegments(entry)
  if (segments.length <= 1) return null

  if (layout === "wide") {
    return (
      <div className="rounded-lg border-l-2 border-primary/50 bg-muted/30 px-3 sm:px-4 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,14rem)_5rem] gap-4 items-center px-2 pb-2 mb-1 border-b border-border/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Tasks this session</span>
          <span>Time</span>
          <span className="text-right">Duration</span>
        </div>
        <div className="space-y-0.5">
          {segments.map((seg) => {
            const d = calculateDuration(seg.start, seg.end, 0)
            return (
              <div
                key={seg.id}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_minmax(0,14rem)_5rem] gap-4 items-center px-2 py-1.5 rounded text-xs",
                  seg.isCurrent ? "bg-green-500/10" : "hover:bg-background/40",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {seg.isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />}
                  <span className="font-medium text-foreground truncate">{seg.title}</span>
                  {seg.isCurrent && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 border-green-500/50 text-green-600 dark:text-green-400 flex-shrink-0"
                    >
                      Current
                    </Badge>
                  )}
                </div>
                <span className="font-mono text-[11px] text-foreground/60 truncate">
                  {formatTimeRange(seg.start, seg.end)}
                </span>
                <span className="font-mono text-foreground/80 text-right tabular-nums">
                  {d.hours}h {d.minutes}m
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2 pt-2 border-t border-muted text-xs text-foreground/70 space-y-1.5">
      <p className="font-medium text-foreground mb-1">Tasks this session:</p>
      {segments.map((seg) => {
        const d = calculateDuration(seg.start, seg.end, 0)
        return (
          <div
            key={seg.id}
            className={cn(
              "flex items-start gap-2 pl-2 border-l-2",
              seg.isCurrent ? "border-green-500/60" : "border-muted/50",
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-foreground/90 font-medium truncate">{seg.title}</span>
                {seg.isCurrent && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 border-green-500/50 text-green-600 dark:text-green-400 flex-shrink-0"
                  >
                    Current
                  </Badge>
                )}
              </div>
              <div className="text-foreground/60 text-[10px] mt-0.5">{formatTimeRange(seg.start, seg.end)}</div>
            </div>
            <span className="text-foreground/70 font-mono text-[10px] whitespace-nowrap">
              {d.hours}h {d.minutes}m
            </span>
          </div>
        )
      })}
    </div>
  )
}
