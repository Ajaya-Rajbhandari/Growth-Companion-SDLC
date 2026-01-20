"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Target, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Circle,
  TrendingUp,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, parseISO, startOfDay } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import type { Goal, Milestone } from "@/lib/store"

export function GoalsView() {
  const { goals, addGoal, updateGoal, deleteGoal, updateGoalProgress, addMilestone, completeMilestone } = useAppStore(
    useShallow((state) => ({
      goals: state.goals,
      addGoal: state.addGoal,
      updateGoal: state.updateGoal,
      deleteGoal: state.deleteGoal,
      updateGoalProgress: state.updateGoalProgress,
      addMilestone: state.addMilestone,
      completeMilestone: state.completeMilestone,
    })),
  )

  const [filter, setFilter] = useState<"all" | "active" | "completed" | "paused">("all")
  const [showAddGoalDialog, setShowAddGoalDialog] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState("")
  const [newGoalDescription, setNewGoalDescription] = useState("")
  const [newGoalTargetDate, setNewGoalTargetDate] = useState("")
  const [newGoalCategory, setNewGoalCategory] = useState("")
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [selectedGoalForMilestone, setSelectedGoalForMilestone] = useState<Goal | null>(null)
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("")
  const [newMilestoneDate, setNewMilestoneDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const filteredGoals = goals.filter((goal) => {
    if (filter === "active") return goal.status === "active"
    if (filter === "completed") return goal.status === "completed"
    if (filter === "paused") return goal.status === "paused"
    return true
  })

  // Pagination
  const totalPages = Math.ceil(filteredGoals.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedGoals = filteredGoals.slice(startIndex, endIndex)

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  const handleAddGoal = async () => {
    if (!newGoalTitle.trim()) {
      toast({
        title: "Error",
        description: "Goal title is required",
        variant: "destructive",
      })
      return
    }

    // Validate target date is not in the past
    if (newGoalTargetDate) {
      const targetDate = parseISO(newGoalTargetDate)
      const today = startOfDay(new Date())
      if (targetDate < today) {
        toast({
          title: "Error",
          description: "Target date cannot be in the past",
          variant: "destructive",
        })
        return
      }
    }

    try {
      await addGoal({
        title: newGoalTitle.trim(),
        description: newGoalDescription.trim() || undefined,
        targetDate: newGoalTargetDate || undefined,
        progress: 0,
        status: "active",
        category: newGoalCategory || undefined,
        milestones: [],
      })
      toast({
        title: "Goal added",
        description: `"${newGoalTitle.trim()}" goal created.`,
      })
      setNewGoalTitle("")
      setNewGoalDescription("")
      setNewGoalTargetDate("")
      setNewGoalCategory("")
      setShowAddGoalDialog(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add goal",
        variant: "destructive",
      })
    }
  }

  const handleUpdateProgress = async (goalId: string, progress: number) => {
    try {
      await updateGoalProgress(goalId, progress)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update progress",
        variant: "destructive",
      })
    }
  }

  const handleAddMilestone = async () => {
    if (!selectedGoalForMilestone || !newMilestoneTitle.trim()) {
      toast({
        title: "Error",
        description: "Milestone title is required",
        variant: "destructive",
      })
      return
    }

    // Validate milestone date is not in the past
    if (newMilestoneDate) {
      const milestoneDate = parseISO(newMilestoneDate)
      const today = startOfDay(new Date())
      if (milestoneDate < today) {
        toast({
          title: "Error",
          description: "Milestone date cannot be in the past",
          variant: "destructive",
        })
        return
      }
    }

    try {
      await addMilestone(selectedGoalForMilestone.id, {
        title: newMilestoneTitle.trim(),
        completed: false,
        targetDate: newMilestoneDate || undefined,
      })
      toast({
        title: "Milestone added",
        description: `"${newMilestoneTitle.trim()}" milestone added.`,
      })
      setNewMilestoneTitle("")
      setNewMilestoneDate("")
      setSelectedGoalForMilestone(null)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add milestone",
        variant: "destructive",
      })
    }
  }

  const statusColors = {
    active: "bg-blue-500/20 text-blue-500 border-blue-500/50",
    completed: "bg-green-500/20 text-green-500 border-green-500/50",
    paused: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
    cancelled: "bg-gray-500/20 text-gray-500 border-gray-500/50",
  }

  const activeGoals = goals.filter((g) => g.status === "active").length
  const completedGoals = goals.filter((g) => g.status === "completed").length
  const totalProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
    : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Goals</h2>
          <p className="text-muted-foreground">Set and track your long-term objectives</p>
        </div>
        <Dialog open={showAddGoalDialog} onOpenChange={setShowAddGoalDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="goal-title">Goal Title</Label>
                <Input
                  id="goal-title"
                  placeholder="e.g., Learn TypeScript, Complete project"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="goal-description">Description (optional)</Label>
                <Textarea
                  id="goal-description"
                  placeholder="Describe your goal..."
                  value={newGoalDescription}
                  onChange={(e) => setNewGoalDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="goal-target-date">Target Date (optional)</Label>
                <Input
                  id="goal-target-date"
                  type="date"
                  value={newGoalTargetDate}
                  onChange={(e) => setNewGoalTargetDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div>
                <Label htmlFor="goal-category">Category (optional)</Label>
                <Input
                  id="goal-category"
                  placeholder="e.g., Career, Health, Learning"
                  value={newGoalCategory}
                  onChange={(e) => setNewGoalCategory(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddGoal} className="flex-1">
                  Create Goal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddGoalDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGoals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedGoals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProgress}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Goals</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {filter === "all" ? "No goals yet. Create your first goal to get started!" : `No ${filter} goals.`}
            </p>
            <Button onClick={() => setShowAddGoalDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {paginatedGoals.map((goal) => (
            <Card key={goal.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{goal.title}</CardTitle>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", statusColors[goal.status])}
                      >
                        {goal.status}
                      </Badge>
                      {goal.category && (
                        <Badge variant="outline" className="text-xs">
                          {goal.category}
                        </Badge>
                      )}
                      {goal.targetDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          {format(parseISO(goal.targetDate), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingGoal(goal)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (confirm(`Delete goal "${goal.title}"?`)) {
                          try {
                            await deleteGoal(goal.id)
                            toast({
                              title: "Goal deleted",
                              description: `"${goal.title}" goal removed.`,
                            })
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: error instanceof Error ? error.message : "Failed to delete goal",
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
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Progress</span>
                    <span className="text-muted-foreground">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={goal.progress}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0
                        handleUpdateProgress(goal.id, value)
                      }}
                      className="w-20 h-8 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateProgress(goal.id, Math.min(100, goal.progress + 10))}
                    >
                      +10%
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateProgress(goal.id, Math.max(0, goal.progress - 10))}
                    >
                      -10%
                    </Button>
                  </div>
                </div>

                {/* Milestones */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Milestones</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedGoalForMilestone(goal)
                        setNewMilestoneTitle("")
                        setNewMilestoneDate("")
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {goal.milestones.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No milestones yet</p>
                  ) : (
                    <div className="space-y-1">
                      {goal.milestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          className="flex items-center gap-2 p-2 rounded border bg-muted/30"
                        >
                          <button
                            onClick={async () => {
                              try {
                                await completeMilestone(goal.id, milestone.id)
                                toast({
                                  title: "Milestone completed",
                                  description: `"${milestone.title}" completed!`,
                                })
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: error instanceof Error ? error.message : "Failed to complete milestone",
                                  variant: "destructive",
                                })
                              }
                            }}
                            className="flex-shrink-0"
                          >
                            {milestone.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm",
                              milestone.completed && "line-through text-muted-foreground"
                            )}>
                              {milestone.title}
                            </p>
                            {milestone.targetDate && (
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(milestone.targetDate), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Pagination Controls */}
          {filteredGoals.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1) }}>
                  <SelectTrigger className="w-20 h-9">
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
                <span className="text-sm text-foreground px-3">
                  Page {currentPage} of {totalPages} ({filteredGoals.length} total)
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
          )}
          
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
        </div>
      )}

      {/* Edit Goal Dialog */}
      {editingGoal && (
        <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editingGoal.title}
                  onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingGoal.description || ""}
                  onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={editingGoal.targetDate || ""}
                  onChange={(e) => setEditingGoal({ ...editingGoal, targetDate: e.target.value })}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editingGoal.status}
                  onValueChange={(v) => setEditingGoal({ ...editingGoal, status: v as Goal["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    try {
                      await updateGoal(editingGoal.id, editingGoal)
                      toast({
                        title: "Goal updated",
                        description: `"${editingGoal.title}" updated.`,
                      })
                      setEditingGoal(null)
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: error instanceof Error ? error.message : "Failed to update goal",
                        variant: "destructive",
                      })
                    }
                  }}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingGoal(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Milestone Dialog */}
      {selectedGoalForMilestone && (
        <Dialog open={!!selectedGoalForMilestone} onOpenChange={(open) => !open && setSelectedGoalForMilestone(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Milestone to "{selectedGoalForMilestone.title}"</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Milestone Title</Label>
                <Input
                  placeholder="e.g., Complete first module, Finish research"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>Target Date (optional)</Label>
                <Input
                  type="date"
                  value={newMilestoneDate}
                  onChange={(e) => setNewMilestoneDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddMilestone} className="flex-1" disabled={!newMilestoneTitle.trim()}>
                  Add Milestone
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedGoalForMilestone(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
