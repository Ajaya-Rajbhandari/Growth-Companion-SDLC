"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"

// Fetches AI task-title suggestions for the switch-task dialog: an initial
// fetch when the dialog opens, then debounced re-fetches as the user types.
export function useTaskTitleSuggestions(open: boolean, draft: string) {
  const { timeEntries, currentEntry, getTopTemplates } = useAppStore(
    useShallow((state) => ({
      timeEntries: state.timeEntries,
      currentEntry: state.currentEntry,
      getTopTemplates: state.getTopTemplates,
    })),
  )

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const fetchSuggestions = useCallback(
    async (currentDraft: string) => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      setSuggestionsLoading(true)
      const recentFromTemplates = getTopTemplates().slice(0, 8).map((t) => t.title)
      const recentFromEntries = [...timeEntries]
        .filter((e) => e.title && e.clockOut)
        .reverse()
        .slice(0, 12)
        .map((e) => e.title as string)
      const recentTitles = Array.from(new Set([...recentFromTemplates, ...recentFromEntries]))
      try {
        const res = await fetch("/api/suggest-task-titles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draft: currentDraft.slice(0, 200),
            recentTitles,
            currentTask: currentEntry?.title || undefined,
          }),
          signal: abortRef.current.signal,
        })
        const data = await res.json()
        if (Array.isArray(data.suggestions)) {
          setAiSuggestions(data.suggestions)
        }
      } catch {
        setAiSuggestions([])
      } finally {
        setSuggestionsLoading(false)
        abortRef.current = null
      }
    },
    [timeEntries, currentEntry?.title, getTopTemplates],
  )

  useEffect(() => {
    if (!open) return
    setAiSuggestions([])
    fetchSuggestions("")
  }, [open, fetchSuggestions])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = draft.trim()
    if (trimmed.length < 2) return
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(trimmed)
      debounceRef.current = null
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open, draft, fetchSuggestions])

  return { aiSuggestions, suggestionsLoading }
}
