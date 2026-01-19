"use client"

import { useState, useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  TrendingDown,
  Grid3x3
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Task } from "@/lib/store"

type Quadrant = "urgent-important" | "not-urgent-important" | "urgent-not-important" | "not-urgent-not-important"

interface QuadrantConfig {
  id: Quadrant
  label: string
  description: string
  icon: typeof AlertCircle
  color: string
  bgColor: string
}

const quadrants: QuadrantConfig[] = [
  {
    id: "urgent-important",
    label: "Do First",
    description: "Urgent & Important",
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10 border-red-500/30",
  },
  {
    id: "not-urgent-important",
    label: "Schedule",
    description: "Not Urgent & Important",
    icon: CheckCircle2,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/30",
  },
  {
    id: "urgent-not-important",
    label: "Delegate",
    description: "Urgent & Not Important",
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10 border-yellow-500/30",
  },
  {
    id: "not-urgent-not-important",
    label: "Eliminate",
    description: "Not Urgent & Not Important",
    icon: TrendingDown,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10 border-gray-500/30",
  },
]

export function PriorityMatrixView() {
  const { tasks, updateTask } = useAppStore(
    useShallow((state) => ({
      tasks: state.tasks,
      updateTask: state.updateTask,
    })),
  )

  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending")

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === "pending") return !task.completed
      if (filter === "completed") return task.completed
      return true
    })
  }, [tasks, filter])

  const getTaskQuadrant = (task: Task): Quadrant => {
    const urgency = task.urgency || "medium"
    const priority = task.priority

    const isUrgent = urgency === "high"
    const isImportant = priority === "high"

    if (isUrgent && isImportant) return "urgent-important"
    if (!isUrgent && isImportant) return "not-urgent-important"
    if (isUrgent && !isImportant) return "urgent-not-important"
    return "not-urgent-not-important"
  }

  const tasksByQuadrant = useMemo(() => {
    const grouped: Record<Quadrant, Task[]> = {
      "urgent-important": [],
      "not-urgent-important": [],
      "urgent-not-important": [],
      "not-urgent-not-important": [],
    }

    filteredTasks.forEach((task) => {
      const quadrant = getTaskQuadrant(task)
      grouped[quadrant].push(task)
    })

    return grouped
  }, [filteredTasks])

  const handleMoveTask = async (taskId: string, newUrgency: "low" | "medium" | "high", newPriority: "low" | "medium" | "high") => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    try {
      // Update task urgency and priority
      await updateTask(taskId, {
        urgency: newUrgency,
        priority: newPriority,
      })
    } catch (error) {
      console.error("Failed to update task:", error)
    }
  }

  const getPriorityScore = (task: Task): number => {
    const urgencyScore = task.urgency === "high" ? 3 : task.urgency === "medium" ? 2 : 1
    const importanceScore = task.priority === "high" ? 3 : task.priority === "medium" ? 2 : 1
    return urgencyScore + importanceScore
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Priority Matrix</h2>
          <p className="text-muted-foreground">Eisenhower Matrix - Organize tasks by urgency and importance</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-2 gap-4">
        {quadrants.map((quadrant) => {
          const quadrantTasks = tasksByQuadrant[quadrant.id]
          const Icon = quadrant.icon

          return (
            <Card key={quadrant.id} className={cn("relative overflow-hidden", quadrant.bgColor)}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", quadrant.color)} />
                  <CardTitle className="text-lg">{quadrant.label}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{quadrant.description}</p>
                <Badge variant="outline" className="mt-2 w-fit">
                  {quadrantTasks.length} task{quadrantTasks.length !== 1 ? "s" : ""}
                </Badge>
              </CardHeader>
              <CardContent>
                {quadrantTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No tasks in this quadrant
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {quadrantTasks
                      .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
                      .map((task) => (
                        <div
                          key={task.id}
                          className="p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium",
                                task.completed && "line-through text-muted-foreground"
                              )}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    task.urgency === "high" && "border-red-500/50 text-red-500",
                                    task.urgency === "medium" && "border-yellow-500/50 text-yellow-500",
                                    task.urgency === "low" && "border-gray-500/50 text-gray-500",
                                  )}
                                >
                                  {task.urgency || "medium"} urgency
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    task.priority === "high" && "border-red-500/50 text-red-500",
                                    task.priority === "medium" && "border-yellow-500/50 text-yellow-500",
                                    task.priority === "low" && "border-gray-500/50 text-gray-500",
                                  )}
                                >
                                  {task.priority} priority
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 mt-2">
                            <Select
                              value={task.urgency || "medium"}
                              onValueChange={(v) => handleMoveTask(task.id, v as "low" | "medium" | "high", task.priority)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low Urgency</SelectItem>
                                <SelectItem value="medium">Medium Urgency</SelectItem>
                                <SelectItem value="high">High Urgency</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={task.priority}
                              onValueChange={(v) => handleMoveTask(task.id, task.urgency || "medium", v as "low" | "medium" | "high")}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low Priority</SelectItem>
                                <SelectItem value="medium">Medium Priority</SelectItem>
                                <SelectItem value="high">High Priority</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            How to Use
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Do First (Urgent & Important):</strong> Tasks that require immediate attention and are critical to your goals.
          </p>
          <p>
            <strong>Schedule (Not Urgent & Important):</strong> Important tasks that don't need immediate action. Plan these for later.
          </p>
          <p>
            <strong>Delegate (Urgent & Not Important):</strong> Tasks that are urgent but not important. Consider delegating or minimizing these.
          </p>
          <p>
            <strong>Eliminate (Not Urgent & Not Important):</strong> Tasks that are neither urgent nor important. Consider removing these from your list.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
