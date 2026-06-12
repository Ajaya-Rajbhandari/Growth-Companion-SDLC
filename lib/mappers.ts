import type {
  BreakPeriod,
  ChatMessage,
  ChatSession,
  Goal,
  Habit,
  HabitLog,
  Milestone,
  Note,
  Task,
  TimeCategory,
  TimeEntry,
  WorkTemplate,
} from "./types"

// Helper function to convert Supabase errors to Error objects
export function handleSupabaseError(error: any, context: string): Error {
  if (error instanceof Error) {
    return error
  }
  const errorMessage = error?.message || error?.error_description || JSON.stringify(error)
  return new Error(`${context}: ${errorMessage}`)
}

// Helper to throw Supabase errors as proper Error objects
export function throwSupabaseError(error: any, context: string): never {
  throw handleSupabaseError(error, context)
}

export type DbTask = {
  id: string
  title: string
  completed: boolean
  priority: "low" | "medium" | "high"
  urgency?: "low" | "medium" | "high" | null
  due_date?: string | null
  created_at: string
}

export type DbNote = {
  id: string
  title: string
  content: string
  category?: "work" | "personal" | "ideas" | "meeting" | "other"
  tags?: string[]
  created_at: string
  updated_at: string
}

export type DbTimeEntry = {
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

export type DbTimeCategory = {
  id: string
  name: string
  color: string
  icon?: string | null
  created_at: string
}

export type DbWorkTemplate = {
  id: string
  title: string
  description?: string | null
  usage_count: number
  created_at: string
}

export type DbChatSession = {
  id: string
  title: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

export type DbGoal = {
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

export type DbHabit = {
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

export type DbHabitLog = {
  id: string
  habit_id: string
  user_id: string
  date: string
  count: number
  notes?: string | null
  created_at: string
}

export const mapTaskFromDb = (task: DbTask): Task => ({
  id: task.id,
  title: task.title,
  completed: task.completed,
  priority: task.priority,
  urgency: task.urgency || undefined,
  dueDate: task.due_date || undefined,
  createdAt: task.created_at,
})

export const mapNoteFromDb = (note: DbNote): Note => ({
  id: note.id,
  title: note.title,
  content: note.content,
  category: note.category,
  tags: note.tags,
  createdAt: note.created_at,
  updatedAt: note.updated_at,
})

export const mapTimeEntryFromDb = (entry: DbTimeEntry): TimeEntry => ({
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

export const mapTimeCategoryFromDb = (category: DbTimeCategory): TimeCategory => ({
  id: category.id,
  name: category.name,
  color: category.color,
  icon: category.icon || undefined,
  createdAt: category.created_at,
})

export const mapGoalFromDb = (goal: DbGoal): Goal => ({
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

export const mapHabitFromDb = (habit: DbHabit): Habit => ({
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

export const mapHabitLogFromDb = (log: DbHabitLog): HabitLog => ({
  id: log.id,
  habitId: log.habit_id,
  date: log.date,
  count: log.count,
  notes: log.notes || undefined,
  createdAt: log.created_at,
})

export const mapWorkTemplateFromDb = (template: DbWorkTemplate): WorkTemplate => ({
  id: template.id,
  title: template.title,
  description: template.description || undefined,
  usageCount: template.usage_count,
  createdAt: template.created_at,
})

export const mapChatSessionFromDb = (session: DbChatSession): ChatSession => ({
  id: session.id,
  title: session.title,
  messages: session.messages,
  createdAt: session.created_at,
  updatedAt: session.updated_at,
})
