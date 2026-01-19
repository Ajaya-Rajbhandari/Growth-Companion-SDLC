"use client"

import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Menu, Sparkles, LayoutDashboard, CheckSquare, FileText, Clock, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

export function MobileHeader() {
  const { activeView, setActiveView, currentEntry } = useAppStore(
    useShallow((state) => ({
      activeView: state.activeView,
      setActiveView: state.setActiveView,
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => setActiveView("dashboard")}
            className={activeView === "dashboard" ? "bg-accent" : ""}
          >
            <LayoutDashboard className="size-4 mr-2" />
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setActiveView("tasks")}
            className={activeView === "tasks" ? "bg-accent" : ""}
          >
            <CheckSquare className="size-4 mr-2" />
            Tasks
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setActiveView("notes")}
            className={activeView === "notes" ? "bg-accent" : ""}
          >
            <FileText className="size-4 mr-2" />
            Notes
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setActiveView("timesheet")}
            className={activeView === "timesheet" ? "bg-accent" : ""}
          >
            <Clock className="size-4 mr-2" />
            Timesheet
            {currentEntry && <span className="ml-auto text-xs text-chart-2">Active</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme}>
            {isDark ? <Sun className="size-4 mr-2" /> : <Moon className="size-4 mr-2" />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
