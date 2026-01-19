import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "./supabase"

// Helper function to convert Supabase errors to Error objects
function handleSupabaseError(error: any, context: string): Error {
  if (error instanceof Error) {
    return error
  }
  const errorMessage = error?.message || error?.error_description || JSON.stringify(error)
  return new Error(`${context}: ${errorMessage}`)
}

// Helper to throw Supabase errors as proper Error objects
function throwSupabaseError(error: any, context: string): never {
  throw handleSupabaseError(error, context)
}

export interface Task {
  id: string
  title: string
  completed: boolean
  priority: "low" | "medium" | "high"
  urgency?: "low" | "medium" | "high"
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
  title?: string // Optional title/description for the break
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
  category?: string // Time tracking category
  subtasks?: Array<{
    id: string
    title: string
    clockIn: string
    clockOut?: string
  }> // added subtasks array to support multiple tasks in single session
}

export interface TimeCategory {
  id: string
  name: string
  color: string
  icon?: string
  createdAt: string
}

export interface Milestone {
  id: string
  title: string
  completed: boolean
  targetDate?: string
}

export interface Goal {
  id: string
  title: string
  description?: string
  targetDate?: string
  progress: number // 0-100
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  category?: string
  milestones: Milestone[]
  createdAt: string
  updatedAt: string
}

export interface Habit {
  id: string
  title: string
  description?: string
  frequency: 'daily' | 'weekly' | 'custom'
  targetCount: number
  color: string
  icon?: string
  createdAt: string
  updatedAt: string
}

export interface HabitLog {
  id: string
  habitId: string
  date: string
  count: number
  notes?: string
  createdAt: string
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
  urgency?: "low" | "medium" | "high" | null
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
  category?: string | null
  subtasks?: Array<{
    id: string
    title: string
    clockIn: string
    clockOut?: string
  }>
}

type DbTimeCategory = {
  id: string
  name: string
  color: string
  icon?: string | null
  created_at: string
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

type DbGoal = {
  id: string
  user_id: string
  title: string
  description?: string | null
  target_date?: string | null
  progress: number
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  category?: string | null
  milestones: Milestone[]
  created_at: string
  updated_at: string
}

type DbHabit = {
  id: string
  user_id: string
  title: string
  description?: string | null
  frequency: 'daily' | 'weekly' | 'custom'
  target_count: number
  color: string
  icon?: string | null
  created_at: string
  updated_at: string
}

type DbHabitLog = {
  id: string
  habit_id: string
  user_id: string
  date: string
  count: number
  notes?: string | null
  created_at: string
}

const mapTaskFromDb = (task: DbTask): Task => ({
  id: task.id,
  title: task.title,
  completed: task.completed,
  priority: task.priority,
  urgency: task.urgency || undefined,
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
  category: entry.category || undefined,
  subtasks: entry.subtasks,
})

const mapTimeCategoryFromDb = (category: DbTimeCategory): TimeCategory => ({
  id: category.id,
  name: category.name,
  color: category.color,
  icon: category.icon || undefined,
  createdAt: category.created_at,
})

const mapGoalFromDb = (goal: DbGoal): Goal => ({
  id: goal.id,
  title: goal.title,
  description: goal.description || undefined,
  targetDate: goal.target_date || undefined,
  progress: goal.progress,
  status: goal.status,
  category: goal.category || undefined,
  milestones: goal.milestones || [],
  createdAt: goal.created_at,
  updatedAt: goal.updated_at,
})

const mapHabitFromDb = (habit: DbHabit): Habit => ({
  id: habit.id,
  title: habit.title,
  description: habit.description || undefined,
  frequency: habit.frequency,
  targetCount: habit.target_count,
  color: habit.color,
  icon: habit.icon || undefined,
  createdAt: habit.created_at,
  updatedAt: habit.updated_at,
})

const mapHabitLogFromDb = (log: DbHabitLog): HabitLog => ({
  id: log.id,
  habitId: log.habit_id,
  date: log.date,
  count: log.count,
  notes: log.notes || undefined,
  createdAt: log.created_at,
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
  activeView: "dashboard" | "tasks" | "notes" | "timesheet" | "calendar" | "goals" | "habits" | "profile"
  chatMessages: ChatMessage[]
  chatSessions: ChatSession[]
  currentChatSessionId: string | null
  isChatOpen: boolean
  timeEntries: TimeEntry[]
  currentEntry: TimeEntry | null
  activeBreak: BreakPeriod | null
  workTemplates: WorkTemplate[] // Added templates array
  timeCategories: TimeCategory[] // Time tracking categories
  goals: Goal[] // Goals for goal setting feature
  habits: Habit[] // Habits for habit tracking
  habitLogs: HabitLog[] // Habit logs for tracking habit completion
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
  setActiveView: (view: "dashboard" | "tasks" | "notes" | "timesheet" | "calendar" | "goals" | "habits" | "profile") => void
  setChatMessages: (messages: ChatMessage[]) => void
  addChatMessage: (message: ChatMessage) => void
  updateLastChatMessage: (updates: Partial<ChatMessage>) => void
  toggleChat: () => void
  setIsChatOpen: (open: boolean) => void
  clearChatHistory: () => void
  clockIn: (title?: string) => void // Update clockIn to accept optional title
  clockOut: () => void
  startBreak: (durationMinutes?: number, breakType?: "short" | "lunch" | "custom" | "fixed") => void
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
  getTasksSummary: () => { total: number; completed: number; pending: number; highPriority: number }
  getNotesSummary: () => { total: number; recent: Note[] }
  calculateTotalHours: (entries: TimeEntry[]) => number
  addWorkTemplate: (template: Omit<WorkTemplate, "id" | "usageCount" | "createdAt">) => Promise<void>
  deleteWorkTemplate: (id: string) => Promise<void>
  updateWorkTemplate: (id: string, updates: Partial<WorkTemplate>) => Promise<void>
  getTopTemplates: () => WorkTemplate[]
  updateCurrentEntryTitle: (title: string) => void // add method to update current task title
  switchTask: (newTitle: string) => Promise<void> // add method to switch tasks mid-session
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
  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "updatedAt">) => Promise<void>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  updateGoalProgress: (id: string, progress: number) => Promise<void>
  addMilestone: (goalId: string, milestone: Omit<Milestone, "id" | "completed">) => Promise<void>
  completeMilestone: (goalId: string, milestoneId: string) => Promise<void>
  addHabit: (habit: Omit<Habit, "id" | "createdAt" | "updatedAt">) => Promise<void>
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
  logHabit: (habitId: string, date: string, count?: number, notes?: string) => Promise<void>
  getHabitStreak: (habitId: string) => number
  getHabitStats: (habitId: string) => { totalDays: number; completedDays: number; currentStreak: number; longestStreak: number }
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
      timeCategories: [], // Initialize time categories
      goals: [], // Initialize goals
      habits: [], // Initialize habits
      habitLogs: [], // Initialize habit logs
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

        if (error) {
          const errorMessage = error.message || JSON.stringify(error)
          throw new Error(`Failed to create note: ${errorMessage}`)
        }
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

        if (error) throwSupabaseError(error, "Failed to update note")
        if (data) {
          const mappedNote = mapNoteFromDb(data as DbNote)
          set((state) => ({
            notes: state.notes.map((n) => (n.id === id ? mappedNote : n)),
          }))
        }
      },
      deleteNote: async (id) => {
        const { error } = await supabase.from("notes").delete().eq("id", id)
        if (error) throwSupabaseError(error, "Failed to delete note")
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
      clockIn: async (title?: string, category?: string) => {
        const { user } = get()
        if (!user) return

        const now = new Date()
        const entry = {
          date: now.toISOString().split("T")[0],
          clock_in: now.toISOString(),
          break_minutes: 0,
          breaks: [] as BreakPeriod[],
          title: title || null,
          category: category || null,
        }

        const { data, error } = await supabase.from("time_entries").insert({
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
          // Generate a proper UUID v4
          const newSessionId = crypto.randomUUID()
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
          if (error) {
            const errorMessage = error.message || JSON.stringify(error)
            throw new Error(`Failed to update chat session: ${errorMessage}`)
          }
        } else {
          // Only insert if currentChatSessionId is a valid UUID format
          // If it's not (e.g., old timestamp-based ID), generate a new UUID
          const sessionId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentChatSessionId)
            ? currentChatSessionId
            : crypto.randomUUID()
          
          const { data, error } = await supabase.from("chat_sessions").insert({
            ...sessionData,
            id: sessionId
          }).select().single()

          if (error) {
            const errorMessage = error.message || JSON.stringify(error)
            throw new Error(`Failed to create chat session: ${errorMessage}`)
          }
          
          // Update the current session ID if we generated a new one
          if (sessionId !== currentChatSessionId) {
            set({ currentChatSessionId: sessionId })
          }
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

        const { data, error } = await supabase
          .from("habit_logs")
          .upsert({
            habit_id: habitId,
            user_id: user.id,
            date,
            count: count || 1,
            notes: notes || null,
          })
          .select()
          .single()

        if (error) throwSupabaseError(error, "Failed to log habit")
        if (data) {
          const newLog = mapHabitLogFromDb(data as DbHabitLog)
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
          const logDate = new Date(habitLogsForHabit[i].date)
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
        }
      },
    }),
    {
      name: "app-store",
    },
  ),
)
