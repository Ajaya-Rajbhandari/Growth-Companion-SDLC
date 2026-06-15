import type { StateCreator } from "zustand"
import { supabase } from "../supabase"
import { parseLocalDateKey } from "../utils"
import {
  mapHabitFromDb,
  mapHabitLogFromDb,
  throwSupabaseError,
  type DbHabit,
  type DbHabitLog,
} from "../mappers"
import { trackEvent } from "../analytics"
import type { Habit, HabitLog } from "../types"
import type { AppState } from "./index"

export interface HabitsSlice {
  habits: Habit[] // Habits for habit tracking
  habitLogs: HabitLog[] // Habit logs for tracking habit completion

  addHabit: (habit: Omit<Habit, "id" | "createdAt" | "updatedAt">) => Promise<void>
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
  logHabit: (habitId: string, date: string, count?: number, notes?: string) => Promise<void>
  getHabitStreak: (habitId: string) => number
  getHabitStats: (habitId: string) => {
    totalDays: number
    completedDays: number
    currentStreak: number
    longestStreak: number
    completionRate: number
  }
}

export const createHabitsSlice: StateCreator<
  AppState,
  [["zustand/persist", unknown]],
  [],
  HabitsSlice
> = (set, get) => ({
  habits: [], // Initialize habits
  habitLogs: [], // Initialize habit logs

  addHabit: async (habit: Omit<Habit, "id" | "createdAt" | "updatedAt">) => {
    const { user } = get()
    if (!user) throw new Error("Must be logged in to add habit")

    const { data, error } = await supabase
      .from("habits")
      .insert({
        title: habit.title,
        description: habit.description || null,
        frequency: habit.frequency,
        target_count: habit.targetCount,
        color: habit.color,
        icon: habit.icon || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) throwSupabaseError(error, "Failed to add habit")
    if (data) {
      const newHabit = mapHabitFromDb(data as DbHabit)
      set((state) => ({
        habits: [newHabit, ...state.habits],
      }))
      trackEvent("habit_created", user.id, { frequency: habit.frequency })
    }
  },

  updateHabit: async (id: string, updates: Partial<Habit>) => {
    const { user } = get()
    if (!user) throw new Error("Must be logged in to update habit")

    const updateData: any = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description || null
    if (updates.frequency !== undefined) updateData.frequency = updates.frequency
    if (updates.targetCount !== undefined) updateData.target_count = updates.targetCount
    if (updates.color !== undefined) updateData.color = updates.color
    if (updates.icon !== undefined) updateData.icon = updates.icon || null
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("habits")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) throwSupabaseError(error, "Failed to update habit")
    if (data) {
      const updatedHabit = mapHabitFromDb(data as DbHabit)
      set((state) => ({
        habits: state.habits.map((h) => (h.id === id ? updatedHabit : h)),
      }))
    }
  },

  deleteHabit: async (id: string) => {
    const { user } = get()
    if (!user) throw new Error("Must be logged in to delete habit")

    const { error } = await supabase
      .from("habits")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) throwSupabaseError(error, "Failed to delete habit")
    set((state) => ({
      habits: state.habits.filter((h) => h.id !== id),
      habitLogs: state.habitLogs.filter((log) => log.habitId !== id),
    }))
  },

  logHabit: async (habitId: string, date: string, count?: number, notes?: string) => {
    const { user } = get()
    if (!user) throw new Error("Must be logged in to log habit")

    // Check if log already exists
    const { data: existingLog, error: checkError } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("habit_id", habitId)
      .eq("date", date)
      .eq("user_id", user.id)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is fine
      throwSupabaseError(checkError, "Failed to check habit log")
    }

    const result = existingLog
      ? await supabase
          .from("habit_logs")
          .update({
            count: count ?? existingLog.count,
            notes: notes !== undefined ? notes : existingLog.notes,
          })
          .eq("habit_id", habitId)
          .eq("date", date)
          .eq("user_id", user.id)
          .select()
          .single()
      : await supabase
          .from("habit_logs")
          .insert({
            habit_id: habitId,
            user_id: user.id,
            date,
            count: count || 1,
            notes: notes || null,
          })
          .select()
          .single()

    const data = result.data as DbHabitLog | null
    const error = result.error

    if (error) throwSupabaseError(error, "Failed to log habit")

    if (data) {
      const newLog = mapHabitLogFromDb(data)
      set((state) => {
        const existingIndex = state.habitLogs.findIndex(
          (log) => log.habitId === habitId && log.date === date
        )
        if (existingIndex >= 0) {
          const updatedLogs = [...state.habitLogs]
          updatedLogs[existingIndex] = newLog
          return { habitLogs: updatedLogs }
        }
        return { habitLogs: [newLog, ...state.habitLogs] }
      })
    }
  },

  getHabitStreak: (habitId: string) => {
    const { habitLogs } = get()
    const habitLogsForHabit = habitLogs
      .filter((log) => log.habitId === habitId)
      .sort((a, b) => b.date.localeCompare(a.date))

    if (habitLogsForHabit.length === 0) return 0

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < habitLogsForHabit.length; i++) {
      const logDate = parseLocalDateKey(habitLogsForHabit[i].date)
      logDate.setHours(0, 0, 0, 0)

      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)

      if (logDate.getTime() === expectedDate.getTime() && habitLogsForHabit[i].count > 0) {
        streak++
      } else {
        break
      }
    }

    return streak
  },

  getHabitStats: (habitId: string) => {
    const { habitLogs, getHabitStreak } = get()
    const habitLogsForHabit = habitLogs
      .filter((log) => log.habitId === habitId)
      .sort((a, b) => a.date.localeCompare(b.date))

    const currentStreak = getHabitStreak(habitId)

    // Calculate longest streak
    let longestStreak = 0
    let currentRun = 0
    const sortedLogs = [...habitLogsForHabit].sort((a, b) => a.date.localeCompare(b.date))

    for (let i = 0; i < sortedLogs.length; i++) {
      if (sortedLogs[i].count > 0) {
        currentRun++
        longestStreak = Math.max(longestStreak, currentRun)
      } else {
        currentRun = 0
      }
    }

    // Calculate total days and completed days
    const totalDays = habitLogsForHabit.length
    const completedDays = habitLogsForHabit.filter((log) => log.count > 0).length

    return {
      totalDays,
      completedDays,
      currentStreak,
      longestStreak,
      completionRate: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
    }
  },
})
