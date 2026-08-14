"use client"

import { useEffect, useState } from "react"
import { Play } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useTaskTitleSuggestions } from "./use-task-title-suggestions"
import { useScreenshotTitle } from "./use-screenshot-title"
import { ScreenshotTitleField } from "./screenshot-title-field"

interface ClockInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAtHardCap?: boolean
}

export function ClockInDialog({ open, onOpenChange, isAtHardCap = false }: ClockInDialogProps) {
  const { clockIn, currentEntry, timeCategories, getTopTemplates, getTodayTimeEntries } = useAppStore(
    useShallow((state) => ({
      clockIn: state.clockIn,
      currentEntry: state.currentEntry,
      timeCategories: state.timeCategories,
      getTopTemplates: state.getTopTemplates,
      getTodayTimeEntries: state.getTodayTimeEntries,
    })),
  )
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("none")
  const [submitting, setSubmitting] = useState(false)
  const { aiSuggestions, suggestionsLoading } = useTaskTitleSuggestions(open, title)
  const screenshot = useScreenshotTitle(open)
  const recentTemplates = getTopTemplates().slice(0, 5)
  const hasClockedInToday = getTodayTimeEntries().length > 0

  useEffect(() => {
    if (!open) {
      setTitle("")
      setCategory("none")
      setSubmitting(false)
    }
  }, [open])

  const submit = async () => {
    const workTitle = title.trim()
    if (!workTitle || currentEntry || hasClockedInToday || isAtHardCap) return

    setSubmitting(true)
    try {
      await clockIn(workTitle, category === "none" ? undefined : category)
      toast({
        title: "Clocked in",
        description: `Started "${workTitle}".`,
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Clock-in failed",
        description: error instanceof Error ? error.message : "Unable to start the work session.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const unavailableReason = isAtHardCap
    ? "You reached today’s work limit."
    : hasClockedInToday && !currentEntry
      ? "You already completed a work session today."
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,720px)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Start a focused work session</DialogTitle>
          <DialogDescription>
            Name the work before the timer starts. You can log a new task whenever your focus changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {unavailableReason && (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              {unavailableReason}
            </p>
          )}

          <ScreenshotTitleField
            screenshot={screenshot}
            onPick={setTitle}
            selected={title}
            disabled={submitting || !!unavailableReason}
          />

          {(aiSuggestions.length > 0 || suggestionsLoading) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Suggested work</Label>
                {suggestionsLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.slice(0, 5).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTitle(suggestion)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      title === suggestion
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary/35 hover:bg-secondary/70",
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {recentTemplates.length > 0 && (
            <div className="space-y-2">
              <Label>Recent work</Label>
              <div className="flex flex-wrap gap-2">
                {recentTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setTitle(template.description || template.title)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-secondary/60"
                  >
                    {template.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dashboard-work-title">What are you working on?</Label>
            <Input
              id="dashboard-work-title"
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void submit()
                }
              }}
              placeholder="e.g. Review pull requests"
              maxLength={100}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Be specific enough that the activity makes sense in your daily log.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Category <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {timeCategories.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={!title.trim() || submitting || !!unavailableReason || !!currentEntry}
            >
              <Play className="mr-2 size-4" />
              {submitting ? "Starting…" : "Start timer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
