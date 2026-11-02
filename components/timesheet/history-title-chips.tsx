"use client"

import { History } from "lucide-react"
import { cn } from "@/lib/utils"
import { matchTitleHistory, type TitleSuggestion } from "@/lib/title-history"

interface HistoryTitleChipsProps {
  history: TitleSuggestion[]
  /** What is in the title field now; filters the chips as the user types. */
  query: string
  onPick: (suggestion: TitleSuggestion) => void
  /** Titles not to offer, e.g. the task being switched away from. */
  exclude?: (string | undefined)[]
  limit?: number
  compact?: boolean
  disabled?: boolean
}

/**
 * The user's own past titles, offered back as chips. Picking one only fills the
 * field — it never submits. Enter in the field keeps submitting exactly what was
 * typed, because a clock-in's start time can't be edited afterwards.
 */
export function HistoryTitleChips({
  history,
  query,
  onPick,
  exclude,
  limit = 6,
  compact = false,
  disabled = false,
}: HistoryTitleChipsProps) {
  const matches = matchTitleHistory(history, query, { limit, exclude })
  if (matches.length === 0) return null

  return (
    <div className="space-y-2">
      <p
        className={cn(
          "flex items-center gap-1.5 font-medium text-foreground/70",
          compact ? "text-[11px]" : "text-xs",
        )}
      >
        <History className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
        {query.trim() ? "Matches from your history" : "From your history"}
      </p>
      <div className={cn("flex flex-wrap", compact ? "gap-1.5" : "gap-2")}>
        {matches.map((suggestion) => (
          <button
            key={suggestion.title}
            type="button"
            disabled={disabled}
            onClick={() => onPick(suggestion)}
            title={suggestion.title}
            className={cn(
              "max-w-full truncate rounded-lg border border-border bg-background text-left font-medium text-foreground transition-colors hover:bg-secondary/60 disabled:opacity-50",
              compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
            )}
          >
            {suggestion.title}
          </button>
        ))}
      </div>
    </div>
  )
}
