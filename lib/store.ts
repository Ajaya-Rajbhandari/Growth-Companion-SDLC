import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "./supabase"

export interface Task {
  id: string
  title: string
  completed: boolean
  priority: "low" | "medium" | "high"
  dueDate?: string
  createdAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  category?: "work" | "personal" | "ideas" | "meeting" | "other"
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  toolCalls?: Array<{
    name: string
    arguments: Record<string, unknown>
    result?: any
  }>
}

export interface BreakPeriod {
  id: string
  startTime: string
  endTime?: string
  durationMinutes?: number // Pre-set duration for timer
  type: "short" | "lunch" | "custom" // Added break type
}

export interface TimeEntry {
  id: string
  date: string
  clockIn: string
  clockOut?: string
  breakMinutes: number
  breaks: BreakPeriod[]
  notes?: string
  title?: string // Added work entry title
  templateId?: string // Track if created from template
  subtasks?: Array<{
    id: string
    title: string
    clockIn: string
    clockOut?: string
  }> // added subtasks array to support multiple tasks in single session
}

export interface WorkTemplate {
  id: string
  title: string
  description?: string
  usageCount: number
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

type DbTask = {
  id: string
  title: string
  completed: boolean
  priority: "low" | "medium" | "high"
  due_date?: string | null
  created_at: string
}

type DbNote = {
  id: string
  title: string
  content: string
  category?: "work" | "personal" | "ideas" | "meeting" | "other"
  tags?: string[]
  created_at: string
  updated_at: string
}

type DbTimeEntry = {
  id: string
  date: string
  clock_in: string
  clock_out?: string | null
  break_minutes: number
  breaks: BreakPeriod[]
  notes?: string | null
  title?: string | null
  template_id?: string | null
  subtasks?: Array<{
    id: string
    title: string
    clockIn: string
    clockOut?: string
  }>
}

type DbWorkTemplate = {
  id: string
  title: string
  description?: string | null
  usage_count: number
  created_at: string
}

type DbChatSession = {
  id: string
  title: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

const mapTaskFromDb = (task: DbTask): Task => ({
  id: task.id,
  title: task.title,
  completed: task.completed,
  priority: task.priority,
  dueDate: task.due_date || undefined,
  createdAt: task.created_at,
})

const mapNoteFromDb = (note: DbNote): Note => ({
  id: note.id,
  title: note.title,
  content: note.content,
  category: note.category,
  tags: note.tags,
  createdAt: note.created_at,
  updatedAt: note.updated_at,
})

const mapTimeEntryFromDb = (entry: DbTimeEntry): TimeEntry => ({
  id: entry.id,
  date: entry.date,
  clockIn: entry.clock_in,
  clockOut: entry.clock_out || undefined,
  breakMinutes: entry.break_minutes || 0,
  breaks: entry.breaks || [],
  notes: entry.notes || undefined,
  title: entry.title || undefined,
  templateId: entry.template_id || undefined,
  subtasks: entry.subtasks,
})

const mapWorkTemplateFromDb = (template: DbWorkTemplate): WorkTemplate => ({
  id: template.id,
  title: template.title,
  description: template.description || undefined,
  usageCount: template.usage_count,
  createdAt: template.created_at,
})

const mapChatSessionFromDb = (session: DbChatSession): ChatSession => ({
  id: session.id,
  title: session.title,
  messages: session.messages,
  createdAt: session.created_at,
  updatedAt: session.updated_at,
})

interface AppState {
  tasks: Task[]
  notes: Note[]
  activeView: "dashboard" | "tasks" | "notes" | "timesheet" | "profile"
  chatMessages: ChatMessage[]
  chatSessions: ChatSession[]
  currentChatSessionId: string | null
  isChatOpen: boolean
  timeEntries: TimeEntry[]
  currentEntry: TimeEntry | null
  activeBreak: BreakPeriod | null
  workTemplates: WorkTemplate[] // Added templates array
  user: User | null
  isLoggedIn: boolean
  authInitialized: boolean
  authError: string
  hasCompletedOnboarding: boolean
  currentOnboardingStep: number

  fetchInitialData: () => Promise<void>
  addTask: (task: Omit<Task, "id" | "createdAt">) => Promise<void>
  toggleTask: (id: string, completed: boolean) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => Promise<void>
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  setActiveView: (view: "dashboard" | "tasks" | "notes" | "timesheet" | "profile") => void
  setChatMessages: (messages: ChatMessage[]) => void
  addChatMessage: (message: ChatMessage) => void
  updateLastChatMessage: (updates: Partial<ChatMessage>) => void
  toggleChat: () => void
  setIsChatOpen: (open: boolean) => void
  clearChatHistory: () => void
  clockIn: (title?: string) => void // Update clockIn to accept optional title
  clockOut: () => void
  startBreak: (durationMinutes?: number, breakType?: "short" | "lunch" | "custom" | "fixed") => void
  endBreak: () => void
  addBreakTime: (minutes: number) => void
  updateEntryNotes: (id: string, notes: string) => Promise<void>
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
  getTasksSummary: () => { total: number; completed: number; pending: number; highPriority: number }
  getNotesSummary: () => { total: number; recent: Note[] }
  calculateTotalHours: (entries: TimeEntry[]) => number
  addWorkTemplate: (template: Omit<WorkTemplate, "id" | "usageCount" | "createdAt">) => Promise<void>
  deleteWorkTemplate: (id: string) => Promise<void>
  updateWorkTemplate: (id: string, updates: Partial<WorkTemplate>) => Promise<void>
  getTopTemplates: () => WorkTemplate[]
  updateCurrentEntryTitle: (title: string) => void // add method to update current task title
  switchTask: (newTitle: string) => void // add method to switch tasks mid-session
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  setAuthInitialized: (ready: boolean) => void
  setAuthError: (error: string) => void
  setOnboardingStatus: (completed: boolean) => void
  updateUserProfile: (updates: Partial<User>) => Promise<void>
  setOnboardingStep: (step: number) => void
  completeOnboarding: () => Promise<void>
  skipOnboarding: () => Promise<void>
  createNewChatSession: () => void
  saveCurrentChatSession: () => void
  loadChatSession: (sessionId: string) => void
  deleteChatSession: (sessionId: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [
        {
          id: "1",
          title: "Review project requirements",
          completed: false,
          priority: "high",
          dueDate: new Date().toISOString().split("T")[0],
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
      notes: [
        {
          id: "1",
          title: "Meeting Notes",
          content: "Discussed Q1 goals and roadmap priorities. Key action items: finalize specs, review budget.",
          category: "work",
          tags: ["Q1", "roadmap"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "2",
          title: "Ideas",
          content: "New feature concepts for the dashboard. Consider adding analytics widgets and custom themes.",
          category: "ideas",
          tags: ["dashboard", "features"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      activeView: "dashboard",
      chatMessages: [],
      chatSessions: [],
      currentChatSessionId: null,
      isChatOpen: false,
      timeEntries: [],
      currentEntry: null,
      activeBreak: null,
      workTemplates: [], // Initialize templates
      user: null,
      isLoggedIn: false,
      authInitialized: false,
      authError: "",
      hasCompletedOnboarding: false,
      currentOnboardingStep: 0,

      fetchInitialData: async () => {
        const { user } = get()
        if (!user) return

        const [
          { data: tasks },
          { data: notes },
          { data: timeEntries },
          { data: templates },
          { data: chatSessions }
        ] = await Promise.all([
          supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("notes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
          supabase.from("time_entries").select("*").eq("user_id", user.id).order("clock_in", { ascending: false }),
          supabase.from("work_templates").select("*").eq("user_id", user.id).order("usage_count", { ascending: false }),
          supabase.from("chat_sessions").select("*").eq("user_id", user.id).order("updated_at", { ascending: false })
        ])

        const mappedTasks = (tasks || []).map((task) => mapTaskFromDb(task as DbTask))
        const mappedNotes = (notes || []).map((note) => mapNoteFromDb(note as DbNote))
        const mappedTimeEntries = (timeEntries || []).map((entry) => mapTimeEntryFromDb(entry as DbTimeEntry))
        const mappedTemplates = (templates || []).map((template) => mapWorkTemplateFromDb(template as DbWorkTemplate))
        const mappedChatSessions = (chatSessions || []).map((session) => mapChatSessionFromDb(session as DbChatSession))

        const currentEntry = mappedTimeEntries.find((entry) => !entry.clockOut)

        set({
          tasks: mappedTasks,
          notes: mappedNotes,
          timeEntries: mappedTimeEntries,
          workTemplates: mappedTemplates,
          chatSessions: mappedChatSessions,
          currentEntry: currentEntry || null,
          isLoggedIn: true
        })
      },

      addTask: async (task) => {
        const { user } = get()
        if (!user) return

        const { data, error } = await supabase.from("tasks").insert({
          title: task.title,
          completed: task.completed,
          priority: task.priority,
          due_date: task.dueDate || null,
          user_id: user.id,
        }).select().single()

        if (error) throw error
        if (data) {
          set((state) => ({
            tasks: [mapTaskFromDb(data as DbTask), ...state.tasks],
          }))
        }
      },
      toggleTask: async (id, completed) => {
        const { error } = await supabase.from("tasks").update({ completed }).eq("id", id)
        if (error) throw error
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed } : t)),
        }))
      },
      deleteTask: async (id) => {
        const { error } = await supabase.from("tasks").delete().eq("id", id)
        if (error) throw error
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }))
      },
      addNote: async (note) => {
        const { user } = get()
        if (!user) return

        const { data, error } = await supabase.from("notes").insert({
          title: note.title,
          content: note.content,
          category: note.category || "other",
          tags: note.tags || [],
          user_id: user.id,
        }).select().single()

        if (error) throw error
        if (data) {
          set((state) => ({
            notes: [mapNoteFromDb(data as DbNote), ...state.notes],
          }))
        }
      },
      updateNote: async (id, updates) => {
        const { data, error } = await supabase.from("notes").update({
          title: updates.title,
          content: updates.content,
          category: updates.category,
          tags: updates.tags,
          updated_at: new Date().toISOString()
        }).eq("id", id).select().single()

        if (error) throw error
        if (data) {
          const mappedNote = mapNoteFromDb(data as DbNote)
          set((state) => ({
            notes: state.notes.map((n) => (n.id === id ? mappedNote : n)),
          }))
        }
      },
      deleteNote: async (id) => {
        const { error } = await supabase.from("notes").delete().eq("id", id)
        if (error) throw error
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        }))
      },
      setActiveView: (view) => set({ activeView: view }),
      setChatMessages: (messages) => set({ chatMessages: messages }),
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        })),
      updateLastChatMessage: (updates) =>
        set((state) => {
          const messages = [...state.chatMessages]
          if (messages.length > 0) {
            messages[messages.length - 1] = { ...messages[messages.length - 1], ...updates }
          }
          return { chatMessages: messages }
        }),
      toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
      setIsChatOpen: (open) => set({ isChatOpen: open }),
      clearChatHistory: () => set({ chatMessages: [] }),
      clockIn: async (title?: string) => {
        const { user } = get()
        if (!user) return

        const now = new Date()
        const entry = {
          date: now.toISOString().split("T")[0],
          clock_in: now.toISOString(),
          break_minutes: 0,
          breaks: [] as BreakPeriod[],
          title: title || null,
        }

        const { data, error } = await supabase.from("time_entries").insert({
          ...entry,
          user_id: user.id,
        }).select().single()

        if (error) throw error
        if (data) {
          set({ currentEntry: mapTimeEntryFromDb(data as DbTimeEntry) })
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

          if (error) throw error

          await get().fetchInitialData() // Refresh to get the complete entry in history
          set({
            currentEntry: null,
            activeBreak: null,
          })
        }
      },
      startBreak: (durationMinutes?: number, breakType?: "short" | "lunch" | "custom" | "fixed") => {
        const { currentEntry } = get()
        if (currentEntry) {
          const resolvedType = breakType === "fixed" ? "short" : breakType || "custom"
          const newBreak: BreakPeriod = {
            id: crypto.randomUUID(),
            startTime: new Date().toISOString(),
            durationMinutes,
            type: resolvedType,
          }
          set({ activeBreak: newBreak })
        }
      },
      endBreak: () => {
        const { currentEntry, activeBreak } = get()
        if (currentEntry && activeBreak) {
          const endTime = new Date()
          const startTime = new Date(activeBreak.startTime)
          const breakDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

          const completedBreak: BreakPeriod = {
            ...activeBreak,
            endTime: endTime.toISOString(),
          }

          set({
            currentEntry: {
              ...currentEntry,
              breakMinutes: (currentEntry.breakMinutes || 0) + breakDuration,
              breaks: [...(currentEntry.breaks || []), completedBreak],
            },
            activeBreak: null,
          })
        }
      },
      addBreakTime: (minutes) => {
        const { currentEntry } = get()
        if (currentEntry) {
          // Add a completed break period for manual entry
          const now = new Date()
          const startTime = new Date(now.getTime() - minutes * 60 * 1000)
          const manualBreak: BreakPeriod = {
            id: crypto.randomUUID(),
            startTime: startTime.toISOString(),
            endTime: now.toISOString(),
            type: "custom"
          }
          set({
            currentEntry: {
              ...currentEntry,
              breakMinutes: (currentEntry.breakMinutes || 0) + minutes,
              breaks: [...(currentEntry.breaks || []), manualBreak],
            },
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
      deleteTimeEntry: async (id) => {
        const { error } = await supabase.from("time_entries").delete().eq("id", id)
        if (error) throw error
        set((state) => ({
          timeEntries: state.timeEntries.filter((e) => e.id !== id),
        }))
      },
      getTimesheetStatus: () => {
        const state = get()
        const today = new Date()
        const todayStr = today.toISOString().split("T")[0]

        // Calculate today's hours
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
        const weekStart = new Date(today)
        const dayOfWeek = weekStart.getDay()
        weekStart.setDate(weekStart.getDate() - dayOfWeek)
        weekStart.setHours(0, 0, 0, 0)

        const weekEntries = state.timeEntries.filter((e) => new Date(e.date) >= weekStart)
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

      getTodayTimeEntries: () => {
        const state = get()
        const todayStr = new Date().toISOString().split("T")[0]
        return state.timeEntries.filter((e) => e.date === todayStr)
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

      getNotesSummary: () => {
        const state = get()
        const sortedNotes = [...state.notes].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        return {
          total: state.notes.length,
          recent: sortedNotes.slice(0, 3),
        }
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

      switchTask: (newTitle: string) => {
        set((state) => {
          if (state.currentEntry && state.currentEntry.title) {
            const { currentEntry, timeEntries } = state

            // Create subtask entry for the previous task
            const now = new Date()
            if (!currentEntry.subtasks) {
              currentEntry.subtasks = []
            }

            currentEntry.subtasks.push({
              id: crypto.randomUUID(),
              title: currentEntry.title || "Untitled Task",
              clockIn: currentEntry.clockIn,
              clockOut: now.toISOString(),
            })

            // Switch to new task
            return {
              currentEntry: {
                ...currentEntry,
                title: newTitle,
                clockIn: now.toISOString(),
              },
            }
          } else if (state.currentEntry) {
            return {
              currentEntry: {
                ...state.currentEntry,
                title: newTitle,
              },
            }
          }
          return state
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
            name: data.user.user_metadata.full_name || data.user.email?.split("@")[0] || "User",
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

        if (data.user) {
          const user: User = {
            id: data.user.id,
            name: name,
            email: data.user.email || "",
            createdAt: data.user.created_at,
          }
          set({ user, isLoggedIn: true, authError: "" })
        }
      },

      loginWithGoogle: async () => {
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

      setOnboardingStatus: (completed: boolean) => {
        set({
          hasCompletedOnboarding: completed,
          currentOnboardingStep: completed ? 0 : get().currentOnboardingStep,
        })
      },

      updateUserProfile: async (updates: Partial<User>) => {
        if (updates.name) {
          const { error } = await supabase.auth.updateUser({
            data: { full_name: updates.name },
          })
          if (error) throw error
        }
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }))
      },

      setOnboardingStep: (step: number) => {
        set({ currentOnboardingStep: step })
      },

      completeOnboarding: async () => {
        const { error } = await supabase.auth.updateUser({
          data: { hasCompletedOnboarding: true },
        })
        if (error) throw error
        set({ hasCompletedOnboarding: true, currentOnboardingStep: 0 })
      },

      skipOnboarding: async () => {
        const { error } = await supabase.auth.updateUser({
          data: { hasCompletedOnboarding: true },
        })
        if (error) throw error
        set({ hasCompletedOnboarding: true, currentOnboardingStep: 0 })
      },

      createNewChatSession: () => {
        set((state) => {
          const newSessionId = Date.now().toString()
          return {
            currentChatSessionId: newSessionId,
            chatMessages: [],
          }
        })
      },

      saveCurrentChatSession: async () => {
        const { currentChatSessionId, chatMessages, user, chatSessions } = get()
        if (!currentChatSessionId || chatMessages.length === 0 || !user) {
          return
        }

        const firstUserMessage = chatMessages.find((m) => m.role === "user")
        const title = firstUserMessage ? firstUserMessage.content.substring(0, 50) : "Untitled Chat"

        const existingSession = chatSessions.find((s) => s.id === currentChatSessionId)

        const sessionData = {
          title,
          messages: chatMessages,
          user_id: user.id,
          updated_at: new Date().toISOString()
        }

        if (existingSession) {
          const { error } = await supabase.from("chat_sessions").update(sessionData).eq("id", currentChatSessionId)
          if (error) throw error
        } else {
          const { data, error } = await supabase.from("chat_sessions").insert({
            ...sessionData,
            id: currentChatSessionId
          }).select().single()

          if (error) throw error
        }

        await get().fetchInitialData()
      },

      loadChatSession: (sessionId: string) => {
        set((state) => {
          const session = state.chatSessions.find((s) => s.id === sessionId)
          if (session) {
            return {
              currentChatSessionId: sessionId,
              chatMessages: session.messages,
            }
          }
          return state
        })
      },

      deleteChatSession: (sessionId: string) => {
        set((state) => {
          const newSessions = state.chatSessions.filter((s) => s.id !== sessionId)
          return {
            chatSessions: newSessions,
            currentChatSessionId: state.currentChatSessionId === sessionId ? null : state.currentChatSessionId,
            chatMessages: state.currentChatSessionId === sessionId ? [] : state.chatMessages,
          }
        })
      },
    }),
    {
      name: "app-store",
    },
  ),
)
