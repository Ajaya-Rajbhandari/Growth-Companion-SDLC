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

interface SwitchTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SwitchTaskDialog({ open, onOpenChange }: SwitchTaskDialogProps) {
  const { timeEntries, currentEntry, switchTask, getTopTemplates } = useAppStore(
    useShallow((state) => ({
      timeEntries: state.timeEntries,
      currentEntry: state.currentEntry,
      switchTask: state.switchTask,
      getTopTemplates: state.getTopTemplates,
    })),
  )

  const [newTaskTitle, setNewTaskTitle] = useState("")
  const { aiSuggestions, suggestionsLoading } = useTaskTitleSuggestions(open, newTaskTitle)
  const topTemplates = getTopTemplates()

  useEffect(() => {
    if (open) setNewTaskTitle("")
  }, [open])

  const handleSwitchTask = async () => {
    const title = newTaskTitle.trim()
    if (title) {
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
      }
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
              maxLength={100}
              className="text-base bg-input text-foreground"
            />
            <div className="text-xs text-foreground/70">{newTaskTitle.length}/100 characters</div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSwitchTask} disabled={!newTaskTitle.trim()} className="flex-1">
              Log & switch
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
