"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bell, BellRing, AlertCircle, Clock, Flame, Target, CheckCircle2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { computeNotifications, type NotificationItem } from "@/lib/notifications"
import { REMINDERS_ENABLED_KEY } from "@/components/reminder-notifier"

const ICONS = {
  overdue: AlertCircle,
  due_today: Clock,
  goal: Target,
  habit: Flame,
} as const

const TONE = {
  high: "text-destructive bg-destructive/10",
  medium: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  low: "text-primary bg-primary/10",
} as const

export function NotificationCenter() {
  const { tasks, habits, habitLogs, goals, setActiveView } = useAppStore(
    useShallow((state) => ({
      tasks: state.tasks,
      habits: state.habits,
      habitLogs: state.habitLogs,
      goals: state.goals,
      setActiveView: state.setActiveView,
    })),
  )
  const [open, setOpen] = useState(false)
  const [remindersOn, setRemindersOn] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    setRemindersOn(localStorage.getItem(REMINDERS_ENABLED_KEY) === "1" && Notification.permission === "granted")
  }, [])

  const items = useMemo(
    () => computeNotifications({ tasks, habits, habitLogs, goals }),
    [tasks, habits, habitLogs, goals],
  )
  const count = items.length

  const go = (item: NotificationItem) => {
    setActiveView(item.view)
    setOpen(false)
  }

  const toggleReminders = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast({ title: "Not supported", description: "This browser can't show notifications.", variant: "destructive" })
      return
    }
    if (remindersOn) {
      localStorage.setItem(REMINDERS_ENABLED_KEY, "0")
      setRemindersOn(false)
      return
    }
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission()
    if (permission !== "granted") {
      toast({ title: "Notifications blocked", description: "Allow notifications for this site in your browser settings.", variant: "destructive" })
      return
    }
    localStorage.setItem(REMINDERS_ENABLED_KEY, "1")
    setRemindersOn(true)
    toast({ title: "Reminders on", description: "You'll get browser nudges for overdue & due-today items." })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">Notifications</span>
          {count > 0 && <span className="text-xs text-muted-foreground">{count} to act on</span>}
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <CheckCircle2 className="size-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-foreground">You're all caught up</p>
            <p className="text-xs text-muted-foreground mt-0.5">No overdue tasks, habits, or deadlines.</p>
          </div>
        ) : (
          <div className="max-h-[22rem] overflow-y-auto">
            {items.map((item) => {
              const Icon = ICONS[item.type]
              return (
                <button
                  key={item.id}
                  onClick={() => go(item)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0"
                >
                  <div className={cn("size-8 rounded-lg flex items-center justify-center flex-shrink-0", TONE[item.severity])}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <button
          onClick={toggleReminders}
          className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-border text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          {remindersOn ? (
            <>
              <BellRing className="size-3.5 text-primary" />
              <span className="text-foreground">Browser reminders on</span>
              <span className="ml-auto text-muted-foreground">Turn off</span>
            </>
          ) : (
            <>
              <Bell className="size-3.5" />
              Enable browser reminders
            </>
          )}
        </button>
      </PopoverContent>
    </Popover>
  )
}
