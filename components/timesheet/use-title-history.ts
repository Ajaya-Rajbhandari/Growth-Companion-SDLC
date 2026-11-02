"use client"

import { useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { buildTitleHistory, type TitleSuggestion } from "@/lib/title-history"

// Every task title the user has logged, ranked, recomputed only when the
// entries change. Cheap: one pass over at most one row per working day.
export function useTitleHistory(): TitleSuggestion[] {
  const timeEntries = useAppStore((state) => state.timeEntries)
  return useMemo(() => buildTitleHistory(timeEntries), [timeEntries])
}
