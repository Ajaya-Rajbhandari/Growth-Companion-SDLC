"use client"

import { useEffect, useState } from "react"
import { getLocalDateKey } from "../utils"

export interface LocalDay {
  /** Local date key for "today", e.g. "2026-07-28". */
  dayKey: string
  /** Local hour of day (0-23), for time-of-day greetings. */
  hour: number
}

/**
 * The current local day, kept live.
 *
 * Views that derive a date window from `new Date()` inside a `useMemo` with a
 * static dependency list silently freeze that window at mount: a tab left open
 * across midnight keeps filtering on yesterday's key. Anchoring those windows on
 * `dayKey` makes them recompute when the day actually rolls over.
 *
 * Resyncs once a minute and whenever the tab becomes visible again, so a laptop
 * waking from sleep corrects immediately rather than up to a minute later.
 * Re-rendering is cheap because React bails out when the value is unchanged.
 */
export function useLocalDay(): LocalDay {
  const [day, setDay] = useState<LocalDay>(() => ({
    dayKey: getLocalDateKey(),
    hour: new Date().getHours(),
  }))

  useEffect(() => {
    const sync = () => {
      const dayKey = getLocalDateKey()
      const hour = new Date().getHours()
      setDay((previous) =>
        previous.dayKey === dayKey && previous.hour === hour ? previous : { dayKey, hour },
      )
    }

    sync()
    const interval = window.setInterval(sync, 60 * 1000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") sync()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return day
}
