import { z } from "zod"

// /api/suggest-task-titles request
export const SuggestTaskTitlesRequestSchema = z.object({
  draft: z.string().optional().default(""),
  recentTitles: z.array(z.string()).optional().default([]),
  currentTask: z.string().optional().default(""),
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
  content: z.string(),
})

export const AssistantRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1, "At least one message is required"),
  appState: z.any().optional(),
})

export type AssistantRequest = z.infer<typeof AssistantRequestSchema>

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
