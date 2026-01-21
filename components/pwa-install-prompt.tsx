"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    // Check if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS) {
      // On iOS, show custom instructions
      const hasSeenIOSPrompt = localStorage.getItem("pwa-ios-prompt-dismissed")
      if (!hasSeenIOSPrompt) {
        setShowPrompt(true)
      }
      return
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      const hasSeenPrompt = localStorage.getItem("pwa-install-prompt-dismissed")
      if (!hasSeenPrompt) {
        setShowPrompt(true)
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === "accepted") {
        setShowPrompt(false)
        setDeferredPrompt(null)
      }
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pwa-install-prompt-dismissed", "true")
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      localStorage.setItem("pwa-ios-prompt-dismissed", "true")
    }
  }

  if (isInstalled || !showPrompt) {
    return null
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 bg-card border border-border rounded-lg shadow-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">
            {isIOS ? "Install Companion App" : "Install Companion"}
          </h3>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mb-3">
              Tap the Share button <span className="font-mono">□↑</span> and select &quot;Add to Home Screen&quot;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mb-3">
              Install this app on your device for a better experience
            </p>
          )}
          {!isIOS && (
            <Button onClick={handleInstall} size="sm" className="w-full">
              Install Now
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
