"use client"

import { useEffect, useState } from "react"
import { useAppStore, type TimeEntry } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Plus, Trash2 } from "lucide-react"

export type BreakType = "short" | "lunch" | "custom"

interface NotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: TimeEntry | null
  onClose: () => void
}

export function NotesDialog({ open, onOpenChange, entry, onClose }: NotesDialogProps) {
  const updateEntryNotes = useAppStore((state) => state.updateEntryNotes)
  const [entryNotes, setEntryNotes] = useState("")

  useEffect(() => {
    if (open) setEntryNotes(entry?.notes || "")
  }, [open, entry])

  const handleSaveNotes = () => {
    if (entry) {
      updateEntryNotes(entry.id, entryNotes)
        .then(() => {
          toast({
            title: "Notes saved",
            description: "Entry notes updated.",
          })
          onOpenChange(false)
          onClose()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  )
}

interface BreakDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  breakType: BreakType
  onBreakTypeChange: (type: BreakType) => void
  onBeforeStart: () => void
}

export function BreakDialog({ open, onOpenChange, breakType, onBreakTypeChange, onBeforeStart }: BreakDialogProps) {
  const startBreak = useAppStore((state) => state.startBreak)
  const [breakMinutes, setBreakMinutes] = useState("")
  const [breakTitle, setBreakTitle] = useState("")

  const resetAndClose = () => {
    onOpenChange(false)
    setBreakMinutes("")
    setBreakTitle("")
    onBreakTypeChange("custom")
  }

  const handleStartBreak = async () => {
    onBeforeStart()
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
    onOpenChange(false)
    setBreakMinutes("")
    setBreakTitle("")
    onBreakTypeChange("custom")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  onBreakTypeChange("short")
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
                  onBreakTypeChange("lunch")
                  setBreakMinutes("60")
                }}
                className="text-xs"
              >
                Lunch (60m)
              </Button>
              <Button
                type="button"
                variant={breakType === "custom" ? "default" : "outline"}
                onClick={() => onBreakTypeChange("custom")}
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
            <Button variant="outline" onClick={resetAndClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export interface SelectedBreak {
  entryId: string
  breakId: string
  currentTitle?: string
}

interface EditBreakDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedBreak: SelectedBreak | null
  onClose: () => void
}

export function EditBreakDialog({ open, onOpenChange, selectedBreak, onClose }: EditBreakDialogProps) {
  const updateBreakTitle = useAppStore((state) => state.updateBreakTitle)
  const [breakTitleEdit, setBreakTitleEdit] = useState("")

  useEffect(() => {
    if (open) setBreakTitleEdit(selectedBreak?.currentTitle || "")
  }, [open, selectedBreak])

  const handleSaveBreakTitle = async () => {
    if (!selectedBreak) return

    try {
      await updateBreakTitle(selectedBreak.entryId, selectedBreak.breakId, breakTitleEdit)
      toast({
        title: "Break title updated",
        description: "Break title has been saved.",
      })
      onOpenChange(false)
      onClose()
      setBreakTitleEdit("")
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to update break title.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              Leave empty to use default &quot;Custom&quot; label
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveBreakTitle} className="flex-1">
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                onClose()
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
  )
}

interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditTaskDialog({ open, onOpenChange }: EditTaskDialogProps) {
  const { currentEntry, updateCurrentEntryTitle } = useAppStore(
    useShallow((state) => ({
      currentEntry: state.currentEntry,
      updateCurrentEntryTitle: state.updateCurrentEntryTitle,
    })),
  )
  const [editTaskTitle, setEditTaskTitle] = useState("")

  useEffect(() => {
    if (open) setEditTaskTitle(currentEntry?.title || "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleEditTaskTitle = () => {
    if (editTaskTitle.trim() && currentEntry) {
      updateCurrentEntryTitle(editTaskTitle.trim())
      onOpenChange(false)
      setEditTaskTitle("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface OverworkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OverworkDialog({ open, onOpenChange }: OverworkDialogProps) {
  const { graceMinutes, allowOverworkMinutes, overworkMinutesRequested, setOverworkMinutesRequested } = useAppStore(
    useShallow((state) => ({
      graceMinutes: state.graceMinutes,
      allowOverworkMinutes: state.allowOverworkMinutes,
      overworkMinutesRequested: state.overworkMinutesRequested,
      setOverworkMinutesRequested: state.setOverworkMinutesRequested,
    })),
  )
  const [overworkMinutesInput, setOverworkMinutesInput] = useState(overworkMinutesRequested.toString())

  useEffect(() => {
    if (open) {
      setOverworkMinutesInput(overworkMinutesRequested.toString())
    }
  }, [open, overworkMinutesRequested])

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
    onOpenChange(false)
    toast({
      title: "Overwork updated",
      description: value > 0 ? `Up to ${value} minutes allowed today.` : "Overwork disabled for today.",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveOverworkMinutes}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface CategoryManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CategoryManagementDialog({ open, onOpenChange }: CategoryManagementDialogProps) {
  const { timeCategories, addTimeCategory, updateTimeCategory, deleteTimeCategory } = useAppStore(
    useShallow((state) => ({
      timeCategories: state.timeCategories,
      addTimeCategory: state.addTimeCategory,
      updateTimeCategory: state.updateTimeCategory,
      deleteTimeCategory: state.deleteTimeCategory,
    })),
  )
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6")
  const [editingCategory, setEditingCategory] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  )
}
