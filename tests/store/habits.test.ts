import { describe, it, expect, beforeEach, vi } from "vitest"
import { useAppStore } from "@/lib/store"
import { getLocalDateKey } from "@/lib/utils"
import type { Habit, HabitLog } from "@/lib/store"

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}))

// Generic chainable query-builder mock (see goals.test.ts for rationale).
function chain(result: { data?: unknown; error: unknown }) {
  const obj: any = {
    data: result.data ?? null,
    error: result.error ?? null,
    insert: () => obj,
    update: () => obj,
    delete: () => obj,
    select: () => obj,
    eq: () => obj,
    order: () => obj,
    single: () => result,
    maybeSingle: () => result,
  }
  return obj
}

// logHabit first reads an existing row (maybeSingle) then writes (single). This
// variant lets the read and the write resolve to different results.
function chainLog(
  checkResult: { data?: unknown; error: unknown },
  writeResult: { data?: unknown; error: unknown },
) {
  const obj: any = {
    insert: () => obj,
    update: () => obj,
    select: () => obj,
    eq: () => obj,
    maybeSingle: () => checkResult,
    single: () => writeResult,
  }
  return obj
}

async function mockFrom(value: unknown) {
  const { supabase } = await import("@/lib/supabase")
  ;(supabase.from as any).mockReturnValue(value)
}

const dbHabit = (overrides: Record<string, unknown> = {}) => ({
  id: "habit-1",
  title: "Drink water",
  description: null,
  frequency: "daily",
  target_count: 1,
  color: "#3b82f6",
  icon: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

const dbHabitLog = (date: string, overrides: Record<string, unknown> = {}) => ({
  id: `log-${date}`,
  habit_id: "habit-1",
  date,
  count: 1,
  notes: null,
  created_at: new Date().toISOString(),
  ...overrides,
})

const baseHabit: Omit<Habit, "id" | "createdAt" | "updatedAt"> = {
  title: "Drink water",
  frequency: "daily",
  targetCount: 1,
  color: "#3b82f6",
}

// Local date key offset by `n` days from today (matches store streak logic).
function dayKey(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return getLocalDateKey(d)
}

describe("Habits Store", () => {
  beforeEach(() => {
    useAppStore.setState({
      habits: [],
      habitLogs: [],
      user: { id: "test-user", name: "Test User", email: "test@example.com", createdAt: new Date().toISOString() },
      isLoggedIn: true,
    })
  })

  describe("addHabit", () => {
    it("adds a habit returned by the database", async () => {
      await mockFrom(chain({ data: dbHabit(), error: null }))
      await useAppStore.getState().addHabit(baseHabit)

      const { habits } = useAppStore.getState()
      expect(habits).toHaveLength(1)
      expect(habits[0]).toMatchObject({ id: "habit-1", title: "Drink water", targetCount: 1 })
    })

    it("requires a logged-in user", async () => {
      useAppStore.setState({ user: null, isLoggedIn: false })
      await expect(useAppStore.getState().addHabit(baseHabit)).rejects.toThrow(/logged in/i)
    })

    it("throws on a database error", async () => {
      await mockFrom(chain({ data: null, error: { message: "insert failed" } }))
      await expect(useAppStore.getState().addHabit(baseHabit)).rejects.toThrow()
    })
  })

  describe("updateHabit", () => {
    it("replaces the habit with the updated row", async () => {
      useAppStore.setState({ habits: [{ ...baseHabit, id: "habit-1", createdAt: "", updatedAt: "" } as Habit] })
      await mockFrom(chain({ data: dbHabit({ title: "Drink 2L water", target_count: 8 }), error: null }))

      await useAppStore.getState().updateHabit("habit-1", { title: "Drink 2L water", targetCount: 8 })

      const habit = useAppStore.getState().habits.find((h) => h.id === "habit-1")
      expect(habit).toMatchObject({ title: "Drink 2L water", targetCount: 8 })
    })
  })

  describe("logHabit", () => {
    it("inserts a new log when none exists for the date", async () => {
      useAppStore.setState({ habits: [{ ...baseHabit, id: "habit-1", createdAt: "", updatedAt: "" } as Habit] })
      const today = dayKey(0)
      await mockFrom(chainLog({ data: null, error: null }, { data: dbHabitLog(today), error: null }))

      await useAppStore.getState().logHabit("habit-1", today)

      const logs = useAppStore.getState().habitLogs
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({ habitId: "habit-1", date: today, count: 1 })
    })

    it("updates the existing log instead of duplicating it", async () => {
      const today = dayKey(0)
      useAppStore.setState({
        habits: [{ ...baseHabit, id: "habit-1", createdAt: "", updatedAt: "" } as Habit],
        habitLogs: [{ id: "log-x", habitId: "habit-1", date: today, count: 1, createdAt: "" } as HabitLog],
      })
      await mockFrom(
        chainLog(
          { data: dbHabitLog(today, { id: "log-x" }), error: null },
          { data: dbHabitLog(today, { id: "log-x", count: 3 }), error: null },
        ),
      )

      await useAppStore.getState().logHabit("habit-1", today, 3)

      const logs = useAppStore.getState().habitLogs.filter((l) => l.date === today)
      expect(logs).toHaveLength(1)
      expect(logs[0].count).toBe(3)
    })
  })

  describe("getHabitStreak", () => {
    it("counts consecutive days ending today", () => {
      useAppStore.setState({
        habitLogs: [
          { id: "1", habitId: "habit-1", date: dayKey(0), count: 1, createdAt: "" },
          { id: "2", habitId: "habit-1", date: dayKey(-1), count: 1, createdAt: "" },
          { id: "3", habitId: "habit-1", date: dayKey(-2), count: 1, createdAt: "" },
        ] as HabitLog[],
      })
      expect(useAppStore.getState().getHabitStreak("habit-1")).toBe(3)
    })

    it("breaks the streak on a gap", () => {
      useAppStore.setState({
        habitLogs: [
          { id: "1", habitId: "habit-1", date: dayKey(0), count: 1, createdAt: "" },
          { id: "3", habitId: "habit-1", date: dayKey(-2), count: 1, createdAt: "" },
        ] as HabitLog[],
      })
      expect(useAppStore.getState().getHabitStreak("habit-1")).toBe(1)
    })

    it("returns 0 with no logs", () => {
      expect(useAppStore.getState().getHabitStreak("habit-1")).toBe(0)
    })
  })

  describe("getHabitStats", () => {
    it("computes totals, completion rate, and longest streak", () => {
      useAppStore.setState({
        habitLogs: [
          { id: "1", habitId: "habit-1", date: dayKey(-3), count: 1, createdAt: "" },
          { id: "2", habitId: "habit-1", date: dayKey(-2), count: 1, createdAt: "" },
          { id: "3", habitId: "habit-1", date: dayKey(-1), count: 0, createdAt: "" },
          { id: "4", habitId: "habit-1", date: dayKey(0), count: 1, createdAt: "" },
        ] as HabitLog[],
      })

      const stats = useAppStore.getState().getHabitStats("habit-1")
      expect(stats.totalDays).toBe(4)
      expect(stats.completedDays).toBe(3)
      expect(stats.longestStreak).toBe(2)
      expect(stats.completionRate).toBe(75)
    })
  })

  describe("deleteHabit", () => {
    it("removes the habit and its logs", async () => {
      useAppStore.setState({
        habits: [{ ...baseHabit, id: "habit-1", createdAt: "", updatedAt: "" } as Habit],
        habitLogs: [{ id: "log-1", habitId: "habit-1", date: dayKey(0), count: 1, createdAt: "" } as HabitLog],
      })
      await mockFrom(chain({ error: null }))

      await useAppStore.getState().deleteHabit("habit-1")

      const state = useAppStore.getState()
      expect(state.habits.find((h) => h.id === "habit-1")).toBeUndefined()
      expect(state.habitLogs.filter((l) => l.habitId === "habit-1")).toHaveLength(0)
    })

    it("throws on a database error", async () => {
      await mockFrom(chain({ error: { message: "delete failed" } }))
      await expect(useAppStore.getState().deleteHabit("habit-1")).rejects.toThrow()
    })
  })
})
