// @vitest-environment jsdom
import "../setup-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { act } from "react"

const toast = vi.fn()
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
  useToast: () => ({ toast, dismiss: vi.fn(), toasts: [] }),
}))

// Minimal store double: useAppStore(selector) applies the selector to this state.
const storeState: Record<string, any> = {}
vi.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: any) => unknown) => selector(storeState),
}))

import { BreakDialog, EditTaskDialog } from "@/components/timesheet/dialogs"

/** Click by accessible name and flush the resulting state updates. */
async function click(name: RegExp) {
  const button = screen.getByRole("button", { name })
  await act(async () => {
    button.click()
  })
  return button
}

describe("BreakDialog", () => {
  beforeEach(() => {
    toast.mockClear()
    storeState.startBreak = vi.fn(() => Promise.resolve())
  })

  it("awaits the persisted break before reporting success and closing", async () => {
    let resolveStart!: () => void
    storeState.startBreak = vi.fn(() => new Promise<void>((resolve) => { resolveStart = resolve }))
    const onOpenChange = vi.fn()

    render(
      <BreakDialog
        open
        onOpenChange={onOpenChange}
        breakType="short"
        onBreakTypeChange={vi.fn()}
        onBeforeStart={vi.fn()}
      />,
    )

    await click(/start break/i)

    // While the write is in flight the dialog must not claim success or close.
    expect(storeState.startBreak).toHaveBeenCalledWith(15, "short", undefined)
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /starting/i })).toBeDisabled()

    await act(async () => {
      resolveStart()
    })

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Break started" }))
  })

  it("keeps the dialog open and reports the error when persisting fails", async () => {
    storeState.startBreak = vi.fn(() => Promise.reject(new Error("offline")))
    const onOpenChange = vi.fn()

    render(
      <BreakDialog
        open
        onOpenChange={onOpenChange}
        breakType="lunch"
        onBreakTypeChange={vi.fn()}
        onBeforeStart={vi.fn()}
      />,
    )

    await click(/start break/i)

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Couldn't start break",
          description: "offline",
          variant: "destructive",
        }),
      ),
    )
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Break started" }))
    // The button must be usable again so the user can retry.
    expect(screen.getByRole("button", { name: /start break/i })).not.toBeDisabled()
  })

  it("rejects an invalid custom duration without touching the store", async () => {
    render(
      <BreakDialog
        open
        onOpenChange={vi.fn()}
        breakType="custom"
        onBreakTypeChange={vi.fn()}
        onBeforeStart={vi.fn()}
      />,
    )

    await click(/start break/i)

    expect(storeState.startBreak).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Invalid duration" }))
  })
})

describe("EditTaskDialog", () => {
  beforeEach(() => {
    toast.mockClear()
    storeState.currentEntry = {
      id: "entry-1",
      date: "2026-07-28",
      clockIn: "2026-07-28T09:00:00.000Z",
      breakMinutes: 0,
      breaks: [],
      title: "Old title",
    }
    storeState.updateCurrentEntryTitle = vi.fn(() => Promise.resolve())
  })

  it("saves the trimmed title and closes once the write settles", async () => {
    const onOpenChange = vi.fn()
    render(<EditTaskDialog open onOpenChange={onOpenChange} />)

    await click(/update task/i)

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(storeState.updateCurrentEntryTitle).toHaveBeenCalledWith("Old title")
  })

  it("keeps the dialog open and reports the error when the save fails", async () => {
    storeState.updateCurrentEntryTitle = vi.fn(() => Promise.reject(new Error("offline")))
    const onOpenChange = vi.fn()

    render(<EditTaskDialog open onOpenChange={onOpenChange} />)

    await click(/update task/i)

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Couldn't update task",
          description: "offline",
          variant: "destructive",
        }),
      ),
    )
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /update task/i })).not.toBeDisabled()
  })

  it("does not call the store for an empty title", async () => {
    storeState.currentEntry = { ...storeState.currentEntry, title: "   " }
    render(<EditTaskDialog open onOpenChange={vi.fn()} />)

    await click(/update task/i)

    expect(storeState.updateCurrentEntryTitle).not.toHaveBeenCalled()
  })
})
