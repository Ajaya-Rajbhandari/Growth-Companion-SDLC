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
} from "lucide-react"
import { cn } from "@/lib/utils"

const suggestedPrompts = [
  {
    icon: Target,
    label: "Plan my day",
    prompt: "Help me plan my day effectively based on my current tasks and schedule.",
  },
  {
    icon: Clock,
    label: "Clock in",
    prompt: "Clock me in to start tracking my work time.",
  },
  {
    icon: BarChart3,
    label: "Time status",
    prompt: "What's my timesheet status? How many hours have I worked today?",
  },
  {
    icon: Brain,
    label: "Daily summary",
    prompt: "Give me a summary of my tasks, notes, and time tracked for today.",
  },
  {
    icon: MessageCircle,
    label: "How to use",
    prompt: "Show me how to use the different features in this app. Where can I find things?",
  },
  {
    icon: AlertCircle,
    label: "Need help?",
    prompt: "I need help navigating the app. What can I do here?",
  },
]

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
    tasks,
    notes,
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
    timeEntries,
  } = useAppStore(
    useShallow((state) => ({
      addTask: state.addTask,
      addNote: state.addNote,
      tasks: state.tasks,
      notes: state.notes,
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
  const [viewport, setViewport] = useState({ width: 0, height: 0 })

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
          setBubblePosition(parsed)
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
      const maxY = Math.max(margin, window.innerHeight - bubbleSize - margin)
      const nextX = Math.min(maxX, Math.max(margin, event.clientX - radius))
      const nextY = Math.min(maxY, Math.max(margin, event.clientY - radius))
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
        const maxY = Math.max(margin, window.innerHeight - bubbleSize - margin)
        const snappedX = event.clientX < window.innerWidth / 2 ? margin : window.innerWidth - bubbleSize - margin
        const snappedY = Math.min(maxY, Math.max(margin, dragPosition.y))
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
              await addTask({ title: args.title, priority: args.priority, dueDate: args.dueDate, completed: false })
            }
            results.push({ name: "createTask", result: { success: true, title: args.title } })
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
                await addNote({ 
                  title: args.title, 
                  content: args.content,
                  category: args.category || "other",
                  tags: args.tags || []
                })
              }
              results.push({ name: "createNote", result: { success: true, title: args.title } })
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
              endBreak()
              results.push({ name: "endBreak", result: { success: true, message: "Break ended, back to work!" } })
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
          setError(`Error executing ${toolCall.name}: ${String(error)}`)
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

          if (response.status === 429) {
            throw new Error("Too many requests. Please wait a moment and try again.")
          } else if (response.status === 500) {
            throw new Error(errorText || "Server error. Please try again later.")
          } else if (response.status === 401) {
            throw new Error("Authentication required. Please sign in again.")
          } else {
            throw new Error(errorText || `API error: ${response.status}`)
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
                          await addNote(payload)
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
                          endBreak()
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

  return (
    <>
      {/* Floating Bubble Button */}
      <button
        ref={bubbleRef}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          dragStartRef.current = { x: event.clientX, y: event.clientY }
          dragMovedRef.current = false
          suppressClickRef.current = false
          setIsDragging(true)
        }}
        onClick={() => {
          if (!dragMovedRef.current && !suppressClickRef.current) {
            toggleChat()
          }
        }}
        className={cn(
          "fixed size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center z-40 hover:scale-110 cursor-grab transition-all duration-300",
          isDragging && "scale-110 cursor-grabbing shadow-2xl ring-2 ring-primary/40",
          isDragging && "transition-none",
          !isDragging && !bubblePosition && "bottom-6",
          !isDragging && !bubblePosition && (dockSide === "left" ? "left-6" : "right-6"),
          isChatOpen && "scale-0",
        )}
        style={
          (isDragging && dragPosition) || bubblePosition
            ? {
                left: `${(dragPosition || bubblePosition)?.x}px`,
                top: `${(dragPosition || bubblePosition)?.y}px`,
              }
            : undefined
        }
        aria-label="Open AI Assistant"
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
                      {suggestedPrompts.map((item, index) => (
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
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
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
                      <Bot className="size-4 text-primary" />
                    </div>
                    <div className="bg-secondary/50 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        <div
                          className="size-2 bg-primary/40 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="size-2 bg-primary/40 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="size-2 bg-primary/40 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
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
