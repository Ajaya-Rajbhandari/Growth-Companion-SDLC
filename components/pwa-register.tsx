"use client"

import { useEffect } from "react"
import { toast } from "@/components/ui/use-toast"

export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    let refreshing = false

    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      toast({ title: "New version available", description: "Refreshing…" })
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for updates when user comes back to the tab (so they get new version without hard refresh)
        const checkForUpdates = () => registration.update?.()

        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdates()
        })

        // When a new worker is installed (waiting), tell it to take over and we'll reload
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" })
            }
          })
        })

        // If there's already a waiting worker (e.g. from a previous visit), take over now
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" })
        }
      })
      .catch((err) => console.error("Service Worker registration failed:", err))

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
    }
  }, [])

  return null
}
