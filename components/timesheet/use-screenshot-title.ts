"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { imageFromClipboard, isAcceptedImageType, prepareScreenshot } from "@/lib/screenshot"

export type ScreenshotStatus = "idle" | "reading" | "ready" | "error"

export interface ScreenshotTitleState {
  status: ScreenshotStatus
  previewUrl: string | null
  summary: string
  suggestions: string[]
  error: string
  handleFile: (file: File | null | undefined) => void
  clear: () => void
}

// ---------------------------------------------------------------------------
// Paste capture
//
// A paste event fires on whatever currently has focus. Listening on the card or
// dialog subtree therefore only works if the caret is already inside it — land on
// the timesheet, press Cmd+V, and the event fires on <body>, never reaches the
// card, and the paste appears to do nothing at all.
//
// So the listener lives on the document. Two surfaces can be active at once (the
// clock-in card behind an open dialog), and a single paste must not fill in both,
// so handlers form a stack and only the topmost — the most recently opened
// surface — consumes the image. Text pastes are left alone entirely.
// ---------------------------------------------------------------------------

type PasteHandler = (file: File) => void

const pasteHandlers: PasteHandler[] = []
let listening = false

function onDocumentPaste(event: ClipboardEvent) {
  const handler = pasteHandlers[pasteHandlers.length - 1]
  if (!handler) return
  const file = imageFromClipboard(event.clipboardData?.items)
  if (!file) return // a normal text paste — leave it to whatever is focused
  event.preventDefault()
  handler(file)
}

function registerPasteHandler(handler: PasteHandler): () => void {
  pasteHandlers.push(handler)
  if (!listening && typeof document !== "undefined") {
    document.addEventListener("paste", onDocumentPaste)
    listening = true
  }
  return () => {
    const index = pasteHandlers.indexOf(handler)
    if (index !== -1) pasteHandlers.splice(index, 1)
    if (pasteHandlers.length === 0 && listening) {
      document.removeEventListener("paste", onDocumentPaste)
      listening = false
    }
  }
}

/**
 * Reads a pasted or picked screenshot and turns it into task-title suggestions.
 *
 * The image is downscaled in the browser and sent to /api/extract-task-title for
 * one round trip; nothing is stored, and the suggestions only ever prefill the
 * title field — the user still confirms before anything is written.
 *
 * `active` both mirrors a dialog's open state — so a closed dialog forgets its
 * previous screenshot — and decides whether this surface is listening for pastes.
 * Pass `true` from surfaces that are always mounted.
 */
export function useScreenshotTitle(active: boolean): ScreenshotTitleState {
  const { timeEntries, getTopTemplates } = useAppStore(
    useShallow((state) => ({
      timeEntries: state.timeEntries,
      getTopTemplates: state.getTopTemplates,
    })),
  )

  const [status, setStatus] = useState<ScreenshotStatus>("idle")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [summary, setSummary] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState("")

  const abortRef = useRef<AbortController | null>(null)

  const clear = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus("idle")
    setPreviewUrl(null)
    setSummary("")
    setSuggestions([])
    setError("")
  }, [])

  // A dialog that reopens should start clean rather than showing the screenshot
  // from the last task the user logged.
  useEffect(() => {
    if (!active) clear()
  }, [active, clear])

  // Abort any in-flight read when the component goes away, so a slow response
  // cannot call setState on an unmounted surface.
  useEffect(() => () => abortRef.current?.abort(), [])

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return
      if (!isAcceptedImageType(file.type)) {
        setStatus("error")
        setError("That file isn't a PNG, JPEG, or WebP image.")
        return
      }

      // A second paste replaces the first; drop the earlier request's results so
      // they cannot land after the newer ones.
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setStatus("reading")
      setError("")
      setSummary("")
      setSuggestions([])

      const recentFromTemplates = getTopTemplates().slice(0, 8).map((template) => template.title)
      const recentFromEntries = [...timeEntries]
        .filter((entry) => entry.title && entry.clockOut)
        .reverse()
        .slice(0, 12)
        .map((entry) => entry.title as string)
      const recentTitles = Array.from(new Set([...recentFromTemplates, ...recentFromEntries]))

      void (async () => {
        try {
          const prepared = await prepareScreenshot(file)
          if (controller.signal.aborted) return
          setPreviewUrl(prepared.previewUrl)

          const res = await fetch("/api/extract-task-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: { mimeType: prepared.mimeType, data: prepared.data },
              recentTitles,
            }),
            signal: controller.signal,
          })

          const data = (await res.json()) as {
            suggestions?: string[]
            summary?: string
            error?: string
          }
          if (controller.signal.aborted) return

          if (!res.ok) {
            setStatus("error")
            setError(data.error || "Couldn't read that screenshot.")
            return
          }

          const titles = Array.isArray(data.suggestions) ? data.suggestions : []
          setSuggestions(titles)
          setSummary(data.summary || "")

          if (titles.length === 0) {
            // A configured-but-keyless deployment returns 200 with an error, and
            // so does a screenshot with no task in it. Both mean "type it yourself".
            setStatus("error")
            setError(data.error || data.summary || "No task was recognisable in that screenshot.")
            return
          }

          setStatus("ready")
        } catch (e) {
          if (controller.signal.aborted || (e instanceof Error && e.name === "AbortError")) return
          setStatus("error")
          setError(e instanceof Error ? e.message : "Couldn't read that screenshot.")
        } finally {
          if (abortRef.current === controller) abortRef.current = null
        }
      })()
    },
    [getTopTemplates, timeEntries],
  )

  // Registering the handler directly would re-subscribe on every store change,
  // because handleFile depends on the entry list. The ref keeps the subscription
  // tied to `active` alone while still calling the current implementation.
  const handleFileRef = useRef(handleFile)
  useEffect(() => {
    handleFileRef.current = handleFile
  }, [handleFile])

  useEffect(() => {
    if (!active) return
    return registerPasteHandler((file) => handleFileRef.current(file))
  }, [active])

  return { status, previewUrl, summary, suggestions, error, handleFile, clear }
}
