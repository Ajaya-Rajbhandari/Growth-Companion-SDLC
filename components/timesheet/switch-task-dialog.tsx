"use client"

import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { useTaskTitleSuggestions } from "./use-task-title-suggestions"
import { useScreenshotTitle } from "./use-screenshot-title"
import { ScreenshotTitleField } from "./screenshot-title-field"
import { HistoryTitleChips } from "./history-title-chips"
import { useTitleHistory } from "./use-title-history"

interface SwitchTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SwitchTaskDialog({ open, onOpenChange }: SwitchTaskDialogProps) {
  const { currentEntry, switchTask, getTopTemplates } = useAppStore(
    useShallow((state) => ({
      currentEntry: state.currentEntry,
      switchTask: state.switchTask,
      getTopTemplates: state.getTopTemplates,
    })),
  )

  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isSwitching, setIsSwitching] = useState(false)
  const { aiSuggestions, suggestionsLoading } = useTaskTitleSuggestions(open, newTaskTitle)
  const screenshot = useScreenshotTitle(open)
  const topTemplates = getTopTemplates()
  const titleHistory = useTitleHistory()

  useEffect(() => {
    if (open) setNewTaskTitle("")
  }, [open])

  const handleSwitchTask = async () => {
    const title = newTaskTitle.trim()
    // Switching closes the current task and opens a new one; a double submit would
    // log two segments. The button's own `disabled` only tracks the text field.
    if (!title || isSwitching) return

    setIsSwitching(true)
    try {
      await switchTask(title)
      onOpenChange(false)
      setNewTaskTitle("")
      toast({
        title: "Task switched",
        description: `Now working on "${title}".`,
      })
    } catch (error) {
      toast({
        title: "Switch failed",
        description: error instanceof Error ? error.message : "Unable to switch task.",
        variant: "destructive",
      })
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log new task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-foreground/70">
            Current activity &quot;{currentEntry?.title}&quot; will be saved with its time. Pick a suggestion or type your own.
          </p>

          <ScreenshotTitleField
            screenshot={screenshot}
            onPick={setNewTaskTitle}
            selected={newTaskTitle}
            disabled={isSwitching}
          />

          {/* AI suggestions */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Suggested for you
              {suggestionsLoading && (
                <span className="text-xs font-normal text-muted-foreground">Loading…</span>
              )}
            </h3>
            {aiSuggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setNewTaskTitle(title)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
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
              <p className="text-xs text-muted-foreground">Suggestions appear here. Type a few words to get titles based on your input.</p>
            )}
          </div>

          {/* Recently used tasks */}
          {topTemplates.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Saved templates</h3>
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
                    {template.usageCount > 0 && (
                      <p className="text-xs text-foreground/70">Used {template.usageCount} times</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Every past title, switched-away-from tasks included — not just each
              day's final task. The task being switched away from is left out. */}
          <HistoryTitleChips
            history={titleHistory}
            query={newTaskTitle}
            onPick={(suggestion) => setNewTaskTitle(suggestion.title)}
            exclude={[currentEntry?.title]}
            limit={8}
            disabled={isSwitching}
          />

          {/* Divider */}
          {(topTemplates.length > 0 || titleHistory.length > 0) && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-card text-foreground/70">or type your own</span>
              </div>
            </div>
          )}

          {/* Create new task input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">What are you doing next?</label>
            <Input
              placeholder="e.g., Team standup, Code review, Email, Deep work, Meeting..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSwitchTask()}
              maxLength={100}
              className="text-base bg-input text-foreground"
            />
            <div className="text-xs text-foreground/70">{newTaskTitle.length}/100 characters</div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSwitchTask} disabled={!newTaskTitle.trim() || isSwitching} className="flex-1">
              {isSwitching ? "Switching…" : "Log & switch"}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
              disabled={isSwitching}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
