"use client"

import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { NAV_VIEW_IDS } from "@/lib/feature-flags"
import { LayoutDashboard, CheckSquare, FileText, Sparkles, Clock, User, LogOut, Sun, Moon, Calendar as CalendarIcon, Target, Flame, BarChart3 } from "lucide-react"
import { useTheme } from "next-themes"

export function Sidebar() {
  const { activeView, setActiveView, tasks, notes, currentEntry, user, logout } = useAppStore(
    useShallow((state) => ({
      activeView: state.activeView,
      setActiveView: state.setActiveView,
      tasks: state.tasks,
      notes: state.notes,
      currentEntry: state.currentEntry,
      user: state.user,
      logout: state.logout,
    })),
  )
  const { theme, resolvedTheme, setTheme } = useTheme()
  const isDark = (theme === "dark" || (theme === "system" && resolvedTheme === "dark"))
  const toggleTheme = () => setTheme(isDark ? "light" : "dark")

  const pendingTasks = tasks.filter((t) => !t.completed).length

  const navItems = [
    {
      id: "dashboard" as const,
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "analytics" as const,
      label: "Analytics",
      icon: BarChart3,
    },
    {
      id: "tasks" as const,
      label: "Tasks",
      icon: CheckSquare,
      badge: pendingTasks > 0 ? pendingTasks : undefined,
    },
    {
      id: "notes" as const,
      label: "Notes",
      icon: FileText,
      badge: notes.length > 0 ? notes.length : undefined,
    },
    {
      id: "timesheet" as const,
      label: "Timesheet",
      icon: Clock,
      badge: currentEntry ? "Active" : undefined,
    },
    {
      id: "calendar" as const,
      label: "Calendar",
      icon: CalendarIcon,
    },
    {
      id: "goals" as const,
      label: "Goals",
      icon: Target,
    },
    {
      id: "habits" as const,
      label: "Habits",
      icon: Flame,
    },
    {
      id: "profile" as const,
      label: "Profile",
      icon: User,
    },
  ]

  return (
    <aside className="w-64 bg-sidebar/90 backdrop-blur-xl border-r border-sidebar-border h-screen flex flex-col fixed top-0 left-0 z-40 shadow-2xl shadow-black/10">
      <div className="p-5">
        <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold tracking-tight text-sidebar-foreground">Companion</h1>
            <p className="text-xs text-muted-foreground">Growth command center</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto scrollbar-hide">
        <ul className="space-y-1">
          {navItems.filter((item) => NAV_VIEW_IDS.includes(item.id)).map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveView(item.id)}
                className={cn(
                  "group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  activeView === item.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}
              >
                {activeView === item.id && <span className="absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary" />}
                <item.icon className={cn("size-5 transition-transform", activeView === item.id ? "text-primary" : "group-hover:scale-105")} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs rounded-full",
                      item.badge === "Active"
                        ? "bg-chart-2/20 text-chart-2 animate-pulse"
                        : "bg-primary/20 text-primary",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 space-y-3 border-t border-sidebar-border/70">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-sidebar-accent/70"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {isDark ? "Light Mode" : "Dark Mode"}
        </button>
        {user && (
          <div className="px-3 py-2 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/60">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors rounded-xl hover:bg-destructive/10"
        >
          <LogOut className="size-4" />
          Sign Out
        </button>
      </div>

      <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-primary/15 via-sidebar-accent/60 to-accent/10 border border-sidebar-border/70">
        <p className="text-xs font-medium text-sidebar-foreground">Stay focused.</p>
        <p className="mt-1 text-xs text-muted-foreground">Plan your tasks, protect your energy, and track daily momentum.</p>
      </div>
    </aside>
  )
}
