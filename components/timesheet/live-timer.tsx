"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface LiveTimerProps {
  /** ISO timestamp the session started. */
  clockIn: string
  /** Break minutes already banked against this session. */
  breakMinutes: number
  /**
   * ISO timestamp to freeze the clock at, or null to run live. Work time stops
   * accruing the moment a break starts, so the session clock holds at the break's
   * start rather than ticking through it.
   */
  frozenAt?: string | null
  className?: string
}

function elapsedFrom(clockIn: string, breakMinutes: number, frozenAt?: string | null) {
  const start = new Date(clockIn).getTime()
  const end = frozenAt ? new Date(frozenAt).getTime() : Date.now()
  const diffMs = Math.max(0, end - start - (breakMinutes || 0) * 60 * 1000)

  return {
    hours: Math.floor(diffMs / (1000 * 60 * 60)),
    minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diffMs % (1000 * 60)) / 1000),
  }
}

const pad = (value: number) => String(value).padStart(2, "0")

/**
 * The running session clock.
 *
 * This owns its own interval rather than reading a prop, so a per-second tick
 * re-renders these few digits instead of the whole Timesheet screen and the
 * history table beneath it.
 *
 * The visible digits are hidden from assistive tech — announcing a changing
 * number every second is worse than announcing nothing. A separate live region
 * carries the same information at minute granularity: its text only changes when
 * the minute does, so that is the only time a screen reader speaks.
 */
export function LiveTimer({ clockIn, breakMinutes, frozenAt, className }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState(() => elapsedFrom(clockIn, breakMinutes, frozenAt))

  useEffect(() => {
    const update = () => setElapsed(elapsedFrom(clockIn, breakMinutes, frozenAt))

    update()
    // A frozen clock has nothing to tick.
    if (frozenAt) return

    const interval = setInterval(update, 1000)

    // Background tabs throttle timers, so the count drifts while hidden. Recompute
    // from the timestamps on return rather than trusting the accumulated ticks.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") update()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [clockIn, breakMinutes, frozenAt])

  return (
    <>
      {/* tabular-nums plus zero-padding keeps the digits from shifting the block
          sideways every time the minutes roll over from 9 to 10. */}
      <div
        aria-hidden="true"
        className={cn("text-3xl sm:text-4xl font-bold text-foreground font-mono tabular-nums", className)}
      >
        {pad(elapsed.hours)}h {pad(elapsed.minutes)}m
        <span className="text-base sm:text-xl text-foreground/70 ml-1">{pad(elapsed.seconds)}s</span>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {`Working for ${elapsed.hours} hours ${elapsed.minutes} minutes`}
      </span>
    </>
  )
}
