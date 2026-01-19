"use client"

import { useState, useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Flag, 
  CheckCircle2,
  Plus,
  AlertCircle,
  Target,
  Flame,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, isSameDay, parseISO, startOfDay, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, startOfMonth, endOfMonth, isSameMonth, getDay } from "date-fns"
import { toast } from "@/components/ui/use-toast"

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: "task" | "time_entry" | "goal" | "habit"
  priority?: "low" | "medium" | "high"
  urgency?: "low" | "medium" | "high"
  completed?: boolean
  duration?: string
  time?: string
  category?: string
  status?: string
}

function calculateDuration(clockIn: string, clockOut?: string, breakMinutes = 0): string {
  const start = new Date(clockIn).getTime()
  const end = clockOut ? new Date(clockOut).getTime() : Date.now()
  const diffMs = Math.max(0, end - start - breakMinutes * 60 * 1000)
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

export function CalendarView() {
  const { tasks, timeEntries, goals, habits, addTask, toggleTask, setActiveView } = useAppStore(
    useShallow((state) => ({
      tasks: state.tasks,
      timeEntries: state.timeEntries,
      goals: state.goals,
      habits: state.habits,
      addTask: state.addTask,
      toggleTask: state.toggleTask,
      setActiveView: state.setActiveView,
    })),
  )

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month")
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [showAddEventDialog, setShowAddEventDialog] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState("")
  const [newEventDate, setNewEventDate] = useState("")
  const [newEventPriority, setNewEventPriority] = useState<"low" | "medium" | "high">("medium")
  const [eventFilter, setEventFilter] = useState<"all" | "tasks" | "time_entries" | "goals" | "habits">("all")
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Combine tasks, time entries, goals, and habits into calendar events
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = []

    // Add tasks with due dates
    tasks.forEach((task) => {
      if (task.dueDate) {
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          date: task.dueDate,
          type: "task",
          priority: task.priority,
          urgency: task.urgency,
          completed: task.completed,
        })
      }
    })

    // Add time entries
    timeEntries.forEach((entry) => {
      if (entry.clockOut) {
        const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
        const time = format(parseISO(entry.clockIn), "h:mm a")
        events.push({
          id: `entry-${entry.id}`,
          title: entry.title || "Work Session",
          date: entry.date,
          type: "time_entry",
          duration,
          time,
          category: entry.category,
        })
      }
    })

    // Add goals with target dates
    goals.forEach((goal) => {
      if (goal.targetDate) {
        events.push({
          id: `goal-${goal.id}`,
          title: goal.title,
          date: goal.targetDate,
          type: "goal",
          status: goal.status,
        })
      }
    })

    // Add habits (show today's habit logs)
    habits.forEach((habit) => {
      // For daily habits, show them every day
      if (habit.frequency === "daily") {
        const today = format(new Date(), "yyyy-MM-dd")
        events.push({
          id: `habit-${habit.id}-${today}`,
          title: habit.title,
          date: today,
          type: "habit",
        })
      }
    })

    return events
  }, [tasks, timeEntries, goals, habits])

  // Filter events based on selected filter
  const filteredEvents = useMemo(() => {
    if (eventFilter === "all") return calendarEvents
    return calendarEvents.filter((event) => {
      if (eventFilter === "tasks") return event.type === "task"
      if (eventFilter === "time_entries") return event.type === "time_entry"
      if (eventFilter === "goals") return event.type === "goal"
      if (eventFilter === "habits") return event.type === "habit"
      return true
    })
  }, [calendarEvents, eventFilter])

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = format(date, "yyyy-MM-dd")
    return filteredEvents.filter((event) => event.date === dateStr)
  }

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    return getEventsForDate(selectedDate)
  }, [selectedDate, filteredEvents])

  // Calendar modifiers for styling
  const dateModifiers = useMemo(() => {
    const modifiers: Record<string, Date[]> = {
      hasTask: [],
      hasTimeEntry: [],
      hasGoal: [],
      hasHabit: [],
      hasHighPriority: [],
      today: [new Date()],
    }

    filteredEvents.forEach((event) => {
      const eventDate = parseISO(event.date)
      if (event.type === "task") {
        modifiers.hasTask.push(eventDate)
        if (event.priority === "high" && !event.completed) {
          modifiers.hasHighPriority.push(eventDate)
        }
      } else if (event.type === "time_entry") {
        modifiers.hasTimeEntry.push(eventDate)
      } else if (event.type === "goal") {
        modifiers.hasGoal.push(eventDate)
      } else if (event.type === "habit") {
        modifiers.hasHabit.push(eventDate)
      }
    })

    return modifiers
  }, [filteredEvents])

  // Week view calculations
  const weekStart = useMemo(() => {
    return startOfWeek(selectedDate, { weekStartsOn: 0 })
  }, [selectedDate])

  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 0 }) })
  }, [weekStart])

  // Month view calculations
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const handleAddEvent = () => {
    if (!newEventTitle.trim()) {
      toast({
        title: "Error",
        description: "Event title is required",
        variant: "destructive",
      })
      return
    }

    if (!newEventDate) {
      toast({
        title: "Error",
        description: "Event date is required",
        variant: "destructive",
      })
      return
    }

    // Validate date is not in the past
    const eventDate = parseISO(newEventDate)
    const today = startOfDay(new Date())
    if (eventDate < today) {
      toast({
        title: "Error",
        description: "Event date cannot be in the past",
        variant: "destructive",
      })
      return
    }

    addTask({
      title: newEventTitle.trim(),
      completed: false,
      priority: newEventPriority,
      dueDate: newEventDate,
    })
      .then(() => {
        toast({
          title: "Event added",
          description: `"${newEventTitle.trim()}" scheduled for ${format(parseISO(newEventDate), "MMM d, yyyy")}`,
        })
        setNewEventTitle("")
        setNewEventDate("")
        setShowAddEventDialog(false)
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to add event",
          variant: "destructive",
        })
      })
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    if (event.type === "task") {
      const taskId = event.id.replace("task-", "")
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        setActiveView("tasks")
      }
    } else if (event.type === "time_entry") {
      setActiveView("timesheet")
    } else if (event.type === "goal") {
      setActiveView("goals")
    } else if (event.type === "habit") {
      setActiveView("habits")
    }
  }

  const priorityColors = {
    high: "bg-destructive/20 text-destructive border-destructive/50",
    medium: "bg-chart-3/20 text-chart-3 border-chart-3/50",
    low: "bg-muted text-muted-foreground border-muted",
  }

  // Check if date is overdue
  const isOverdue = (dateStr: string): boolean => {
    const today = format(new Date(), "yyyy-MM-dd")
    return dateStr < today
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const navigateWeek = (direction: "prev" | "next") => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        return subDays(newDate, 7)
      } else {
        return addDays(newDate, 7)
      }
    })
  }

  const navigateDay = (direction: "prev" | "next") => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        return subDays(newDate, 1)
      } else {
        return addDays(newDate, 1)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
          <p className="text-muted-foreground">View and manage your tasks, time entries, goals, and habits</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={eventFilter} onValueChange={(v) => setEventFilter(v as typeof eventFilter)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="tasks">Tasks</SelectItem>
              <SelectItem value="time_entries">Time Entries</SelectItem>
              <SelectItem value="goals">Goals</SelectItem>
              <SelectItem value="habits">Habits</SelectItem>
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showAddEventDialog} onOpenChange={setShowAddEventDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Calendar Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="event-title">Event Title</Label>
                  <Input
                    id="event-title"
                    placeholder="Enter event title"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="event-date">Date</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
                <div>
                  <Label htmlFor="event-priority">Priority</Label>
                  <Select
                    value={newEventPriority}
                    onValueChange={(v) => setNewEventPriority(v as typeof newEventPriority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddEvent} className="flex-1">
                    Add Event
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddEventDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === "month" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {format(currentMonth, "MMMM yyyy")}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
                    Today
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 sm:p-6">
              <div className="w-full [&_.rdp-root]:!w-full [&_.rdp-months]:!w-full [&_.rdp-month]:!w-full [&_.rdp-table]:!w-full">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  modifiers={dateModifiers}
                  modifiersClassNames={{
                    hasTask: "bg-blue-500/20 border-blue-500/50",
                    hasTimeEntry: "bg-green-500/20 border-green-500/50",
                    hasGoal: "bg-purple-500/20 border-purple-500/50",
                    hasHabit: "bg-orange-500/20 border-orange-500/50",
                    hasHighPriority: "ring-2 ring-destructive",
                    today: "bg-accent font-bold",
                  }}
                  className="w-full rounded-md border"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded border border-blue-500/50 bg-blue-500/20" />
                  <span>Task</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded border border-green-500/50 bg-green-500/20" />
                  <span>Time Entry</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded border border-purple-500/50 bg-purple-500/20" />
                  <span>Goal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded border border-orange-500/50 bg-orange-500/20" />
                  <span>Habit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded ring-2 ring-destructive" />
                  <span>High Priority</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarIcon className="mb-2 h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No events scheduled for this date</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setNewEventDate(format(selectedDate, "yyyy-MM-dd"))
                      setShowAddEventDialog(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Event
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent",
                        event.type === "task" && priorityColors[event.priority || "low"],
                        event.type === "time_entry" && "bg-green-500/10 border-green-500/50 hover:bg-green-500/20",
                        event.type === "goal" && "bg-purple-500/10 border-purple-500/50 hover:bg-purple-500/20",
                        event.type === "habit" && "bg-orange-500/10 border-orange-500/50 hover:bg-orange-500/20",
                      )}
                    >
                      {event.type === "task" && (
                        <>
                          {event.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          ) : isOverdue(event.date) ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Flag className={cn(
                              "h-4 w-4",
                              event.priority === "high" && "text-destructive",
                              event.priority === "medium" && "text-chart-3",
                            )} />
                          )}
                        </>
                      )}
                      {event.type === "time_entry" && (
                        <Clock className="h-4 w-4 text-green-500" />
                      )}
                      {event.type === "goal" && (
                        <Target className="h-4 w-4 text-purple-500" />
                      )}
                      {event.type === "habit" && (
                        <Flame className="h-4 w-4 text-orange-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          event.completed && "line-through text-muted-foreground"
                        )}>
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {event.type === "task" ? "Task" : 
                             event.type === "time_entry" ? "Work Session" :
                             event.type === "goal" ? "Goal" : "Habit"}
                          </p>
                          {event.time && (
                            <span className="text-xs text-muted-foreground">• {event.time}</span>
                          )}
                          {event.duration && (
                            <span className="text-xs text-muted-foreground">• {event.duration}</span>
                          )}
                          {event.category && (
                            <Badge variant="outline" className="text-xs h-4 px-1.5">
                              {event.category}
                            </Badge>
                          )}
                          {isOverdue(event.date) && !event.completed && (
                            <span className="text-xs text-destructive">• Overdue</span>
                          )}
                        </div>
                      </div>
                      {event.priority && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {event.priority}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === "week" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {format(weekStart, "MMM d")} - {format(endOfWeek(weekStart), "MMM d, yyyy")}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => navigateWeek("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
                  Today
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigateWeek("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayEvents = getEventsForDate(day)
                const isSelected = isSameDay(day, selectedDate)
                const isToday = isSameDay(day, new Date())
                
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[120px] rounded-lg border p-2",
                      isSelected && "ring-2 ring-primary",
                      isToday && "bg-accent/50"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-2",
                      isToday && "text-primary font-bold"
                    )}>
                      {format(day, "EEE d")}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          onClick={() => {
                            setSelectedDate(day)
                            handleEventClick(event)
                          }}
                          className={cn(
                            "text-xs p-1.5 rounded cursor-pointer truncate",
                            event.type === "task" && "bg-blue-500/20 text-blue-700 dark:text-blue-400",
                            event.type === "time_entry" && "bg-green-500/20 text-green-700 dark:text-green-400",
                            event.type === "goal" && "bg-purple-500/20 text-purple-700 dark:text-purple-400",
                            event.type === "habit" && "bg-orange-500/20 text-orange-700 dark:text-orange-400",
                          )}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground px-1.5">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "day" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => navigateDay("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
                  Today
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigateDay("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="mb-2 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No events scheduled for this day</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setNewEventDate(format(selectedDate, "yyyy-MM-dd"))
                    setShowAddEventDialog(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents
                  .sort((a, b) => {
                    if (a.time && b.time) {
                      return a.time.localeCompare(b.time)
                    }
                    return 0
                  })
                  .map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-accent",
                        event.type === "task" && priorityColors[event.priority || "low"],
                        event.type === "time_entry" && "bg-green-500/10 border-green-500/50 hover:bg-green-500/20",
                        event.type === "goal" && "bg-purple-500/10 border-purple-500/50 hover:bg-purple-500/20",
                        event.type === "habit" && "bg-orange-500/10 border-orange-500/50 hover:bg-orange-500/20",
                      )}
                    >
                      {event.type === "task" && (
                        <>
                          {event.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                          ) : isOverdue(event.date) ? (
                            <AlertCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <Flag className={cn(
                              "h-5 w-5",
                              event.priority === "high" && "text-destructive",
                              event.priority === "medium" && "text-chart-3",
                            )} />
                          )}
                        </>
                      )}
                      {event.type === "time_entry" && (
                        <Clock className="h-5 w-5 text-green-500" />
                      )}
                      {event.type === "goal" && (
                        <Target className="h-5 w-5 text-purple-500" />
                      )}
                      {event.type === "habit" && (
                        <Flame className="h-5 w-5 text-orange-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-base font-semibold",
                          event.completed && "line-through text-muted-foreground"
                        )}>
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">
                            {event.type === "task" ? "Task" : 
                             event.type === "time_entry" ? "Work Session" :
                             event.type === "goal" ? "Goal" : "Habit"}
                          </p>
                          {event.time && (
                            <span className="text-sm text-muted-foreground">• {event.time}</span>
                          )}
                          {event.duration && (
                            <span className="text-sm text-muted-foreground">• {event.duration}</span>
                          )}
                          {event.category && (
                            <Badge variant="outline" className="text-xs h-5 px-2">
                              {event.category}
                            </Badge>
                          )}
                          {isOverdue(event.date) && !event.completed && (
                            <span className="text-sm text-destructive">• Overdue</span>
                          )}
                        </div>
                      </div>
                      {event.priority && (
                        <Badge variant="outline" className="shrink-0">
                          {event.priority}
                        </Badge>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
