import type { StateCreator } from "zustand"
import { supabase } from "../supabase"
import { getLocalDateKey } from "../utils"
import { mapTaskFromDb, throwSupabaseError, type DbTask } from "../mappers"
import type { Task } from "../types"
import type { AppState } from "./index"

export interface TasksSlice {
  tasks: Task[]

  addTask: (task: Omit<Task, "id" | "createdAt">) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  toggleTask: (id: string, completed: boolean) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  getTasksSummary: () => { total: number; completed: number; pending: number; highPriority: number }
}

export const createTasksSlice: StateCreator<
  AppState,
  [["zustand/persist", unknown]],
  [],
  TasksSlice
> = (set, get) => ({
  tasks: [
    {
      id: "1",
      title: "Review project requirements",
      completed: false,
      priority: "high",
      dueDate: getLocalDateKey(),
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "Schedule team meeting",
      completed: true,
      priority: "medium",
      createdAt: new Date().toISOString(),
    },
    {
      id: "3",
      title: "Update documentation",
      completed: false,
      priority: "low",
      createdAt: new Date().toISOString(),
    },
  ],

  addTask: async (task) => {
    const { user } = get()
    if (!user) return

    const { data, error } = await supabase.from("tasks").insert({
      title: task.title,
      completed: task.completed,
      priority: task.priority,
      urgency: task.urgency || 'medium',
      due_date: task.dueDate || null,
      user_id: user.id,
    }).select().single()

    if (error) {
      const errorMessage = error.message || JSON.stringify(error)
      throw new Error(`Failed to create task: ${errorMessage}`)
    }
    if (data) {
      set((state) => ({
        tasks: [mapTaskFromDb(data as DbTask), ...state.tasks],
      }))
    }
  },
  toggleTask: async (id, completed) => {
    const { error } = await supabase.from("tasks").update({ completed }).eq("id", id)
    if (error) throwSupabaseError(error, "Failed to update task")
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed } : t)),
    }))
  },
  updateTask: async (id: string, updates: Partial<Task>) => {
    const { user } = get()
    if (!user) throw new Error("Must be logged in to update task")

    const updateData: any = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.completed !== undefined) updateData.completed = updates.completed
    if (updates.priority !== undefined) updateData.priority = updates.priority
    if (updates.urgency !== undefined) updateData.urgency = updates.urgency
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate || null

    const { data, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) throwSupabaseError(error, "Failed to update task")
    if (data) {
      const updatedTask = mapTaskFromDb(data as DbTask)
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
      }))
    }
  },
  deleteTask: async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id)
    if (error) throwSupabaseError(error, "Failed to delete task")
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }))
  },

  getTasksSummary: () => {
    const state = get()
    const completed = state.tasks.filter((t) => t.completed).length
    const pending = state.tasks.filter((t) => !t.completed).length
    const highPriority = state.tasks.filter((t) => t.priority === "high" && !t.completed).length
    return {
      total: state.tasks.length,
      completed,
      pending,
      highPriority,
    }
  },
})
