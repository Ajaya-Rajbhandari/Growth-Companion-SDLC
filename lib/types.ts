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
  officeHours?: number // Maximum office hours per day (default: 9)
  graceMinutes?: number // Optional daily grace minutes (0,10,15)
  allowOverworkMinutes?: number // Max overwork minutes user can request (0-60)
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}
