// @vitest-environment jsdom
import "../setup-dom"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { BreakModePanel } from "@/components/break-mode-panel"
import { getBreakCountdown } from "@/lib/break-timer"

const START = "2026-08-12T10:00:00.000Z"
const at = (minutes: number) => new Date(START).getTime() + minutes * 60_000

const activeBreak = {
  id: "break-1",
  startTime: START,
  durationMinutes: 15,
  type: "short" as const,
}

// `null` rather than `undefined` for the open-ended case: passing `undefined`
// explicitly would fall back to the default parameter.
function renderPanel(nowMinutes: number, durationMinutes: number | null = 15) {
  const countdown = getBreakCountdown(START, durationMinutes, at(nowMinutes))
  return render(
    <BreakModePanel
      activeBreak={{ ...activeBreak, durationMinutes } as never}
      breakTimeRemaining={countdown}
      breakElapsed={{ minutes: nowMinutes, seconds: 0 }}
      onResume={() => {}}
      isBreakEndedAlert={false}
      breakType="short"
    />,
  )
}

const progressWidth = () =>
  (document.querySelector('[role="progressbar"] > div') as HTMLElement | null)?.style.width

describe("BreakModePanel", () => {
  it("counts down while the break is running", () => {
    renderPanel(5)

    expect(screen.getByText("Time Remaining")).toBeInTheDocument()
    expect(screen.getByText("10:00")).toBeInTheDocument()
    expect(screen.queryByText("Over by")).not.toBeInTheDocument()
  })

  it("reports how far over the break has run instead of freezing at 00:00", () => {
    // 15-minute break, 40 minutes in. This previously rendered a frozen "00:00"
    // under a "Time Remaining" heading.
    renderPanel(40)

    expect(screen.getByText("Over by")).toBeInTheDocument()
    expect(screen.getByText("-25:00")).toBeInTheDocument()
    expect(screen.queryByText("Time Remaining")).not.toBeInTheDocument()
  })

  describe("progress bar", () => {
    // The old expression evaluated to ~9900% for every input, so overflow-hidden
    // clipped it to a bar that read full for the entire break.
    it("grows across the break rather than starting full", () => {
      renderPanel(0)
      expect(progressWidth()).toBe("0%")
    })

    it("is half full at the halfway point", () => {
      renderPanel(7.5)
      expect(progressWidth()).toBe("50%")
    })

    it("caps at 100% once overrun", () => {
      renderPanel(40)
      expect(progressWidth()).toBe("100%")
    })

    it("exposes progress to assistive tech", () => {
      renderPanel(7.5)
      const bar = screen.getByRole("progressbar")
      expect(bar).toHaveAttribute("aria-valuenow", "50")
      expect(bar).toHaveAttribute("aria-label", "Break progress")
    })
  })

  it("shows elapsed time and no progress bar for an open-ended break", () => {
    renderPanel(12, null)

    expect(screen.getByText("Break Elapsed")).toBeInTheDocument()
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
  })

  it("announces the state at minute granularity, hiding the ticking digits", () => {
    renderPanel(5)

    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("10 minutes of break remaining.")
    expect(status.className).toContain("sr-only")
    expect(screen.getByText("10:00")).toHaveAttribute("aria-hidden", "true")
  })

  it("announces the overrun rather than staying silent past the end", () => {
    renderPanel(40)
    expect(screen.getByRole("status")).toHaveTextContent("Break is 25 minutes over.")
  })
})
