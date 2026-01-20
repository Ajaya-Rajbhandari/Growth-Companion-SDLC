"use client"

import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { Sparkles, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

export function MobileHeader() {
  const { currentEntry } = useAppStore(
    useShallow((state) => ({
      currentEntry: state.currentEntry,
    })),
  )
  const { theme, resolvedTheme, setTheme } = useTheme()
  const isDark = theme === "dark" || (theme === "system" && resolvedTheme === "dark")
  const toggleTheme = () => setTheme(isDark ? "light" : "dark")

  return (
    <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Sparkles className="size-4 text-primary" />
        </div>
        <span className="font-semibold text-foreground">Companion</span>
        {currentEntry && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-chart-2/20 text-chart-2 animate-pulse">Working</span>
        )}
      </div>

      <Button variant="ghost" size="icon" onClick={toggleTheme} className="min-w-[44px] min-h-[44px]">
        {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </Button>
    </header>
  )
}
