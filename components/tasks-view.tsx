"use client"

import { useState, useEffect } from "react"
import { useAppStore, type Task } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Flag, AlertCircle, ChevronLeft, ChevronRight, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

export function TasksView() {
  const { tasks, addTask, toggleTask, deleteTask } = useAppStore(
    useShallow((state) => ({
      tasks: state.tasks,
      addTask: state.addTask,
      toggleTask: state.toggleTask,
      deleteTask: state.deleteTask,
    })),
  )
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState<Task["priority"]>("medium")
  const [newTaskUrgency, setNewTaskUrgency] = useState<Task["urgency"]>("medium")
  const [newTaskDueDate, setNewTaskDueDate] = useState("")
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "overdue" | "upcoming">("all")
  const [inputError, setInputError] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const todayStr = new Date().toISOString().split("T")[0]
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split("T")[0]

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) {
      setInputError("Task title cannot be empty")
      setTimeout(() => setInputError(""), 3000)
      return
    }

    if (newTaskTitle.length > 200) {
      setInputError("Task title is too long (max 200 characters)")
      setTimeout(() => setInputError(""), 3000)
      return
    }

    addTask({
      title: newTaskTitle.trim(),
      completed: false,
      priority: newTaskPriority,
      urgency: newTaskUrgency,
      dueDate: newTaskDueDate || undefined,
    })
      .then(() => {
        toast({
          title: "Task added",
          description: `"${newTaskTitle.trim()}" created.`,
        })
      })
      .catch((error) => {
        toast({
          title: "Task failed",
          description: error instanceof Error ? error.message : "Unable to create task.",
        })
      })
    setNewTaskTitle("")
    setNewTaskDueDate("")
    setInputError("")
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "pending") return !task.completed
    if (filter === "completed") return task.completed
    if (filter === "overdue") return !task.completed && !!task.dueDate && task.dueDate < todayStr
    if (filter === "upcoming")
      return !task.completed && !!task.dueDate && task.dueDate >= todayStr && task.dueDate <= nextWeekStr
    return true
  })

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (filter === "completed") return 0
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate)
    }
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // Pagination
  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTasks = sortedTasks.slice(startIndex, endIndex)

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  const priorityColors = {
    high: "text-destructive",
    medium: "text-chart-3",
    low: "text-muted-foreground",
  }

  const highPriorityCount = tasks.filter((t) => t.priority === "high" && !t.completed).length
  const completedToday = tasks.filter((t) => t.completed).length
  const totalPending = tasks.filter((t) => !t.completed).length
  const overdueCount = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr).length
  const upcomingCount = tasks.filter(
    (t) => !t.completed && t.dueDate && t.dueDate >= todayStr && t.dueDate <= nextWeekStr,
  ).length

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Tasks</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage your to-do list</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Add New Task</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col gap-3">
            <Input
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => {
                setNewTaskTitle(e.target.value)
                setInputError("")
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              className="w-full bg-input border-border"
              maxLength={200}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full bg-input border-border"
              />
              <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as Task["priority"])}>
                <SelectTrigger className="w-full bg-input border-border">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={newTaskUrgency} onValueChange={(v) => setNewTaskUrgency(v as Task["urgency"])}>
                <SelectTrigger className="w-full bg-input border-border">
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Urgency</SelectItem>
                  <SelectItem value="medium">Medium Urgency</SelectItem>
                  <SelectItem value="high">High Urgency</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddTask} className="w-full sm:w-auto bg-primary text-primary-foreground">
                <Plus className="size-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
          {inputError && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <AlertCircle className="size-3" />
              {inputError}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">{newTaskTitle.length}/200 characters</p>
        </CardContent>
      </Card>

      {highPriorityCount > 3 && (
        <Card className="bg-chart-3/5 border-chart-3/20 border-l-4 border-l-chart-3">
          <CardContent className="py-3 flex items-start gap-3">
            <AlertCircle className="size-5 text-chart-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm text-card-foreground">Many High Priority Tasks</p>
              <p className="text-xs text-muted-foreground mt-1">
                Consider breaking down tasks or adjusting priorities to stay focused.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-xs sm:text-sm text-muted-foreground">Filter:</span>
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "completed", "overdue", "upcoming"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilter(f)}
              className={cn(
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "pending" && totalPending > 0 && ` (${totalPending})`}
              {f === "completed" && completedToday > 0 && ` (${completedToday})`}
              {f === "overdue" && overdueCount > 0 && ` (${overdueCount})`}
              {f === "upcoming" && upcomingCount > 0 && ` (${upcomingCount})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Pagination Controls - Top */}
      {sortedTasks.length > itemsPerPage && (
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Items per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1) }}>
                  <SelectTrigger className="w-20 h-9 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="min-h-[44px] sm:min-h-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <span className="text-xs sm:text-sm text-foreground px-3">
                  Page {currentPage} of {totalPages} ({sortedTasks.length} total)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="min-h-[44px] sm:min-h-0"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {sortedTasks.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-8 text-center text-muted-foreground">
              {filter === "completed" ? "No completed tasks yet!" : "No tasks found. Add one above!"}
            </CardContent>
          </Card>
        ) : (
          <>
            {paginatedTasks.map((task) => (
            <Card key={task.id} className={cn("bg-card border-border transition-all w-full", task.completed && "opacity-60")}>
              <CardContent className="p-4 sm:py-4 flex items-center gap-3 sm:gap-4">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => {
                    const nextValue = Boolean(checked)
                    toggleTask(task.id, nextValue)
                      .then(() => {
                        toast({
                          title: nextValue ? "Task completed" : "Task reopened",
                          description: `"${task.title}" updated.`,
                        })
                      })
                      .catch((error) => {
                        toast({
                          title: "Task update failed",
                          description: error instanceof Error ? error.message : "Unable to update task.",
                        })
                      })
                  }}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium text-sm sm:text-base text-card-foreground break-words",
                      task.completed && "line-through text-muted-foreground",
                    )}
                  >
                    {task.title}
                  </p>
                  {task.dueDate && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "mt-2 text-xs",
                        !task.completed && task.dueDate < todayStr && "bg-destructive/15 text-destructive",
                      )}
                    >
                      Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Badge>
                  )}
                </div>
                <Flag className={cn("size-4 sm:size-5 flex-shrink-0", priorityColors[task.priority])} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    deleteTask(task.id)
                      .then(() => {
                        toast({
                          title: "Task deleted",
                          description: `"${task.title}" removed.`,
                        })
                      })
                      .catch((error) => {
                        toast({
                          title: "Delete failed",
                          description: error instanceof Error ? error.message : "Unable to delete task.",
                        })
                      })
                  }}
                  className="text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {/* Scroll to Top Button */}
          {currentPage > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-32 right-4 z-30 rounded-full shadow-lg min-h-[44px] sm:min-h-0"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
          </>
        )}
      </div>
    </div>
  )
}
