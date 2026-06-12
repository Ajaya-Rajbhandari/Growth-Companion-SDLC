"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAppStore, type TimeEntry } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { BreakModePanel } from "./break-mode-panel"
import { toast } from "@/components/ui/use-toast"
import {
  playNotificationSound,
  stopNotificationSound,
  getStoredSoundId,
  setStoredSoundId,
  unlockNotificationAudio,
  SOUND_OPTIONS,
  type NotificationSoundId,
} from "@/lib/notification-sound"
import { cn, getLocalDateKey, parseLocalDateKey } from "@/lib/utils"

import {
  type ViewPeriod,
  calculateDuration,
  filterEntriesByPeriod,
  groupEntriesByDate,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfYear,
  getEndOfYear,
} from "./timesheet/helpers"

import { ClockInCard } from "./timesheet/clock-in-card"
import { ActiveSessionCard } from "./timesheet/active-session-card"
import { TodayTimeline } from "./timesheet/today-timeline"
import { StatsCards } from "./timesheet/stats-cards"
import { TemplatesCard } from "./timesheet/templates-card"
import { HistoryCard } from "./timesheet/history-card"
import {
  NotesDialog,
  BreakDialog,
  EditBreakDialog,
  type BreakType,
  type SelectedBreak,
  EditTaskDialog,
  OverworkDialog,
  CategoryManagementDialog,
} from "./timesheet/dialogs"
import { SwitchTaskDialog } from "./timesheet/switch-task-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { BellOff, Volume2, Download, FileSpreadsheet, LayoutPanelTop } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function TimesheetView() {
  const {
    timeEntries,
    currentEntry,
    activeBreak,
    clockOut,
    getTodayWorkStats,
    overworkMinutesRequested,
    graceMinutes,
    allowOverworkMinutes,
    resetOverworkForToday,
  } = useAppStore(
    useShallow((state) => ({
      timeEntries: state.timeEntries,
      currentEntry: state.currentEntry,
      activeBreak: state.activeBreak,
      clockOut: state.clockOut,
      getTodayWorkStats: state.getTodayWorkStats,
      overworkMinutesRequested: state.overworkMinutesRequested,
      graceMinutes: state.graceMinutes,
      allowOverworkMinutes: state.allowOverworkMinutes,
      resetOverworkForToday: state.resetOverworkForToday,
    })),
  )

  // Time tracking
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [breakTimeRemaining, setBreakTimeRemaining] = useState<{ minutes: number; seconds: number } | null>(null)
  const [breakElapsed, setBreakElapsed] = useState({ minutes: 0, seconds: 0 })
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationSoundId, setNotificationSoundId] = useState<NotificationSoundId>("default")
  const [breakEndedAlert, setBreakEndedAlert] = useState(false)

  // Dialog states
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null)
  const [breakDialogOpen, setBreakDialogOpen] = useState(false)
  const [breakType, setBreakType] = useState<BreakType>("custom")
  const [editBreakDialogOpen, setEditBreakDialogOpen] = useState(false)
  const [selectedBreak, setSelectedBreak] = useState<SelectedBreak | null>(null)
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false)
  const [switchTaskDialogOpen, setSwitchTaskDialogOpen] = useState(false)
  const [overworkDialogOpen, setOverworkDialogOpen] = useState(false)
  const [showCategoryManagement, setShowCategoryManagement] = useState(false)

  // History filtering
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>("weekly")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // Audio & alerts
  const audioUnlockedRef = useRef(false)
  const autoClockedOutRef = useRef(false)
  const [warned8h, setWarned8h] = useState(false)
  const [warned830, setWarned830] = useState(false)

  // Load sound settings
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const v = localStorage.getItem("companion-sound-enabled")
      if (v !== null) setSoundEnabled(v === "true")
      setNotificationSoundId(getStoredSoundId())
    } catch {}
  }, [])

  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return
    audioUnlockedRef.current = true
    unlockNotificationAudio()
  }, [])

  const playAlarm = useCallback(() => {
    if (soundEnabled) {
      playNotificationSound(notificationSoundId, true)
    }
    setBreakEndedAlert(true)
    toast({
      title: "Break time has ended",
      description: "Click Resume to get back to work.",
      duration: 10000,
    })
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          const n = new Notification("Break ended — Companion", {
            body: "Your break time is over. Click to return and resume work.",
            icon: "/icon-192x192.png",
          })
          n.onclick = () => window.focus()
        } catch {}
      } else if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {})
      }
    }
  }, [soundEnabled, notificationSoundId])

  const stopAlarm = useCallback(() => {
    stopNotificationSound()
    setBreakEndedAlert(false)
  }, [])

  // Elapsed time tracking
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
      }

      updateElapsedTime()
      const interval = setInterval(updateElapsedTime, 1000)

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

  // Break time tracking
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

      updateBreakTime()
      const interval = setInterval(updateBreakTime, 1000)

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

  // Time safety warnings
  const workStats = useMemo(() => getTodayWorkStats(), [getTodayWorkStats])

  useEffect(() => {
    if (workStats.todayMinutes >= workStats.warningThresholdMinutes && !warned8h) {
      setWarned8h(true)
      toast({
        title: "Approaching daily limit",
        description: `You've worked ${Math.floor(workStats.todayMinutes / 60)}h ${Math.round(workStats.todayMinutes % 60)}m today.`,
      })
    }
    if (workStats.todayMinutes >= workStats.secondaryWarningMinutes && !warned830) {
      setWarned830(true)
      toast({
        title: "Almost at limit",
        description: `About ${Math.round((workStats.appliedLimitMinutes - workStats.todayMinutes) / 60)}m remaining.`,
      })
    }
    if (workStats.status === "hardCap" && currentEntry && !autoClockedOutRef.current) {
      autoClockedOutRef.current = true
      const entryId = currentEntry.id
      clockOut()
        .then(() => {
          if (entryId) {
            // Note: updateEntryNotes is not in the store extraction yet, but we're avoiding it here for now
          }
          toast({
            title: "Auto clocked out",
            description: `Reached your limit.`,
          })
          resetOverworkForToday()
        })
        .catch(() => {})
    } else if (workStats.status !== "hardCap") {
      autoClockedOutRef.current = false
    }
  }, [workStats, warned8h, warned830, currentEntry, clockOut, resetOverworkForToday])

  // Filter entries for history
  const filteredEntries = useMemo(() => {
    let entries = filterEntriesByPeriod(timeEntries, selectedDate, viewPeriod)

    if (categoryFilter) {
      entries = entries.filter((entry) => entry.category === categoryFilter)
    }

    if (currentEntry && !currentEntry.clockOut) {
      const entryDate = parseLocalDateKey(currentEntry.date)
      let start: Date, end: Date

      switch (viewPeriod) {
        case "daily": {
          start = new Date(selectedDate)
          start.setHours(0, 0, 0, 0)
          end = new Date(selectedDate)
          end.setHours(23, 59, 59, 999)
          break
        }
        case "weekly": {
          start = getStartOfWeek(selectedDate)
          end = getEndOfWeek(selectedDate)
          break
        }
        case "monthly": {
          start = getStartOfMonth(selectedDate)
          end = getEndOfMonth(selectedDate)
          break
        }
        case "yearly": {
          start = getStartOfYear(selectedDate)
          end = getEndOfYear(selectedDate)
          break
        }
      }

      const alreadyIncluded = entries.some((entry) => entry.id === currentEntry.id)
      const matchesCategory = !categoryFilter || currentEntry.category === categoryFilter
      if (entryDate >= start && entryDate <= end && !alreadyIncluded && matchesCategory) {
        entries = [currentEntry, ...entries]
      }
    }

    return entries
  }, [timeEntries, selectedDate, viewPeriod, currentEntry, categoryFilter])

  const handleEndBreak = async () => {
    stopAlarm()
    try {
      const endBreak = useAppStore.getState().endBreak
      await endBreak()
      toast({
        title: "Break ended",
        description: "Welcome back!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end break",
        variant: "destructive",
      })
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
          breakType={activeBreak.type}
        />
      )}

      <div className={cn("space-y-2 sm:space-y-3", activeBreak && "pointer-events-none opacity-50")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Timesheet</h2>
            <p className="text-xs text-foreground/70">Track your day, time-to-time.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 bg-transparent min-h-[44px]"
              title="Open quick actions"
              onClick={() => window.open("/widget", "companion-widget", "width=420,height=560,scrollbars=yes,resizable=yes")}
            >
              <LayoutPanelTop className="size-4" />
              <span className="hidden sm:inline">Widget</span>
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-transparent min-w-[44px] min-h-[44px]"
                  title="Sound & notification settings"
                >
                  {soundEnabled ? <Volume2 className="size-4" /> : <BellOff className="size-4" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Break reminder</span>
                    <Button
                      variant={soundEnabled ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => {
                        unlockAudio()
                        const next = !soundEnabled
                        setSoundEnabled(next)
                        try {
                          localStorage.setItem("companion-sound-enabled", next ? "true" : "false")
                        } catch {}
                      }}
                    >
                      {soundEnabled ? "On" : "Off"}
                    </Button>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Notification sound</p>
                    <Select
                      value={notificationSoundId}
                      onValueChange={(v) => {
                        const id = v as NotificationSoundId
                        setNotificationSoundId(id)
                        setStoredSoundId(id)
                        unlockAudio()
                        playNotificationSound(id, false)
                        setTimeout(stopNotificationSound, 600)
                      }}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOUND_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Plays when your break ends.</p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {!currentEntry ? (
          <ClockInCard isAtHardCap={workStats.status === "hardCap"} onManageCategories={() => setShowCategoryManagement(true)} />
        ) : (
          <ActiveSessionCard
            elapsedTime={elapsedTime}
            remainingMinutes={workStats.remainingMinutes}
            overtimeBadge={workStats.overtimeBadge}
            onEditTask={() => setEditTaskDialogOpen(true)}
            onSwitchTask={() => setSwitchTaskDialogOpen(true)}
            onTakeBreak={() => setBreakDialogOpen(true)}
            onRequestOverwork={() => setOverworkDialogOpen(true)}
            onClockOut={() => clockOut()}
            onEditBreak={(selectedBreak) => setSelectedBreak(selectedBreak)}
          />
        )}

        <TodayTimeline />

        <StatsCards workStats={workStats} filteredEntries={filteredEntries} />

        <TemplatesCard />

        <HistoryCard
          viewPeriod={viewPeriod}
          onViewPeriodChange={setViewPeriod}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          filteredEntries={filteredEntries}
          elapsedTime={elapsedTime}
          onClockOut={() => clockOut()}
          onOpenNotes={setSelectedEntry}
          onEditBreak={setSelectedBreak}
        />
      </div>

      {/* Dialogs */}
      <NotesDialog
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        entry={selectedEntry}
        onClose={() => {
          setSelectedEntry(null)
        }}
      />

      <BreakDialog
        open={breakDialogOpen}
        onOpenChange={setBreakDialogOpen}
        breakType={breakType}
        onBreakTypeChange={setBreakType}
        onBeforeStart={unlockAudio}
      />

      <EditBreakDialog
        open={editBreakDialogOpen}
        onOpenChange={setEditBreakDialogOpen}
        selectedBreak={selectedBreak}
        onClose={() => {
          setSelectedBreak(null)
        }}
      />

      <EditTaskDialog open={editTaskDialogOpen} onOpenChange={setEditTaskDialogOpen} />

      <OverworkDialog open={overworkDialogOpen} onOpenChange={setOverworkDialogOpen} />

      <CategoryManagementDialog open={showCategoryManagement} onOpenChange={setShowCategoryManagement} />

      <SwitchTaskDialog open={switchTaskDialogOpen} onOpenChange={setSwitchTaskDialogOpen} />
    </div>
  )
}
