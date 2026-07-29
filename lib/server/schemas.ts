import { z } from "zod"

// /api/suggest-task-titles request
export const SuggestTaskTitlesRequestSchema = z.object({
  draft: z.string().max(200).optional().default(""),
  recentTitles: z.array(z.string().min(1).max(100)).max(20).optional().default([]),
  currentTask: z.string().max(100).optional().default(""),
})

export type SuggestTaskTitlesRequest = z.infer<typeof SuggestTaskTitlesRequestSchema>

export const SuggestTaskTitlesResponseSchema = z.object({
  suggestions: z.array(z.string()),
  error: z.string().optional(),
})

export type SuggestTaskTitlesResponse = z.infer<typeof SuggestTaskTitlesResponseSchema>

// /api/assistant request
export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(4_000),
})

const AssistantAppStateSchema = z.object({
  tasks: z.array(z.unknown()).max(500).optional(),
  notes: z.array(z.unknown()).max(500).optional(),
  goals: z.array(z.unknown()).max(250).optional(),
  habits: z.array(z.unknown()).max(250).optional(),
  habitLogs: z.array(z.unknown()).max(2_500).optional(),
  timeEntries: z.array(z.unknown()).max(1_000).optional(),
  currentEntry: z.unknown().nullable().optional(),
  todayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const AssistantRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1, "At least one message is required").max(40),
  appState: AssistantAppStateSchema.optional(),
})

export type AssistantRequest = z.infer<typeof AssistantRequestSchema>

const boundedMetric = z.number().finite().min(0).max(100_000)

export const InsightsRequestSchema = z.object({
  metrics: z.object({
    weekHours: boundedMetric,
    daysWorked: boundedMetric.max(7),
    daysOnTarget: boundedMetric.max(7),
    targetHours: boundedMetric.max(24),
    avgHoursPerDay: boundedMetric.max(24),
    tasksCompleted: boundedMetric,
    tasksPending: boundedMetric,
    tasksOverdue: boundedMetric,
    tasksCreatedThisWeek: boundedMetric,
    habitConsistencyPct: boundedMetric.max(100),
    activeGoals: boundedMetric,
    avgGoalProgress: boundedMetric.max(100),
    goalsNearingDeadline: boundedMetric,
  }),
})

// /api/summary response
export const SummaryResponseSchema = z.object({
  tasks: z.object({
    total: z.number(),
    pending: z.number(),
  }),
  notes: z.object({
    total: z.number(),
  }),
  timesheet: z.object({
    todayHours: z.number(),
    sessionsToday: z.number(),
  }),
})

export type SummaryResponse = z.infer<typeof SummaryResponseSchema>

// Generic error response
export const ErrorResponseSchema = z.object({
  error: z.string(),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
