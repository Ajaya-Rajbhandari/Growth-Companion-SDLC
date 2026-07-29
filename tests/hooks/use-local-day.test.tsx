// @vitest-environment jsdom
import "../setup-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useLocalDay } from "@/lib/hooks/use-local-day"

describe("useLocalDay", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("reports the current local day key and hour", () => {
    vi.setSystemTime(new Date(2026, 6, 28, 14, 30))

    const { result } = renderHook(() => useLocalDay())

    expect(result.current.dayKey).toBe("2026-07-28")
    expect(result.current.hour).toBe(14)
  })

  it("rolls the day key over at midnight without a remount", () => {
    vi.setSystemTime(new Date(2026, 6, 28, 23, 59, 30))

    const { result } = renderHook(() => useLocalDay())
    expect(result.current.dayKey).toBe("2026-07-28")

    act(() => {
      vi.setSystemTime(new Date(2026, 6, 29, 0, 0, 30))
      vi.advanceTimersByTime(60 * 1000)
    })

    expect(result.current.dayKey).toBe("2026-07-29")
    expect(result.current.hour).toBe(0)
  })

  it("updates the hour as the greeting window changes", () => {
    vi.setSystemTime(new Date(2026, 6, 28, 11, 59, 30))

    const { result } = renderHook(() => useLocalDay())
    expect(result.current.hour).toBe(11)

    act(() => {
      vi.setSystemTime(new Date(2026, 6, 28, 12, 0, 30))
      vi.advanceTimersByTime(60 * 1000)
    })

    expect(result.current.hour).toBe(12)
    expect(result.current.dayKey).toBe("2026-07-28")
  })

  it("resyncs immediately when the tab becomes visible again", () => {
    vi.setSystemTime(new Date(2026, 6, 28, 23, 59, 0))

    const { result } = renderHook(() => useLocalDay())
    expect(result.current.dayKey).toBe("2026-07-28")

    // Simulate the machine sleeping past midnight: the interval never fired,
    // but the visibility change must still correct the value.
    act(() => {
      vi.setSystemTime(new Date(2026, 6, 30, 9, 0, 0))
      document.dispatchEvent(new Event("visibilitychange"))
    })

    expect(result.current.dayKey).toBe("2026-07-30")
    expect(result.current.hour).toBe(9)
  })

  it("returns a stable object while the day and hour are unchanged", () => {
    vi.setSystemTime(new Date(2026, 6, 28, 9, 0, 0))

    const { result } = renderHook(() => useLocalDay())
    const first = result.current

    act(() => {
      vi.setSystemTime(new Date(2026, 6, 28, 9, 30, 0))
      vi.advanceTimersByTime(60 * 1000)
    })

    // Identity must survive an uneventful tick, otherwise every consumer's
    // memoised date windows recompute once a minute for no reason.
    expect(result.current).toBe(first)
  })

  it("stops ticking after unmount", () => {
    vi.setSystemTime(new Date(2026, 6, 28, 9, 0, 0))
    const removeSpy = vi.spyOn(document, "removeEventListener")

    const { unmount } = renderHook(() => useLocalDay())
    unmount()

    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
  })
})
