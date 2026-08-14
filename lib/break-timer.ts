/**
 * Break countdown maths, shared by the timesheet panel and the /widget surface.
 *
 * Both used to carry their own copy, and both had the same two bugs: the remaining
 * time was clamped at zero, so an over-running break froze at 00:00 under a "Time
 * Remaining" heading and the "elapsed" branch was unreachable; and the progress bar
 * divided a fraction before multiplying by 100, producing ~9,900% — clipped by
 * `overflow-hidden` into a bar that read full from the first second to the last.
 */

export interface BreakCountdown {
  /** Whole minutes of the remaining (or, once overrun, the excess) span. */
  minutes: number
  /** Seconds within that minute, 0-59. */
  seconds: number
  /** True once the break has run past its planned duration. */
  isOverrun: boolean
  /** How much of the planned break has been used, 0-100 and clamped at both ends. */
  percentUsed: number
}

export interface BreakElapsed {
  minutes: number
  seconds: number
}

const splitMs = (ms: number) => ({
  minutes: Math.floor(ms / 60_000),
  seconds: Math.floor((ms % 60_000) / 1000),
})

/** Time on the clock since the break started. Never negative. */
export function getBreakElapsed(startTime: string, now: number = Date.now()): BreakElapsed {
  const elapsedMs = Math.max(0, now - new Date(startTime).getTime())
  return splitMs(elapsedMs)
}

/**
 * The countdown for a break with a planned duration.
 *
 * Returns null for an open-ended break (no `durationMinutes`) — there is nothing to
 * count down to, and the caller should show elapsed time instead.
 *
 * Past the planned end, `isOverrun` flips and `minutes`/`seconds` describe how far
 * over the break has run. That number is what matters for the timesheet's accuracy,
 * and it is exactly what the old clamped version threw away.
 */
export function getBreakCountdown(
  startTime: string,
  durationMinutes: number | undefined | null,
  now: number = Date.now(),
): BreakCountdown | null {
  if (!durationMinutes || durationMinutes <= 0) return null

  const totalMs = durationMinutes * 60_000
  const elapsedMs = Math.max(0, now - new Date(startTime).getTime())
  const remainingMs = totalMs - elapsedMs

  return {
    ...splitMs(Math.abs(remainingMs)),
    isOverrun: remainingMs < 0,
    percentUsed: Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100)),
  }
}

/** "05:09", or "-05:09" once the break is over its planned length. */
export function formatBreakClock({ minutes, seconds, isOverrun }: BreakCountdown): string {
  const sign = isOverrun ? "-" : ""
  return `${sign}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
