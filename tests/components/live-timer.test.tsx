// @vitest-environment jsdom
import "../setup-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { act } from "react"

import { LiveTimer } from "@/components/timesheet/live-timer"

const START = new Date("2026-08-12T09:00:00.000Z")

describe("LiveTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(START)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** Advance both the clock and the interval that reads it. */
  async function advance(ms: number) {
    await act(async () => {
      vi.advanceTimersByTime(ms)
    })
  }

  it("zero-pads hours and minutes so the digits do not shift width", async () => {
    vi.setSystemTime(new Date("2026-08-12T14:05:03.000Z"))
    render(<LiveTimer clockIn={START.toISOString()} breakMinutes={0} />)

    // 5h 05m 03s — not "5h 5m 03s", which changes width as the minute rolls over.
    const display = document.querySelector("[aria-hidden='true']")
    expect(display?.textContent?.replace(/\s+/g, " ")).toContain("05h 05m")
    expect(display?.className).toContain("tabular-nums")
  })

  it("hides the ticking digits from assistive tech and announces minutes instead", async () => {
    vi.setSystemTime(new Date("2026-08-12T11:30:00.000Z"))
    render(<LiveTimer clockIn={START.toISOString()} breakMinutes={0} />)

    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Working for 2 hours 30 minutes")
    expect(status.className).toContain("sr-only")
    // The visible clock must not be announced — it changes every second.
    expect(document.querySelector("[aria-hidden='true']")).not.toBeNull()
  })

  it("keeps the announcement stable across seconds and updates it on the minute", async () => {
    vi.setSystemTime(new Date("2026-08-12T10:00:50.000Z"))
    render(<LiveTimer clockIn={START.toISOString()} breakMinutes={0} />)

    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Working for 1 hours 0 minutes")

    await advance(5000)
    // Seconds moved; the announcement must not have.
    expect(status).toHaveTextContent("Working for 1 hours 0 minutes")

    await advance(6000)
    expect(status).toHaveTextContent("Working for 1 hours 1 minutes")
  })

  it("subtracts banked break minutes from the session total", async () => {
    vi.setSystemTime(new Date("2026-08-12T11:00:00.000Z"))
    render(<LiveTimer clockIn={START.toISOString()} breakMinutes={30} />)

    expect(screen.getByRole("status")).toHaveTextContent("Working for 1 hours 30 minutes")
  })

  it("freezes at the break's start instead of ticking through the break", async () => {
    vi.setSystemTime(new Date("2026-08-12T12:00:00.000Z"))
    render(
      <LiveTimer
        clockIn={START.toISOString()}
        breakMinutes={0}
        frozenAt="2026-08-12T10:15:00.000Z"
      />,
    )

    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Working for 1 hours 15 minutes")

    // Wall-clock time passing must not move a frozen timer.
    await advance(60_000)
    expect(status).toHaveTextContent("Working for 1 hours 15 minutes")
  })

  it("never renders a negative duration for a clock-in in the future", async () => {
    render(<LiveTimer clockIn="2026-08-12T10:00:00.000Z" breakMinutes={0} />)

    expect(screen.getByRole("status")).toHaveTextContent("Working for 0 hours 0 minutes")
  })
})
