import { describe, it, expect, beforeEach, vi } from "vitest"
import { useAppStore } from "@/lib/store"
import type { Goal } from "@/lib/store"

// Mock Supabase. The chain() helper returns an object that satisfies every
// query-builder method the slices call (insert/update/delete/select/eq/single/
// maybeSingle) and also carries { data, error } so awaiting any terminal point
// (e.g. delete().eq().eq()) destructures correctly.
vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}))

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

async function mockFrom(result: { data?: unknown; error: unknown }) {
  const { supabase } = await import("@/lib/supabase")
  ;(supabase.from as any).mockReturnValue(chain(result))
}

const dbGoal = (overrides: Record<string, unknown> = {}) => ({
  id: "goal-1",
  title: "Ship v1",
  description: null,
  target_date: null,
  progress: 0,
  status: "active",
  category: null,
  milestones: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

const baseGoal: Omit<Goal, "id" | "createdAt" | "updatedAt"> = {
  title: "Ship v1",
  progress: 0,
  status: "active",
  milestones: [],
}

describe("Goals Store", () => {
  beforeEach(() => {
    useAppStore.setState({
      goals: [],
      user: { id: "test-user", name: "Test User", email: "test@example.com", createdAt: new Date().toISOString() },
      isLoggedIn: true,
    })
  })

  describe("addGoal", () => {
    it("adds a goal returned by the database", async () => {
      await mockFrom({ data: dbGoal(), error: null })
      await useAppStore.getState().addGoal(baseGoal)

      const { goals } = useAppStore.getState()
      expect(goals).toHaveLength(1)
      expect(goals[0]).toMatchObject({ id: "goal-1", title: "Ship v1", status: "active", progress: 0 })
    })

    it("requires a logged-in user", async () => {
      useAppStore.setState({ user: null, isLoggedIn: false })
      await expect(useAppStore.getState().addGoal(baseGoal)).rejects.toThrow(/logged in/i)
    })

    it("throws on a database error", async () => {
      await mockFrom({ data: null, error: { message: "insert failed" } })
      await expect(useAppStore.getState().addGoal(baseGoal)).rejects.toThrow()
      expect(useAppStore.getState().goals).toHaveLength(0)
    })
  })

  describe("updateGoal", () => {
    it("replaces the goal in state with the updated row", async () => {
      useAppStore.setState({ goals: [{ ...baseGoal, id: "goal-1", createdAt: "", updatedAt: "" } as Goal] })
      await mockFrom({ data: dbGoal({ title: "Ship v2", progress: 40 }), error: null })

      await useAppStore.getState().updateGoal("goal-1", { title: "Ship v2", progress: 40 })

      const goal = useAppStore.getState().goals.find((g) => g.id === "goal-1")
      expect(goal).toMatchObject({ title: "Ship v2", progress: 40 })
    })

    it("throws on a database error", async () => {
      await mockFrom({ data: null, error: { message: "update failed" } })
      await expect(useAppStore.getState().updateGoal("goal-1", { progress: 10 })).rejects.toThrow()
    })
  })

  describe("updateGoalProgress", () => {
    it("clamps progress to the 0-100 range", async () => {
      useAppStore.setState({ goals: [{ ...baseGoal, id: "goal-1", createdAt: "", updatedAt: "" } as Goal] })

      await mockFrom({ data: dbGoal({ progress: 100 }), error: null })
      await useAppStore.getState().updateGoalProgress("goal-1", 250)
      expect(useAppStore.getState().goals[0].progress).toBe(100)

      await mockFrom({ data: dbGoal({ progress: 0 }), error: null })
      await useAppStore.getState().updateGoalProgress("goal-1", -50)
      expect(useAppStore.getState().goals[0].progress).toBe(0)
    })
  })

  describe("milestones", () => {
    it("adds a milestone to an existing goal", async () => {
      useAppStore.setState({ goals: [{ ...baseGoal, id: "goal-1", createdAt: "", updatedAt: "" } as Goal] })
      await mockFrom({
        data: dbGoal({ milestones: [{ id: "m1", title: "Design", completed: false }] }),
        error: null,
      })

      await useAppStore.getState().addMilestone("goal-1", { title: "Design" })

      const goal = useAppStore.getState().goals.find((g) => g.id === "goal-1")
      expect(goal?.milestones).toHaveLength(1)
      expect(goal?.milestones[0]).toMatchObject({ title: "Design", completed: false })
    })

    it("throws when adding a milestone to a missing goal", async () => {
      await expect(useAppStore.getState().addMilestone("nope", { title: "X" })).rejects.toThrow(/not found/i)
    })

    it("marks a milestone complete", async () => {
      useAppStore.setState({
        goals: [
          {
            ...baseGoal,
            id: "goal-1",
            createdAt: "",
            updatedAt: "",
            milestones: [{ id: "m1", title: "Design", completed: false }],
          } as Goal,
        ],
      })
      await mockFrom({
        data: dbGoal({ milestones: [{ id: "m1", title: "Design", completed: true }] }),
        error: null,
      })

      await useAppStore.getState().completeMilestone("goal-1", "m1")

      const goal = useAppStore.getState().goals.find((g) => g.id === "goal-1")
      expect(goal?.milestones[0].completed).toBe(true)
    })
  })

  describe("deleteGoal", () => {
    it("removes the goal from state", async () => {
      useAppStore.setState({ goals: [{ ...baseGoal, id: "goal-1", createdAt: "", updatedAt: "" } as Goal] })
      await mockFrom({ error: null })

      await useAppStore.getState().deleteGoal("goal-1")
      expect(useAppStore.getState().goals.find((g) => g.id === "goal-1")).toBeUndefined()
    })

    it("throws on a database error", async () => {
      await mockFrom({ error: { message: "delete failed" } })
      await expect(useAppStore.getState().deleteGoal("goal-1")).rejects.toThrow()
    })
  })
})
