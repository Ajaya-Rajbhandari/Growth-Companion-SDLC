import type { StateCreator } from "zustand"
import { supabase } from "../supabase"
import { getLocalDateKey } from "../utils"
import {
  mapTimeCategoryFromDb,
  mapTimeEntryFromDb,
  mapWorkTemplateFromDb,
  throwSupabaseError,
  type DbTimeCategory,
  type DbTimeEntry,
  type DbWorkTemplate,
} from "../mappers"
import { trackEvent } from "../analytics"
import type { BreakPeriod, TimeCategory, TimeEntry, WorkTemplate } from "../types"
import type { AppState } from "./index"

export interface TimesheetSlice {
  timeEntries: TimeEntry[]
  currentEntry: TimeEntry | null
  activeBreak: BreakPeriod | null
  workTemplates: WorkTemplate[] // Added templates array
  timeCategories: TimeCategory[] // Time tracking categories
  officeHours: number // Maximum office hours per day (default: 9)
  graceMinutes: number // Optional daily grace minutes (0,10,15)
  allowOverworkMinutes: number // Max overwork minutes user can request (0-60)
  overworkMinutesRequested: number // User opt-in overwork minutes for today (0-60)

  clockIn: (title?: string, category?: string) => Promise<void>
  clockOut: () => Promise<void>
  startBreak: (durationMinutes?: number, breakType?: "short" | "lunch" | "custom" | "fixed", title?: string) => void
  endBreak: () => Promise<void>
  addBreakTime: (minutes: number) => Promise<void>
  updateEntryNotes: (id: string, notes: string) => Promise<void>
  updateBreakTitle: (entryId: string, breakId: string, title: string) => Promise<void>
  deleteTimeEntry: (id: string) => Promise<void>
  getTimesheetStatus: () => {
    isWorking: boolean
    isOnBreak: boolean
    currentSessionStart?: string
    currentBreakStart?: string
    elapsedMinutes?: number
    breakMinutes?: number
    todayHours: number
    weeklyHours: number
  }
  getTodayTimeEntries: () => TimeEntry[]
  calculateTotalHours: (entries: TimeEntry[]) => number
  addWorkTemplate: (template: Omit<WorkTemplate, "id" | "usageCount" | "createdAt">) => Promise<void>
  deleteWorkTemplate: (id: string) => Promise<void>
  updateWorkTemplate: (id: string, updates: Partial<WorkTemplate>) => Promise<void>
  getTopTemplates: () => WorkTemplate[]
  updateCurrentEntryTitle: (title: string) => void // add method to update current task title
  switchTask: (newTitle: string, category?: string) => Promise<void>
  setOfficeHours: (hours: number) => void
  setGraceMinutes: (minutes: number) => void
  setAllowOverworkMinutes: (minutes: number) => void
  setOverworkMinutesRequested: (minutes: number) => void
  resetOverworkForToday: () => void
  getTodayWorkStats: () => {
    todayMinutes: number
    weeklyMinutes: number
    remainingMinutes: number
    baseLimitMinutes: number
    appliedLimitMinutes: number
    status: "normal" | "warning" | "grace" | "overwork" | "hardCap"
    warningThresholdMinutes: number
    secondaryWarningMinutes: number
    overtimeBadge: boolean
    weeklyCatchUpMinutes: number
  }
  addTimeCategory: (category: Omit<TimeCategory, "id" | "createdAt">) => Promise<void>
  updateTimeCategory: (id: string, updates: Partial<TimeCategory>) => Promise<void>
  deleteTimeCategory: (id: string) => Promise<void>
}

export const createTimesheetSlice: StateCreator<
  AppState,
  [["zustand/persist", unknown]],
  [],
  TimesheetSlice
> = (set, get) => ({
  timeEntries: [],
  currentEntry: null,
  activeBreak: null,
  workTemplates: [], // Initialize templates
  timeCategories: [], // Initialize time categories
  officeHours: 9, // Default office hours per day
  graceMinutes: 0,
  allowOverworkMinutes: 60,
  overworkMinutesRequested: 0,

  clockIn: async (title?: string, category?: string) => {
    const { user } = get()
    if (!user) return
    // reset per-day overwork when starting a new session
    set({ overworkMinutesRequested: 0 })
    const { currentEntry, timeEntries, officeHours, graceMinutes, overworkMinutesRequested, allowOverworkMinutes } = get()

    // Validation 1: Check if there's an active session
    if (currentEntry) {
      throw new Error("You already have an active work session. Please clock out first.")
    }

    // Validation 2: Check if user has already clocked in today (even if clocked out)
    // Check both in-memory state AND database to ensure accuracy
    const todayStr = getLocalDateKey()
    const todayEntries = timeEntries.filter((e) => e.date === todayStr)

    // Also check database directly to avoid race conditions.
    const timeEntriesTable = supabase.from("time_entries")
    let dbTodayEntries: Array<{ id: string; date: string }> | null = null
    if (typeof (timeEntriesTable as { select?: unknown }).select === "function") {
      const { data } = await timeEntriesTable
        .select("id, date")
        .eq("user_id", user.id)
        .eq("date", todayStr)
      dbTodayEntries = data || null
    }

    const hasTodayEntry = (todayEntries.length > 0) || (dbTodayEntries && dbTodayEntries.length > 0)
    if (hasTodayEntry) {
      throw new Error("You can only clock in once per day. You have already clocked in today.")
    }

    // Validation 3: Check office hours + grace/overwork limit
    const completedMs = todayEntries.reduce((total, entry) => {
      if (entry.clockOut) {
        const start = new Date(entry.clockIn).getTime()
        const end = new Date(entry.clockOut).getTime()
        const diffMs = Math.max(0, end - start - entry.breakMinutes * 60 * 1000)
        return total + diffMs
      }
      return total
    }, 0)

    const baseLimitMs = officeHours * 60 * 60 * 1000
    const graceMs = (graceMinutes || 0) * 60 * 1000
    const requestedOverworkMs = Math.min(overworkMinutesRequested, allowOverworkMinutes) * 60 * 1000
    const appliedLimitMs = baseLimitMs + graceMs + requestedOverworkMs

    if (completedMs >= appliedLimitMs) {
      throw new Error("You have reached your daily limit and cannot clock in today.")
    }

    const now = new Date()
    const entry = {
      date: todayStr,
      clock_in: now.toISOString(),
      break_minutes: 0,
      breaks: [] as BreakPeriod[],
      title: title || null,
      category: category || null,
    }

    const { data, error } = await timeEntriesTable.insert({
      ...entry,
      user_id: user.id,
    }).select().single()

    if (error) {
      const errorMessage = error.message || JSON.stringify(error)
      throw new Error(`Failed to clock in: ${errorMessage}`)
    }
    if (data) {
      const newEntry = mapTimeEntryFromDb(data as DbTimeEntry)
      // Add to timeEntries array so it appears in history immediately
      set((state) => ({
        currentEntry: newEntry,
        timeEntries: [newEntry, ...state.timeEntries],
      }))
      trackEvent("clock_in", user.id, { hasTitle: !!title, hasCategory: !!category })
    }
  },
  clockOut: async () => {
    const { currentEntry, activeBreak, user } = get()
    if (currentEntry && user) {
      const finalBreaks = [...(currentEntry.breaks || [])]
      let totalBreakMinutes = currentEntry.breakMinutes || 0

      if (activeBreak) {
        const endTime = new Date()
        const startTime = new Date(activeBreak.startTime)
        const breakDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
        finalBreaks.push({
          ...activeBreak,
          endTime: endTime.toISOString(),
          type: activeBreak.type || "lunch"
        })
        totalBreakMinutes += breakDuration
      }

      const { error } = await supabase.from("time_entries").update({
        clock_out: new Date().toISOString(),
        break_minutes: totalBreakMinutes,
        breaks: finalBreaks,
      }).eq("id", currentEntry.id)

      if (error) {
        const errorMessage = error.message || JSON.stringify(error)
        throw new Error(`Failed to clock out: ${errorMessage}`)
      }

      await get().fetchInitialData() // Refresh to get the complete entry in history
      set({
        currentEntry: null,
        activeBreak: null,
      })
      const workedMinutes = Math.max(
        0,
        Math.round((Date.now() - new Date(currentEntry.clockIn).getTime()) / 60000) - totalBreakMinutes,
      )
      trackEvent("clock_out", user.id, {
        workedMinutes,
        breakMinutes: totalBreakMinutes,
        taskCount: (currentEntry.subtasks?.length || 0) + 1,
      })
    }
  },
  startBreak: (durationMinutes?: number, breakType?: "short" | "lunch" | "custom" | "fixed", title?: string) => {
    const { currentEntry } = get()
    if (currentEntry) {
      const resolvedType = breakType === "fixed" ? "short" : breakType || "custom"
      const newBreak: BreakPeriod = {
        id: crypto.randomUUID(),
        startTime: new Date().toISOString(),
        durationMinutes,
        type: resolvedType,
        title: title?.trim() || undefined,
      }
      set({ activeBreak: newBreak })
    }
  },
  endBreak: async () => {
    const { currentEntry, activeBreak, user } = get()
    if (!currentEntry || !activeBreak || !user) {
      return
    }

    const endTime = new Date()
    const startTime = new Date(activeBreak.startTime)
    const breakDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

    const completedBreak: BreakPeriod = {
      ...activeBreak,
      endTime: endTime.toISOString(),
    }

    const updatedBreakMinutes = (currentEntry.breakMinutes || 0) + breakDuration
    const updatedBreaks = [...(currentEntry.breaks || []), completedBreak]

    // Update the database immediately
    const { data, error } = await supabase
      .from("time_entries")
      .update({
        break_minutes: updatedBreakMinutes,
        breaks: updatedBreaks,
      })
      .eq("id", currentEntry.id)
      .select()
      .single()

    if (error) {
      const errorMessage = error.message || JSON.stringify(error)
      throw new Error(`Failed to end break: ${errorMessage}`)
    }

    if (data) {
      const updatedEntry = mapTimeEntryFromDb(data as DbTimeEntry)

      // Update both currentEntry and timeEntries
      set((state) => {
        const updatedTimeEntries = state.timeEntries.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry
        )

        // If entry doesn't exist in timeEntries yet, add it
        const entryExists = updatedTimeEntries.some((e) => e.id === updatedEntry.id)
        const finalTimeEntries = entryExists
          ? updatedTimeEntries
          : [updatedEntry, ...state.timeEntries]

        return {
          currentEntry: updatedEntry,
          timeEntries: finalTimeEntries,
          activeBreak: null,
        }
      })
    }
  },
  addBreakTime: async (minutes) => {
    const { currentEntry, user } = get()
    if (!currentEntry || !user) {
      throw new Error("Must be clocked in to add break time")
    }

    // Add a completed break period for manual entry
    const now = new Date()
    const startTime = new Date(now.getTime() - minutes * 60 * 1000)
    const manualBreak: BreakPeriod = {
      id: crypto.randomUUID(),
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      type: "custom"
    }

    const updatedBreakMinutes = (currentEntry.breakMinutes || 0) + minutes
    const updatedBreaks = [...(currentEntry.breaks || []), manualBreak]

    // Update the database immediately
    const { data, error } = await supabase
      .from("time_entries")
      .update({
        break_minutes: updatedBreakMinutes,
        breaks: updatedBreaks,
      })
      .eq("id", currentEntry.id)
      .select()
      .single()

    if (error) {
      const errorMessage = error.message || JSON.stringify(error)
      throw new Error(`Failed to add break time: ${errorMessage}`)
    }

    if (data) {
      const updatedEntry = mapTimeEntryFromDb(data as DbTimeEntry)

      // Update both currentEntry and timeEntries
      set((state) => {
        const updatedTimeEntries = state.timeEntries.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry
        )

        // If entry doesn't exist in timeEntries yet, add it
        const entryExists = updatedTimeEntries.some((e) => e.id === updatedEntry.id)
        const finalTimeEntries = entryExists
          ? updatedTimeEntries
          : [updatedEntry, ...state.timeEntries]

        return {
          currentEntry: updatedEntry,
          timeEntries: finalTimeEntries,
        }
      })
    }
  },
  updateEntryNotes: async (id, notes) => {
    const { error } = await supabase.from("time_entries").update({ notes }).eq("id", id)
    if (error) throw error
    set((state) => ({
      timeEntries: state.timeEntries.map((e) => (e.id === id ? { ...e, notes } : e)),
    }))
  },
  updateBreakTitle: async (entryId, breakId, title) => {
    const { currentEntry, timeEntries } = get()
    const entry = currentEntry?.id === entryId ? currentEntry : timeEntries.find((e) => e.id === entryId)

    if (!entry) {
      throw new Error("Time entry not found")
    }

    const updatedBreaks = (entry.breaks || []).map((brk) =>
      brk.id === breakId ? { ...brk, title: title.trim() || undefined } : brk
    )

    const { data, error } = await supabase
      .from("time_entries")
      .update({ breaks: updatedBreaks })
      .eq("id", entryId)
      .select()
      .single()

    if (error) {
      const errorMessage = error.message || JSON.stringify(error)
      throw new Error(`Failed to update break title: ${errorMessage}`)
    }

    if (data) {
      const updatedEntry = mapTimeEntryFromDb(data as DbTimeEntry)

      // Update both currentEntry and timeEntries
      set((state) => {
        const updatedTimeEntries = state.timeEntries.map((e) =>
          e.id === entryId ? updatedEntry : e
        )

        return {
          currentEntry: currentEntry?.id === entryId ? updatedEntry : state.currentEntry,
          timeEntries: updatedTimeEntries,
        }
      })
    }
  },
  deleteTimeEntry: async (id) => {
    const { currentEntry } = get()
    const { error } = await supabase.from("time_entries").delete().eq("id", id)
    if (error) throw error
    set((state) => ({
      timeEntries: state.timeEntries.filter((e) => e.id !== id),
      currentEntry: state.currentEntry?.id === id ? null : state.currentEntry,
      activeBreak: currentEntry?.id === id ? null : state.activeBreak,
    }))
  },
  getTimesheetStatus: () => {
    const state = get()
    const today = new Date()
    const todayStr = getLocalDateKey(today)

    // Calculate today's completed hours only. The active/current entry is added below
    // so it is not double-counted when currentEntry is also present in timeEntries.
    const todayEntries = state.timeEntries.filter((e) => e.date === todayStr)
    let todayHours = todayEntries.reduce((total, entry) => {
      if (entry.clockOut) {
        const start = new Date(entry.clockIn).getTime()
        const end = new Date(entry.clockOut).getTime()
        const diffMs = Math.max(0, end - start - entry.breakMinutes * 60 * 1000)
        return total + diffMs / (1000 * 60 * 60)
      }
      return total
    }, 0)

    // Add current session if working
    if (state.currentEntry && !state.activeBreak) {
      const start = new Date(state.currentEntry.clockIn).getTime()
      const now = Date.now()
      const breakMs = state.currentEntry.breakMinutes * 60 * 1000
      const diffMs = Math.max(0, now - start - breakMs)
      todayHours += diffMs / (1000 * 60 * 60)
    }

    // Calculate weekly hours
    const dayOfWeek = today.getDay()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartKey = getLocalDateKey(weekStart)

    const weekEntries = state.timeEntries.filter((e) => e.date >= weekStartKey)
    let weeklyHours = weekEntries.reduce((total, entry) => {
      if (entry.clockOut) {
        const start = new Date(entry.clockIn).getTime()
        const end = new Date(entry.clockOut).getTime()
        const diffMs = Math.max(0, end - start - entry.breakMinutes * 60 * 1000)
        return total + diffMs / (1000 * 60 * 60)
      }
      return total
    }, 0)

    if (state.currentEntry && !state.activeBreak) {
      const start = new Date(state.currentEntry.clockIn).getTime()
      const now = Date.now()
      const breakMs = state.currentEntry.breakMinutes * 60 * 1000
      const diffMs = Math.max(0, now - start - breakMs)
      weeklyHours += diffMs / (1000 * 60 * 60)
    }

    let elapsedMinutes: number | undefined
    if (state.currentEntry) {
      const start = new Date(state.currentEntry.clockIn).getTime()
      const now = Date.now()
      const breakMs = state.currentEntry.breakMinutes * 60 * 1000
      elapsedMinutes = Math.floor(Math.max(0, now - start - breakMs) / (1000 * 60))
    }

    return {
      isWorking: !!state.currentEntry,
      isOnBreak: !!state.activeBreak,
      currentSessionStart: state.currentEntry?.clockIn,
      currentBreakStart: state.activeBreak?.startTime,
      elapsedMinutes,
      breakMinutes: state.currentEntry?.breakMinutes,
      todayHours: Math.round(todayHours * 100) / 100,
      weeklyHours: Math.round(weeklyHours * 100) / 100,
    }
  },

  getTodayWorkStats: () => {
    const state = get()
    const today = new Date()
    const todayStr = getLocalDateKey(today)

    const todayEntries = state.timeEntries.filter((e) => e.date === todayStr)
    let todayMinutes = todayEntries.reduce((total, entry) => {
      if (entry.clockOut) {
        const start = new Date(entry.clockIn).getTime()
        const end = new Date(entry.clockOut).getTime()
        const diffMs = Math.max(0, end - start - entry.breakMinutes * 60 * 1000)
        return total + diffMs / (1000 * 60)
      }
      return total
    }, 0)

    if (state.currentEntry && !state.activeBreak) {
      const start = new Date(state.currentEntry.clockIn).getTime()
      const now = Date.now()
      const breakMs = state.currentEntry.breakMinutes * 60 * 1000
      const diffMs = Math.max(0, now - start - breakMs)
      todayMinutes += diffMs / (1000 * 60)
    }

    // Weekly totals
    const dayOfWeek = today.getDay()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartKey = getLocalDateKey(weekStart)
    const weekEntries = state.timeEntries.filter((e) => e.date >= weekStartKey)
    let weeklyMinutes = weekEntries.reduce((total, entry) => {
      if (entry.clockOut) {
        const start = new Date(entry.clockIn).getTime()
        const end = new Date(entry.clockOut).getTime()
        const diffMs = Math.max(0, end - start - entry.breakMinutes * 60 * 1000)
        return total + diffMs / (1000 * 60)
      }
      return total
    }, 0)
    if (state.currentEntry && !state.activeBreak && state.currentEntry.date >= weekStartKey) {
      const start = new Date(state.currentEntry.clockIn).getTime()
      const now = Date.now()
      const breakMs = state.currentEntry.breakMinutes * 60 * 1000
      const diffMs = Math.max(0, now - start - breakMs)
      weeklyMinutes += diffMs / (1000 * 60)
    }

    const baseLimitMinutes = (state.officeHours || 9) * 60
    const warningThresholdMinutes = Math.max(0, baseLimitMinutes - 60) // 1 hour before
    const secondaryWarningMinutes = Math.max(0, baseLimitMinutes - 30) // 30 minutes before
    const graceMinutes = state.graceMinutes || 0
    const overworkMinutes = Math.min(state.overworkMinutesRequested, state.allowOverworkMinutes)
    const appliedLimitMinutes = baseLimitMinutes + graceMinutes + overworkMinutes
    const remainingMinutes = Math.max(0, appliedLimitMinutes - todayMinutes)

    let status: "normal" | "warning" | "grace" | "overwork" | "hardCap" = "normal"
    if (todayMinutes >= appliedLimitMinutes - 0.01) {
      status = "hardCap"
    } else if (todayMinutes >= baseLimitMinutes + (overworkMinutes > 0 ? 0.01 : graceMinutes ? 0.01 : 0)) {
      status = overworkMinutes > 0 ? "overwork" : "grace"
    } else if (todayMinutes >= secondaryWarningMinutes) {
      status = "warning"
    } else if (todayMinutes >= warningThresholdMinutes) {
      status = "warning"
    }

    // Weekly catch-up: sum deficits for days in this week relative to base limit
    const weekDayDeficits = Array.from({ length: dayOfWeek + 1 }).reduce<number>((acc, _, idx) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + idx)
      const dateKey = getLocalDateKey(d)
      const dayEntries = state.timeEntries.filter((e) => e.date === dateKey)
      let minutes = dayEntries.reduce((total, entry) => {
        if (entry.clockOut) {
          const start = new Date(entry.clockIn).getTime()
          const end = new Date(entry.clockOut).getTime()
          const diffMs = Math.max(0, end - start - entry.breakMinutes * 60 * 1000)
          return total + diffMs / (1000 * 60)
        }
        return total
      }, 0)
      if (state.currentEntry && state.currentEntry.date === dateKey && !state.activeBreak) {
        const start = new Date(state.currentEntry.clockIn).getTime()
        const now = Date.now()
        const breakMs = state.currentEntry.breakMinutes * 60 * 1000
        const diffMs = Math.max(0, now - start - breakMs)
        minutes += diffMs / (1000 * 60)
      }
      const deficit = Math.max(0, baseLimitMinutes - minutes)
      return acc + deficit
    }, 0)

    return {
      todayMinutes,
      weeklyMinutes,
      remainingMinutes,
      baseLimitMinutes,
      appliedLimitMinutes,
      status,
      warningThresholdMinutes,
      secondaryWarningMinutes,
      overtimeBadge: todayMinutes > baseLimitMinutes,
      weeklyCatchUpMinutes: weekDayDeficits,
    }
  },

  getTodayTimeEntries: () => {
    const state = get()
    const todayStr = getLocalDateKey()
    return state.timeEntries.filter((e) => e.date === todayStr)
  },

  calculateTotalHours: (entries: TimeEntry[]): number => {
    return entries.reduce((total, entry) => {
      const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now()
      const start = new Date(entry.clockIn).getTime()
      const diffMs = Math.max(0, end - start - entry.breakMinutes * 60 * 1000)
      return total + diffMs / (1000 * 60 * 60)
    }, 0)
  },

  addWorkTemplate: async (template) => {
    const { user } = get()
    if (!user) return

    const templateWithId = template as Partial<WorkTemplate>
    const { data, error } = await supabase.from("work_templates").insert({
      title: template.title,
      description: template.description || null,
      user_id: user.id,
      usage_count: 0,
      ...(templateWithId.id ? { id: templateWithId.id } : {}),
    }).select().single()

    if (error) throw error
    if (data) {
      set((state) => ({
        workTemplates: [mapWorkTemplateFromDb(data as DbWorkTemplate), ...state.workTemplates],
      }))
    }
  },

  deleteWorkTemplate: async (id) => {
    const { error } = await supabase.from("work_templates").delete().eq("id", id)
    if (error) throw error
    set((state) => ({
      workTemplates: state.workTemplates.filter((t) => t.id !== id),
    }))
  },

  updateWorkTemplate: async (id, updates) => {
    const { data, error } = await supabase.from("work_templates").update({
      title: updates.title,
      description: updates.description,
      usage_count: updates.usageCount,
    }).eq("id", id).select().single()
    if (error) throw error
    if (data) {
      const mappedTemplate = mapWorkTemplateFromDb(data as DbWorkTemplate)
      set((state) => ({
        workTemplates: state.workTemplates.map((t) => (t.id === id ? mappedTemplate : t)),
      }))
    }
  },

  getTopTemplates: () => {
    const state = get()
    return [...state.workTemplates].sort((a, b) => b.usageCount - a.usageCount).slice(0, 5)
  },

  updateCurrentEntryTitle: (title: string) => {
    set((state) => {
      if (state.currentEntry) {
        return {
          currentEntry: {
            ...state.currentEntry,
            title,
          },
        }
      }
      return state
    })
  },

  switchTask: async (newTitle: string, category?: string) => {
    const { currentEntry, user } = get()
    if (!currentEntry || !user) {
      throw new Error("Must be clocked in to switch tasks")
    }

    const now = new Date()
    const nowISO = now.toISOString()
    const updatedSubtasks = [...(currentEntry.subtasks || [])]

    // If there was a previous task, create a subtask entry for it
    if (currentEntry.title && currentEntry.title.trim()) {
      // Determine the start time for the previous task:
      // - If this is the first switch (no subtasks yet), use the original session start
      // - If there are already subtasks, use the end time of the last subtask (which is when current task started)
      const previousTaskStart = updatedSubtasks.length === 0
        ? currentEntry.clockIn // First task: use original session start
        : updatedSubtasks[updatedSubtasks.length - 1].clockOut || currentEntry.clockIn // Subsequent: use last subtask's end

      updatedSubtasks.push({
        id: crypto.randomUUID(),
        title: currentEntry.title,
        clockIn: previousTaskStart,
        clockOut: nowISO, // When we're switching away from this task
      })
    }

    // Update the database entry immediately
    // Keep the original clock_in (session start), only update title and subtasks
    const { data, error } = await supabase
      .from("time_entries")
      .update({
        title: newTitle,
        subtasks: updatedSubtasks,
        category: category || currentEntry.category || null,
        // Note: clock_in stays the same (original session start time)
        // Each subtask tracks its own start/end times
      })
      .eq("id", currentEntry.id)
      .select()
      .single()

    if (error) {
      const errorMessage = error.message || JSON.stringify(error)
      throw new Error(`Failed to switch task: ${errorMessage}`)
    }

    if (data) {
      // Update local state with the new entry
      const updatedEntry = mapTimeEntryFromDb(data as DbTimeEntry)

      // Also update the entry in timeEntries array so history view updates immediately
      set((state) => {
        const updatedTimeEntries = state.timeEntries.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry
        )

        // If the entry doesn't exist in timeEntries yet (just clocked in), add it
        const entryExists = updatedTimeEntries.some((e) => e.id === updatedEntry.id)
        const finalTimeEntries = entryExists
          ? updatedTimeEntries
          : [updatedEntry, ...state.timeEntries]

        return {
          currentEntry: updatedEntry,
          timeEntries: finalTimeEntries,
        }
      })
    }
  },

  setOfficeHours: (hours: number) => {
    if (hours < 1 || hours > 24) {
      throw new Error("Office hours must be between 1 and 24 hours")
    }
    set({ officeHours: hours })
  },
  setGraceMinutes: (minutes: number) => {
    if (![0, 10, 15].includes(minutes)) {
      throw new Error("Grace minutes must be 0, 10, or 15")
    }
    set({ graceMinutes: minutes })
  },
  setAllowOverworkMinutes: (minutes: number) => {
    if (minutes < 0 || minutes > 60) {
      throw new Error("Overwork allowance must be between 0 and 60 minutes")
    }
    set({ allowOverworkMinutes: minutes })
  },
  setOverworkMinutesRequested: (minutes: number) => {
    if (minutes < 0 || minutes > 60) {
      throw new Error("Requested overwork must be between 0 and 60 minutes")
    }
    set({ overworkMinutesRequested: minutes })
  },
  resetOverworkForToday: () => {
    set({ overworkMinutesRequested: 0 })
  },

  addTimeCategory: async (category: Omit<TimeCategory, "id" | "createdAt">) => {
    const { user } = get()
    if (!user) throw new Error("Must be logged in to add time category")

    const { data, error } = await supabase
      .from("time_categories")
      .insert({
        name: category.name,
        color: category.color,
        icon: category.icon || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) throwSupabaseError(error, "Failed to add time category")
    if (data) {
      const newCategory = mapTimeCategoryFromDb(data as DbTimeCategory)
      set((state) => ({
        timeCategories: [newCategory, ...state.timeCategories],
      }))
    }
  },

  updateTimeCategory: async (id: string, updates: Partial<TimeCategory>) => {
    const { user } = get()
    if (!user) throw new Error("Must be logged in to update time category")

    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.color !== undefined) updateData.color = updates.color
    if (updates.icon !== undefined) updateData.icon = updates.icon || null

    const { data, error } = await supabase
      .from("time_categories")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) throwSupabaseError(error, "Failed to update time category")
    if (data) {
      const updatedCategory = mapTimeCategoryFromDb(data as DbTimeCategory)
      set((state) => ({
        timeCategories: state.timeCategories.map((c) => (c.id === id ? updatedCategory : c)),
      }))
    }
  },

  deleteTimeCategory: async (id: string) => {
    const { user } = get()
    if (!user) throw new Error("Must be logged in to delete time category")

    const { error } = await supabase
      .from("time_categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) throwSupabaseError(error, "Failed to delete time category")
    set((state) => ({
      timeCategories: state.timeCategories.filter((c) => c.id !== id),
    }))
  },
})
