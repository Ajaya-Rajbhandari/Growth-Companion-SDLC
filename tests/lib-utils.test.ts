import { describe, expect, it } from "vitest"
import { cn, summarizeHabitProgress } from "../lib/utils"
import type { Habit, HabitLog } from "../lib/types"

describe("cn", () => {
  it("merges conditional class names", () => {
    const value = cn("base", false && "hidden", "active")
    expect(value).toBe("base active")
  })

  it("deduplicates tailwind classes", () => {
    const value = cn("px-2", "px-4")
    expect(value).toBe("px-4")
  })
})

describe("summarizeHabitProgress", () => {
  const habit = (id: string, targetCount: number): Habit => ({
    id,
    title: `Habit ${id}`,
    frequency: "daily",
    targetCount,
    color: "#000",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  })

  const log = (habitId: string, date: string, count: number): HabitLog => ({
    id: `${habitId}-${date}-${count}`,
    habitId,
    date,
    count,
    createdAt: "2026-01-01T00:00:00.000Z",
  })

  it("treats a habit as complete only once the count reaches its target", () => {
    const habits = [habit("a", 3), habit("b", 1)]
    const logs = [log("a", "2026-01-01", 1), log("b", "2026-01-01", 1)]

    const progress = summarizeHabitProgress(habits, logs, "2026-01-01")

    expect(progress[0]).toMatchObject({ count: 1, target: 3, isCompleted: false })
    expect(progress[1]).toMatchObject({ count: 1, target: 1, isCompleted: true })
  })

  it("sums multiple logs for the same habit and day", () => {
    const progress = summarizeHabitProgress(
      [habit("a", 3)],
      [log("a", "2026-01-01", 2), log("a", "2026-01-01", 1)],
      "2026-01-01",
    )

    expect(progress[0]).toMatchObject({ count: 3, isCompleted: true })
  })

  it("ignores logs from other days and zero-count logs", () => {
    const progress = summarizeHabitProgress(
      [habit("a", 1)],
      [log("a", "2025-12-31", 5), log("a", "2026-01-01", 0)],
      "2026-01-01",
    )

    expect(progress[0]).toMatchObject({ count: 0, isCompleted: false })
  })

  it("treats a missing or zero target as a target of one", () => {
    const progress = summarizeHabitProgress(
      [habit("a", 0)],
      [log("a", "2026-01-01", 1)],
      "2026-01-01",
    )

    expect(progress[0]).toMatchObject({ target: 1, isCompleted: true })
  })
})
