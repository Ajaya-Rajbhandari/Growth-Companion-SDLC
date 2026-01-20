"use client"

import { useState, useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Flame, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2,
  Calendar as CalendarIcon,
  TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, parseISO, startOfDay, subDays, eachDayOfInterval, isSameDay } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import type { Habit } from "@/lib/store"

export function HabitsView() {
  const { 
    habits, 
    habitLogs, 
    addHabit, 
    updateHabit, 
    deleteHabit, 
    logHabit, 
    getHabitStreak, 
    getHabitStats 
  } = useAppStore(
    useShallow((state) => ({
      habits: state.habits,
      habitLogs: state.habitLogs,
      addHabit: state.addHabit,
      updateHabit: state.updateHabit,
      deleteHabit: state.deleteHabit,
      logHabit: state.logHabit,
      getHabitStreak: state.getHabitStreak,
      getHabitStats: state.getHabitStats,
    })),
  )

  const [showAddHabitDialog, setShowAddHabitDialog] = useState(false)
  const [newHabitTitle, setNewHabitTitle] = useState("")
  const [newHabitDescription, setNewHabitDescription] = useState("")
  const [newHabitFrequency, setNewHabitFrequency] = useState<"daily" | "weekly" | "custom">("daily")
  const [newHabitTargetCount, setNewHabitTargetCount] = useState("1")
  const [newHabitColor, setNewHabitColor] = useState("#3b82f6")
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())

  const handleAddHabit = async () => {
    if (!newHabitTitle.trim()) {
      toast({
        title: "Error",
        description: "Habit title is required",
        variant: "destructive",
      })
      return
    }

    try {
      await addHabit({
        title: newHabitTitle.trim(),
        description: newHabitDescription.trim() || undefined,
        frequency: newHabitFrequency,
        targetCount: parseInt(newHabitTargetCount) || 1,
        color: newHabitColor,
      })
      toast({
        title: "Habit added",
        description: `"${newHabitTitle.trim()}" habit created.`,
      })
      setNewHabitTitle("")
      setNewHabitDescription("")
      setNewHabitTargetCount("1")
      setNewHabitColor("#3b82f6")
      setShowAddHabitDialog(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add habit",
        variant: "destructive",
      })
    }
  }

  const handleLogHabit = async (habitId: string, date: Date, increment: number = 1) => {
    const dateStr = format(date, "yyyy-MM-dd")
    const existingLog = habitLogs.find((log) => log.habitId === habitId && log.date === dateStr)
    const newCount = (existingLog?.count || 0) + increment

    try {
      await logHabit(habitId, dateStr, Math.max(0, newCount))
      toast({
        title: "Habit logged",
        description: `Habit updated for ${format(date, "MMM d, yyyy")}.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to log habit",
        variant: "destructive",
      })
    }
  }

  // Get last 30 days for heatmap
  const last30Days = useMemo(() => {
    const today = startOfDay(new Date())
    const start = subDays(today, 29)
    return eachDayOfInterval({ start, end: today })
  }, [])

  const getLogForDate = (habitId: string, date: Date): number => {
    const dateStr = format(date, "yyyy-MM-dd")
    const log = habitLogs.find((log) => log.habitId === habitId && log.date === dateStr)
    return log?.count || 0
  }

  const getHeatmapIntensity = (count: number, targetCount: number): string => {
    if (count === 0) return "bg-muted/20"
    const ratio = Math.min(count / targetCount, 1)
    if (ratio >= 1) return "bg-green-500"
    if (ratio >= 0.75) return "bg-green-400"
    if (ratio >= 0.5) return "bg-yellow-400"
    if (ratio >= 0.25) return "bg-orange-400"
    return "bg-red-400"
  }

  const activeHabits = habits.length
  const totalStreaks = habits.reduce((sum, habit) => sum + getHabitStreak(habit.id), 0)
  const avgStreak = habits.length > 0 ? Math.round(totalStreaks / habits.length) : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Habits</h2>
          <p className="text-muted-foreground">Track your daily routines and build consistency</p>
        </div>
        <Dialog open={showAddHabitDialog} onOpenChange={setShowAddHabitDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="habit-title">Habit Title</Label>
                <Input
                  id="habit-title"
                  placeholder="e.g., Exercise, Read, Meditate"
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="habit-description">Description (optional)</Label>
                <Textarea
                  id="habit-description"
                  placeholder="Describe your habit..."
                  value={newHabitDescription}
                  onChange={(e) => setNewHabitDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="habit-frequency">Frequency</Label>
                  <Select
                    value={newHabitFrequency}
                    onValueChange={(v) => setNewHabitFrequency(v as typeof newHabitFrequency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="habit-target">Target Count</Label>
                  <Input
                    id="habit-target"
                    type="number"
                    min="1"
                    value={newHabitTargetCount}
                    onChange={(e) => setNewHabitTargetCount(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="habit-color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="habit-color"
                    type="color"
                    value={newHabitColor}
                    onChange={(e) => setNewHabitColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={newHabitColor}
                    onChange={(e) => setNewHabitColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddHabit} className="flex-1">
                  Create Habit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddHabitDialog(false)}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Habits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeHabits}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Streaks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStreaks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgStreak} days</div>
          </CardContent>
        </Card>
      </div>

      {/* Habits List */}
      {habits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Flame className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No habits yet. Create your first habit to get started!</p>
            <Button onClick={() => setShowAddHabitDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Habit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {habits.map((habit) => {
            const stats = getHabitStats(habit.id)
            const streak = getHabitStreak(habit.id)
            const todayLog = getLogForDate(habit.id, new Date())
            const todayStr = format(new Date(), "yyyy-MM-dd")

            return (
              <Card key={habit.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${habit.color}20`, color: habit.color }}
                        >
                          <Flame className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{habit.title}</CardTitle>
                          {habit.description && (
                            <p className="text-sm text-muted-foreground mt-1">{habit.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <Badge variant="outline" className="text-xs">
                          {habit.frequency}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Target: {habit.targetCount}
                        </Badge>
                        {streak > 0 && (
                          <Badge className="text-xs bg-orange-500/20 text-orange-500 border-orange-500/50">
                            <Flame className="h-3 w-3 mr-1" />
                            {streak} day streak
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingHabit(habit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (confirm(`Delete habit "${habit.title}"?`)) {
                            try {
                              await deleteHabit(habit.id)
                              toast({
                                title: "Habit deleted",
                                description: `"${habit.title}" habit removed.`,
                              })
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: error instanceof Error ? error.message : "Failed to delete habit",
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
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Streak</p>
                      <p className="text-lg font-bold">{stats.currentStreak} days</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Longest Streak</p>
                      <p className="text-lg font-bold">{stats.longestStreak} days</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Completion Rate</p>
                      <p className="text-lg font-bold">{stats.completionRate}%</p>
                    </div>
                  </div>

                  {/* Today's Check-in */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Today ({format(new Date(), "MMM d")})</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={todayLog >= habit.targetCount ? "default" : "outline"}
                        onClick={() => handleLogHabit(habit.id, new Date(), 1)}
                        className="flex-1"
                        style={{
                          backgroundColor: todayLog >= habit.targetCount ? habit.color : undefined,
                          borderColor: habit.color,
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {todayLog >= habit.targetCount ? "Completed" : `Log (+1)`}
                      </Button>
                      {habit.targetCount > 1 && (
                        <div className="flex items-center gap-1 px-3 py-2 border rounded-lg">
                          <span className="text-sm font-medium">{todayLog}</span>
                          <span className="text-xs text-muted-foreground">/ {habit.targetCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Calendar Heatmap */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Last 30 Days</Label>
                    <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1">
                      {last30Days.map((date) => {
                        const count = getLogForDate(habit.id, date)
                        const intensity = getHeatmapIntensity(count, habit.targetCount)
                        const isToday = isSameDay(date, new Date())

                        return (
                          <div
                            key={date.toISOString()}
                            className={cn(
                              "aspect-square rounded border",
                              intensity,
                              isToday && "ring-2 ring-primary"
                            )}
                            title={`${format(date, "MMM d")}: ${count}/${habit.targetCount}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Habit Dialog */}
      {editingHabit && (
        <Dialog open={!!editingHabit} onOpenChange={(open) => !open && setEditingHabit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editingHabit.title}
                  onChange={(e) => setEditingHabit({ ...editingHabit, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingHabit.description || ""}
                  onChange={(e) => setEditingHabit({ ...editingHabit, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={editingHabit.frequency}
                    onValueChange={(v) => setEditingHabit({ ...editingHabit, frequency: v as Habit["frequency"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Count</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingHabit.targetCount}
                    onChange={(e) => setEditingHabit({ ...editingHabit, targetCount: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={editingHabit.color}
                    onChange={(e) => setEditingHabit({ ...editingHabit, color: e.target.value })}
                    className="w-20"
                  />
                  <Input
                    value={editingHabit.color}
                    onChange={(e) => setEditingHabit({ ...editingHabit, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    try {
                      await updateHabit(editingHabit.id, editingHabit)
                      toast({
                        title: "Habit updated",
                        description: `"${editingHabit.title}" updated.`,
                      })
                      setEditingHabit(null)
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: error instanceof Error ? error.message : "Failed to update habit",
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
                  onClick={() => setEditingHabit(null)}
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
