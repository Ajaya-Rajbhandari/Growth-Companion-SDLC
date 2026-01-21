"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useAppStore, type TimeEntry, type WorkTemplate } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { BreakModePanel } from "./break-mode-panel" // Import the new component
import { toast } from "@/components/ui/use-toast"
import {
  Play,
  Square,
  Coffee,
  Clock,
  Calendar,
  Timer,
  Download,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  BellOff,
  Volume2,
  FileSpreadsheet,
  Plus,
  Trash2,
} from "lucide-react"
import React from "react" // Added for React.Fragment

type ViewPeriod = "daily" | "weekly" | "monthly" | "yearly"

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function calculateDuration(
  clockIn: string,
  clockOut?: string,
  breakMinutes = 0,
): { hours: number; minutes: number; totalMs: number } {
  const start = new Date(clockIn).getTime()
  const end = clockOut ? new Date(clockOut).getTime() : Date.now()
  const diffMs = Math.max(0, end - start - breakMinutes * 60 * 1000)
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return { hours, minutes, totalMs: diffMs }
}

function formatDuration(hours: number, minutes: number): string {
  return `${hours}h ${minutes}m`
}

function getBreakTypeLabel(type?: "short" | "lunch" | "custom", title?: string): string {
  // If it's a custom break with a title, show the title instead
  if (type === "custom" && title?.trim()) {
    return title.trim()
  }
  
  switch (type) {
    case "short":
      return "Short"
    case "lunch":
      return "Lunch"
    case "custom":
      return "Custom"
    default:
      return "Break"
  }
}

function getBreakTypeBadgeColor(type?: "short" | "lunch" | "custom"): string {
  switch (type) {
    case "short":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    case "lunch":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30"
    case "custom":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30"
    default:
      return "bg-muted text-foreground/70 border-border"
  }
}

function calculateTotalHours(entries: TimeEntry[]): number {
  return entries.reduce((total, entry) => {
    if (entry.clockOut) {
      const start = new Date(entry.clockIn).getTime()
      const end = new Date(entry.clockOut).getTime()
      const diffMs = Math.max(0, end - start - entry.breakMinutes * 60 * 1000)
      return total + diffMs / (1000 * 60 * 60)
    }
    return total
  }, 0)
}

function calculateTotalBreakMinutes(entries: TimeEntry[]): number {
  return entries.reduce((total, entry) => total + entry.breakMinutes, 0)
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getStartOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1)
}

function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function getEndOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999)
}

function getPeriodLabel(date: Date, period: ViewPeriod): string {
  switch (period) {
    case "daily":
      return formatFullDate(date.toISOString())
    case "weekly": {
      const start = getStartOfWeek(date)
      const end = getEndOfWeek(date)
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    }
    case "monthly":
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    case "yearly":
      return date.getFullYear().toString()
  }
}

function navigatePeriod(date: Date, period: ViewPeriod, direction: number): Date {
  const newDate = new Date(date)
  switch (period) {
    case "daily":
      newDate.setDate(newDate.getDate() + direction)
      break
    case "weekly":
      newDate.setDate(newDate.getDate() + direction * 7)
      break
    case "monthly":
      newDate.setMonth(newDate.getMonth() + direction)
      break
    case "yearly":
      newDate.setFullYear(newDate.getFullYear() + direction)
      break
  }
  return newDate
}

function filterEntriesByPeriod(entries: TimeEntry[], date: Date, period: ViewPeriod): TimeEntry[] {
  let start: Date
  let end: Date

  switch (period) {
    case "daily":
      start = new Date(date)
      start.setHours(0, 0, 0, 0)
      end = new Date(date)
      end.setHours(23, 59, 59, 999)
      break
    case "weekly":
      start = getStartOfWeek(date)
      end = getEndOfWeek(date)
      break
    case "monthly":
      start = getStartOfMonth(date)
      end = getEndOfMonth(date)
      break
    case "yearly":
      start = getStartOfYear(date)
      end = getEndOfYear(date)
      break
  }

  return entries.filter((entry) => {
    const entryDate = new Date(entry.date)
    return entryDate >= start && entryDate <= end
  })
}

function groupEntriesByDate(entries: TimeEntry[]): Record<string, TimeEntry[]> {
  return entries.reduce(
    (groups, entry) => {
      const date = entry.date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(entry)
      return groups
    },
    {} as Record<string, TimeEntry[]>,
  )
}

const groupEntriesByWeek = (entries: TimeEntry[]): Record<string, TimeEntry[]> => {
  return entries.reduce(
    (groups, entry) => {
      const date = new Date(entry.date)
      const weekStart = getStartOfWeek(date)
      const weekKey = weekStart.toISOString().split("T")[0]
      if (!groups[weekKey]) {
        groups[weekKey] = []
      }
      groups[weekKey].push(entry)
      return groups
    },
    {} as Record<string, TimeEntry[]>,
  )
}

const groupEntriesByMonth = (entries: TimeEntry[]): Record<string, Record<string, TimeEntry[]>> => {
  return entries.reduce(
    (months, entry) => {
      const date = new Date(entry.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (!months[monthKey]) {
        months[monthKey] = {}
      }
      const dateKey = entry.date
      if (!months[monthKey][dateKey]) {
        months[monthKey][dateKey] = []
      }
      months[monthKey][dateKey].push(entry)
      return months // Corrected from groups to months
    },
    {} as Record<string, Record<string, TimeEntry[]>>,
  )
}

const groupEntriesByYear = (entries: TimeEntry[]): Record<string, Record<string, Record<string, TimeEntry[]>>> => {
  return entries.reduce(
    (years, entry) => {
      const date = new Date(entry.date)
      const year = date.getFullYear().toString()
      if (!years[year]) {
        years[year] = {}
      }
      const monthKey = `${String(date.getMonth() + 1).padStart(2, "0")}`
      if (!years[year][monthKey]) {
        years[year][monthKey] = {}
      }
      const dateKey = entry.date
      if (!years[year][monthKey][dateKey]) {
        years[year][monthKey][dateKey] = []
      }
      years[year][monthKey][dateKey].push(entry)
      return years
    },
    {} as Record<string, Record<string, Record<string, TimeEntry[]>>>,
  )
}

export function TimesheetView() {
  const {
    timeEntries,
    currentEntry,
    activeBreak,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    addBreakTime,
    updateEntryNotes,
    updateBreakTitle,
    deleteTimeEntry,
    workTemplates,
    addWorkTemplate,
    deleteWorkTemplate,
    getTopTemplates,
    updateCurrentEntryTitle, // add new store method
    switchTask, // add new store method
    timeCategories,
    addTimeCategory,
    updateTimeCategory,
    deleteTimeCategory,
    getTodayTimeEntries,
    getTodayWorkStats,
    setOverworkMinutesRequested,
    overworkMinutesRequested,
    graceMinutes,
    allowOverworkMinutes,
    resetOverworkForToday,
  } = useAppStore(
    useShallow((state) => ({
      timeEntries: state.timeEntries,
      currentEntry: state.currentEntry,
      activeBreak: state.activeBreak,
      clockIn: state.clockIn,
      clockOut: state.clockOut,
      startBreak: state.startBreak,
      endBreak: state.endBreak,
      addBreakTime: state.addBreakTime,
      updateEntryNotes: state.updateEntryNotes,
      updateBreakTitle: state.updateBreakTitle,
      deleteTimeEntry: state.deleteTimeEntry,
      workTemplates: state.workTemplates,
      addWorkTemplate: state.addWorkTemplate,
      deleteWorkTemplate: state.deleteWorkTemplate,
      getTopTemplates: state.getTopTemplates,
      updateCurrentEntryTitle: state.updateCurrentEntryTitle,
      switchTask: state.switchTask,
      timeCategories: state.timeCategories,
      addTimeCategory: state.addTimeCategory,
      updateTimeCategory: state.updateTimeCategory,
      deleteTimeCategory: state.deleteTimeCategory,
      getTodayTimeEntries: state.getTodayTimeEntries,
      getTodayWorkStats: state.getTodayWorkStats,
      setOverworkMinutesRequested: state.setOverworkMinutesRequested,
      overworkMinutesRequested: state.overworkMinutesRequested,
      graceMinutes: state.graceMinutes,
      allowOverworkMinutes: state.allowOverworkMinutes,
      resetOverworkForToday: state.resetOverworkForToday,
    })),
  )

  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [breakTimeRemaining, setBreakTimeRemaining] = useState<{ minutes: number; seconds: number } | null>(null)
  const [breakElapsed, setBreakElapsed] = useState({ minutes: 0, seconds: 0 })
  const [breakDialogOpen, setBreakDialogOpen] = useState(false)
  const [breakMinutes, setBreakMinutes] = useState("")
  const [breakType, setBreakType] = useState<"short" | "lunch" | "custom">("custom")
  const [breakTitle, setBreakTitle] = useState("")
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null)
  const [entryNotes, setEntryNotes] = useState("")
  const [editBreakDialogOpen, setEditBreakDialogOpen] = useState(false)
  const [selectedBreak, setSelectedBreak] = useState<{ entryId: string; breakId: string; currentTitle?: string } | null>(null)
  const [breakTitleEdit, setBreakTitleEdit] = useState("")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [breakEndedAlert, setBreakEndedAlert] = useState(false)
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false) // add state for edit dialog
  const [editTaskTitle, setEditTaskTitle] = useState("") // add state for edit input
  const [switchTaskDialogOpen, setSwitchTaskDialogOpen] = useState(false) // add state for switch dialog
  const [newTaskTitle, setNewTaskTitle] = useState("") // add state for new task input

  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>("weekly")
  const [selectedDate, setSelectedDate] = useState(new Date())

  const [workTitle, setWorkTitle] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("none")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [showCategoryManagement, setShowCategoryManagement] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6")
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [overworkDialogOpen, setOverworkDialogOpen] = useState(false)
  const [overworkMinutesInput, setOverworkMinutesInput] = useState(overworkMinutesRequested.toString())
  const [warned8h, setWarned8h] = useState(false)
  const [warned830, setWarned830] = useState(false)

  const formatMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hrs}h ${mins}m`
  }

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastUpdateRef = useRef<number>(Date.now())
  const autoClockedOutRef = useRef(false)

  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.src =
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRY/l9TejGQfCEWd2NuJYyEISZzX2opkIglKm9fbjGQhCEqc19qLZCEISZvX24xkIQhKnNfai2QhCEqb19uMZCEISZzX2otkIQhKm9fbjGQhCEmc19qLZCEISpvX24xkIQhJnNfai2QhCEqb19uMZCEISZzX2otkIQhKm9fbjGQhCEmc"
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (overworkDialogOpen) {
      setOverworkMinutesInput(overworkMinutesRequested.toString())
    }
  }, [overworkDialogOpen, overworkMinutesRequested])

  const playAlarm = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.loop = true
      audioRef.current.play().catch(() => {})
    }
    setBreakEndedAlert(true)
  }, [soundEnabled])

  const stopAlarm = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.loop = false
    }
    setBreakEndedAlert(false)
  }, [])

  useEffect(() => {
    if (currentEntry && !activeBreak) {
      const updateElapsedTime = () => {
        const start = new Date(currentEntry.clockIn).getTime()
        const now = Date.now()
        const breakMs = (currentEntry.breakMinutes || 0) * 60 * 1000
        const diffMs = Math.max(0, now - start - breakMs)

        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

        setElapsedTime({ hours, minutes, seconds })
        lastUpdateRef.current = now
      }

      // Update immediately
      updateElapsedTime()

      // Set up interval
      const interval = setInterval(updateElapsedTime, 1000)

      // Handle visibility change - recalculate when tab becomes visible
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          updateElapsedTime()
        }
      }

      document.addEventListener("visibilitychange", handleVisibilityChange)

      return () => {
        clearInterval(interval)
        document.removeEventListener("visibilitychange", handleVisibilityChange)
      }
    }
  }, [currentEntry, activeBreak])

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

          if (remainingMs <= 0 && !breakEndedAlert) {
            playAlarm()
          }

          const remainingMins = Math.floor(remainingMs / (1000 * 60))
          const remainingSecs = Math.floor((remainingMs % (1000 * 60)) / 1000)
          setBreakTimeRemaining({ minutes: remainingMins, seconds: remainingSecs })
        } else {
          setBreakTimeRemaining(null)
        }
      }

      // Update immediately
      updateBreakTime()

      const interval = setInterval(updateBreakTime, 1000)

      // Handle visibility change
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          updateBreakTime()
        }
      }

      document.addEventListener("visibilitychange", handleVisibilityChange)

      return () => {
        clearInterval(interval)
        document.removeEventListener("visibilitychange", handleVisibilityChange)
      }
    } else {
      setBreakTimeRemaining(null)
      setBreakElapsed({ minutes: 0, seconds: 0 })
      stopAlarm()
    }
  }, [activeBreak, breakEndedAlert, playAlarm, stopAlarm])

  const filteredEntries = useMemo(() => {
    let entries = filterEntriesByPeriod(timeEntries, selectedDate, viewPeriod)

    // Filter by category if selected
    if (categoryFilter) {
      entries = entries.filter((entry) => entry.category === categoryFilter)
    }

    // Add current entry if it's in the filtered date range and still active
    if (currentEntry && !currentEntry.clockOut) {
      const entryDate = new Date(currentEntry.date)
      let start: Date, end: Date

      switch (viewPeriod) {
        case "daily":
          start = new Date(selectedDate)
          start.setHours(0, 0, 0, 0)
          end = new Date(selectedDate)
          end.setHours(23, 59, 59, 999)
          break
        case "weekly":
          start = getStartOfWeek(selectedDate)
          end = getEndOfWeek(selectedDate)
          break
        case "monthly":
          start = getStartOfMonth(selectedDate)
          end = getEndOfMonth(selectedDate)
          break
        case "yearly":
          start = getStartOfYear(selectedDate)
          end = getEndOfYear(selectedDate)
          break
      }

      const alreadyIncluded = entries.some((entry) => entry.id === currentEntry.id)
      const matchesCategory = !categoryFilter || currentEntry.category === categoryFilter
      if (entryDate >= start && entryDate <= end && !alreadyIncluded && matchesCategory) {
        entries = [currentEntry, ...entries]
      }
    }

    return entries
  }, [timeEntries, selectedDate, viewPeriod, currentEntry, categoryFilter])

  const groupedEntries = useMemo(() => {
    return groupEntriesByDate(filteredEntries)
  }, [filteredEntries])

  const sortedDates = useMemo(() => {
    return Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  }, [groupedEntries])

  const periodStats = useMemo(() => {
    let totalHours = 0
    let totalBreakMinutes = 0
    let sessionCount = 0

    filteredEntries.forEach((entry) => {
      const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
      totalHours += duration.hours + duration.minutes / 60
      totalBreakMinutes += entry.breakMinutes || 0
      sessionCount += 1
    })

    return {
      totalHours: totalHours.toFixed(1),
      totalBreakMinutes,
      sessionCount,
    }
  }, [filteredEntries])

  // Handle clockIn with workTitle and save template
  const handleClockIn = () => {
    const title = workTitle.trim()
    const category = selectedCategory && selectedCategory !== "none" ? selectedCategory : undefined
    if (title) {
      clockIn(title, category)
        .then(() => {
          toast({
            title: "Clocked in",
            description: `Started "${title}".`,
          })
        })
        .catch((error) => {
          toast({
            title: "Clock-in failed",
            description: error instanceof Error ? error.message : "Unable to start session.",
          })
        })
      setWorkTitle("")
      setSelectedCategory("none")
      return
    }
    clockIn(undefined, category)
      .then(() => {
        toast({
          title: "Clocked in",
          description: "Work session started.",
        })
      })
      .catch((error) => {
        toast({
          title: "Clock-in failed",
          description: error instanceof Error ? error.message : "Unable to start session.",
        })
      })
    setSelectedCategory("none")
  }

  // Break type selection and management
  const handleStartBreak = async () => {
    const durations: Record<string, number> = {
      short: 15,
      lunch: 60,
      custom: breakMinutes.trim() ? Number.parseInt(breakMinutes, 10) : 30,
    }
    
    const duration = durations[breakType]
    if (breakType === "custom" && (!breakMinutes.trim() || isNaN(Number.parseInt(breakMinutes, 10)))) {
      toast({
        title: "Invalid duration",
        description: "Please enter a valid break duration in minutes.",
        variant: "destructive",
      })
      return
    }
    
    if (duration <= 0 || duration > 480) {
      toast({
        title: "Invalid duration",
        description: "Break duration must be between 1 and 480 minutes.",
        variant: "destructive",
      })
      return
    }
    
    startBreak(duration, breakType, breakTitle.trim() || undefined)
    toast({
      title: "Break started",
      description: breakTitle.trim() 
        ? `${breakTitle} - ${duration} minute ${breakType} break.`
        : `${duration} minute ${breakType} break.`,
    })
    setBreakDialogOpen(false)
    setBreakMinutes("")
    setBreakTitle("")
    setBreakType("custom")
  }

  const handleEndBreak = async () => {
    try {
      await endBreak()
      toast({
        title: "Break ended",
        description: "Welcome back! Ready to continue working.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end break",
        variant: "destructive",
      })
    }
  }

  const handleSaveTemplate = () => {
    if (workTitle.trim() && templateName.trim()) {
      addWorkTemplate({
        id: crypto.randomUUID(),
        title: templateName,
        description: workTitle,
        usageCount: 0,
      })
      setTemplateName("")
      setShowTemplateDialog(false)
    }
  }

  const handleSaveOverworkMinutes = () => {
    const value = Number.parseInt(overworkMinutesInput, 10)
    if (isNaN(value) || value < 0 || value > allowOverworkMinutes) {
      toast({
        title: "Invalid overwork request",
        description: `Enter 0-${allowOverworkMinutes} minutes.`,
        variant: "destructive",
      })
      return
    }
    setOverworkMinutesRequested(value)
    setOverworkDialogOpen(false)
    toast({
      title: "Overwork updated",
      description: value > 0 ? `Up to ${value} minutes allowed today.` : "Overwork disabled for today.",
    })
  }

  const handleUseTemplate = (template: WorkTemplate) => {
    setWorkTitle(template.description || template.title)
  }

  const topTemplates = getTopTemplates()

  const handleAddManualBreak = async () => {
    const minutes = breakMinutes.trim() ? Number.parseInt(breakMinutes, 10) : 0

    if (isNaN(minutes)) {
      console.error("[v0] Invalid break duration: not a number")
      return
    }

    if (minutes <= 0 || minutes > 480) {
      // Prevent invalid durations (must be 1-480 minutes / 8 hours max)
      console.error("[v0] Invalid break duration: must be between 1 and 480 minutes")
      return
    }

    try {
      await addBreakTime(minutes)
      toast({
        title: "Break added",
        description: `${minutes} minute break logged.`,
      })
      setBreakMinutes("")
      setBreakDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add break time",
        variant: "destructive",
      })
    }
  }

  const handleSaveNotes = () => {
    if (selectedEntry) {
      updateEntryNotes(selectedEntry.id, entryNotes)
        .then(() => {
          toast({
            title: "Notes saved",
            description: "Entry notes updated.",
          })
          setNotesDialogOpen(false)
          setSelectedEntry(null)
          setEntryNotes("")
        })
        .catch((error) => {
          toast({
            title: "Save failed",
            description: error instanceof Error ? error.message : "Unable to save notes.",
          })
        })
    }
  }

  const handleClockOut = () => {
    clockOut()
      .then(() => {
        toast({
          title: "Clocked out",
          description: "Work session ended.",
        })
      })
      .catch((error) => {
        toast({
          title: "Clock-out failed",
          description: error instanceof Error ? error.message : "Unable to end session.",
        })
      })
  }

  const handleDeleteEntry = (entryId: string) => {
    deleteTimeEntry(entryId)
      .then(() => {
        toast({
          title: "Entry deleted",
          description: "Time entry removed.",
        })
      })
      .catch((error) => {
        toast({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Unable to delete entry.",
        })
      })
  }

  const openNotesDialog = (entry: TimeEntry) => {
    setSelectedEntry(entry)
    setEntryNotes(entry.notes || "")
    setNotesDialogOpen(true)
  }

  const openEditBreakDialog = (entryId: string, breakId: string, currentTitle?: string) => {
    setSelectedBreak({ entryId, breakId, currentTitle })
    setBreakTitleEdit(currentTitle || "")
    setEditBreakDialogOpen(true)
  }

  const handleSaveBreakTitle = async () => {
    if (!selectedBreak) return
    
    try {
      await updateBreakTitle(selectedBreak.entryId, selectedBreak.breakId, breakTitleEdit)
      toast({
        title: "Break title updated",
        description: "Break title has been saved.",
      })
      setEditBreakDialogOpen(false)
      setSelectedBreak(null)
      setBreakTitleEdit("")
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to update break title.",
        variant: "destructive",
      })
    }
  }

  const handlePrevPeriod = () => {
    setSelectedDate(navigatePeriod(selectedDate, viewPeriod, -1))
  }

  const handleNextPeriod = () => {
    setSelectedDate(navigatePeriod(selectedDate, viewPeriod, 1))
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  const exportToCSV = () => {
    const headers = ["Date", "Clock In", "Clock Out", "Break (min)", "Duration (hours)", "Notes"]
    const rows = filteredEntries.map((entry) => {
      const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
      const hours = entry.clockOut ? (duration.totalMs / (1000 * 60 * 60)).toFixed(2) : "In Progress"
      return [
        entry.date,
        formatTime(entry.clockIn),
        entry.clockOut ? formatTime(entry.clockOut) : "-",
        entry.breakMinutes.toString(),
        hours,
        entry.notes || "",
      ]
    })

    const totalHours = calculateTotalHours(filteredEntries)
    const totalBreak = calculateTotalBreakMinutes(filteredEntries)
    rows.push([])
    rows.push(["Summary", "", "", "", "", ""])
    rows.push(["Total Hours", "", "", "", totalHours.toFixed(2), ""])
    rows.push(["Total Break", "", "", totalBreak.toString(), "", ""])
    rows.push(["Total Entries", "", "", "", filteredEntries.length.toString(), ""])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `timesheet-${viewPeriod}-${selectedDate.toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToJSON = () => {
    const exportData = {
      period: viewPeriod,
      periodLabel: getPeriodLabel(selectedDate, viewPeriod),
      exportDate: new Date().toISOString(),
      summary: {
        totalHours: calculateTotalHours(filteredEntries).toFixed(2),
        totalBreakMinutes: calculateTotalBreakMinutes(filteredEntries),
        totalEntries: filteredEntries.length,
      },
      entries: filteredEntries.map((entry) => {
        const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
        return {
          ...entry,
          durationHours: entry.clockOut ? (duration.totalMs / (1000 * 60 * 60)).toFixed(2) : null,
        }
      }),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `timesheet-${viewPeriod}-${selectedDate.toISOString().split("T")[0]}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ADDED EXCEL EXPORT FUNCTION
  const exportToExcel = async () => {
    // Dynamically import xlsx library
    const XLSX = await import("xlsx")

    // Create workbook
    const wb = XLSX.utils.book_new()

    // Get user info
    const userName = useAppStore.getState().user?.name || "Unknown"
    const userEmail = useAppStore.getState().user?.email || ""

    // ===== SHEET 1: Summary =====
    const summaryData = [
      ["TIMESHEET REPORT"],
      [],
      ["Employee Name:", userName],
      ["Email:", userEmail],
      ["Report Period:", getPeriodLabel(selectedDate, viewPeriod)],
      ["View Type:", viewPeriod.charAt(0).toUpperCase() + viewPeriod.slice(1)],
      ["Generated On:", new Date().toLocaleString()],
      [],
      ["SUMMARY STATISTICS"],
      [],
      ["Total Work Hours:", `${calculateTotalHours(filteredEntries).toFixed(2)} hours`],
      ["Total Break Time:", `${calculateTotalBreakMinutes(filteredEntries)} minutes`],
      ["Total Sessions:", filteredEntries.length],
      [
        "Average Hours/Session:",
        filteredEntries.length > 0
          ? `${(calculateTotalHours(filteredEntries) / filteredEntries.length).toFixed(2)} hours`
          : "N/A",
      ],
    ]

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    // Set column widths for summary
    summaryWs["!cols"] = [{ wch: 20 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

    // ===== SHEET 2: Detailed Entries =====
    const detailHeaders = [
      "Date",
      "Day",
      "Task/Project",
      "Clock In",
      "Clock Out",
      "Break Time (min)",
      "Work Duration",
      "Status",
      "Notes",
    ]

    const detailRows = filteredEntries.map((entry) => {
      const date = new Date(entry.date)
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" })
      const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
      const hours = entry.clockOut
        ? `${Math.floor(duration.totalMs / (1000 * 60 * 60))}h ${Math.floor((duration.totalMs % (1000 * 60 * 60)) / (1000 * 60))}m`
        : "-"

      return [
        entry.date,
        dayName,
        entry.title || "No title",
        formatTime(entry.clockIn),
        entry.clockOut ? formatTime(entry.clockOut) : "-",
        entry.breakMinutes || 0,
        hours,
        entry.clockOut ? "Completed" : "In Progress",
        entry.notes || "",
      ]
    })

    // Add totals row
    detailRows.push([])
    detailRows.push([
      "TOTALS",
      "",
      "",
      "",
      "",
      calculateTotalBreakMinutes(filteredEntries),
      `${calculateTotalHours(filteredEntries).toFixed(2)} hours`,
      "",
      "",
    ])

    const detailWs = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows])
    // Set column widths
    detailWs["!cols"] = [
      { wch: 12 }, // Date
      { wch: 12 }, // Day
      { wch: 30 }, // Task
      { wch: 12 }, // Clock In
      { wch: 12 }, // Clock Out
      { wch: 15 }, // Break
      { wch: 15 }, // Duration
      { wch: 12 }, // Status
      { wch: 30 }, // Notes
    ]
    XLSX.utils.book_append_sheet(wb, detailWs, "Detailed Entries")

    // ===== SHEET 3: Break Details =====
    const breakHeaders = ["Date", "Task", "Break Type", "Start Time", "End Time", "Duration (min)"]
    const breakRows: (string | number)[][] = []

    filteredEntries.forEach((entry) => {
      if (entry.breaks && entry.breaks.length > 0) {
        entry.breaks.forEach((brk) => {
          const duration = brk.endTime
            ? Math.round((new Date(brk.endTime).getTime() - new Date(brk.startTime).getTime()) / (1000 * 60))
            : brk.durationMinutes || 0

          breakRows.push([
            entry.date,
            entry.title || "No title",
            getBreakTypeLabel(brk.type, brk.title),
            formatTime(brk.startTime),
            brk.endTime ? formatTime(brk.endTime) : "Ongoing",
            duration,
          ])
        })
      }
    })

    if (breakRows.length === 0) {
      breakRows.push(["No breaks recorded for this period", "", "", "", "", ""])
    }

    const breakWs = XLSX.utils.aoa_to_sheet([breakHeaders, ...breakRows])
    breakWs["!cols"] = [
      { wch: 12 }, // Date
      { wch: 30 }, // Task
      { wch: 12 }, // Type
      { wch: 12 }, // Start
      { wch: 12 }, // End
      { wch: 15 }, // Duration
    ]
    XLSX.utils.book_append_sheet(wb, breakWs, "Break Details")

    // ===== SHEET 4: Daily Summary =====
    const dailySummaryHeaders = ["Date", "Day", "Total Hours", "Total Breaks (min)", "Sessions", "Tasks Completed"]
    const groupedByDate = groupEntriesByDate(filteredEntries)
    const dailySummaryRows = Object.entries(groupedByDate).map(([date, entries]) => {
      const dateObj = new Date(date)
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" })
      const totalHours = calculateTotalHours(entries)
      const totalBreaks = entries.reduce((sum, e) => sum + (e.breakMinutes || 0), 0)
      const completedTasks = entries.filter((e) => e.clockOut).length

      return [date, dayName, `${totalHours.toFixed(2)}`, totalBreaks, entries.length, completedTasks]
    })

    const dailyWs = XLSX.utils.aoa_to_sheet([dailySummaryHeaders, ...dailySummaryRows])
    dailyWs["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, dailyWs, "Daily Summary")

    // ===== SHEET 5: Subtasks (if any) =====
    const subtaskHeaders = ["Date", "Main Task", "Subtask", "Start Time", "End Time", "Duration"]
    const subtaskRows: (string | number)[][] = []

    filteredEntries.forEach((entry) => {
      if (entry.subtasks && entry.subtasks.length > 0) {
        entry.subtasks.forEach((sub) => {
          const duration = sub.clockOut
            ? Math.round((new Date(sub.clockOut).getTime() - new Date(sub.clockIn).getTime()) / (1000 * 60))
            : 0

          subtaskRows.push([
            entry.date,
            entry.title || "No title",
            sub.title,
            formatTime(sub.clockIn),
            sub.clockOut ? formatTime(sub.clockOut) : "In Progress",
            `${Math.floor(duration / 60)}h ${duration % 60}m`,
          ])
        })
      }
    })

    if (subtaskRows.length === 0) {
      subtaskRows.push(["No subtasks recorded for this period", "", "", "", "", ""])
    }

    const subtaskWs = XLSX.utils.aoa_to_sheet([subtaskHeaders, ...subtaskRows])
    subtaskWs["!cols"] = [{ wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, subtaskWs, "Subtasks")

    // Generate and download file
    const fileName = `timesheet-${viewPeriod}-${selectedDate.toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Calculate stats for current period
  const periodHours = calculateTotalHours(filteredEntries)
  const periodBreakMinutes = calculateTotalBreakMinutes(filteredEntries)

  // Work limits and stats
  const workStats = useMemo(() => getTodayWorkStats(), [timeEntries, currentEntry, activeBreak, getTodayWorkStats])
  const todayEntries = getTodayTimeEntries()
  const todayHours = workStats.todayMinutes / 60
  const weeklyHours = workStats.weeklyMinutes / 60
  const today = new Date()
  const weekStart = getStartOfWeek(today)
  const thisWeekEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.date)
    return entryDate >= weekStart
  })
  const weeklyBreakMinutes = calculateTotalBreakMinutes(thisWeekEntries)
  const weekDates = new Set(thisWeekEntries.map((entry) => entry.date))
  if (currentEntry && new Date(currentEntry.date) >= weekStart) {
    weekDates.add(currentEntry.date)
  }

  useEffect(() => {
    if (workStats.todayMinutes >= workStats.warningThresholdMinutes && !warned8h) {
      setWarned8h(true)
      toast({
        title: "Approaching daily limit",
        description: `You've worked ${formatMinutes(workStats.todayMinutes)} today. Limit: ${formatMinutes(workStats.baseLimitMinutes)}.`,
      })
    }
    if (workStats.todayMinutes >= workStats.secondaryWarningMinutes && !warned830) {
      setWarned830(true)
      toast({
        title: "Almost at limit",
        description: `About ${formatMinutes(workStats.appliedLimitMinutes - workStats.todayMinutes)} remaining before auto clock-out.`,
      })
    }
    if (workStats.status === "hardCap" && currentEntry && !autoClockedOutRef.current) {
      autoClockedOutRef.current = true
      const entryId = currentEntry.id
      clockOut()
        .then(() => {
          if (entryId) {
            updateEntryNotes(entryId, "[Auto clocked out at daily limit]").catch(() => {})
          }
          toast({
            title: "Auto clocked out",
            description: `Reached your limit (${formatMinutes(workStats.appliedLimitMinutes)}).`,
          })
          resetOverworkForToday()
        })
        .catch(() => {
          // swallow
        })
    } else if (workStats.status !== "hardCap") {
      autoClockedOutRef.current = false
    }
  }, [
    workStats,
    warned8h,
    warned830,
    currentEntry,
    clockOut,
    resetOverworkForToday,
  ])
  const activeDaysWeek = weekDates.size
  const getDateKey = (date: Date) => date.toISOString().split("T")[0]
  const entryDates = new Set(timeEntries.map((entry) => entry.date))
  if (currentEntry) {
    entryDates.add(currentEntry.date)
  }
  let streakDays = 0
  const streakCursor = new Date()
  while (entryDates.has(getDateKey(streakCursor))) {
    streakDays += 1
    streakCursor.setDate(streakCursor.getDate() - 1)
  }

  const breakProgress = activeBreak?.durationMinutes
    ? Math.min(100, ((breakElapsed.minutes * 60 + breakElapsed.seconds) / (activeBreak.durationMinutes * 60)) * 100)
    : 0

  const handleEditTaskTitle = () => {
    if (editTaskTitle.trim() && currentEntry) {
      updateCurrentEntryTitle(editTaskTitle.trim())
      setEditTaskDialogOpen(false)
      setEditTaskTitle("")
    }
  }

  const handleSwitchTask = () => {
    if (newTaskTitle.trim()) {
      switchTask(newTaskTitle.trim())
      setSwitchTaskDialogOpen(false)
      setNewTaskTitle("")
    }
  }

  const openEditTaskDialog = () => {
    if (currentEntry?.title) {
      setEditTaskTitle(currentEntry.title)
      setEditTaskDialogOpen(true)
    }
  }

  return (
    <div className="space-y-2 sm:space-y-3 w-full max-w-full overflow-x-hidden [&>*]:max-w-full [&>*]:overflow-x-hidden">
      {activeBreak && (
        <BreakModePanel
          activeBreak={activeBreak}
          breakTimeRemaining={breakTimeRemaining}
          breakElapsed={breakElapsed}
          onResume={handleEndBreak}
          isBreakEndedAlert={breakEndedAlert}
          breakType={breakType}
        />
      )}

      <div className={cn("space-y-2 sm:space-y-3", activeBreak && "pointer-events-none opacity-50")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Timesheet</h2>
            <p className="text-xs text-foreground/70">Track your working hours automatically.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="bg-transparent min-w-[44px] min-h-[44px]"
              title={soundEnabled ? "Disable break alarm" : "Enable break alarm"}
            >
              {soundEnabled ? <Volume2 className="size-4" /> : <BellOff className="size-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 bg-transparent min-h-[44px]">
                  <Download className="size-4" />
                  <span className="hidden sm:inline">Export</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </DropdownMenuTrigger>
              {/* Update export dropdown around line 720 to add Excel export option */}
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToExcel} className="gap-2">
                  <FileSpreadsheet className="size-4" />
                  Export as Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToCSV} className="gap-2">
                  <Download className="size-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToJSON} className="gap-2">
                  <Download className="size-4" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
              {/* ... existing code ... */}
            </DropdownMenu>
          </div>
        </div>

        {/* Clock In/Out Card */}
        {!currentEntry ? (
          <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent w-full max-w-full overflow-hidden !px-0">
            <CardHeader className="p-2 sm:p-3 md:p-4 !px-2 sm:!px-3 md:!px-4">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Play className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Start Your Work Day</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-2 sm:p-3 md:p-4 w-full max-w-full overflow-hidden !px-2 sm:!px-3 md:!px-4">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium">What are you working on?</label>
                <Input
                  placeholder="e.g., Frontend development, Meeting, Code review..."
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleClockIn()}
                  className="text-base h-12 sm:h-10 w-full max-w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-medium">Category (optional)</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCategoryManagement(true)}
                    className="h-8 sm:h-6 text-xs min-w-[44px] min-h-[44px] sm:min-h-0"
                  >
                    Manage
                  </Button>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-12 sm:h-10 w-full max-w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {timeCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {topTemplates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground/70">Recently used:</p>
                  <div className="flex flex-wrap gap-2">
                    {topTemplates.map((template) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleUseTemplate(template)}
                        className="text-xs"
                      >
                        {template.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-full">
                {(() => {
                  const todayEntries = getTodayTimeEntries()
                  const hasClockedInToday = todayEntries.length > 0
                  const isDisabled = !!currentEntry || hasClockedInToday || workStats.status === "hardCap"
                  if (hasClockedInToday && !currentEntry) {
                    return (
                      <Button className="flex-1 w-full sm:w-auto min-w-0" size="lg" disabled>
                        <Play className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">Already Clocked In Today</span>
                      </Button>
                    )
                  }
                  return (
                    <Button 
                      onClick={handleClockIn}
                      className="flex-1 w-full sm:w-auto min-w-0" 
                      size="lg"
                      disabled={isDisabled}
                    >
                      <Play className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Clock In</span>
                    </Button>
                  )
                })()}
                <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="w-full sm:w-auto min-w-0 flex-shrink-0">
                      <span className="truncate">Save as Template</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Work Template</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Template Name</label>
                        <Input
                          placeholder="e.g., Morning Development"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleSaveTemplate} className="w-full">
                        Save Template
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ) : (
          // modified card for ongoing session with task management buttons
            <Card className="border-l-4 border-l-green-500 bg-card w-full max-w-full">
            <CardContent className="p-2 sm:p-3 md:p-4 w-full max-w-full">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 text-foreground">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-green-500 flex-shrink-0" />
                      <div className="truncate max-w-[200px] sm:max-w-none font-semibold text-base sm:text-lg">
                        {currentEntry.title || "Working"}
                      </div>
                      <Badge variant="secondary" className="text-xs">In Progress</Badge>
                    </div>
                    <div className="text-center">
                      <p className="text-xs sm:text-sm text-foreground/70 mb-1">
                        Working since {formatTime(currentEntry.clockIn)}
                      </p>
                      <div className="text-2xl sm:text-4xl font-bold text-foreground font-mono">
                        {elapsedTime.hours}h {elapsedTime.minutes}m
                        <span className="text-base sm:text-xl text-foreground/70 ml-1">
                          {String(elapsedTime.seconds).padStart(2, "0")}s
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground/70 mt-1">
                        Remaining today: {formatMinutes(workStats.remainingMinutes)}
                      </p>
                      {workStats.overtimeBadge && (
                        <Badge variant="destructive" className="mt-1">
                          Overtime
                        </Badge>
                      )}
                      {currentEntry.breakMinutes > 0 && (
                        <p className="text-xs sm:text-sm text-foreground/70 mt-2">
                          Total break: {currentEntry.breakMinutes} minutes ({(currentEntry.breaks || []).length} break
                          {(currentEntry.breaks || []).length !== 1 ? "s" : ""})
                        </p>
                      )}
                    </div>
                </div>

                {/* Show breaks taken if any */}
                {currentEntry.breaks && currentEntry.breaks.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-3 border border-muted">
                    <p className="text-xs font-medium text-foreground/90 mb-2">Breaks taken:</p>
                    <div className="space-y-1.5">
                      {currentEntry.breaks.map((breakPeriod) => {
                        const breakDuration = breakPeriod.endTime
                          ? calculateDuration(breakPeriod.startTime, breakPeriod.endTime, 0)
                          : null
                        return (
                          <div
                            key={breakPeriod.id}
                            className="flex items-center justify-between text-xs bg-background/50 rounded px-2 py-1.5"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0.5 ${getBreakTypeBadgeColor(breakPeriod.type)} cursor-pointer hover:opacity-80`}
                                onClick={() => openEditBreakDialog(currentEntry.id, breakPeriod.id, breakPeriod.title)}
                                title="Click to edit break title"
                              >
                                {getBreakTypeLabel(breakPeriod.type, breakPeriod.title)}
                              </Badge>
                              {breakPeriod.title && breakPeriod.type !== "custom" ? (
                                <>
                                  <span className="text-foreground/90 font-medium truncate">{breakPeriod.title}</span>
                                  <span className="text-foreground/60 text-[10px]">
                                    {formatTime(breakPeriod.startTime)} → {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : "ongoing"}
                                  </span>
                                </>
                              ) : (
                                <span className="text-foreground/70 text-[10px]">
                                  {formatTime(breakPeriod.startTime)} → {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : "ongoing"}
                                </span>
                              )}
                            </div>
                            {breakDuration && (
                              <span className="text-foreground/70 font-mono text-[10px] whitespace-nowrap ml-2">
                                {breakDuration.hours}h {breakDuration.minutes}m
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Show previous tasks if any */}
                {currentEntry.subtasks && currentEntry.subtasks.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-3 border border-muted">
                    <p className="text-xs font-medium text-foreground/90 mb-2">Previous tasks in this session:</p>
                    <div className="space-y-1.5">
                      {currentEntry.subtasks.map((subtask) => {
                        const subtaskDuration = calculateDuration(
                          subtask.clockIn,
                          subtask.clockOut,
                          0,
                        )
                        return (
                          <div
                            key={subtask.id}
                            className="flex items-center justify-between text-xs bg-background/50 rounded px-2 py-1.5"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-foreground/90 font-medium truncate block">
                                {subtask.title}
                              </span>
                              <span className="text-foreground/60 text-[10px]">
                                {formatTime(subtask.clockIn)} → {subtask.clockOut ? formatTime(subtask.clockOut) : "..."}
                              </span>
                            </div>
                            <span className="text-foreground/70 font-mono text-[10px] whitespace-nowrap ml-2">
                              {subtaskDuration.hours}h {subtaskDuration.minutes}m
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {!activeBreak && (
                  // add task management buttons
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                    <Button onClick={openEditTaskDialog} variant="outline" className="gap-2 bg-transparent w-full sm:w-auto min-h-[44px]">
                      <Clock className="h-4 w-4" />
                      Edit Task
                    </Button>
                    <Button onClick={() => setSwitchTaskDialogOpen(true)} variant="outline" className="gap-2 w-full sm:w-auto min-h-[44px]">
                      <Play className="h-4 w-4" />
                      Switch Task
                    </Button>
                  {allowOverworkMinutes > 0 && (
                    <Button
                      onClick={() => setOverworkDialogOpen(true)}
                      variant="outline"
                      className="gap-2 w-full sm:w-auto min-h-[44px]"
                      disabled={overworkMinutesRequested >= allowOverworkMinutes}
                    >
                      <Timer className="h-4 w-4" />
                      {overworkMinutesRequested > 0 ? `Overwork: ${overworkMinutesRequested}m` : "Add Overwork"}
                    </Button>
                  )}
                    <Button onClick={() => setBreakDialogOpen(true)} variant="outline" className="gap-2 w-full sm:w-auto min-h-[44px]">
                      <Coffee className="h-4 w-4" />
                      Take Break
                    </Button>
                    <Button onClick={handleClockOut} variant="destructive" className="gap-2 w-full sm:w-auto sm:ml-auto min-h-[44px]">
                      <Square className="h-4 w-4" />
                      Clock Out
                    </Button>
                  </div>
                )}

                  {activeBreak && (
                    <div className="bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-lg p-4 text-center">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Break in progress</p>
                      <p className="text-xs text-foreground/70 mt-1">All work activities are paused</p>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={overworkDialogOpen} onOpenChange={setOverworkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Overwork</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-foreground/70">
                You can add up to {allowOverworkMinutes} extra minutes for today. If you leave this at 0, only your grace period ({graceMinutes} minutes) will apply.
              </p>
              <Input
                type="number"
                min={0}
                max={allowOverworkMinutes}
                value={overworkMinutesInput}
                onChange={(e) => setOverworkMinutesInput(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOverworkDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveOverworkMinutes}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full max-w-full">
            <Card className="bg-card border-border w-full max-w-full overflow-hidden !px-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-2 sm:p-3 md:p-4 !px-2 sm:!px-3 md:!px-4">
                <CardTitle className="text-xs sm:text-sm font-medium text-foreground/70">Today</CardTitle>
                <Calendar className="size-4 sm:size-5 text-primary flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{todayHours.toFixed(1)}h</div>
                  <p className="text-xs text-foreground/70 mt-1">{todayEntries.length} session(s)</p>
                  <p className="text-xs text-foreground/70 mt-1">
                    Remaining: {formatMinutes(workStats.remainingMinutes)}
                  </p>
                  {workStats.overtimeBadge && <Badge variant="destructive" className="mt-1">Over limit</Badge>}
            </CardContent>
          </Card>

          <Card className="bg-card border-border w-full max-w-full overflow-hidden !px-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 md:p-5 !px-3 sm:!px-4 md:!px-5">
              <CardTitle className="text-xs sm:text-sm font-medium text-foreground/70">This Week</CardTitle>
              <Timer className="size-4 sm:size-5 text-chart-2 flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{weeklyHours.toFixed(1)}h</div>
                  <p className="text-xs text-foreground/70 mt-1">{thisWeekEntries.length} session(s)</p>
              {workStats.weeklyCatchUpMinutes > 0 ? (
                <p className="text-xs text-amber-500 mt-1">
                  Catch-up available: {formatMinutes(workStats.weeklyCatchUpMinutes)}
                </p>
              ) : (
                <p className="text-xs text-foreground/60 mt-1">On track for the week</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border w-full max-w-full overflow-hidden !px-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 md:p-5 !px-3 sm:!px-4 md:!px-5">
              <CardTitle className="text-xs sm:text-sm font-medium text-foreground/70">Period Hours</CardTitle>
              <CalendarRange className="size-4 sm:size-5 text-chart-3 flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{periodHours.toFixed(1)}h</div>
                  <p className="text-xs text-foreground/70 mt-1">{filteredEntries.length} session(s)</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border w-full max-w-full overflow-hidden !px-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 md:p-5 !px-3 sm:!px-4 md:!px-5">
              <CardTitle className="text-xs sm:text-sm font-medium text-foreground/70">Total Breaks</CardTitle>
              <Coffee className="size-4 sm:size-5 text-chart-4 flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{periodBreakMinutes}m</div>
                  <p className="text-xs text-foreground/70 mt-1">
                    {Math.floor(periodBreakMinutes / 60)}h {periodBreakMinutes % 60}m total
                  </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 w-full max-w-full">
            <Card className="bg-card border-border w-full max-w-full overflow-hidden !px-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-2 sm:p-3 md:p-4 !px-2 sm:!px-3 md:!px-4">
                <CardTitle className="text-xs sm:text-sm font-medium text-foreground/70">Weekly Summary</CardTitle>
                <Timer className="size-4 sm:size-5 text-primary flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
                <div className="text-xl sm:text-2xl font-bold text-foreground">{activeDaysWeek} day(s)</div>
                <p className="text-xs text-foreground/70 mt-1">
                  {weeklyHours.toFixed(1)}h, {weeklyBreakMinutes}m breaks
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border w-full max-w-full overflow-hidden !px-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-2 sm:p-3 md:p-4 !px-2 sm:!px-3 md:!px-4">
                <CardTitle className="text-xs sm:text-sm font-medium text-foreground/70">Work Streak</CardTitle>
                <CalendarDays className="size-4 sm:size-5 text-chart-2 flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
                <div className="text-xl sm:text-2xl font-bold text-foreground">{streakDays} day(s)</div>
                <p className="text-xs text-foreground/70 mt-1">
                  {streakDays > 0 ? "Keep it going!" : "Log time today to start"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card w-full max-w-full overflow-hidden !px-0">
            <CardHeader className="p-2 sm:p-3 md:p-4 !px-2 sm:!px-3 md:!px-4">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-sm sm:text-base font-semibold">Time History</h3>
                <div className="text-xs sm:text-sm text-foreground/70 bg-muted/50 px-2 sm:px-3 py-1 rounded-lg">
                  {viewPeriod === "daily" && "Daily view"}
                  {viewPeriod === "weekly" && `${periodStats.sessionCount} sessions`}
                  {viewPeriod === "monthly" && `${periodStats.totalHours}h total`}
                  {viewPeriod === "yearly" && `${periodStats.sessionCount} sessions`}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <Button variant="ghost" onClick={handlePrevPeriod} className="hover:bg-secondary min-h-[44px] text-xs sm:text-sm">
                    <ChevronLeft className="size-3 sm:size-4 mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  <div className="px-2 sm:px-4 py-2 bg-card border border-border rounded-lg text-center min-w-[100px] sm:min-w-48 flex-1 sm:flex-none max-w-full">
                    <p className="text-xs sm:text-sm font-medium text-foreground">{getPeriodLabel(selectedDate, viewPeriod)}</p>
                    <p className="text-[10px] sm:text-xs text-foreground/70 mt-1">
                      {viewPeriod.charAt(0).toUpperCase() + viewPeriod.slice(1)} View
                    </p>
                  </div>
                  <Button variant="ghost" onClick={handleToday} className="text-primary hover:bg-primary/10 min-h-[44px] text-xs sm:text-sm">
                    Today
                  </Button>
                  <Button variant="ghost" onClick={handleNextPeriod} className="hover:bg-secondary min-h-[44px] text-xs sm:text-sm">
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                    <ChevronRight className="size-3 sm:size-4 ml-1" />
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={exportToCSV}
                    variant="outline"
                    className="border-border hover:bg-secondary bg-transparent w-full sm:w-auto min-h-[44px]"
                  >
                    <Download className="size-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    onClick={exportToJSON}
                    variant="outline"
                    className="border-border hover:bg-secondary bg-transparent w-full sm:w-auto min-h-[44px]"
                  >
                    <Download className="size-4 mr-2" />
                    JSON
                  </Button>
                  {/* ADDED EXCEL EXPORT BUTTON */}
                  <Button
                    onClick={exportToExcel}
                    variant="outline"
                    className="border-border hover:bg-secondary bg-transparent w-full sm:w-auto min-h-[44px]"
                  >
                    <FileSpreadsheet className="size-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>
              {/* Rest of the card header content */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-border gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap w-full sm:w-auto">
                  <div className="grid grid-cols-4 sm:flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-full sm:w-auto max-w-full">
                    {(["daily", "weekly", "monthly", "yearly"] as ViewPeriod[]).map((period) => (
                    <Button
                      key={period}
                      variant={viewPeriod === period ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setViewPeriod(period)}
                      className={cn(
                        "capitalize text-xs px-2 sm:px-3 whitespace-nowrap transition-all duration-200 min-h-[44px] sm:min-h-0",
                        viewPeriod === period && "bg-background shadow-sm ring-1 ring-primary/20",
                      )}
                    >
                      {period === "daily" && <CalendarDays className="size-3 mr-1 sm:mr-1.5" />}
                      {period === "weekly" && <CalendarRange className="size-3 mr-1 sm:mr-1.5" />}
                      {period === "monthly" && <Calendar className="size-3 mr-1 sm:mr-1.5" />}
                      {period === "yearly" && <CalendarClock className="size-3 mr-1 sm:mr-1.5" />}
                      <span className="hidden sm:inline">{period}</span>
                      <span className="sm:hidden">{period.charAt(0).toUpperCase()}</span>
                    </Button>
                  ))}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-2 sm:p-3 md:p-4 pt-0 !px-2 sm:!px-3 md:!px-4">
            {sortedDates.length === 0 ? (
              <div className="text-center py-4 text-foreground/70">
                <Clock className="size-5 sm:size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm sm:text-base">No entries for this period</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {viewPeriod === "daily" &&
                  sortedDates.map((date) => {
                    const dateEntries = groupedEntries[date]
                    const dayTotal = calculateTotalHours(dateEntries)
                    const dayBreaks = calculateTotalBreakMinutes(dateEntries)

                    return (
                      <div key={date} className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <span className="font-medium text-sm sm:text-base text-foreground">{formatDate(date)}</span>
                          <span className="text-foreground/70 text-xs sm:text-sm">
                            {dayTotal.toFixed(1)}h worked, {dayBreaks}m breaks
                          </span>
                        </div>
                        <div className="rounded-lg border border-border overflow-hidden w-full max-w-full">
                          {/* Mobile Card Layout */}
                          <div className="block sm:hidden space-y-2 p-2 sm:p-3 w-full max-w-full">
                            {dateEntries.map((entry) => {
                              const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
                              const isCurrentEntry = currentEntry?.id === entry.id && !entry.clockOut
                              const breakDuration =
                                entry.breaks?.reduce(
                                  (total, b) =>
                                    total +
                                    (new Date(b.endTime || Date.now()).getTime() - new Date(b.startTime).getTime()),
                                  0,
                                ) || 0
                              const breakMinutesCount = Math.round(breakDuration / (1000 * 60))

                              return (
                                <Card key={entry.id} className={cn("bg-card border-border", isCurrentEntry && "bg-primary/5 border-primary/20")}>
                                  <CardContent className="p-3 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          {isCurrentEntry && (
                                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                                          )}
                                          <span className="font-semibold text-sm truncate">
                                            {entry.title || (
                                              <span className="text-foreground/70 italic">No task specified</span>
                                            )}
                                          </span>
                                          {entry.category && (() => {
                                            const category = timeCategories.find((c) => c.id === entry.category)
                                            return category ? (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 py-0 flex-shrink-0"
                                                style={{
                                                  borderColor: category.color,
                                                  color: category.color,
                                                  backgroundColor: `${category.color}15`,
                                                }}
                                              >
                                                {category.name}
                                              </Badge>
                                            ) : null
                                          })()}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                          <div>
                                            <span className="font-medium">In:</span> {formatTime(entry.clockIn)}
                                          </div>
                                          <div>
                                            <span className="font-medium">Out:</span>{" "}
                                            {entry.clockOut ? (
                                              formatTime(entry.clockOut)
                                            ) : (
                                              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                                                In Progress
                                              </Badge>
                                            )}
                                          </div>
                                          <div>
                                            <span className="font-medium">Duration:</span>{" "}
                                            {isCurrentEntry ? (
                                              <span className="text-primary font-semibold">
                                                {String(elapsedTime.hours).padStart(2, "0")}h{" "}
                                                {String(elapsedTime.minutes).padStart(2, "0")}m
                                              </span>
                                            ) : (
                                              `${String(duration.hours).padStart(2, "0")}h ${String(duration.minutes).padStart(2, "0")}m`
                                            )}
                                          </div>
                                          <div>
                                            <span className="font-medium">Breaks:</span>{" "}
                                            {entry.breaks && entry.breaks.length > 0 ? (
                                              <span>{breakMinutesCount}m</span>
                                            ) : (
                                              <span>—</span>
                                            )}
                                          </div>
                                        </div>
                                        {entry.breaks && entry.breaks.length > 0 && (
                                          <div className="pt-2 border-t border-border space-y-1.5">
                                            {entry.breaks.map((breakPeriod) => {
                                              const breakDuration = breakPeriod.endTime
                                                ? calculateDuration(breakPeriod.startTime, breakPeriod.endTime, 0)
                                                : null
                                              return (
                                                <div key={breakPeriod.id} className="flex items-center gap-2 text-xs">
                                                  <Badge
                                                    variant="outline"
                                                    className={`text-[10px] px-1.5 py-0.5 ${getBreakTypeBadgeColor(breakPeriod.type)}`}
                                                  >
                                                    {getBreakTypeLabel(breakPeriod.type, breakPeriod.title)}
                                                  </Badge>
                                                  <span className="text-foreground/70">
                                                    {formatTime(breakPeriod.startTime)} -{" "}
                                                    {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : "ongoing"}
                                                    {breakDuration && (
                                                      <span className="ml-1 text-foreground/60">
                                                        ({breakDuration.hours}h {breakDuration.minutes}m)
                                                      </span>
                                                    )}
                                                  </span>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px]">
                                            ⋯
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => openNotesDialog(entry)}>
                                            Edit Notes
                                          </DropdownMenuItem>
                                          {isCurrentEntry && (
                                            <DropdownMenuItem onClick={handleClockOut} className="text-destructive">
                                              Clock Out
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem
                                            onClick={() => handleDeleteEntry(entry.id)}
                                            className="text-destructive"
                                          >
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                          {/* Desktop Table Layout */}
                          <div className="hidden sm:block overflow-x-auto w-full">
                            <Table className="w-full">
                              <TableHeader>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="text-xs whitespace-nowrap">Task Description</TableHead>
                                  <TableHead className="text-xs whitespace-nowrap">Clock In</TableHead>
                                  <TableHead className="text-xs whitespace-nowrap">Clock Out</TableHead>
                                  <TableHead className="text-xs whitespace-nowrap">Duration</TableHead>
                                  <TableHead className="text-xs whitespace-nowrap">Breaks</TableHead>
                                  <TableHead className="text-xs text-right whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dateEntries.map((entry) => {
                                  const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
                                  const isCurrentEntry = currentEntry?.id === entry.id && !entry.clockOut
                                  const breakDuration =
                                    entry.breaks?.reduce(
                                      (total, b) =>
                                        total +
                                        (new Date(b.endTime || Date.now()).getTime() - new Date(b.startTime).getTime()),
                                      0,
                                    ) || 0
                                  const breakMinutesCount = Math.round(breakDuration / (1000 * 60))

                                  return (
                                    <TableRow key={entry.id} className={isCurrentEntry ? "bg-primary/5" : ""}>
                                      <TableCell className="font-semibold text-xs max-w-sm">
                                        <div className="flex items-start gap-2">
                                          <div className="mt-0.5">
                                            {isCurrentEntry && (
                                              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 truncate">
                                            <span className="truncate">
                                              {entry.title || (
                                                <span className="text-foreground/70 italic">No task specified</span>
                                              )}
                                            </span>
                                            {entry.category && (() => {
                                              const category = timeCategories.find((c) => c.id === entry.category)
                                              return category ? (
                                                <Badge
                                                  variant="outline"
                                                  className="text-[10px] px-1.5 py-0 flex-shrink-0"
                                                  style={{
                                                    borderColor: category.color,
                                                    color: category.color,
                                                    backgroundColor: `${category.color}15`,
                                                  }}
                                                >
                                                  {category.name}
                                                </Badge>
                                              ) : null
                                            })()}
                                          </div>
                                        </div>
                                        {entry.subtasks && entry.subtasks.length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-muted text-xs text-foreground/70 space-y-1.5">
                                            <p className="font-medium text-foreground mb-1">Previous tasks in this session:</p>
                                            {entry.subtasks.map((subtask, idx) => {
                                              const subtaskDuration = calculateDuration(
                                                subtask.clockIn,
                                                subtask.clockOut,
                                                0,
                                              )
                                              return (
                                                <div
                                                  key={subtask.id}
                                                  className="flex items-start gap-2 pl-2 border-l-2 border-muted/50"
                                                >
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                      <span className="text-foreground/90 font-medium truncate">
                                                        {subtask.title}
                                                      </span>
                                                    </div>
                                                    <div className="text-foreground/60 text-[10px] mt-0.5">
                                                      {formatTime(subtask.clockIn)} → {subtask.clockOut ? formatTime(subtask.clockOut) : "..."}
                                                    </div>
                                                  </div>
                                                  <span className="text-foreground/70 font-mono text-[10px] whitespace-nowrap">
                                                    {subtaskDuration.hours}h {subtaskDuration.minutes}m
                                                  </span>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="font-mono text-xs">{formatTime(entry.clockIn)}</TableCell>
                                      <TableCell className="font-mono text-xs">
                                        {entry.clockOut ? (
                                          formatTime(entry.clockOut)
                                        ) : (
                                          <Badge
                                            variant="secondary"
                                            className="bg-primary/20 text-primary border-primary/30"
                                          >
                                            In Progress
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="font-mono text-xs">
                                        {isCurrentEntry ? (
                                          <span className="text-primary font-semibold">
                                            {String(elapsedTime.hours).padStart(2, "0")}h{" "}
                                            {String(elapsedTime.minutes).padStart(2, "0")}m
                                          </span>
                                        ) : (
                                          `${String(duration.hours).padStart(2, "0")}h ${String(duration.minutes).padStart(2, "0")}m`
                                        )}
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {entry.breaks && entry.breaks.length > 0 ? (
                                          <div className="text-xs space-y-1.5">
                                            {entry.breaks.map((breakPeriod) => {
                                              const breakDuration = breakPeriod.endTime
                                                ? calculateDuration(breakPeriod.startTime, breakPeriod.endTime, 0)
                                                : null
                                              return (
                                                <div key={breakPeriod.id} className="flex items-center gap-2">
                                                  <Badge
                                                    variant="outline"
                                                    className={`text-[10px] px-1.5 py-0.5 ${getBreakTypeBadgeColor(breakPeriod.type)} cursor-pointer hover:opacity-80`}
                                                    onClick={() => openEditBreakDialog(entry.id, breakPeriod.id, breakPeriod.title)}
                                                    title="Click to edit break title"
                                                  >
                                                    {getBreakTypeLabel(breakPeriod.type, breakPeriod.title)}
                                                  </Badge>
                                                  <span className="text-foreground/70">
                                                    {formatTime(breakPeriod.startTime)} -{" "}
                                                    {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : "ongoing"}
                                                    {breakDuration && (
                                                      <span className="ml-1 text-foreground/60">
                                                        ({breakDuration.hours}h {breakDuration.minutes}m)
                                                      </span>
                                                    )}
                                                  </span>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        ) : (
                                          <span className="text-foreground/70">—</span>
                                        )}
                                      </TableCell>

                                      <TableCell>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                              ⋯
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openNotesDialog(entry)}>
                                              Edit Notes
                                            </DropdownMenuItem>
                                            {isCurrentEntry && (
                                              <DropdownMenuItem onClick={handleClockOut} className="text-destructive">
                                                Clock Out
                                              </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem
                                              onClick={() => handleDeleteEntry(entry.id)}
                                              className="text-destructive"
                                            >
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                {viewPeriod === "weekly" &&
                  // Use groupEntriesByWeek for weekly view
                  Object.entries(groupEntriesByWeek(filteredEntries))
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()) // Sort weeks
                    .map(([weekStartKey, weekEntries]) => {
                      const weekTotalHours = calculateTotalHours(weekEntries)
                      const weekTotalBreakMinutes = calculateTotalBreakMinutes(weekEntries)
                      const weekLabel = getPeriodLabel(new Date(weekStartKey), "weekly")

                      return (
                        <div key={weekStartKey} className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
                            <span className="font-medium text-foreground">{weekLabel}</span>
                            <span className="text-foreground/70 text-xs sm:text-sm">
                              {weekTotalHours.toFixed(1)}h worked, {weekTotalBreakMinutes}m breaks
                            </span>
                          </div>
                          <div className="rounded-lg border border-border overflow-hidden w-full max-w-full">
                            {/* Mobile Card Layout */}
                            <div className="block sm:hidden space-y-2 p-2 sm:p-3 w-full max-w-full">
                              {Object.entries(groupEntriesByDate(weekEntries))
                                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                                .map(([date, dateEntries]) => {
                                  const dayTotal = calculateTotalHours(dateEntries)
                                  const dayBreaks = calculateTotalBreakMinutes(dateEntries)
                                  return (
                                    <div key={date} className="space-y-2">
                                      <div className="flex items-center justify-between pb-2 border-b border-border">
                                        <span className="font-semibold text-sm text-foreground">{formatDate(date)}</span>
                                        <span className="text-xs text-foreground/70">
                                          {dayTotal.toFixed(1)}h / {dayBreaks}m
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        {dateEntries.map((entry) => {
                                          const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
                                          const isCurrentEntry = currentEntry?.id === entry.id && !entry.clockOut
                                          const breakDuration =
                                            entry.breaks?.reduce(
                                              (total, b) =>
                                                total +
                                                (new Date(b.endTime || Date.now()).getTime() - new Date(b.startTime).getTime()),
                                              0,
                                            ) || 0
                                          const breakMinutesCount = Math.round(breakDuration / (1000 * 60))

                                          return (
                                            <Card key={entry.id} className={cn("bg-card border-border", isCurrentEntry && "bg-primary/5 border-primary/20")}>
                                              <CardContent className="p-3 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      {isCurrentEntry && (
                                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                                                      )}
                                                      <span className="font-semibold text-sm truncate">
                                                        {entry.title || (
                                                          <span className="text-foreground/70 italic">No task specified</span>
                                                        )}
                                                      </span>
                                                      {entry.category && (() => {
                                                        const category = timeCategories.find((c) => c.id === entry.category)
                                                        return category ? (
                                                          <Badge
                                                            variant="outline"
                                                            className="text-[10px] px-1.5 py-0 flex-shrink-0"
                                                            style={{
                                                              borderColor: category.color,
                                                              color: category.color,
                                                              backgroundColor: `${category.color}15`,
                                                            }}
                                                          >
                                                            {category.name}
                                                          </Badge>
                                                        ) : null
                                                      })()}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                      <div>
                                                        <span className="font-medium">In:</span> {formatTime(entry.clockIn)}
                                                      </div>
                                                      <div>
                                                        <span className="font-medium">Out:</span>{" "}
                                                        {entry.clockOut ? (
                                                          formatTime(entry.clockOut)
                                                        ) : (
                                                          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                                                            In Progress
                                                          </Badge>
                                                        )}
                                                      </div>
                                                      <div>
                                                        <span className="font-medium">Duration:</span>{" "}
                                                        {isCurrentEntry ? (
                                                          <span className="text-primary font-semibold">
                                                            {String(elapsedTime.hours).padStart(2, "0")}h{" "}
                                                            {String(elapsedTime.minutes).padStart(2, "0")}m
                                                          </span>
                                                        ) : (
                                                          `${String(duration.hours).padStart(2, "0")}h ${String(duration.minutes).padStart(2, "0")}m`
                                                        )}
                                                      </div>
                                                      <div>
                                                        <span className="font-medium">Breaks:</span>{" "}
                                                        {entry.breaks && entry.breaks.length > 0 ? (
                                                          <span>{breakMinutesCount}m</span>
                                                        ) : (
                                                          <span>—</span>
                                                        )}
                                                      </div>
                                                    </div>
                                                    {entry.breaks && entry.breaks.length > 0 && (
                                                      <div className="pt-2 border-t border-border space-y-1.5">
                                                        {entry.breaks.map((breakPeriod) => {
                                                          const breakDuration = breakPeriod.endTime
                                                            ? calculateDuration(breakPeriod.startTime, breakPeriod.endTime, 0)
                                                            : null
                                                          return (
                                                            <div key={breakPeriod.id} className="flex items-center gap-2 text-xs">
                                                              <Badge
                                                                variant="outline"
                                                                className={`text-[10px] px-1.5 py-0.5 ${getBreakTypeBadgeColor(breakPeriod.type)}`}
                                                              >
                                                                {getBreakTypeLabel(breakPeriod.type, breakPeriod.title)}
                                                              </Badge>
                                                              <span className="text-foreground/70">
                                                                {formatTime(breakPeriod.startTime)} -{" "}
                                                                {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : "ongoing"}
                                                                {breakDuration && (
                                                                  <span className="ml-1 text-foreground/60">
                                                                    ({breakDuration.hours}h {breakDuration.minutes}m)
                                                                  </span>
                                                                )}
                                                              </span>
                                                            </div>
                                                          )
                                                        })}
                                                      </div>
                                                    )}
                                                  </div>
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px]">
                                                        ⋯
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                      <DropdownMenuItem onClick={() => openNotesDialog(entry)}>
                                                        Edit Notes
                                                      </DropdownMenuItem>
                                                      {isCurrentEntry && (
                                                        <DropdownMenuItem onClick={handleClockOut} className="text-destructive">
                                                          Clock Out
                                                        </DropdownMenuItem>
                                                      )}
                                                      <DropdownMenuItem
                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                        className="text-destructive"
                                                      >
                                                        Delete
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                            {/* Desktop Table Layout */}
                            <div className="hidden sm:block overflow-x-auto w-full max-w-full">
                              <Table className="w-full min-w-[600px]">
                                <TableHeader>
                                  <TableRow className="bg-muted/30">
                                    <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                                    <TableHead className="text-xs whitespace-nowrap">Task Description</TableHead>
                                    <TableHead className="text-xs whitespace-nowrap">Clock In</TableHead>
                                    <TableHead className="text-xs whitespace-nowrap">Clock Out</TableHead>
                                    <TableHead className="text-xs whitespace-nowrap">Duration</TableHead>
                                    <TableHead className="text-xs whitespace-nowrap">Breaks</TableHead>
                                    <TableHead className="text-xs text-right whitespace-nowrap">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Object.entries(groupEntriesByDate(weekEntries))
                                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()) // Sort days within the week
                                    .map(([date, dateEntries]) => {
                                      const dayTotal = calculateTotalHours(dateEntries)
                                      const dayBreaks = calculateTotalBreakMinutes(dateEntries)
                                      return (
                                        <React.Fragment key={date}>
                                          <TableRow className="bg-card/10">
                                            <TableCell
                                              rowSpan={dateEntries.length + 1}
                                              className="font-medium text-xs align-top"
                                            >
                                              {formatDate(date)}
                                              <div className="text-foreground/70 text-xs pt-1">
                                                {dayTotal.toFixed(1)}h / {dayBreaks}m
                                              </div>
                                            </TableCell>
                                            {/* First entry for the day */}
                                            {dateEntries.map((entry, index) => {
                                              const duration = calculateDuration(
                                                entry.clockIn,
                                                entry.clockOut,
                                                entry.breakMinutes,
                                              )
                                              const isCurrentEntry = currentEntry?.id === entry.id && !entry.clockOut

                                              return (
                                                <React.Fragment key={entry.id}>
                                                  {index === 0 && (
                                                    <>
                                                      <TableCell className="font-semibold text-xs max-w-sm">
                                                        <div className="flex items-start gap-2">
                                                          <div className="mt-0.5">
                                                            {isCurrentEntry && (
                                                              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                            )}
                                                          </div>
                                                    <div className="flex items-center gap-2 truncate">
                                                      <span className="truncate">
                                                        {entry.title || (
                                                          <span className="text-foreground/70 italic">
                                                            No task specified
                                                          </span>
                                                        )}
                                                      </span>
                                                      {entry.category && (() => {
                                                        const category = timeCategories.find((c) => c.id === entry.category)
                                                        return category ? (
                                                          <Badge
                                                            variant="outline"
                                                            className="text-[10px] px-1.5 py-0 flex-shrink-0"
                                                            style={{
                                                              borderColor: category.color,
                                                              color: category.color,
                                                              backgroundColor: `${category.color}15`,
                                                            }}
                                                          >
                                                            {category.name}
                                                          </Badge>
                                                        ) : null
                                                      })()}
                                                    </div>
                                                  </div>
                                                  {entry.subtasks && entry.subtasks.length > 0 && (
                                                          <div className="mt-2 pt-2 border-t border-muted text-xs text-foreground/70 space-y-1">
                                                            <p className="font-medium text-foreground">
                                                              Tasks completed:
                                                            </p>
                                                            {entry.subtasks.map((subtask) => {
                                                              const subtaskDuration = calculateDuration(
                                                                subtask.clockIn,
                                                                subtask.clockOut,
                                                                0,
                                                              )
                                                              return (
                                                                <div
                                                                  key={subtask.id}
                                                                  className="flex items-center justify-between text-xs"
                                                                >
                                                                  <span className="truncate flex-1">
                                                                    • {subtask.title}
                                                                  </span>
                                                                  <span className="text-foreground/70 ml-2">
                                                                    {subtaskDuration.hours}h {subtaskDuration.minutes}m
                                                                  </span>
                                                                </div>
                                                              )
                                                            })}
                                                          </div>
                                                        )}
                                                      </TableCell>
                                                      <TableCell className="font-mono text-xs">
                                                        {formatTime(entry.clockIn)}
                                                      </TableCell>
                                                      <TableCell className="font-mono text-xs">
                                                        {entry.clockOut ? (
                                                          formatTime(entry.clockOut)
                                                        ) : (
                                                          <Badge
                                                            variant="secondary"
                                                            className="bg-primary/20 text-primary border-primary/30"
                                                          >
                                                            In Progress
                                                          </Badge>
                                                        )}
                                                      </TableCell>
                                                      <TableCell className="font-mono text-xs">
                                                        {isCurrentEntry ? (
                                                          <span className="text-primary font-semibold">
                                                            {String(elapsedTime.hours).padStart(2, "0")}h{" "}
                                                            {String(elapsedTime.minutes).padStart(2, "0")}m
                                                          </span>
                                                        ) : (
                                                          `${String(duration.hours).padStart(2, "0")}h ${String(duration.minutes).padStart(2, "0")}m`
                                                        )}
                                                      </TableCell>
                                                      <TableCell className="text-xs">
                                                        {entry.breaks && entry.breaks.length > 0 ? (
                                                          <div className="text-xs space-y-1.5">
                                                            {entry.breaks.map((breakPeriod) => {
                                                              const breakDuration = breakPeriod.endTime
                                                                ? calculateDuration(breakPeriod.startTime, breakPeriod.endTime, 0)
                                                                : null
                                                              return (
                                                                <div key={breakPeriod.id} className="flex items-center gap-2">
                                                                  <Badge
                                                                    variant="outline"
                                                                    className={`text-[10px] px-1.5 py-0.5 ${getBreakTypeBadgeColor(breakPeriod.type)} cursor-pointer hover:opacity-80`}
                                                                    onClick={() => openEditBreakDialog(entry.id, breakPeriod.id, breakPeriod.title)}
                                                                    title="Click to edit break title"
                                                                  >
                                                                    {getBreakTypeLabel(breakPeriod.type, breakPeriod.title)}
                                                                  </Badge>
                                                                  <span className="text-foreground/70">
                                                                    {breakPeriod.title && breakPeriod.type !== "custom" ? (
                                                                      <>
                                                                        <span className="font-medium">{breakPeriod.title}</span>
                                                                        <span className="ml-2 text-foreground/60 text-[10px]">
                                                                          {formatTime(breakPeriod.startTime)} -{" "}
                                                                          {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : "ongoing"}
                                                                          {breakDuration && ` (${breakDuration.hours}h ${breakDuration.minutes}m)`}
                                                                        </span>
                                                                      </>
                                                                    ) : (
                                                                      <>
                                                                        {formatTime(breakPeriod.startTime)} -{" "}
                                                                        {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : "ongoing"}
                                                                        {breakDuration && (
                                                                          <span className="ml-1 text-foreground/60">
                                                                            ({breakDuration.hours}h {breakDuration.minutes}m)
                                                                          </span>
                                                                        )}
                                                                      </>
                                                                    )}
                                                                  </span>
                                                                </div>
                                                              )
                                                            })}
                                                          </div>
                                                        ) : (
                                                          <span className="text-foreground/70">—</span>
                                                        )}
                                                      </TableCell>

                                                      <TableCell>
                                                        <DropdownMenu>
                                                          <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                              ⋯
                                                            </Button>
                                                          </DropdownMenuTrigger>
                                                          <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openNotesDialog(entry)}>
                                                              Edit Notes
                                                            </DropdownMenuItem>
                                                            {isCurrentEntry && (
                                                              <DropdownMenuItem
                                                                onClick={handleClockOut}
                                                                className="text-destructive"
                                                              >
                                                                Clock Out
                                                              </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                              onClick={() => handleDeleteEntry(entry.id)}
                                                              className="text-destructive"
                                                            >
                                                              Delete
                                                            </DropdownMenuItem>
                                                          </DropdownMenuContent>
                                                        </DropdownMenu>
                                                      </TableCell>
                                                    </>
                                                  )}
                                                </React.Fragment>
                                              )
                                            })}
                                          </TableRow>
                                          {/* Subsequent entries for the same day */}
                                          {dateEntries.slice(1).map((entry) => {
                                            const duration = calculateDuration(
                                              entry.clockIn,
                                              entry.clockOut,
                                              entry.breakMinutes,
                                            )
                                            const isCurrentEntry = currentEntry?.id === entry.id && !entry.clockOut

                                            return (
                                              <TableRow key={entry.id} className={isCurrentEntry ? "bg-primary/5" : ""}>
                                                <TableCell className="font-semibold text-xs max-w-sm">
                                                  <div className="flex items-start gap-2">
                                                    <div className="mt-0.5">
                                                      {isCurrentEntry && (
                                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                      )}
                                                    </div>
                                                    <div className="flex items-center gap-2 truncate">
                                                      <span className="truncate">
                                                        {entry.title || (
                                                          <span className="text-foreground/70 italic">
                                                            No task specified
                                                          </span>
                                                        )}
                                                      </span>
                                                      {entry.category && (() => {
                                                        const category = timeCategories.find((c) => c.id === entry.category)
                                                        return category ? (
                                                          <Badge
                                                            variant="outline"
                                                            className="text-[10px] px-1.5 py-0 flex-shrink-0"
                                                            style={{
                                                              borderColor: category.color,
                                                              color: category.color,
                                                              backgroundColor: `${category.color}15`,
                                                            }}
                                                          >
                                                            {category.name}
                                                          </Badge>
                                                        ) : null
                                                      })()}
                                                    </div>
                                                  </div>
                                                  {entry.subtasks && entry.subtasks.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-muted text-xs text-foreground/70 space-y-1">
                                                      <p className="font-medium text-foreground">Tasks completed:</p>
                                                      {entry.subtasks.map((subtask) => {
                                                        const subtaskDuration = calculateDuration(
                                                          subtask.clockIn,
                                                          subtask.clockOut,
                                                          0,
                                                        )
                                                        return (
                                                          <div
                                                            key={subtask.id}
                                                            className="flex items-center justify-between text-xs"
                                                          >
                                                            <span className="truncate flex-1">• {subtask.title}</span>
                                                            <span className="text-foreground/70 ml-2">
                                                              {subtaskDuration.hours}h {subtaskDuration.minutes}m
                                                            </span>
                                                          </div>
                                                        )
                                                      })}
                                                    </div>
                                                  )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                  {formatTime(entry.clockIn)}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                  {entry.clockOut ? (
                                                    formatTime(entry.clockOut)
                                                  ) : (
                                                    <Badge
                                                      variant="secondary"
                                                      className="bg-primary/20 text-primary border-primary/30"
                                                    >
                                                      In Progress
                                                    </Badge>
                                                  )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                  {isCurrentEntry ? (
                                                    <span className="text-primary font-semibold">
                                                      {String(elapsedTime.hours).padStart(2, "0")}h{" "}
                                                      {String(elapsedTime.minutes).padStart(2, "0")}m
                                                    </span>
                                                  ) : (
                                                    `${String(duration.hours).padStart(2, "0")}h ${String(duration.minutes).padStart(2, "0")}m`
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                  {entry.breaks && entry.breaks.length > 0 ? (
                                                    <div className="text-xs space-y-1">
                                                      {entry.breaks.map((breakPeriod) => {
                                                        const breakDuration = breakPeriod.endTime
                                                          ? calculateDuration(breakPeriod.startTime, breakPeriod.endTime, 0)
                                                          : null
                                                        return (
                                                          <div key={breakPeriod.id} className="flex items-center gap-2">
                                                                  <Badge
                                                                    variant="outline"
                                                                    className={`text-[10px] px-1.5 py-0.5 ${getBreakTypeBadgeColor(breakPeriod.type)} cursor-pointer hover:opacity-80`}
                                                                    onClick={() => openEditBreakDialog(entry.id, breakPeriod.id, breakPeriod.title)}
                                                                    title="Click to edit break title"
                                                                  >
                                                                    {getBreakTypeLabel(breakPeriod.type, breakPeriod.title)}
                                                                  </Badge>
                                                            <span className="text-foreground/70">
                                                              {breakPeriod.title ? (
                                                                <>
                                                                  <span className="font-medium">{breakPeriod.title}</span>
                                                                  <span className="ml-2 text-foreground/60 text-[10px]">
                                                                    {formatTime(breakPeriod.startTime)} -{" "}
                                                                    {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : "ongoing"}
                                                                    {breakDuration && ` (${breakDuration.hours}h ${breakDuration.minutes}m)`}
                                                                  </span>
                                                                </>
                                                              ) : (
                                                                <>
                                                                  {formatTime(breakPeriod.startTime)} -{" "}
                                                                  {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : "ongoing"}
                                                                  {breakDuration && (
                                                                    <span className="ml-1 text-foreground/60">
                                                                      ({breakDuration.hours}h {breakDuration.minutes}m)
                                                                    </span>
                                                                  )}
                                                                </>
                                                              )}
                                                            </span>
                                                          </div>
                                                        )
                                                      })}
                                                    </div>
                                                  ) : (
                                                    <span className="text-foreground/70">—</span>
                                                  )}
                                                </TableCell>

                                                <TableCell>
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button variant="ghost" size="sm">
                                                        ⋯
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                      <DropdownMenuItem onClick={() => openNotesDialog(entry)}>
                                                        Edit Notes
                                                      </DropdownMenuItem>
                                                      {isCurrentEntry && (
                                                        <DropdownMenuItem
                                                          onClick={handleClockOut}
                                                          className="text-destructive"
                                                        >
                                                          Clock Out
                                                        </DropdownMenuItem>
                                                      )}
                                                      <DropdownMenuItem
                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                        className="text-destructive"
                                                      >
                                                        Delete
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                </TableCell>
                                              </TableRow>
                                            )
                                          })}
                                        </React.Fragment>
                                      )
                                    })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                {(viewPeriod === "monthly" || viewPeriod === "yearly") && (
                  <div className="space-y-4">
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {/* For monthly and yearly views, we need to group by month/year first */}
                      {viewPeriod === "monthly" &&
                        Object.entries(groupEntriesByMonth(filteredEntries))
                          .sort(([a], [b]) => a.localeCompare(b)) // Sort by year-month
                          .map(([monthKey, monthEntriesGroup]) => (
                            <Card key={monthKey} className="bg-card/50 border-border">
                              <CardHeader className="pb-2">
                                {/* FIX: Closing CardTitle tag */}
                                <CardTitle className="text-sm">
                                  {new Date(`${monthKey}-01`).toLocaleDateString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {/* Sum up hours and breaks for the entire month */}
                                {(() => {
                                  let totalMonthHours = 0
                                  let totalMonthBreaks = 0
                                  let sessionCount = 0
                                  Object.values(monthEntriesGroup).forEach((dayEntries) => {
                                    totalMonthHours += calculateTotalHours(dayEntries)
                                    totalMonthBreaks += calculateTotalBreakMinutes(dayEntries)
                                    sessionCount += dayEntries.length
                                  })
                                  return (
                                    <>
                                      <div className="text-2xl font-bold">{totalMonthHours.toFixed(1)}h</div>
                                      <div className="text-xs text-foreground/70 space-y-1">
                                        <p>{sessionCount} session(s)</p>
                                        <p>{totalMonthBreaks}m breaks</p>
                                      </div>
                                    </>
                                  )
                                })()}
                              </CardContent>
                            </Card>
                          ))}
                      {viewPeriod === "yearly" &&
                        Object.entries(groupEntriesByYear(filteredEntries))
                          .sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b)) // Sort by year
                          .map(([year, yearEntriesGroup]) => (
                            <Card key={year} className="bg-card/50 border-border">
                              <CardHeader className="pb-2">
                                {/* FIX: Closing CardTitle tag */}
                                <CardTitle className="text-sm">{year}</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {/* Sum up hours and breaks for the entire year */}
                                {(() => {
                                  let totalYearHours = 0
                                  let totalYearBreaks = 0
                                  let sessionCount = 0
                                  Object.values(yearEntriesGroup).forEach((monthEntriesGroup) => {
                                    Object.values(monthEntriesGroup).forEach((dayEntries) => {
                                      totalYearHours += calculateTotalHours(dayEntries)
                                      totalYearBreaks += calculateTotalBreakMinutes(dayEntries)
                                      sessionCount += dayEntries.length
                                    })
                                  })
                                  return (
                                    <>
                                      <div className="text-2xl font-bold">{totalYearHours.toFixed(1)}h</div>
                                      <div className="text-xs text-foreground/70 space-y-1">
                                        <p>{sessionCount} session(s)</p>
                                        <p>{totalYearBreaks}m breaks</p>
                                      </div>
                                    </>
                                  )
                                })()}
                              </CardContent>
                            </Card>
                          ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Dialog */}
        <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Entry Notes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Add notes for this entry..."
                value={entryNotes}
                onChange={(e) => setEntryNotes(e.target.value)}
              />
              <Button onClick={handleSaveNotes} className="w-full">
                Save Notes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Break Dialog */}
        <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Take a Break</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Break Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={breakType === "short" ? "default" : "outline"}
                    onClick={() => {
                      setBreakType("short")
                      setBreakMinutes("15")
                    }}
                    className="text-xs"
                  >
                    Short (15m)
                  </Button>
                  <Button
                    type="button"
                    variant={breakType === "lunch" ? "default" : "outline"}
                    onClick={() => {
                      setBreakType("lunch")
                      setBreakMinutes("60")
                    }}
                    className="text-xs"
                  >
                    Lunch (60m)
                  </Button>
                  <Button
                    type="button"
                    variant={breakType === "custom" ? "default" : "outline"}
                    onClick={() => setBreakType("custom")}
                    className="text-xs"
                  >
                    Custom
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Duration (minutes)</label>
                <Input
                  type="number"
                  placeholder={breakType === "short" ? "15" : breakType === "lunch" ? "60" : "Enter duration"}
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(e.target.value)}
                  min="1"
                  max="480"
                  disabled={breakType !== "custom"}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Break Title (optional)</label>
                <Input
                  placeholder="e.g., Coffee break, Lunch with team, Walk"
                  value={breakTitle}
                  onChange={(e) => setBreakTitle(e.target.value)}
                  maxLength={100}
                />
                <div className="text-xs text-foreground/60 mt-1">{breakTitle.length}/100 characters</div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleStartBreak} className="flex-1">
                  Start Break
                </Button>
                <Button variant="outline" onClick={() => {
                  setBreakDialogOpen(false)
                  setBreakMinutes("")
                  setBreakTitle("")
                  setBreakType("custom")
                }} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Break Title Dialog */}
        <Dialog open={editBreakDialogOpen} onOpenChange={setEditBreakDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Break Title</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Break Title</label>
                <Input
                  placeholder="e.g., Coffee break, Lunch with team, Walk"
                  value={breakTitleEdit}
                  onChange={(e) => setBreakTitleEdit(e.target.value)}
                  maxLength={100}
                />
                <div className="text-xs text-foreground/60 mt-1">{breakTitleEdit.length}/100 characters</div>
                <p className="text-xs text-foreground/60 mt-2">
                  Leave empty to use default "Custom" label
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveBreakTitle} className="flex-1">
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditBreakDialogOpen(false)
                    setSelectedBreak(null)
                    setBreakTitleEdit("")
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editTaskDialogOpen} onOpenChange={setEditTaskDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Current Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Task description"
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                maxLength={100}
              />
              <div className="text-xs text-gray-400">{editTaskTitle.length}/100 characters</div>
              <div className="flex gap-2">
                <Button onClick={handleEditTaskTitle} className="flex-1">
                  Update Task
                </Button>
                <Button onClick={() => setEditTaskDialogOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* CHANGE: Enhanced switch task dialog with available and frequently used tasks */}
        <Dialog
          open={switchTaskDialogOpen}
          onOpenChange={setSwitchTaskDialogOpen}
        >
          <DialogContent className="bg-card text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Switch to New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-foreground/70">
                Current task "{currentEntry?.title}" will be saved as completed
              </p>

              {/* Recently used tasks */}
              {topTemplates.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Recently Used Tasks</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {topTemplates.slice(0, 4).map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setNewTaskTitle(template.title)
                        }}
                        className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-left transition-colors text-foreground"
                      >
                        <p className="font-medium text-sm truncate">{template.title}</p>
                        <p className="text-xs text-foreground/70">Used {template.usageCount} times</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent completed tasks from history */}
              {timeEntries.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Recent Tasks from History</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from(
                      new Map(
                        timeEntries
                          .filter((e) => e.title && e.clockOut)
                          .reverse()
                          .map((e) => [e.title, e]),
                      ).values(),
                    )
                      .slice(0, 4)
                      .map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => {
                            setNewTaskTitle(entry.title || "")
                          }}
                          className="p-3 rounded-lg border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-left transition-colors text-foreground"
                        >
                          <p className="font-medium text-sm truncate">{entry.title}</p>
                          <p className="text-xs text-foreground/70">{new Date(entry.clockIn).toLocaleDateString()}</p>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              {(topTemplates.length > 0 || timeEntries.length > 0) && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-card text-foreground/70">or create new task</span>
                  </div>
                </div>
              )}

              {/* Create new task input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">New Task Description</label>
                <Input
                  placeholder="Enter a new task description"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  maxLength={100}
                  className="text-base bg-input text-foreground"
                />
                <div className="text-xs text-foreground/70">{newTaskTitle.length}/100 characters</div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSwitchTask} disabled={!newTaskTitle.trim()} className="flex-1">
                  Switch to Task
                </Button>
                <Button onClick={() => setSwitchTaskDialogOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Category Management Dialog */}
        <Dialog open={showCategoryManagement} onOpenChange={setShowCategoryManagement}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Time Categories</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  placeholder="e.g., Development, Meetings, Admin"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="category-color"
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
              <Button
                onClick={async () => {
                  if (!newCategoryName.trim()) {
                    toast({
                      title: "Error",
                      description: "Category name is required",
                      variant: "destructive",
                    })
                    return
                  }
                  try {
                    await addTimeCategory({
                      name: newCategoryName.trim(),
                      color: newCategoryColor,
                    })
                    toast({
                      title: "Category added",
                      description: `"${newCategoryName.trim()}" category created.`,
                    })
                    setNewCategoryName("")
                    setNewCategoryColor("#3b82f6")
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to add category",
                      variant: "destructive",
                    })
                  }
                }}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>

              <div className="border-t pt-4">
                <Label className="mb-3 block">Existing Categories</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {timeCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No categories yet. Create one above.
                    </p>
                  ) : (
                    timeCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-6 w-6 rounded-full border-2"
                            style={{ backgroundColor: cat.color, borderColor: cat.color }}
                          />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCategory(cat.id)
                              setNewCategoryName(cat.name)
                              setNewCategoryColor(cat.color)
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (confirm(`Delete category "${cat.name}"?`)) {
                                try {
                                  await deleteTimeCategory(cat.id)
                                  toast({
                                    title: "Category deleted",
                                    description: `"${cat.name}" category removed.`,
                                  })
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: error instanceof Error ? error.message : "Failed to delete category",
                                    variant: "destructive",
                                  })
                                }
                              }
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {editingCategory && (
                <div className="border-t pt-4 space-y-2">
                  <Label>Edit Category</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="color"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="w-20"
                    />
                    <Button
                      onClick={async () => {
                        if (!newCategoryName.trim()) {
                          toast({
                            title: "Error",
                            description: "Category name is required",
                            variant: "destructive",
                          })
                          return
                        }
                        try {
                          await updateTimeCategory(editingCategory, {
                            name: newCategoryName.trim(),
                            color: newCategoryColor,
                          })
                          toast({
                            title: "Category updated",
                            description: `"${newCategoryName.trim()}" category updated.`,
                          })
                          setEditingCategory(null)
                          setNewCategoryName("")
                          setNewCategoryColor("#3b82f6")
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: error instanceof Error ? error.message : "Failed to update category",
                            variant: "destructive",
                          })
                        }
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingCategory(null)
                        setNewCategoryName("")
                        setNewCategoryColor("#3b82f6")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {workTemplates.length > 0 && (
          <Card className="mb-3 sm:mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Saved Templates ({workTemplates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {workTemplates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{template.title}</p>
                      <p className="text-xs text-foreground/70">Used {template.usageCount} times</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteWorkTemplate(template.id)}>
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


