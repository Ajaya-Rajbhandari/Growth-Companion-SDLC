import type { StateCreator } from "zustand"
import { supabase } from "../supabase"
import { mapGoalFromDb, throwSupabaseError, type DbGoal } from "../mappers"
import type { Goal, Milestone } from "../types"
import type { AppState } from "./index"

export interface GoalsSlice {
  goals: Goal[] // Goals for goal setting feature

  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "updatedAt">) => Promise<void>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  updateGoalProgress: (id: string, progress: number) => Promise<void>
  addMilestone: (goalId: string, milestone: Omit<Milestone, "id" | "completed">) => Promise<void>
  completeMilestone: (goalId: string, milestoneId: string) => Promise<void>
}

export const createGoalsSlice: StateCreator<
  AppState,
  [["zustand/persist", unknown]],
  [],
  GoalsSlice
> = (set, get) => ({
  goals: [], // Initialize goals

  addGoal: async (goal: Omit<Goal, "id" | "createdAt" | "updatedAt">) => {
    const { user } = get()
    if (!user) throw new Error("Must be logged in to add goal")

    const { data, error } = await supabase
      .from("goals")
      .insert({
        title: goal.title,
        description: goal.description || null,
        target_date: goal.targetDate || null,
        progress: goal.progress,
        status: goal.status,
        category: goal.category || null,
        milestones: goal.milestones || [],
        user_id: user.id,
      })
      .select()
      .single()

    if (error) throwSupabaseError(error, "Failed to add goal")
    if (data) {
      const newGoal = mapGoalFromDb(data as DbGoal)
      set((state) => ({
        goals: [newGoal, ...state.goals],
      }))
    }
  },

  updateGoal: async (id: string, updates: Partial<Goal>) => {
    const { user } = get()
    if (!user) throw new Error("Must be logged in to update goal")

    const updateData: any = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description || null
    if (updates.targetDate !== undefined) updateData.target_date = updates.targetDate || null
    if (updates.progress !== undefined) updateData.progress = updates.progress
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.category !== undefined) updateData.category = updates.category || null
    if (updates.milestones !== undefined) updateData.milestones = updates.milestones
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("goals")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) throwSupabaseError(error, "Failed to update goal")
    if (data) {
      const updatedGoal = mapGoalFromDb(data as DbGoal)
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? updatedGoal : g)),
      }))
    }
  },

  deleteGoal: async (id: string) => {
    const { user } = get()
    if (!user) throw new Error("Must be logged in to delete goal")

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) throwSupabaseError(error, "Failed to delete goal")
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    }))
  },

  updateGoalProgress: async (id: string, progress: number) => {
    await get().updateGoal(id, { progress: Math.max(0, Math.min(100, progress)) })
  },

  addMilestone: async (goalId: string, milestone: Omit<Milestone, "id" | "completed">) => {
    const { goals } = get()
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) throw new Error("Goal not found")

    const newMilestone: Milestone = {
      id: crypto.randomUUID(),
      ...milestone,
      completed: false,
    }

    const updatedMilestones = [...goal.milestones, newMilestone]
    await get().updateGoal(goalId, { milestones: updatedMilestones })
  },

  completeMilestone: async (goalId: string, milestoneId: string) => {
    const { goals } = get()
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) throw new Error("Goal not found")

    const updatedMilestones = goal.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: true } : m
    )
    await get().updateGoal(goalId, { milestones: updatedMilestones })
  },
})
