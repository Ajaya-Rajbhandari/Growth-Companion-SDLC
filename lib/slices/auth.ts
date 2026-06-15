import type { StateCreator } from "zustand"
import { supabase } from "../supabase"
import {
  mapChatSessionFromDb,
  mapGoalFromDb,
  mapHabitFromDb,
  mapHabitLogFromDb,
  mapNoteFromDb,
  mapTaskFromDb,
  mapTimeCategoryFromDb,
  mapTimeEntryFromDb,
  mapWorkTemplateFromDb,
  type DbChatSession,
  type DbGoal,
  type DbHabit,
  type DbHabitLog,
  type DbNote,
  type DbTask,
  type DbTimeCategory,
  type DbTimeEntry,
  type DbWorkTemplate,
} from "../mappers"
import type { User } from "../types"
import { deriveDisplayName } from "../utils"
import { trackEvent } from "../analytics"
import type { AppState } from "./index"

export interface AuthSlice {
  user: User | null
  isLoggedIn: boolean
  isAdmin: boolean
  authInitialized: boolean
  authError: string

  fetchInitialData: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  checkAdminStatus: () => Promise<void>
  setAuthInitialized: (ready: boolean) => void
  setAuthError: (error: string) => void
  updateUserProfile: (updates: Partial<User>) => Promise<void>
}

export const createAuthSlice: StateCreator<
  AppState,
  [["zustand/persist", unknown]],
  [],
  AuthSlice
> = (set, get) => ({
  user: null,
  isLoggedIn: false,
  isAdmin: false,
  authInitialized: false,
  authError: "",

  checkAdminStatus: async () => {
    try {
      const { data, error } = await supabase.rpc("is_admin")
      set({ isAdmin: !error && data === true })
    } catch {
      set({ isAdmin: false })
    }
  },

  fetchInitialData: async () => {
    const { user } = get()
    if (!user) return

    const [
      { data: tasks },
      { data: notes },
      { data: timeEntries },
      { data: templates },
      { data: chatSessions },
      { data: timeCategories },
      { data: goals },
      { data: habits },
      { data: habitLogs }
    ] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("notes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("time_entries").select("*").eq("user_id", user.id).order("clock_in", { ascending: false }),
      supabase.from("work_templates").select("*").eq("user_id", user.id).order("usage_count", { ascending: false }),
      supabase.from("chat_sessions").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("time_categories").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("habits").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("habit_logs").select("*").eq("user_id", user.id).order("date", { ascending: false })
    ])

    const mappedTasks = (tasks || []).map((task) => mapTaskFromDb(task as DbTask))
    const mappedNotes = (notes || []).map((note) => mapNoteFromDb(note as DbNote))
    const mappedTimeEntries = (timeEntries || []).map((entry) => mapTimeEntryFromDb(entry as DbTimeEntry))
    const mappedTemplates = (templates || []).map((template) => mapWorkTemplateFromDb(template as DbWorkTemplate))
    const mappedChatSessions = (chatSessions || []).map((session) => mapChatSessionFromDb(session as DbChatSession))
    const mappedTimeCategories = (timeCategories || []).map((category) => mapTimeCategoryFromDb(category as DbTimeCategory))
    const mappedGoals = (goals || []).map((goal) => mapGoalFromDb(goal as DbGoal))
    const mappedHabits = (habits || []).map((habit) => mapHabitFromDb(habit as DbHabit))
    const mappedHabitLogs = (habitLogs || []).map((log) => mapHabitLogFromDb(log as DbHabitLog))

    const currentEntry = mappedTimeEntries.find((entry) => !entry.clockOut)

    set({
      tasks: mappedTasks,
      notes: mappedNotes,
      timeEntries: mappedTimeEntries,
      workTemplates: mappedTemplates,
      chatSessions: mappedChatSessions,
      timeCategories: mappedTimeCategories,
      goals: mappedGoals,
      habits: mappedHabits,
      habitLogs: mappedHabitLogs,
      currentEntry: currentEntry || null,
      isLoggedIn: true
    })
  },

  login: async (email: string, password: string) => {
    set({ authError: "" })
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      set({ authError: error.message })
      throw error
    }

    if (data.user) {
      const user: User = {
        id: data.user.id,
        name: deriveDisplayName(data.user.user_metadata.full_name, data.user.email),
        email: data.user.email || "",
        createdAt: data.user.created_at,
      }
      set({ user, isLoggedIn: true, authError: "" })
    }
  },

  signup: async (name: string, email: string, password: string) => {
    set({ authError: "" })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (error) {
      set({ authError: error.message })
      throw error
    }

    trackEvent("user_signed_up", data.user?.id ?? null, { needsConfirmation: !data.session })

    // When email confirmation is enabled, signUp returns a user but no session.
    // Without a session, every authenticated call (updateUser, fetchInitialData,
    // the assistant API) fails with "Auth session missing". Don't treat this as
    // logged in — the caller surfaces a "check your email" message instead.
    if (!data.session) {
      return { needsConfirmation: true }
    }

    if (data.user) {
      const user: User = {
        id: data.user.id,
        name: deriveDisplayName(name, data.user.email),
        email: data.user.email || "",
        createdAt: data.user.created_at,
      }
      set({ user, isLoggedIn: true, authError: "" })
    }

    return { needsConfirmation: false }
  },

  loginWithGoogle: async () => {
    // Note: redirectTo uses window.location.origin which should work correctly.
    // However, Supabase's "Site URL" setting in the dashboard takes precedence.
    // If redirects go to localhost in production, check Supabase Dashboard →
    // Authentication → URL Configuration → Site URL (must be your production URL)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      set({ authError: error.message })
      throw error
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({
      user: null,
      isLoggedIn: false,
      authError: "",
      tasks: [],
      notes: [],
      timeEntries: [],
      chatMessages: [],
      chatSessions: [],
      currentChatSessionId: null,
    })
  },

  setUser: (user: User | null) => {
    set({ user, isLoggedIn: !!user })
  },

  setAuthInitialized: (ready: boolean) => {
    set({ authInitialized: ready })
  },

  setAuthError: (error: string) => {
    set({ authError: error })
  },

  updateUserProfile: async (updates: Partial<User>) => {
    const metadataUpdates: Record<string, any> = {}
    if (updates.name) {
      metadataUpdates.full_name = updates.name
    }
    if (updates.graceMinutes !== undefined) {
      metadataUpdates.grace_minutes = updates.graceMinutes
    }
    if (updates.allowOverworkMinutes !== undefined) {
      metadataUpdates.allow_overwork_minutes = updates.allowOverworkMinutes
    }

    if (Object.keys(metadataUpdates).length > 0) {
      const { error } = await supabase.auth.updateUser({
        data: metadataUpdates,
      })
      if (error) throw error
    }
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }))
  },
})
