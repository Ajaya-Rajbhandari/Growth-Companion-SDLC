"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
  playNotificationSound,
  stopNotificationSound,
  getStoredSoundId,
  unlockNotificationAudio,
  type NotificationSoundId,
} from "@/lib/notification-sound"
import { Play, Square, ClipboardList, ExternalLink, Clock, Coffee } from "lucide-react"

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

type BreakType = "short" | "lunch" | "custom"

const BREAK_TYPE_OPTIONS: { type: BreakType; label: string; defaultMinutes: number }[] = [
  { type: "short", label: "Short (15m)", defaultMinutes: 15 },
  { type: "lunch", label: "Lunch (60m)", defaultMinutes: 60 },
  { type: "custom", label: "Custom", defaultMinutes: 15 },
]

function getBreakTypeLabel(type: BreakType, title?: string | null): string {
  if (type === "custom" && title?.trim()) return title.trim()
  switch (type) {
    case "short": return "Short Break"
    case "lunch": return "Lunch Break"
    default: return "Break"
  }
}

export default function WidgetPage() {
  const router = useRouter()
  const [workTitle, setWorkTitle] = useState("")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [breakTimeRemaining, setBreakTimeRemaining] = useState<{ minutes: number; seconds: number } | null>(null)
  const [breakElapsed, setBreakElapsed] = useState({ minutes: 0, seconds: 0 })
  const [breakEndedAlert, setBreakEndedAlert] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationSoundId, setNotificationSoundId] = useState<NotificationSoundId>("default")
  const [breakType, setBreakType] = useState<BreakType>("short")
  const [breakMinutes, setBreakMinutes] = useState("15")
  const [breakTitle, setBreakTitle] = useState("")

  const {
    currentEntry,
    activeBreak,
    clockIn,
    clockOut,
    switchTask,
    startBreak,
    endBreak,
    isLoggedIn,
    authInitialized,
    fetchInitialData,
    getTodayTimeEntries,
    timeEntries,
    getTopTemplates,
  } = useAppStore(
    useShallow((state) => ({
      currentEntry: state.currentEntry,
      activeBreak: state.activeBreak,
      clockIn: state.clockIn,
      clockOut: state.clockOut,
      switchTask: state.switchTask,
      startBreak: state.startBreak,
      endBreak: state.endBreak,
      isLoggedIn: state.isLoggedIn,
      authInitialized: state.authInitialized,
      fetchInitialData: state.fetchInitialData,
      getTodayTimeEntries: state.getTodayTimeEntries,
      timeEntries: state.timeEntries,
      getTopTemplates: state.getTopTemplates,
    })),
  )

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const suggestAbortRef = useRef<AbortController | null>(null)
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const operationRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const v = localStorage.getItem("companion-sound-enabled")
      if (v !== null) setSoundEnabled(v === "true")
      setNotificationSoundId(getStoredSoundId())
    } catch {}
  }, [])

  const fetchTaskTitleSuggestions = useCallback(
    (draft: string) => {
      suggestAbortRef.current?.abort()
      suggestAbortRef.current = new AbortController()
      setSuggestionsLoading(true)
      const recentFromTemplates = getTopTemplates().slice(0, 8).map((t) => t.title)
      const recentFromEntries = [...timeEntries]
        .filter((e) => e.title && e.clockOut)
        .reverse()
        .slice(0, 12)
        .map((e) => e.title as string)
      const recentTitles = Array.from(new Set([...recentFromTemplates, ...recentFromEntries]))
      fetch("/api/suggest-task-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: draft.slice(0, 200),
          recentTitles,
          currentTask: currentEntry?.title || undefined,
        }),
        signal: suggestAbortRef.current.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.suggestions)) setAiSuggestions(data.suggestions)
        })
        .catch(() => setAiSuggestions([]))
        .finally(() => {
          setSuggestionsLoading(false)
          suggestAbortRef.current = null
        })
    },
    [timeEntries, currentEntry?.title, getTopTemplates],
  )

  useEffect(() => {
    document.title = "Quick actions — Companion"
    return () => { document.title = "Companion - Personal Assistant" }
  }, [])

  useEffect(() => {
    if (!currentEntry || activeBreak) return
    setAiSuggestions([])
    fetchTaskTitleSuggestions("")
  }, [currentEntry, activeBreak, fetchTaskTitleSuggestions])

  useEffect(() => {
    if (!currentEntry || activeBreak) return
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current)
    const draft = newTaskTitle.trim()
    if (draft.length < 2) return
    suggestDebounceRef.current = setTimeout(() => {
      fetchTaskTitleSuggestions(draft)
      suggestDebounceRef.current = null
    }, 500)
    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current)
    }
  }, [currentEntry, activeBreak, newTaskTitle, fetchTaskTitleSuggestions])

  useEffect(() => {
    if (authInitialized && !isLoggedIn) {
      router.push("/auth")
      return
    }
    if (isLoggedIn) {
      fetchInitialData()
    }
  }, [authInitialized, isLoggedIn, router, fetchInitialData])

  const playAlarm = useCallback(() => {
    if (soundEnabled) playNotificationSound(notificationSoundId, true)
    setBreakEndedAlert(true)
    toast({ title: "Break time has ended", description: "Click Resume to get back to work.", duration: 10000 })
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const n = new Notification("Break ended — Companion", {
          body: "Your break time is over. Click to return and resume work.",
          icon: "/icon-192x192.png",
        })
        n.onclick = () => window.focus()
      } catch {}
    }
  }, [soundEnabled, notificationSoundId])

  const stopAlarm = useCallback(() => {
    stopNotificationSound()
    setBreakEndedAlert(false)
  }, [])

  useEffect(() => {
    if (activeBreak) {
      const updateBreakTime = () => {
        const startTime = new Date(activeBreak.startTime).getTime()
        const now = Date.now()
        const elapsedMs = now - startTime
        const elapsedMins = Math.floor(elapsedMs / (1000 * 60))
        const elapsedSecs = Math.floor((elapsedMs % (1000 * 60)) / 1000)
        setBreakElapsed({ minutes: elapsedMins, seconds: elapsedSecs })
        if (activeBreak.durationMinutes) {
          const totalBreakMs = activeBreak.durationMinutes * 60 * 1000
          const remainingMs = Math.max(0, totalBreakMs - elapsedMs)
          if (remainingMs <= 0 && !breakEndedAlert) playAlarm()
          const remainingMins = Math.floor(remainingMs / (1000 * 60))
          const remainingSecs = Math.floor((remainingMs % (1000 * 60)) / 1000)
          setBreakTimeRemaining({ minutes: remainingMins, seconds: remainingSecs })
        } else {
          setBreakTimeRemaining(null)
        }
      }
      updateBreakTime()
      const interval = setInterval(updateBreakTime, 1000)
      return () => clearInterval(interval)
    } else {
      setBreakTimeRemaining(null)
      setBreakElapsed({ minutes: 0, seconds: 0 })
      stopAlarm()
    }
  }, [activeBreak, breakEndedAlert, playAlarm, stopAlarm])

  const handleStartBreak = async () => {
    if (operationRef.current) return
    operationRef.current = true
    setIsLoading(true)

    try {
      unlockNotificationAudio()
      const mins = breakType === "custom"
        ? (breakMinutes.trim() ? Number.parseInt(breakMinutes, 10) : 15)
        : BREAK_TYPE_OPTIONS.find((o) => o.type === breakType)?.defaultMinutes ?? 15
      if (breakType === "custom" && (!breakMinutes.trim() || isNaN(Number.parseInt(breakMinutes, 10)))) {
        toast({ title: "Invalid duration", description: "Enter break duration in minutes.", variant: "destructive" })
        return
      }
      if (mins <= 0 || mins > 480) {
        toast({ title: "Invalid duration", description: "Use 1–480 minutes.", variant: "destructive" })
        return
      }
      const title = breakTitle.trim() || undefined
      await startBreak(mins, breakType, title)
      toast({
        title: "Break started",
        description: title ? `${title} — ${mins} min` : `${mins} minute ${breakType} break.`,
      })
      setBreakTitle("")
    } catch (error) {
      console.error("[handleStartBreak]", error)
      toast({
        title: "Break failed",
        description: error instanceof Error ? error.message : "Could not start break",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      operationRef.current = false
    }
  }

  const handleEndBreak = async () => {
    if (operationRef.current) return
    operationRef.current = true
    setIsLoading(true)

    try {
      stopAlarm()
      await endBreak()
      toast({ title: "Break ended", description: "Welcome back! Ready to continue working." })
    } catch (error) {
      console.error("[handleEndBreak]", error)
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Could not end break",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      operationRef.current = false
    }
  }

  const handleClockIn = async () => {
    if (operationRef.current) return
    operationRef.current = true
    setIsLoading(true)

    try {
      const title = workTitle.trim() || undefined
      await clockIn(title)
      setWorkTitle("")
      toast({ title: "Clocked in", description: title ? `Started "${title}"` : "Session started." })
    } catch (error) {
      console.error("[handleClockIn]", error)
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Could not clock in",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      operationRef.current = false
    }
  }

  const handleClockOut = async () => {
    if (operationRef.current) return
    operationRef.current = true
    setIsLoading(true)

    try {
      await clockOut()
      toast({ title: "Clocked out", description: "Session ended." })
    } catch (error) {
      console.error("[handleClockOut]", error)
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Could not clock out",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      operationRef.current = false
    }
  }

  const handleSwitchTask = async () => {
    if (operationRef.current) return
    operationRef.current = true
    setIsLoading(true)

    try {
      const title = newTaskTitle.trim()
      if (!title) return
      await switchTask(title)
      setNewTaskTitle("")
      toast({ title: "Task logged", description: `Switched to "${title}"` })
    } catch (error) {
      console.error("[handleSwitchTask]", error)
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Could not switch task",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      operationRef.current = false
    }
  }

  const hasClockedInToday = getTodayTimeEntries().length > 0
  const canClockIn = !currentEntry && hasClockedInToday === false

  if (!authInitialized || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-[400px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="size-5" />
          Quick actions
        </h1>
        <Button variant="ghost" size="sm" asChild>
          <a href="/" target="_blank" rel="noopener noreferrer" className="gap-1">
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">Full app</span>
          </a>
        </Button>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        {currentEntry ? (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {activeBreak ? "On break" : "Currently working"}
            </p>
            <p className="font-medium truncate">{currentEntry.title || "Work"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeBreak ? "Started " + formatTime(activeBreak.startTime) : "Since " + formatTime(currentEntry.clockIn)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <p className="font-medium">{hasClockedInToday ? "Not clocked in (session ended)" : "Not clocked in"}</p>
          </div>
        )}
      </div>

      {/* On break: timer + Resume */}
      {currentEntry && activeBreak && (
        <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/5 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {getBreakTypeLabel(activeBreak.type ?? "custom", activeBreak.title)}
            </p>
            <span className="text-xs text-amber-700/80 dark:text-amber-400/80">
              Started {formatTime(activeBreak.startTime)}
            </span>
          </div>
          <div className="text-center mb-4">
            {breakTimeRemaining && breakTimeRemaining.minutes >= 0 ? (
              <p className="text-3xl font-mono font-bold text-amber-700 dark:text-amber-400">
                {String(breakTimeRemaining.minutes).padStart(2, "0")}:{String(breakTimeRemaining.seconds).padStart(2, "0")}
              </p>
            ) : (
              <p className="text-3xl font-mono font-bold text-amber-700 dark:text-amber-400">
                {String(breakElapsed.minutes).padStart(2, "0")}:{String(breakElapsed.seconds).padStart(2, "0")}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {breakTimeRemaining && breakTimeRemaining.minutes >= 0 ? "remaining" : "elapsed"}
            </p>
          </div>
          {breakEndedAlert && (
            <p className="text-xs text-red-600 dark:text-red-400 text-center mb-2">Break time has ended — tap Resume</p>
          )}
          <Button onClick={handleEndBreak} className="w-full gap-2" size="lg" disabled={isLoading}>
            <Play className="size-4" />
            {isLoading ? "Resuming…" : "Resume Work"}
          </Button>
        </div>
      )}

      {/* Take Break (when clocked in, not on break) */}
      {currentEntry && !activeBreak && (
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <Coffee className="size-4" />
            Take break
          </p>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {BREAK_TYPE_OPTIONS.map(({ type, label, defaultMinutes }) => (
                  <Button
                    key={type}
                    type="button"
                    variant={breakType === type ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setBreakType(type)
                      setBreakMinutes(String(defaultMinutes))
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            {breakType === "custom" && (
              <div>
                <Label htmlFor="widget-break-mins" className="text-xs text-muted-foreground">Duration (minutes)</Label>
                <Input
                  id="widget-break-mins"
                  type="number"
                  min={1}
                  max={480}
                  placeholder="e.g. 20"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label htmlFor="widget-break-title" className="text-xs text-muted-foreground">Title (optional)</Label>
              <Input
                id="widget-break-title"
                placeholder="e.g. Coffee break, Lunch with team"
                value={breakTitle}
                onChange={(e) => setBreakTitle(e.target.value)}
                maxLength={100}
                className="mt-1"
              />
              {breakTitle.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{breakTitle.length}/100</p>
              )}
            </div>
            <Button onClick={handleStartBreak} className="w-full gap-2" size="sm" disabled={isLoading}>
              <Play className="size-4" />
              {isLoading ? "Starting…" : "Start break"}
            </Button>
          </div>
        </div>
      )}

      {/* Clock In (only when not clocked in and no session today) */}
      {canClockIn && (
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <p className="text-sm font-medium mb-2">Start work</p>
          <Input
            placeholder="What are you working on? (optional)"
            value={workTitle}
            onChange={(e) => setWorkTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleClockIn()}
            className="mb-2"
          />
          <Button onClick={handleClockIn} className="w-full gap-2" size="lg" disabled={isLoading}>
            <Play className="size-4" />
            {isLoading ? "Clocking in…" : "Clock In"}
          </Button>
        </div>
      )}

      {/* Log new task + Clock Out (when clocked in and not on break) */}
      {currentEntry && !activeBreak && (
        <>
          <div className="rounded-xl border border-border bg-card p-4 mb-4">
            <p className="text-sm font-medium mb-2">Log new task</p>
            <div className="space-y-2 mb-3">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                Suggested for you
                {suggestionsLoading && <span className="font-normal">Loading…</span>}
              </p>
              {aiSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {aiSuggestions.map((title) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => setNewTaskTitle(title)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                        newTaskTitle === title
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-primary/10 text-foreground border-primary/30 hover:bg-primary/20",
                      )}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              ) : !suggestionsLoading && (
                <p className="text-[11px] text-muted-foreground">Type a few words to get suggestions.</p>
              )}
            </div>
            <Input
              placeholder="e.g. Team standup, Code review"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSwitchTask()}
              className="mb-2"
            />
            <Button
              onClick={handleSwitchTask}
              variant="secondary"
              className="w-full gap-2"
              size="lg"
              disabled={!newTaskTitle.trim() || isLoading}
            >
              <ClipboardList className="size-4" />
              {isLoading ? "Logging…" : "Log & switch"}
            </Button>
          </div>
          <Button onClick={handleClockOut} variant="destructive" className="w-full gap-2" size="lg" disabled={isLoading}>
            <Square className="size-4" />
            {isLoading ? "Clocking out…" : "Clock Out"}
          </Button>
        </>
      )}

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Open this page in a small window on desktop or add to home screen on mobile for quick access.
      </p>
    </div>
  )
}
