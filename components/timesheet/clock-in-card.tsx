"use client"

import { useState } from "react"
import { useAppStore, type WorkTemplate } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/use-toast"
import { Play } from "lucide-react"
import { useScreenshotTitle } from "./use-screenshot-title"
import { ScreenshotTitleField } from "./screenshot-title-field"

interface ClockInCardProps {
  isAtHardCap: boolean
  onManageCategories: () => void
}

export function ClockInCard({ isAtHardCap, onManageCategories }: ClockInCardProps) {
  const {
    currentEntry,
    clockIn,
    timeCategories,
    addWorkTemplate,
    getTopTemplates,
    getTodayTimeEntries,
  } = useAppStore(
    useShallow((state) => ({
      currentEntry: state.currentEntry,
      clockIn: state.clockIn,
      timeCategories: state.timeCategories,
      addWorkTemplate: state.addWorkTemplate,
      getTopTemplates: state.getTopTemplates,
      getTodayTimeEntries: state.getTodayTimeEntries,
    })),
  )

  const [workTitle, setWorkTitle] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("none")
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [isClockingIn, setIsClockingIn] = useState(false)

  // This card is always mounted, so there is no open/close cycle to reset it —
  // it is cleared explicitly once the session it fed has started.
  const screenshot = useScreenshotTitle(true)

  const topTemplates = getTopTemplates()

  // Handle clockIn with workTitle and save template
  const handleClockIn = () => {
    const title = workTitle.trim()
    const category = selectedCategory && selectedCategory !== "none" ? selectedCategory : undefined
    if (!title) {
      toast({
        title: "Add your current work",
        description: "Name the task before starting the timer.",
        variant: "destructive",
      })
      return
    }
    // The store writes state only once Supabase confirms, so `currentEntry` and
    // `hasClockedInToday` below stay stale for the whole round trip. Without this
    // flag the button keeps its normal label and stays pressable while the write
    // is in flight, which on a slow connection reads as "my tap didn't register".
    if (isClockingIn) return
    setIsClockingIn(true)

    clockIn(title, category)
      .then(() => {
        setWorkTitle("")
        setSelectedCategory("none")
        screenshot.clear()
        toast({
          title: "Clocked in",
          description: `Started "${title}".`,
        })
      })
      .catch((error) => {
        toast({
          title: "Clock-in failed",
          description: error instanceof Error ? error.message : "Unable to start session.",
          variant: "destructive",
        })
      })
      .finally(() => {
        setIsClockingIn(false)
      })
  }

  const handleSaveTemplate = async () => {
    if (!workTitle.trim() || !templateName.trim()) {
      toast({
        title: "Template needs a name",
        description: "Add the work description and a template name first.",
        variant: "destructive",
      })
      return
    }
    // Await the write before closing, so a failed save doesn't look successful.
    try {
      await addWorkTemplate({
        title: templateName.trim(),
        description: workTitle.trim(),
      })
    } catch (error) {
      toast({
        title: "Couldn't save template",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
      return
    }
    toast({ title: "Template saved", description: `"${templateName.trim()}" is ready to reuse.` })
    setTemplateName("")
    setShowTemplateDialog(false)
  }

  const handleUseTemplate = (template: WorkTemplate) => {
    setWorkTitle(template.description || template.title)
  }

  return (
    <Card density="compact" className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent w-full max-w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Play className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Start Your Work Day</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Log what you&apos;re doing so your day is traceable (office rule). You can switch tasks anytime during the session.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 w-full max-w-full overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="clock-in-title" className="text-xs sm:text-sm font-medium">
              What are you working on right now?
            </label>
            {/* Saving a template acts on the title above, so it belongs beside it —
                and as a ghost link, not as a large button sharing a row with the
                one action this whole card exists for. */}
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!workTitle.trim()}
                  className="h-8 sm:h-6 text-xs min-w-[44px] min-h-[44px] sm:min-h-0 flex-shrink-0"
                >
                  Save as template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Work Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label htmlFor="template-name" className="text-sm font-medium">
                      Template Name
                    </label>
                    <Input
                      id="template-name"
                      placeholder="e.g., Morning Development"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSaveTemplate} className="w-full">
                    Save Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Input
            id="clock-in-title"
            placeholder="e.g., Team standup, Sprint planning, Code review, Deep work, Email..."
            value={workTitle}
            onChange={(e) => setWorkTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleClockIn()}
            className="text-base h-12 sm:h-10 w-full max-w-full"
          />
        </div>

        <ScreenshotTitleField
          screenshot={screenshot}
          onPick={setWorkTitle}
          selected={workTitle}
          disabled={isClockingIn}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="clock-in-category" className="text-xs sm:text-sm font-medium">
              Category (optional)
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={onManageCategories}
              className="h-8 sm:h-6 text-xs min-w-[44px] min-h-[44px] sm:min-h-0"
            >
              Manage
            </Button>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger id="clock-in-category" className="h-12 sm:h-10 w-full max-w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {timeCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {topTemplates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground/70">Recently used:</p>
            <div className="flex flex-wrap gap-2">
              {topTemplates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleUseTemplate(template)}
                  className="text-xs"
                >
                  {template.title}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* The one action this card exists for gets the row to itself and the
            largest hit area on the screen. */}
        {(() => {
          const todayEntries = getTodayTimeEntries()
          const hasClockedInToday = todayEntries.length > 0
          const isDisabled = !!currentEntry || hasClockedInToday || isAtHardCap

          // A disabled button is not focusable, so this explanation is invisible to
          // anyone using the keyboard or a screen reader. Say it in prose instead.
          if (hasClockedInToday && !currentEntry) {
            return (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm" role="status">
                <p className="font-medium">You have already clocked in today.</p>
                <p className="text-foreground/70 mt-1">
                  The day&apos;s session is recorded below in Time History. Clocking in is available
                  again tomorrow.
                </p>
              </div>
            )
          }

          return (
            <Button
              onClick={handleClockIn}
              className="w-full h-14 sm:h-12 text-base"
              size="lg"
              disabled={isDisabled || isClockingIn || !workTitle.trim()}
            >
              {isClockingIn ? (
                <Spinner className="mr-2 flex-shrink-0" />
              ) : (
                <Play className="mr-2 h-4 w-4 flex-shrink-0" />
              )}
              <span className="truncate">{isClockingIn ? "Clocking in…" : "Clock In"}</span>
            </Button>
          )
        })()}
      </CardContent>
    </Card>
  )
}
