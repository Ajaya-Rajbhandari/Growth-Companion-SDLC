"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play } from "lucide-react"
import type { BreakPeriod } from "@/lib/store"

interface BreakModePanelProps {
  activeBreak: BreakPeriod | null
  breakTimeRemaining: { minutes: number; seconds: number } | null
  breakElapsed: { minutes: number; seconds: number }
  onResume: () => void
  isBreakEndedAlert: boolean
  breakType?: "short" | "lunch" | "custom"
}

export function BreakModePanel({
  activeBreak,
  breakTimeRemaining,
  breakElapsed,
  onResume,
  isBreakEndedAlert,
  breakType,
}: BreakModePanelProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!activeBreak) return null

  const formatBreakTime = (mins: number, secs: number) => {
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const getBreakBadgeInfo = () => {
    switch (breakType) {
      case "short":
        return { label: "Short Break", color: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200" }
      case "lunch":
        return { label: "Lunch Break", color: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200" }
      case "custom":
        return { label: "Break", color: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200" }
      default:
        return { label: "Break", color: "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200" }
    }
  }

  const breakInfo = getBreakBadgeInfo()
  const startTime = new Date(activeBreak.startTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <Card className="border-2 border-amber-300 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/15 sticky top-0 z-40 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-pulse rounded-full bg-amber-500" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Currently on Break</p>
              <p className="text-xs text-foreground/70">Started at {startTime}</p>
            </div>
          </div>
          <Badge className={breakInfo.color}>{breakInfo.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          {breakTimeRemaining && breakTimeRemaining.minutes >= 0 ? (
            <div>
              <p className="text-xs text-foreground/70 mb-2">Time Remaining</p>
              <div className="text-6xl font-bold text-amber-700 dark:text-amber-400 font-mono tracking-wider">
                {formatBreakTime(breakTimeRemaining.minutes, breakTimeRemaining.seconds)}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-foreground/70 mb-2">Break Elapsed</p>
              <div className="text-6xl font-bold text-amber-700 dark:text-amber-300 font-mono tracking-wider">
                {formatBreakTime(breakElapsed.minutes, breakElapsed.seconds)}
              </div>
            </div>
          )}

          {breakTimeRemaining && breakTimeRemaining.minutes >= 0 && (
            <div className="mt-4 w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    Math.max(
                      0,
                      100 -
                        (breakTimeRemaining.minutes * 60 + breakTimeRemaining.seconds) /
                          ((activeBreak.durationMinutes || 1) * 60),
                    ) * 100
                  }%`,
                }}
              />
            </div>
          )}
        </div>

        {isBreakEndedAlert && (
          <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-lg p-3 text-center">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">Break time has ended!</p>
            <p className="text-xs text-foreground/70 mt-1">Click Resume to get back to work</p>
          </div>
        )}

        <Button onClick={onResume} variant="default" className="w-full gap-2" size="lg">
          <Play className="h-4 w-4" />
          Resume Work
        </Button>

        <p className="text-xs text-foreground/70 text-center italic">
          All work activity is paused during your break
        </p>
      </CardContent>
    </Card>
  )
}
