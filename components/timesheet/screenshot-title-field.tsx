"use client"

import { useRef } from "react"
import { ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { ScreenshotTitleState } from "./use-screenshot-title"

interface ScreenshotTitleFieldProps {
  screenshot: ScreenshotTitleState
  /** Called when the user picks one of the extracted titles. */
  onPick: (title: string) => void
  /** The title currently in the input, so the chosen chip stays highlighted. */
  selected?: string
  disabled?: boolean
}

/**
 * Screenshot-to-title control. Pasting is the fast path, but paste alone is an
 * invisible affordance and unavailable on most touch keyboards, so the file
 * picker is always offered beside it.
 *
 * Paste capture belongs to `useScreenshotTitle`, which listens on the document
 * for as long as its surface is active — a paste works wherever the focus
 * happens to be, including before the user has clicked anything.
 */
export function ScreenshotTitleField({
  screenshot,
  onPick,
  selected,
  disabled = false,
}: ScreenshotTitleFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { status, previewUrl, summary, suggestions, error, handleFile, clear } = screenshot

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-medium text-foreground">
          Have a screenshot of the task?
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || status === "reading"}
          onClick={() => fileInputRef.current?.click()}
          className="h-8 sm:h-6 text-xs min-w-[44px] min-h-[44px] sm:min-h-0 flex-shrink-0"
        >
          <ImagePlus className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
          Choose image
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          handleFile(event.target.files?.[0])
          // Clearing lets the same file be chosen twice in a row.
          event.target.value = ""
        }}
      />

      {status === "idle" && (
        <p className="text-xs text-muted-foreground">
          Paste it anywhere on this screen and the title fills itself in. Screenshots are read once
          and never stored.
        </p>
      )}

      {previewUrl && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-2">
          {/* Decorative: the summary below states what was found in words. */}
          <img
            src={previewUrl}
            alt=""
            className="h-14 w-24 flex-shrink-0 rounded border border-border object-cover"
          />
          <div className="min-w-0 flex-1 space-y-1">
            {status === "reading" ? (
              <p className="flex items-center gap-2 text-xs text-foreground/70">
                <Spinner className="h-3 w-3 flex-shrink-0" />
                Reading the screenshot…
              </p>
            ) : (
              summary && <p className="text-xs text-foreground/80 break-words">{summary}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="h-8 w-8 flex-shrink-0 p-0"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Remove screenshot</span>
          </Button>
        </div>
      )}

      {/* One announcement point for the whole flow, so a screen reader hears the
          outcome instead of only seeing chips appear. */}
      <div aria-live="polite" className="sr-only">
        {status === "reading" && "Reading the screenshot."}
        {status === "ready" &&
          `${suggestions.length} title ${suggestions.length === 1 ? "suggestion" : "suggestions"} from your screenshot.`}
        {status === "error" && error}
      </div>

      {status === "error" && error && (
        <p className="text-xs text-destructive" role="status">
          {error}
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((title) => (
            <button
              key={title}
              type="button"
              disabled={disabled}
              onClick={() => onPick(title)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
                selected === title
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-primary/10 text-foreground border-primary/30 hover:bg-primary/20",
              )}
            >
              {title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
