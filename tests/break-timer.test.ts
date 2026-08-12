import { describe, expect, it } from "vitest"
import { formatBreakClock, getBreakCountdown, getBreakElapsed } from "@/lib/break-timer"

const START = "2026-08-12T10:00:00.000Z"
const at = (minutes: number, seconds = 0) =>
  new Date(START).getTime() + minutes * 60_000 + seconds * 1000

describe("getBreakCountdown", () => {
  it("returns null for an open-ended break", () => {
    expect(getBreakCountdown(START, undefined, at(5))).toBeNull()
    expect(getBreakCountdown(START, 0, at(5))).toBeNull()
  })

  it("counts down while the break is running", () => {
    const countdown = getBreakCountdown(START, 15, at(5, 20))
    expect(countdown).toMatchObject({ minutes: 9, seconds: 40, isOverrun: false })
  })

  it("reports the excess once the break runs over instead of freezing at zero", () => {
    // A 15-minute break, 40 minutes in: 25 minutes over.
    const countdown = getBreakCountdown(START, 15, at(40))
    expect(countdown).toMatchObject({ minutes: 25, seconds: 0, isOverrun: true })
  })

  it("flips to overrun exactly at the planned end", () => {
    expect(getBreakCountdown(START, 15, at(15))).toMatchObject({ isOverrun: false, minutes: 0, seconds: 0 })
    expect(getBreakCountdown(START, 15, at(15, 1))).toMatchObject({ isOverrun: true, minutes: 0, seconds: 1 })
  })

  describe("percentUsed", () => {
    // The old expression divided a fraction and then multiplied by 100, yielding
    // ~9,900% for every input — a bar that was always visually full.
    it("tracks progress across the break rather than pinning to full", () => {
      expect(getBreakCountdown(START, 20, at(0))?.percentUsed).toBe(0)
      expect(getBreakCountdown(START, 20, at(5))?.percentUsed).toBe(25)
      expect(getBreakCountdown(START, 20, at(10))?.percentUsed).toBe(50)
      expect(getBreakCountdown(START, 20, at(15))?.percentUsed).toBe(75)
      expect(getBreakCountdown(START, 20, at(20))?.percentUsed).toBe(100)
    })

    it("clamps at 100 rather than overflowing once overrun", () => {
      expect(getBreakCountdown(START, 20, at(45))?.percentUsed).toBe(100)
    })

    it("never goes negative if the clock is behind the start time", () => {
      expect(getBreakCountdown(START, 20, at(-5))?.percentUsed).toBe(0)
    })
  })
})

describe("getBreakElapsed", () => {
  it("splits the elapsed span into minutes and seconds", () => {
    expect(getBreakElapsed(START, at(7, 42))).toEqual({ minutes: 7, seconds: 42 })
  })

  it("counts past an hour without wrapping", () => {
    expect(getBreakElapsed(START, at(75, 3))).toEqual({ minutes: 75, seconds: 3 })
  })

  it("floors at zero for a start time in the future", () => {
    expect(getBreakElapsed(START, at(-10))).toEqual({ minutes: 0, seconds: 0 })
  })
})

describe("formatBreakClock", () => {
  it("zero-pads both fields", () => {
    expect(formatBreakClock({ minutes: 5, seconds: 9, isOverrun: false, percentUsed: 50 })).toBe("05:09")
  })

  it("signs the value once overrun so the two states cannot be confused", () => {
    expect(formatBreakClock({ minutes: 5, seconds: 9, isOverrun: true, percentUsed: 100 })).toBe("-05:09")
  })
})
