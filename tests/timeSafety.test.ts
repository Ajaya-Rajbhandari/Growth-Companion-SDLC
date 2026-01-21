import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ensure Supabase client can initialize in tests
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.local"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key"

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

let useAppStore: typeof import("../lib/store").useAppStore

type TimeEntry = import("../lib/store").TimeEntry

function makeEntry({
  id,
  date,
  clockIn,
  clockOut,
  breakMinutes = 0,
}: {
  id: string
  date: string
  clockIn: string
  clockOut: string
  breakMinutes?: number
}): TimeEntry {
  return {
    id,
    date,
    clockIn,
    clockOut,
    breakMinutes,
    breaks: [],
    notes: "",
    title: "",
    subtasks: [],
  }
}

const resetStore = () => {
  useAppStore.setState((state) => ({
    ...state,
    timeEntries: [],
    currentEntry: null,
    activeBreak: null,
    officeHours: 9,
    graceMinutes: 0,
    allowOverworkMinutes: 60,
    overworkMinutesRequested: 0,
  }))
}

beforeAll(async () => {
  // Ensure persist middleware has storage available in test environment
  vi.stubGlobal("localStorage", localStorageMock)
  vi.stubGlobal("window", { localStorage: localStorageMock } as any)

  const storeModule = await import("../lib/store")
  useAppStore = storeModule.useAppStore
})

beforeEach(() => {
  vi.useFakeTimers()
  resetStore()
})

describe("time safety calculations", () => {
  it("provides warnings near the daily cap", () => {
    // Tue Jan 2, 2024 18:00 UTC
    vi.setSystemTime(new Date("2024-01-02T18:00:00.000Z"))

    useAppStore.setState((state) => ({
      ...state,
      timeEntries: [
        makeEntry({
          id: "e1",
          date: "2024-01-02",
          clockIn: "2024-01-02T09:00:00.000Z",
          clockOut: "2024-01-02T17:20:00.000Z", // 8h20m = 500m
          breakMinutes: 0,
        }),
      ],
      officeHours: 9,
      graceMinutes: 0,
      allowOverworkMinutes: 0,
      overworkMinutesRequested: 0,
    }))

    const stats = useAppStore.getState().getTodayWorkStats()

    expect(stats.status).toBe("warning")
    expect(Math.round(stats.remainingMinutes)).toBe(40) // 540 - 500
    expect(stats.appliedLimitMinutes).toBe(540) // 9h
  })

  it("honors grace + overwork and hits hard cap", () => {
    // Tue Jan 2, 2024 20:00 UTC
    vi.setSystemTime(new Date("2024-01-02T20:00:00.000Z"))

    useAppStore.setState((state) => ({
      ...state,
      timeEntries: [
        makeEntry({
          id: "e1",
          date: "2024-01-02",
          clockIn: "2024-01-02T09:00:00.000Z",
          clockOut: "2024-01-02T19:00:00.000Z", // 10h = 600m
          breakMinutes: 0,
        }),
      ],
      officeHours: 9,
      graceMinutes: 10,
      allowOverworkMinutes: 60,
      overworkMinutesRequested: 30,
    }))

    const stats = useAppStore.getState().getTodayWorkStats()

    expect(stats.appliedLimitMinutes).toBe(540 + 10 + 30) // 580m
    expect(stats.status).toBe("hardCap")
    expect(stats.remainingMinutes).toBe(0)
  })

  it("computes weekly catch-up deficit for under-hours day", () => {
    // Sunday Jan 7, 2024 16:00 UTC (dayOfWeek = 0, only today considered)
    vi.setSystemTime(new Date("2024-01-07T16:00:00.000Z"))

    const todayStr = new Date().toISOString().split("T")[0]
    const baseDate = new Date(todayStr + "T00:00:00.000Z")
    const clockIn = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(), 9, 0)).toISOString()
    const clockOut = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(), 14, 0)).toISOString()

    useAppStore.setState((state) => ({
      ...state,
      timeEntries: [
        makeEntry({
          id: "e1",
          date: todayStr,
          clockIn,
          clockOut, // 5h = 300m
          breakMinutes: 0,
        }),
      ],
      officeHours: 9,
      graceMinutes: 0,
      allowOverworkMinutes: 0,
      overworkMinutesRequested: 0,
    }))

    const stats = useAppStore.getState().getTodayWorkStats()

    expect(useAppStore.getState().timeEntries.length).toBe(1)
    expect(stats.todayMinutes).toBeCloseTo(300)
    expect(stats.weeklyCatchUpMinutes).toBeCloseTo(240) // deficit from 9h target
    expect(stats.remainingMinutes).toBeCloseTo(240)
    expect(stats.status === "warning" || stats.status === "normal").toBe(true)
  })
})

afterEach(() => {
  vi.useRealTimers()
})
