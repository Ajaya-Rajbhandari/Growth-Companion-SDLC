"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { useAppStore, type ChatMessage } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Send,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  FileText,
  Target,
  Brain,
  X,
  MessageCircle,
  Clock,
  Play,
  Square,
  Coffee,
  BarChart3,
  AlertCircle,
  History,
  Plus,
  Trash2,
  ArrowLeft,
  Flame,
  Copy,
  RotateCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AIMessage } from "@/components/ai-message"
import { AIFeedback } from "@/components/ai-feedback"
import { toast } from "@/components/ui/use-toast"

// Generate context-aware suggested prompts
const getSuggestedPrompts = (
  tasks: any[],
  goals: any[],
  habits: any[],
  currentEntry: any,
  timeEntries: any[]
) => {
  const hour = new Date().getHours()
  const isMorning = hour >= 6 && hour < 12
  const isAfternoon = hour >= 12 && hour < 18
  const isEvening = hour >= 18 || hour < 6
  
  const pendingTasks = tasks.filter((t) => !t.completed).length
  const highPriorityTasks = tasks.filter((t) => !t.completed && t.priority === "high").length
  const activeGoals = goals.filter((g) => g.status === "active").length
  const today = new Date().toISOString().split("T")[0]
  const todayHabitLogs = habits.length > 0 ? habits.length : 0
  
  const basePrompts = [
    {
      icon: Target,
      label: "Plan my day",
      prompt: "Help me plan my day effectively based on my current tasks and schedule.",
      priority: isMorning ? 1 : 3,
    },
    {
      icon: Clock,
      label: currentEntry ? "Clock out" : "Clock in",
      prompt: currentEntry ? "Clock me out to end my work session." : "Clock me in to start tracking my work time.",
      priority: !currentEntry && isMorning ? 1 : 4,
    },
    {
      icon: BarChart3,
      label: "Time status",
      prompt: "What's my timesheet status? How many hours have I worked today?",
      priority: isAfternoon || isEvening ? 2 : 4,
    },
    {
      icon: Brain,
      label: "Daily summary",
      prompt: "Give me a summary of my tasks, notes, and time tracked for today.",
      priority: isEvening ? 1 : 3,
    },
  ]

  // Context-aware prompts
  const contextPrompts = []
  
  if (pendingTasks > 0) {
    contextPrompts.push({
      icon: Target,
      label: highPriorityTasks > 0 ? `Prioritize ${highPriorityTasks} urgent tasks` : `Review ${pendingTasks} pending tasks`,
      prompt: highPriorityTasks > 0
        ? `Help me prioritize my ${highPriorityTasks} high-priority tasks.`
        : `Help me organize my ${pendingTasks} pending tasks.`,
      priority: 1,
    })
  }
  
  if (activeGoals > 0) {
    contextPrompts.push({
      icon: Target,
      label: "Check goals progress",
      prompt: "Show me the progress on my active goals and what I need to do next.",
      priority: 2,
    })
  }
  
  if (habits.length > 0) {
    contextPrompts.push({
      icon: Flame,
      label: "Log habits",
      prompt: "Help me log my habits for today.",
      priority: isMorning ? 2 : 3,
    })
  }
  
  if (!currentEntry && isMorning) {
    contextPrompts.push({
      icon: Play,
      label: "Start work session",
      prompt: "Clock me in and help me plan what to work on today.",
      priority: 1,
    })
  }
  
  if (currentEntry && isAfternoon) {
    contextPrompts.push({
      icon: Coffee,
      label: "Take a break",
      prompt: "I need a break. Start a 30-minute break for me.",
      priority: 2,
    })
  }

  // Combine and sort by priority
  const allPrompts = [...basePrompts, ...contextPrompts]
  allPrompts.sort((a, b) => a.priority - b.priority)
  
  // Return top 6 prompts
  return allPrompts.slice(0, 6).map(({ icon, label, prompt }) => ({ icon, label, prompt }))
}

const REQUEST_TIMEOUT_MS = 30000

export function FloatingAssistant() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const bubbleRef = useRef<HTMLButtonElement>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const dragMovedRef = useRef(false)
  const suppressClickRef = useRef(false)
  const {
    addTask,
    addNote,
    updateTask,
    deleteTask,
    toggleTask,
    updateNote,
    deleteNote,
    addGoal,
    updateGoal,
    deleteGoal,
    updateGoalProgress,
    addHabit,
    updateHabit,
    deleteHabit,
    logHabit,
    getHabitStreak,
    getHabitStats,
    tasks,
    notes,
    goals,
    habits,
    habitLogs,
    timeEntries,
    chatMessages,
    isChatOpen,
    toggleChat,
    addChatMessage,
    updateLastChatMessage,
    clearChatHistory,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    switchTask,
    currentEntry,
    activeBreak,
    getTimesheetStatus,
    getTasksSummary,
    getNotesSummary,
    createNewChatSession,
    saveCurrentChatSession,
    loadChatSession,
    deleteChatSession,
    currentChatSessionId,
    chatSessions,
  } = useAppStore(
    useShallow((state) => ({
      addTask: state.addTask,
      addNote: state.addNote,
      updateTask: state.updateTask,
      deleteTask: state.deleteTask,
      toggleTask: state.toggleTask,
      updateNote: state.updateNote,
      deleteNote: state.deleteNote,
      addGoal: state.addGoal,
      updateGoal: state.updateGoal,
      deleteGoal: state.deleteGoal,
      updateGoalProgress: state.updateGoalProgress,
      addHabit: state.addHabit,
      updateHabit: state.updateHabit,
      deleteHabit: state.deleteHabit,
      logHabit: state.logHabit,
      getHabitStreak: state.getHabitStreak,
      getHabitStats: state.getHabitStats,
      tasks: state.tasks,
      notes: state.notes,
      goals: state.goals,
      habits: state.habits,
      habitLogs: state.habitLogs,
      chatMessages: state.chatMessages,
      isChatOpen: state.isChatOpen,
      toggleChat: state.toggleChat,
      addChatMessage: state.addChatMessage,
      updateLastChatMessage: state.updateLastChatMessage,
      clearChatHistory: state.clearChatHistory,
      clockIn: state.clockIn,
      clockOut: state.clockOut,
      startBreak: state.startBreak,
      endBreak: state.endBreak,
      switchTask: state.switchTask,
      currentEntry: state.currentEntry,
      activeBreak: state.activeBreak,
      getTimesheetStatus: state.getTimesheetStatus,
      getTasksSummary: state.getTasksSummary,
      getNotesSummary: state.getNotesSummary,
      createNewChatSession: state.createNewChatSession,
      saveCurrentChatSession: state.saveCurrentChatSession,
      loadChatSession: state.loadChatSession,
      deleteChatSession: state.deleteChatSession,
      currentChatSessionId: state.currentChatSessionId,
      chatSessions: state.chatSessions,
      timeEntries: state.timeEntries,
    })),
  )
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [dockSide, setDockSide] = useState<"left" | "right">("left")
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
  const [bubblePosition, setBubblePosition] = useState<{ x: number; y: number } | null>(null)
  const [viewport, setViewport] = useState(() => {
    if (typeof window !== "undefined") {
      return { width: window.innerWidth, height: window.innerHeight }
    }
    return { width: 0, height: 0 }
  })

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, isLoading, scrollToBottom])

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(scrollToBottom, 100)
    }
  }, [isChatOpen, scrollToBottom])

  useEffect(() => {
    if (input.trim()) {
      setError(null)
    }
  }, [input])

  useEffect(() => {
    if (!currentChatSessionId) {
      createNewChatSession()
    }
  }, [])

  useEffect(() => {
    const savedSide = window.localStorage.getItem("assistantDockSide")
    if (savedSide === "left" || savedSide === "right") {
      setDockSide(savedSide)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("assistantDockSide", dockSide)
  }, [dockSide])

  useEffect(() => {
    const savedPos = window.localStorage.getItem("assistantBubblePosition")
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos) as { x: number; y: number }
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          // Validate position is within viewport bounds
          const isMobile = window.innerWidth < 768
          const bottomNavHeight = isMobile ? 96 : 0 // Account for bottom nav height (80px + padding)
          const maxX = window.innerWidth - 56 // button size
          const minY = isMobile ? bottomNavHeight + 16 : 16 // Account for bottom nav on mobile
          const maxY = Math.max(minY, window.innerHeight - 56)
          
          // Only use saved position if it's valid for current viewport
          if (parsed.x >= 0 && parsed.x <= maxX && parsed.y >= minY && parsed.y <= maxY) {
            setBubblePosition(parsed)
          } else {
            // Clear invalid saved position
            window.localStorage.removeItem("assistantBubblePosition")
          }
        }
      } catch {
        // ignore invalid storage
      }
    }
  }, [])

  useEffect(() => {
    if (bubblePosition) {
      window.localStorage.setItem("assistantBubblePosition", JSON.stringify(bubblePosition))
    }
  }, [bubblePosition])

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    updateViewport()
    window.addEventListener("resize", updateViewport)
    return () => window.removeEventListener("resize", updateViewport)
  }, [])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStartRef.current) return
      const { x, y } = dragStartRef.current
      if (Math.abs(event.clientX - x) > 4 || Math.abs(event.clientY - y) > 4) {
        dragMovedRef.current = true
      }
      const bubbleSize = 56
      const margin = 16
      const radius = bubbleSize / 2
      const maxX = Math.max(margin, window.innerWidth - bubbleSize - margin)
          const isMobile = window.innerWidth < 768
          const bottomNavHeight = isMobile ? 96 : 0 // Account for bottom nav height (80px + padding)
          const minY = isMobile ? bottomNavHeight + margin : margin // Account for bottom nav on mobile
          const maxY = Math.max(minY, window.innerHeight - bubbleSize - margin)
          const nextX = Math.min(maxX, Math.max(margin, event.clientX - radius))
          const nextY = Math.min(maxY, Math.max(minY, event.clientY - radius))
      setDragPosition({ x: nextX, y: nextY })
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (!dragStartRef.current) return
      setIsDragging(false)
      if (dragMovedRef.current) {
        const nextSide = event.clientX < window.innerWidth / 2 ? "left" : "right"
        setDockSide(nextSide)
        suppressClickRef.current = true
        window.setTimeout(() => {
          suppressClickRef.current = false
        }, 200)
      }
      if (dragPosition) {
        const margin = 16
        const bubbleSize = 56
        const isMobile = window.innerWidth < 768
        const bottomNavHeight = isMobile ? 96 : 0 // Account for bottom nav height (80px + padding)
        const minY = isMobile ? bottomNavHeight + margin : margin // Account for bottom nav on mobile
        const maxY = Math.max(minY, window.innerHeight - bubbleSize - margin)
        const snappedX = event.clientX < window.innerWidth / 2 ? margin : window.innerWidth - bubbleSize - margin
        const snappedY = Math.min(maxY, Math.max(minY, dragPosition.y))
        setBubblePosition({ x: snappedX, y: snappedY })
      }
      setDragPosition(null)
      dragStartRef.current = null
      dragMovedRef.current = false
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [dragPosition])

  useEffect(() => {
    saveCurrentChatSession()
  }, [chatMessages])

  const handleToolCalls = useCallback(
    async (toolCalls: ChatMessage["toolCalls"]) => {
      if (!toolCalls) return

      const results: Array<{ name: string; result: Record<string, unknown> }> = []

      for (const toolCall of toolCalls) {
        try {
          if (toolCall.name === "createTask") {
            const args = toolCall.arguments as {
              title: string
              priority: "low" | "medium" | "high"
              dueDate?: string
            }
            const exists = tasks.some((t) => t.title === args.title)
            if (!exists) {
              try {
                await addTask({ title: args.title, priority: args.priority, dueDate: args.dueDate, completed: false })
                results.push({ name: "createTask", result: { success: true, title: args.title } })
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                results.push({ 
                  name: "createTask", 
                  result: { success: false, message: errorMessage } 
                })
              }
            } else {
              results.push({ name: "createTask", result: { success: true, title: args.title, message: "Task already exists" } })
            }
          }

          if (toolCall.name === "createNote") {
            const args = toolCall.arguments as { title?: string; content?: string; category?: string; tags?: string[] }
            if (!args.title || !args.content) {
              results.push({ 
                name: "createNote", 
                result: { success: false, message: "Missing required fields: title and content are required" } 
              })
            } else {
              const exists = notes.some((n) => n.title === args.title)
              if (!exists) {
                try {
                  await addNote({ 
                    title: args.title, 
                    content: args.content,
                    category: args.category || "other",
                    tags: args.tags || []
                  })
                  results.push({ name: "createNote", result: { success: true, title: args.title } })
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : String(error)
                  results.push({ 
                    name: "createNote", 
                    result: { success: false, message: errorMessage } 
                  })
                }
              } else {
                results.push({ name: "createNote", result: { success: true, title: args.title, message: "Note already exists" } })
              }
            }
          }

          if (toolCall.name === "clockIn") {
            if (currentEntry) {
              results.push({ name: "clockIn", result: { success: false, message: "Already clocked in" } })
            } else {
              await clockIn()
              results.push({
                name: "clockIn",
                result: { success: true, message: "Clocked in successfully", time: new Date().toLocaleTimeString() },
              })
            }
          }

          if (toolCall.name === "clockOut") {
            if (!currentEntry) {
              results.push({ name: "clockOut", result: { success: false, message: "Not currently clocked in" } })
            } else {
              await clockOut()
              results.push({
                name: "clockOut",
                result: { success: true, message: "Clocked out successfully", time: new Date().toLocaleTimeString() },
              })
            }
          }

          if (toolCall.name === "startBreak") {
            const args = toolCall.arguments as { durationMinutes?: number; breakType?: "fixed" | "lunch" | "custom" }
            if (!currentEntry) {
              results.push({
                name: "startBreak",
                result: { success: false, message: "Must be clocked in to take a break" },
              })
            } else if (activeBreak) {
              results.push({ name: "startBreak", result: { success: false, message: "Already on a break" } })
            } else {
              startBreak(args.durationMinutes, args.breakType)
              results.push({
                name: "startBreak",
                result: {
                  success: true,
                  message: args.durationMinutes
                    ? `Started ${args.durationMinutes} minute break`
                    : "Started open-ended break",
                  duration: args.durationMinutes,
                },
              })
            }
          }

          if (toolCall.name === "endBreak") {
            if (!activeBreak) {
              results.push({ name: "endBreak", result: { success: false, message: "Not currently on a break" } })
            } else {
              try {
                await endBreak()
                results.push({ name: "endBreak", result: { success: true, message: "Break ended, back to work!" } })
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                results.push({ name: "endBreak", result: { success: false, message: errorMessage } })
              }
            }
          }

          if (toolCall.name === "getTimesheetStatus") {
            const status = getTimesheetStatus()
            results.push({ name: "getTimesheetStatus", result: status })
          }

          if (toolCall.name === "getAppSummary") {
            const tasksSummary = getTasksSummary()
            const notesSummary = getNotesSummary()
            const timesheetStatus = getTimesheetStatus()
            results.push({
              name: "getAppSummary",
              result: {
                tasks: tasksSummary,
                notes: notesSummary,
                timesheet: timesheetStatus,
              },
            })
          }
        } catch (error) {
          console.error(`[v0] Tool error for ${toolCall.name}:`, error)
          const errorMessage = error instanceof Error 
            ? error.message 
            : typeof error === 'string' 
              ? error 
              : error?.message || JSON.stringify(error)
          setError(`Error executing ${toolCall.name}: ${errorMessage}`)
        }
      }

      return results
    },
    [
      addTask,
      addNote,
      tasks,
      notes,
      clockIn,
      clockOut,
      startBreak,
      endBreak,
      currentEntry,
      activeBreak,
      getTimesheetStatus,
      getTasksSummary,
      getNotesSummary,
    ],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return

      if (text.length > 2000) {
        setError("Message is too long (max 2000 characters)")
        return
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: text,
      }

      addChatMessage(userMessage)
      setIsLoading(true)
      setError(null)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      }
      addChatMessage(assistantMessage)

      try {
        const allMessages = [...chatMessages, userMessage]

        const timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort()
        }, REQUEST_TIMEOUT_MS)

        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            appState: {
              tasks,
              notes,
              goals,
              habits,
              habitLogs,
              currentEntry,
              timeEntries,
            },
          }),
          signal: abortControllerRef.current?.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          let errorText = ""
          try {
            errorText = await response.text()
            // Try to parse as JSON for better error messages
            try {
              const errorJson = JSON.parse(errorText)
              errorText = errorJson.error || errorText
            } catch {
              // Not JSON, use as-is
            }
          } catch {
            errorText = `HTTP ${response.status}`
          }

          // Provide user-friendly error messages with actionable suggestions
          if (response.status === 429) {
            throw new Error("Too many requests. Please wait a moment and try again.")
          } else if (response.status === 500) {
            throw new Error("Server error. Please try again later. If the problem persists, check your connection.")
          } else if (response.status === 401) {
            throw new Error("Authentication required. Please sign in again.")
          } else if (response.status === 503) {
            throw new Error("Service temporarily unavailable. Please try again in a few moments.")
          } else if (response.status === 400) {
            throw new Error(errorText || "Invalid request. Please check your input and try again.")
          } else {
            throw new Error(errorText || `API error: ${response.status}. Please try again.`)
          }
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response stream")

        const decoder = new TextDecoder()
        let assistantContent = ""
        const toolCalls: ChatMessage["toolCalls"] = []
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed === "" || trimmed === "data: [DONE]") continue
            if (trimmed.startsWith("data: ")) {
              try {
                const dataStr = trimmed.slice(6).trim()
                if (!dataStr) continue

                const data = JSON.parse(dataStr)

                if (data.delta?.content) {
                  assistantContent += data.delta.content
                }

                if (data.content) {
                  assistantContent += data.content
                }

                if (data.toolResult && data.toolName) {
                  toolCalls.push({
                    name: data.toolName,
                    arguments: {},
                    result: data.toolResult,
                  })
                  
                  // Don't append tool results to assistantContent - the AI can see them in toolCalls context
                  // and will generate its own response without duplicating the tool result

                  if (data.toolAction) {
                    const { type, payload } = data.toolAction

                    switch (type) {
                      case "createTask":
                        const taskExists = tasks.some((t) => t.title === payload.title)
                        if (!taskExists) {
                          await addTask(payload)
                        }
                        break
                      case "createNote":
                        if (!payload.title || !payload.content) {
                          console.error("[v0] Missing required note fields:", payload)
                          break
                        }
                        const noteExists = notes.some((n) => n.title === payload.title)
                        if (!noteExists) {
                          try {
                            await addNote(payload)
                          } catch (error) {
                            console.error("[v0] Failed to create note:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to create note: ${errorMessage}`)
                          }
                        }
                        break
                      case "clockIn":
                        if (!currentEntry) {
                          await clockIn(payload.taskDescription)
                        }
                        break
                      case "clockOut":
                        if (currentEntry) {
                          await clockOut()
                        }
                        break
                      case "startBreak":
                        if (currentEntry && !activeBreak) {
                          startBreak(payload.durationMinutes, payload.breakType)
                        }
                        break
                      case "endBreak":
                        if (activeBreak) {
                          try {
                            await endBreak()
                          } catch (error) {
                            console.error("[v0] Failed to end break:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to end break: ${errorMessage}`)
                          }
                        }
                        break
                      case "switchTask":
                        if (currentEntry && payload.newTaskTitle) {
                          try {
                            await switchTask(payload.newTaskTitle)
                          } catch (error) {
                            console.error("[v0] Failed to switch task:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to switch task: ${errorMessage}`)
                          }
                        }
                        break
                      case "updateTask":
                        if (payload.id) {
                          try {
                            await updateTask(payload.id, {
                              title: payload.title,
                              priority: payload.priority,
                              urgency: payload.urgency,
                              dueDate: payload.dueDate,
                              completed: payload.completed,
                            })
                          } catch (error) {
                            console.error("[v0] Failed to update task:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to update task: ${errorMessage}`)
                          }
                        }
                        break
                      case "deleteTask":
                        if (payload.id) {
                          try {
                            await deleteTask(payload.id)
                          } catch (error) {
                            console.error("[v0] Failed to delete task:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to delete task: ${errorMessage}`)
                          }
                        }
                        break
                      case "completeTask":
                        if (payload.id) {
                          try {
                            await toggleTask(payload.id, true)
                          } catch (error) {
                            console.error("[v0] Failed to complete task:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to complete task: ${errorMessage}`)
                          }
                        }
                        break
                      case "updateNote":
                        if (payload.id) {
                          try {
                            await updateNote(payload.id, {
                              title: payload.title,
                              content: payload.content,
                              category: payload.category,
                              tags: payload.tags,
                            })
                          } catch (error) {
                            console.error("[v0] Failed to update note:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to update note: ${errorMessage}`)
                          }
                        }
                        break
                      case "deleteNote":
                        if (payload.id) {
                          try {
                            await deleteNote(payload.id)
                          } catch (error) {
                            console.error("[v0] Failed to delete note:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to delete note: ${errorMessage}`)
                          }
                        }
                        break
                      case "createGoal":
                        try {
                          await addGoal({
                            title: payload.title,
                            description: payload.description,
                            targetDate: payload.targetDate,
                            category: payload.category,
                            status: payload.status || "active",
                            progress: payload.progress || 0,
                            milestones: [],
                          })
                        } catch (error) {
                          console.error("[v0] Failed to create goal:", error)
                          const errorMessage = error instanceof Error ? error.message : String(error)
                          setError(`Failed to create goal: ${errorMessage}`)
                        }
                        break
                      case "updateGoal":
                        if (payload.id) {
                          try {
                            await updateGoal(payload.id, {
                              title: payload.title,
                              description: payload.description,
                              targetDate: payload.targetDate,
                              progress: payload.progress,
                              status: payload.status,
                              category: payload.category,
                            })
                          } catch (error) {
                            console.error("[v0] Failed to update goal:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to update goal: ${errorMessage}`)
                          }
                        }
                        break
                      case "deleteGoal":
                        if (payload.id) {
                          try {
                            await deleteGoal(payload.id)
                          } catch (error) {
                            console.error("[v0] Failed to delete goal:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to delete goal: ${errorMessage}`)
                          }
                        }
                        break
                      case "updateGoalProgress":
                        if (payload.id && payload.progress !== undefined) {
                          try {
                            await updateGoalProgress(payload.id, payload.progress)
                          } catch (error) {
                            console.error("[v0] Failed to update goal progress:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to update goal progress: ${errorMessage}`)
                          }
                        }
                        break
                      case "createHabit":
                        try {
                          await addHabit({
                            title: payload.title,
                            description: payload.description,
                            frequency: payload.frequency || "daily",
                            targetCount: payload.targetCount || 1,
                            color: payload.color || "#3b82f6",
                          })
                        } catch (error) {
                          console.error("[v0] Failed to create habit:", error)
                          const errorMessage = error instanceof Error ? error.message : String(error)
                          setError(`Failed to create habit: ${errorMessage}`)
                        }
                        break
                      case "updateHabit":
                        if (payload.id) {
                          try {
                            await updateHabit(payload.id, {
                              title: payload.title,
                              description: payload.description,
                              frequency: payload.frequency,
                              targetCount: payload.targetCount,
                              color: payload.color,
                            })
                          } catch (error) {
                            console.error("[v0] Failed to update habit:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to update habit: ${errorMessage}`)
                          }
                        }
                        break
                      case "deleteHabit":
                        if (payload.id) {
                          try {
                            await deleteHabit(payload.id)
                          } catch (error) {
                            console.error("[v0] Failed to delete habit:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to delete habit: ${errorMessage}`)
                          }
                        }
                        break
                      case "logHabit":
                        if (payload.habitId) {
                          try {
                            await logHabit(payload.habitId, payload.date || new Date().toISOString().split("T")[0], payload.count)
                          } catch (error) {
                            console.error("[v0] Failed to log habit:", error)
                            const errorMessage = error instanceof Error ? error.message : String(error)
                            setError(`Failed to log habit: ${errorMessage}`)
                          }
                        }
                        break
                    }
                  }
                }
              } catch (parseError) {
                console.error("[v0] JSON parse error:", parseError)
              }
            }
          }
        }

        if (assistantContent.trim() || toolCalls.length > 0) {
          updateLastChatMessage({
            content: assistantContent || "(Tool executed successfully)",
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          })
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          setError("Request timed out. Please try again.")
          updateLastChatMessage({ content: "Error: Request timed out. Please try again." })
        } else {
          const errorMessage = error instanceof Error 
            ? error.message 
            : typeof error === 'string' 
              ? error 
              : "An error occurred. Please try again."
          setError(errorMessage)
          updateLastChatMessage({ content: `Error: ${errorMessage}` })
        }
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [chatMessages, isLoading, handleToolCalls, addChatMessage, updateLastChatMessage, tasks, notes, currentEntry, timeEntries],
  )

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput("")
  }

  const handleSuggestedPrompt = (prompt: string) => {
    if (isLoading) return
    sendMessage(prompt)
  }

  // Modified handleNewChat to save current session and reset state
  const handleNewChat = useCallback(() => {
    saveCurrentChatSession()
    createNewChatSession()
    setInput("")
    setError(null)
    setIsLoading(false)
    setShowHistory(false) // Close history panel when starting a new chat
    setTimeout(() => {
      const input = document.querySelector("[data-chat-input]") as HTMLTextAreaElement
      if (input) {
        input.focus()
      }
    }, 100)
  }, [saveCurrentChatSession, createNewChatSession])

  const handleLoadSession = useCallback(
    (sessionId: string) => {
      saveCurrentChatSession() // Save the current chat before loading a new one
      loadChatSession(sessionId)
      setShowHistory(false) // Close history panel after loading
    },
    [saveCurrentChatSession, loadChatSession],
  )

  const handleDeleteSession = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation() // Prevent triggering handleLoadSession
      deleteChatSession(sessionId)
    },
    [deleteChatSession],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault()
        handleNewChat()
      }
    }
    if (isChatOpen) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isChatOpen, handleNewChat])

  const renderToolResult = (
    toolCall: { name: string; arguments?: Record<string, unknown>; result?: string },
    index: number,
  ) => {
    if (toolCall.name === "createTask") {
      const args = (toolCall.arguments || {}) as { title?: string; priority?: string }
      return (
        <Card key={index} className="mt-2 bg-background/50">
          <CardContent className="p-2 flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-green-500" />
            <span className="text-xs">
              Created task: <strong>{args.title || "Untitled"}</strong>
            </span>
          </CardContent>
        </Card>
      )
    }
    if (toolCall.name === "createNote") {
      const args = (toolCall.arguments || {}) as { title?: string }
      return (
        <Card key={index} className="mt-2 bg-background/50">
          <CardContent className="p-2 flex items-center gap-2">
            <FileText className="size-3.5 text-blue-500" />
            <span className="text-xs">
              Created note: <strong>{args.title || "Untitled"}</strong>
            </span>
          </CardContent>
        </Card>
      )
    }
    if (toolCall.name === "clockIn") {
      return (
        <Card key={index} className="mt-2 bg-background/50 border-green-500/30">
          <CardContent className="p-2 flex items-center gap-2">
            <Play className="size-3.5 text-green-500" />
            <span className="text-xs text-green-500 font-medium">Clocked in</span>
          </CardContent>
        </Card>
      )
    }
    if (toolCall.name === "clockOut") {
      return (
        <Card key={index} className="mt-2 bg-background/50 border-red-500/30">
          <CardContent className="p-2 flex items-center gap-2">
            <Square className="size-3.5 text-red-500" />
            <span className="text-xs text-red-500 font-medium">Clocked out</span>
          </CardContent>
        </Card>
      )
    }
    if (toolCall.name === "startBreak") {
      const args = (toolCall.arguments || {}) as { durationMinutes?: number; breakType?: string }
      return (
        <Card key={index} className="mt-2 bg-background/50 border-amber-500/30">
          <CardContent className="p-2 flex items-center gap-2">
            <Coffee className="size-3.5 text-amber-500" />
            <span className="text-xs text-amber-500 font-medium">
              {args.durationMinutes ? `Started ${args.durationMinutes}min break` : "Started break"}
            </span>
          </CardContent>
        </Card>
      )
    }
    if (toolCall.name === "endBreak") {
      return (
        <Card key={index} className="mt-2 bg-background/50 border-primary/30">
          <CardContent className="p-2 flex items-center gap-2">
            <Play className="size-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">Break ended</span>
          </CardContent>
        </Card>
      )
    }
    if (toolCall.name === "switchTask") {
      const args = (toolCall.arguments || {}) as { newTaskTitle?: string }
      return (
        <Card key={index} className="mt-2 bg-background/50 border-blue-500/30">
          <CardContent className="p-2 flex items-center gap-2">
            <Play className="size-3.5 text-blue-500" />
            <span className="text-xs text-blue-500 font-medium">
              Switched to: <strong>{args.newTaskTitle || "New task"}</strong>
            </span>
          </CardContent>
        </Card>
      )
    }
    if (toolCall.name === "getTimesheetStatus" || toolCall.name === "getAppSummary") {
      return (
        <Card key={index} className="mt-2 bg-background/50 border-primary/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="size-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {toolCall.name === "getAppSummary" ? "Daily Summary" : "Timesheet Status"}
              </span>
            </div>
            {toolCall.result && (
              <p className="text-sm whitespace-pre-wrap text-foreground/90">
                {typeof toolCall.result === "string" ? toolCall.result : JSON.stringify(toolCall.result, null, 2)}
              </p>
            )}
          </CardContent>
        </Card>
      )
    }
    // Don't display summary tool results as separate cards - the AI will summarize them in its response
    // This prevents duplication where both the tool result card and AI response show the same information
    if (["getGoalsSummary", "getHabitsSummary", "getCalendarEvents", "getTimesheetStatus", "getAppSummary", "getNotesSummary"].includes(toolCall.name)) {
      return null // Don't render summary tool results as cards - AI will include them in response
    }
    if (toolCall.name === "getHabitsSummary") {
      return (
        <Card key={index} className="mt-2 bg-background/50 border-primary/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="size-4 text-primary" />
              <span className="text-sm font-medium text-primary">Habits Summary</span>
            </div>
            {toolCall.result && (
              <p className="text-sm whitespace-pre-wrap text-foreground/90">
                {typeof toolCall.result === "string" ? toolCall.result : JSON.stringify(toolCall.result, null, 2)}
              </p>
            )}
          </CardContent>
        </Card>
      )
    }
    if (toolCall.name === "getCalendarEvents") {
      return (
        <Card key={index} className="mt-2 bg-background/50 border-primary/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="size-4 text-primary" />
              <span className="text-sm font-medium text-primary">Calendar Events</span>
            </div>
            {toolCall.result && (
              <p className="text-sm whitespace-pre-wrap text-foreground/90">
                {typeof toolCall.result === "string" ? toolCall.result : JSON.stringify(toolCall.result, null, 2)}
              </p>
            )}
          </CardContent>
        </Card>
      )
    }
    return null
  }

  const desktopPanelSize = { width: 420, height: 650 }
  const panelGap = 16
  const bubbleSize = 56
  const bubblePos = dragPosition || bubblePosition
  const isDesktop = viewport.width >= 768
  const panelStyle = (() => {
    if (!isDesktop || !bubblePos) return undefined
    const centerX = bubblePos.x + bubbleSize / 2
    const preferredTop = bubblePos.y - desktopPanelSize.height - panelGap
    const hasSpaceAbove = preferredTop >= panelGap
    const rawTop = hasSpaceAbove ? preferredTop : bubblePos.y + bubbleSize + panelGap
    const maxTop = Math.max(panelGap, viewport.height - desktopPanelSize.height - panelGap)
    const top = Math.min(maxTop, Math.max(panelGap, rawTop))
    const maxLeft = Math.max(panelGap, viewport.width - desktopPanelSize.width - panelGap)
    const left = Math.min(maxLeft, Math.max(panelGap, centerX - desktopPanelSize.width / 2))
    return { left: `${left}px`, top: `${top}px` }
  })()

  // Always render the bubble button - ensure it's always in DOM
  if (typeof window === "undefined") {
    return null // SSR guard
  }

  // Debug: Log when component renders
  useEffect(() => {
    console.log("FloatingAssistant mounted, isChatOpen:", isChatOpen, "viewport:", viewport)
  }, [])

  return (
    <>
      {/* Floating Bubble Button - Always visible on mobile */}
      <button
        ref={bubbleRef}
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch (e) {
            // Pointer capture may fail on some devices, continue anyway
          }
          dragStartRef.current = { x: event.clientX, y: event.clientY }
          dragMovedRef.current = false
          suppressClickRef.current = false
          setIsDragging(true)
        }}
        onTouchStart={(event) => {
          // Handle touch start for better mobile support
          if (event.touches.length === 1) {
            const touch = event.touches[0]
            dragStartRef.current = { x: touch.clientX, y: touch.clientY }
            dragMovedRef.current = false
            suppressClickRef.current = false
            setIsDragging(true)
          }
        }}
        onTouchMove={(event) => {
          // Handle touch move for better mobile support
          if (dragStartRef.current && event.touches.length === 1) {
            event.preventDefault()
            event.stopPropagation()
            const touch = event.touches[0]
            const { x, y } = dragStartRef.current
            if (Math.abs(touch.clientX - x) > 4 || Math.abs(touch.clientY - y) > 4) {
              dragMovedRef.current = true
              setIsDragging(true)
            }
            const bubbleSize = 56
            const margin = 16
            const radius = bubbleSize / 2
            const isMobile = window.innerWidth < 768
            const bottomNavHeight = isMobile ? 96 : 0 // Account for bottom nav height (80px + padding)
            const minY = isMobile ? bottomNavHeight + margin : margin // Account for bottom nav on mobile
            const maxX = Math.max(margin, window.innerWidth - bubbleSize - margin)
            const maxY = Math.max(minY, window.innerHeight - bubbleSize - margin)
            const nextX = Math.min(maxX, Math.max(margin, touch.clientX - radius))
            const nextY = Math.min(maxY, Math.max(minY, touch.clientY - radius))
            setDragPosition({ x: nextX, y: nextY })
          }
        }}
        onTouchEnd={(event) => {
          // Handle touch end for better mobile support
          if (dragStartRef.current) {
            setIsDragging(false)
            if (dragMovedRef.current) {
              const touch = event.changedTouches[0] || event.touches[0]
              if (touch) {
                const nextSide = touch.clientX < window.innerWidth / 2 ? "left" : "right"
                setDockSide(nextSide)
              }
              suppressClickRef.current = true
              window.setTimeout(() => {
                suppressClickRef.current = false
              }, 200)
            }
            if (dragPosition) {
              const touch = event.changedTouches[0] || event.touches[0]
              if (touch) {
                const margin = 16
                const bubbleSize = 56
                const isMobile = window.innerWidth < 768
                const bottomNavHeight = isMobile ? 96 : 0 // Account for bottom nav height (80px + padding)
                const minY = isMobile ? bottomNavHeight + margin : margin
                const maxY = Math.max(minY, window.innerHeight - bubbleSize - margin)
                const snappedX = touch.clientX < window.innerWidth / 2 ? margin : window.innerWidth - bubbleSize - margin
                const snappedY = Math.min(maxY, Math.max(minY, dragPosition.y))
                setBubblePosition({ x: snappedX, y: snappedY })
              }
            }
            setDragPosition(null)
            dragStartRef.current = null
            dragMovedRef.current = false
          }
        }}
        onClick={() => {
          if (!dragMovedRef.current && !suppressClickRef.current) {
            toggleChat()
          }
        }}
        className={cn(
          "fixed size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center z-[60] hover:scale-110 cursor-grab transition-all duration-300 touch-none select-none",
          isDragging && "scale-110 cursor-grabbing shadow-2xl ring-2 ring-primary/40",
          isDragging && "transition-none",
          !isDragging && !bubblePosition && "bottom-24 lg:bottom-6",
          !isDragging && !bubblePosition && (dockSide === "left" ? "left-4 lg:left-6" : "right-4 lg:right-6"),
          isChatOpen && "hidden",
        )}
        style={{
          touchAction: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          ...((isDragging && dragPosition) || bubblePosition
            ? (() => {
                const pos = dragPosition || bubblePosition
                if (!pos) return {}
                
                // Ensure position is within viewport bounds
                const isMobile = viewport.width < 768 || window.innerWidth < 768
                const buttonSize = 56
                const bottomNavHeight = isMobile ? 96 : 0 // Account for bottom nav height (80px + padding)
                const minY = isMobile ? bottomNavHeight + 16 : 16 // Account for bottom nav on mobile
                const maxX = Math.max(16, (viewport.width || window.innerWidth) - buttonSize - 16)
                const maxY = Math.max(minY, (viewport.height || window.innerHeight) - buttonSize - 16)
                
                const clampedX = Math.min(maxX, Math.max(16, pos.x))
                const clampedY = Math.min(maxY, Math.max(minY, pos.y))
                
                return {
                  left: `${clampedX}px`,
                  top: `${clampedY}px`,
                }
              })()
            : undefined),
        }}
        aria-label="Open AI Assistant"
        data-testid="floating-assistant-button"
      >
        <MessageCircle className="size-6" />
      </button>

      {isChatOpen && (
        // Adjusted size and added overflow-hidden for rounded corners
        <div
          className={cn(
            "fixed w-full md:w-[420px] h-screen md:h-[650px] bg-background rounded-none md:rounded-xl shadow-2xl border-0 md:border border-border flex flex-col z-50 overflow-hidden",
            !isDesktop && "left-0 bottom-0",
            isDesktop && !panelStyle && (dockSide === "left" ? "left-4 bottom-4" : "right-4 bottom-4"),
            "pb-safe",
          )}
          style={panelStyle}
        >
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              {showHistory ? (
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <ArrowLeft className="size-5 text-foreground" />
                </button>
              ) : (
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="size-5 text-primary" />
                </div>
              )}
              <div>
                <h2 className="font-semibold text-foreground">{showHistory ? "Chat History" : "AI Assistant"}</h2>
                {!showHistory && <p className="text-xs text-muted-foreground">Your personal productivity helper</p>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!showHistory && (
                <>
                  <button
                    onClick={handleNewChat}
                    className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    title="New Chat (Ctrl+N)"
                  >
                    <Plus className="size-4 text-muted-foreground hover:text-foreground" />
                  </button>
                  <button
                    onClick={() => setShowHistory(true)}
                    className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    title="Chat History"
                  >
                    <History className="size-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </>
              )}
              <button
                onClick={toggleChat}
                className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                title="Close"
              >
                <X className="size-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>

          {showHistory ? (
            // Chat History Panel
            <div className="flex-1 overflow-y-auto">
              {chatSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="size-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                    <History className="size-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No chat history yet</h3>
                  <p className="text-sm text-muted-foreground mb-6">Start a conversation to see it here</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 bg-transparent"
                    onClick={() => setShowHistory(false)} // Navigate back to chat
                  >
                    <Plus className="size-4 mr-2" />
                    Start New Chat
                  </Button>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {chatSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => handleLoadSession(session.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-xl transition-all group",
                        "hover:bg-secondary/50 border border-transparent hover:border-border",
                        currentChatSessionId === session.id && "bg-primary/5 border-primary/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{session.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {session.messages.length} message{session.messages.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(session.updatedAt).toLocaleDateString()}
                          </span>
                          <button
                            onClick={(e) => handleDeleteSession(e, session.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Chat Messages Panel
            <>
              {/* Removed original empty state, now handled within the chatMessages panel */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                {chatMessages.length === 0 ? (
                  // Empty state for the chat interface
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <Bot className="size-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">How can I help you today?</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
                      I can help manage your tasks, notes, and timesheet. Try one of these:
                    </p>
                    <div className="grid grid-cols-2 gap-2 w-full max-w-[320px]">
                      {getSuggestedPrompts(tasks, goals, habits, currentEntry, timeEntries).map((item, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestedPrompt(item.prompt)}
                          disabled={isLoading}
                          className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 text-left transition-colors disabled:opacity-50 border border-transparent hover:border-border"
                        >
                          <item.icon className="size-4 text-primary shrink-0" />
                          <span className="text-xs font-medium text-foreground">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                    >
                      {message.role === "assistant" && (
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="size-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-secondary/50 text-foreground rounded-bl-md",
                        )}
                      >
                        {message.role === "assistant" ? (
                          <div className="w-full">
                            {message.content.trim() ? (
                              <>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1">
                                    <AIMessage content={message.content} />
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        navigator.clipboard.writeText(message.content)
                                        toast({
                                          title: "Copied",
                                          description: "Message copied to clipboard",
                                          duration: 2000,
                                        })
                                      }}
                                      title="Copy message"
                                    >
                                      <Copy className="size-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        if (chatMessages.length > 0) {
                                          const lastUserMessage = [...chatMessages]
                                            .reverse()
                                            .find((m) => m.role === "user")
                                          if (lastUserMessage) {
                                            sendMessage(lastUserMessage.content)
                                          }
                                        }
                                      }}
                                      title="Regenerate response"
                                    >
                                      <RotateCw className="size-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                {message.id && (
                                  <AIFeedback
                                    messageId={message.id}
                                    sessionId={currentChatSessionId}
                                  />
                                )}
                              </>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        )}
                        {message.toolCalls?.map((toolCall, index) => renderToolResult(toolCall, index))}
                      </div>
                      {message.role === "user" && (
                        <div className="size-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <User className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="size-4 text-primary animate-pulse" />
                    </div>
                    <div className="bg-secondary/50 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div
                            className="size-2 bg-primary/60 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <div
                            className="size-2 bg-primary/60 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <div
                            className="size-2 bg-primary/60 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground ml-1">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Error display */}
              {error && (
                <div className="mx-4 mb-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              {/* Input area */}
              {/* Adjusted styling for the input area */}
              <div className="p-4 border-t border-border bg-background/50">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      data-chat-input
                      placeholder="Ask me anything..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      className="min-h-[48px] max-h-[120px] resize-none pr-12 rounded-xl bg-secondary/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
                      disabled={isLoading}
                    />
                    <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{input.length}/2000</span>
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="size-12 rounded-xl shrink-0"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
