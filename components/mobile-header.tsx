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
    <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between p-4 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
          <Sparkles className="size-4 text-primary-foreground" />
        </div>
        <span className="font-bold tracking-tight text-foreground">Companion</span>
        {currentEntry && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-chart-2/20 text-chart-2 animate-pulse">Working</span>
        )}
      </div>

      <Button variant="ghost" size="icon" onClick={toggleTheme} className="min-w-[44px] min-h-[44px] rounded-xl">
        {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </Button>
    </header>
  )
}
