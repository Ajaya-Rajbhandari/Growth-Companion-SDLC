"use client"

import { useState } from "react"
import { useAppStore, type WorkTemplate } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Play } from "lucide-react"

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

  const topTemplates = getTopTemplates()

  // Handle clockIn with workTitle and save template
  const handleClockIn = () => {
    const title = workTitle.trim()
    const category = selectedCategory && selectedCategory !== "none" ? selectedCategory : undefined
    if (title) {
      clockIn(title, category)
        .then(() => {
          setWorkTitle("")
          setSelectedCategory("none")
          toast({
            title: "Clocked in",
            description: `Started "${title}".`,
          })
        })
        .catch((error) => {
          toast({
            title: "Clock-in failed",
            description: error instanceof Error ? error.message : "Unable to start session.",
          })
        })
      return
    }
    clockIn(undefined, category)
      .then(() => {
        setSelectedCategory("none")
        toast({
          title: "Clocked in",
          description: "Work session started.",
        })
      })
      .catch((error) => {
        toast({
          title: "Clock-in failed",
          description: error instanceof Error ? error.message : "Unable to start session.",
        })
      })
  }

  const handleSaveTemplate = () => {
    if (workTitle.trim() && templateName.trim()) {
      addWorkTemplate({
        title: templateName,
        description: workTitle,
      })
      setTemplateName("")
      setShowTemplateDialog(false)
    }
  }

  const handleUseTemplate = (template: WorkTemplate) => {
    setWorkTitle(template.description || template.title)
  }

  return (
    <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent w-full max-w-full overflow-hidden !px-0">
      <CardHeader className="p-2 sm:p-3 md:p-4 !px-2 sm:!px-3 md:!px-4">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Play className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Start Your Work Day</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Log what you&apos;re doing so your day is traceable (office rule). You can switch tasks anytime during the session.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 p-2 sm:p-3 md:p-4 w-full max-w-full overflow-hidden !px-2 sm:!px-3 md:!px-4">
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium">What are you working on right now?</label>
          <Input
            placeholder="e.g., Team standup, Sprint planning, Code review, Deep work, Email..."
            value={workTitle}
            onChange={(e) => setWorkTitle(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleClockIn()}
            className="text-base h-12 sm:h-10 w-full max-w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-medium">Category (optional)</label>
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
            <SelectTrigger className="h-12 sm:h-10 w-full max-w-full">
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

        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-full">
          {(() => {
            const todayEntries = getTodayTimeEntries()
            const hasClockedInToday = todayEntries.length > 0
            const isDisabled = !!currentEntry || hasClockedInToday || isAtHardCap
            if (hasClockedInToday && !currentEntry) {
              return (
                <Button className="flex-1 w-full sm:w-auto min-w-0" size="lg" disabled>
                  <Play className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Already Clocked In Today</span>
                </Button>
              )
            }
            return (
              <Button
                onClick={handleClockIn}
                className="flex-1 w-full sm:w-auto min-w-0"
                size="lg"
                disabled={isDisabled}
              >
                <Play className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Clock In</span>
              </Button>
            )
          })()}
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="w-full sm:w-auto min-w-0 flex-shrink-0">
                <span className="truncate">Save as Template</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Work Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Template Name</label>
                  <Input
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
      </CardContent>
    </Card>
  )
}
