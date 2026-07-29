import { afterEach, describe, expect, it, vi } from "vitest"

const updateSpy = vi.fn()
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      update: (values: Record<string, unknown>) => {
        updateSpy(values)
        return { eq: vi.fn(async () => ({ error: null })) }
      },
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ order: vi.fn(async () => ({ data: [], error: null })) })),
      })),
    })),
  },
}))

import { useAppStore } from "@/lib/store"
import { endOfLocalDayMs, resolveEntryEnd } from "@/lib/utils"
import { calculateDuration } from "@/components/timesheet/helpers"
import { computeWeeklyMetrics } from "@/lib/insights"
import type { TimeEntry } from "@/lib/types"

const HOUR_MS = 60 * 60 * 1000

function at(dayOffset: number, hour: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, 0, 0, 0)
  return d
}

function entry(overrides: Partial<TimeEntry>): TimeEntry {
  return {
    id: "entry-1",
    date: "2026-07-29",
    clockIn: new Date().toISOString(),
    breakMinutes: 0,
    breaks: [],
    ...overrides,
  } as TimeEntry
}

afterEach(() => {
  vi.useRealTimers()
})

describe("resolveEntryEnd", () => {
  it("uses the recorded clock-out for a finished session", () => {
    const out = at(0, 17).toISOString()
    expect(resolveEntryEnd(at(0, 9).toISOString(), out)).toBe(new Date(out).getTime())
  })

  it("ticks live for a session still open today", () => {
    const now = at(0, 14).getTime()
    expect(resolveEntryEnd(at(0, 9).toISOString(), undefined, now)).toBe(now)
  })

  // The bug: an entry left open days ago was measured against "now", so it grew by
  // another 24h every day and dominated every total it appeared in.
  it("stops an abandoned session at midnight of the day it started", () => {
    const clockIn = at(-4, 9).toISOString()
    const now = at(0, 14).getTime()

    const end = resolveEntryEnd(clockIn, undefined, now)

    expect(end).toBe(endOfLocalDayMs(clockIn))
    expect(end).toBeLessThan(now)
    const hours = (end - new Date(clockIn).getTime()) / HOUR_MS
    expect(hours).toBeLessThanOrEqual(24)
  })

  it("does not keep growing as more days pass", () => {
    const clockIn = at(-4, 9).toISOString()
    const today = resolveEntryEnd(clockIn, undefined, at(0, 14).getTime())
    const aWeekLater = resolveEntryEnd(clockIn, undefined, at(7, 14).getTime())
    expect(aWeekLater).toBe(today)
  })
})

describe("calculateDuration", () => {
  it("caps an abandoned session instead of reporting days of work", () => {
    const { totalMs } = calculateDuration(at(-3, 9).toISOString(), undefined, 0)
    expect(totalMs / HOUR_MS).toBeLessThanOrEqual(24)
  })
})

describe("computeWeeklyMetrics", () => {
  const base = {
    tasks: [],
    habits: [],
    habitLogs: [],
    goals: [],
    targetHours: 8,
  }

  it("does not let one forgotten clock-out inflate the week", () => {
    const abandoned = at(-4, 9)
    const metrics = computeWeeklyMetrics({
      ...base,
      timeEntries: [
        entry({ id: "open", date: dateKey(abandoned), clockIn: abandoned.toISOString() }),
      ],
    })

    // Before the fix this was ~4 days of "work" (roughly 100h) in a 7-day window.
    expect(metrics.weekHours).toBeLessThanOrEqual(24)
  })

  it("still counts a normal completed day", () => {
    const day = at(-1, 9)
    const metrics = computeWeeklyMetrics({
      ...base,
      timeEntries: [
        entry({
          id: "closed",
          date: dateKey(day),
          clockIn: day.toISOString(),
          clockOut: new Date(day.getTime() + 8 * HOUR_MS).toISOString(),
        }),
      ],
    })

    expect(metrics.weekHours).toBeCloseTo(8, 1)
    expect(metrics.daysOnTarget).toBe(1)
  })
})

describe("clockOut", () => {
  // Closing a session stamped the current time with no ceiling, so a session
  // abandoned days ago was written into history as a genuine multi-day entry —
  // permanently inflating every report, even after it stopped being open.
  it("caps the recorded clock-out at the applied daily limit", async () => {
    updateSpy.mockClear()
    const clockIn = at(-4, 9)
    useAppStore.setState({
      user: { id: "u1", name: "T", email: "t@e.com", createdAt: new Date().toISOString() },
      isLoggedIn: true,
      currentEntry: entry({ id: "abandoned", date: dateKey(clockIn), clockIn: clockIn.toISOString() }),
      activeBreak: null,
      officeHours: 9,
      graceMinutes: 0,
      overworkMinutesRequested: 0,
      allowOverworkMinutes: 0,
    })

    await useAppStore.getState().clockOut()

    const written = updateSpy.mock.calls[0][0].clock_out as string
    const recordedHours = (new Date(written).getTime() - clockIn.getTime()) / HOUR_MS
    expect(recordedHours).toBeCloseTo(9, 1)
  })

  it("stamps the real time for a session closed within the limit", async () => {
    updateSpy.mockClear()
    const clockIn = new Date(Date.now() - 2 * HOUR_MS)
    useAppStore.setState({
      user: { id: "u1", name: "T", email: "t@e.com", createdAt: new Date().toISOString() },
      isLoggedIn: true,
      currentEntry: entry({ id: "normal", clockIn: clockIn.toISOString() }),
      activeBreak: null,
      officeHours: 9,
      graceMinutes: 0,
      overworkMinutesRequested: 0,
      allowOverworkMinutes: 0,
    })

    await useAppStore.getState().clockOut()

    const written = updateSpy.mock.calls[0][0].clock_out as string
    expect(Math.abs(new Date(written).getTime() - Date.now())).toBeLessThan(5_000)
  })
})

function dateKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${month}-${day}`
}
