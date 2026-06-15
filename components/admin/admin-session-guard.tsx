"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

// Admin session policy (enforced while viewing the admin area):
//   * Hard cap: signed out 7 days after the session started, always.
//   * Inactivity: signed out after 30 min idle — unless "Remember me" was chosen.
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000
export const IDLE_MS = 30 * 60 * 1000
export const ADMIN_SESSION_START = "admin_session_start"
export const ADMIN_LAST_ACTIVITY = "admin_last_activity"
export const ADMIN_REMEMBER = "admin_remember"

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_START)
  localStorage.removeItem(ADMIN_LAST_ACTIVITY)
}

export function AdminSessionGuard() {
  const router = useRouter()

  useEffect(() => {
    const now = Date.now()
    if (!localStorage.getItem(ADMIN_SESSION_START)) {
      localStorage.setItem(ADMIN_SESSION_START, String(now))
    }
    localStorage.setItem(ADMIN_LAST_ACTIVITY, String(now))

    const expire = async (reason: "week" | "idle") => {
      clearAdminSession()
      await supabase.auth.signOut()
      router.replace(`/admin/login?expired=${reason}`)
    }

    const check = () => {
      const start = Number(localStorage.getItem(ADMIN_SESSION_START)) || Date.now()
      const last = Number(localStorage.getItem(ADMIN_LAST_ACTIVITY)) || Date.now()
      const remembered = localStorage.getItem(ADMIN_REMEMBER) === "1"
      if (Date.now() - start > WEEK_MS) return void expire("week")
      if (!remembered && Date.now() - last > IDLE_MS) return void expire("idle")
    }

    // Throttle activity writes so rapid mousemove/scroll don't hammer localStorage.
    let lastBump = 0
    const bump = () => {
      const t = Date.now()
      if (t - lastBump < 5_000) return
      lastBump = t
      localStorage.setItem(ADMIN_LAST_ACTIVITY, String(t))
    }
    const events: (keyof WindowEventMap)[] = ["mousemove", "keydown", "click", "scroll", "touchstart"]
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    const interval = window.setInterval(check, 30_000)
    check()

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump))
      window.clearInterval(interval)
    }
  }, [router])

  return null
}
