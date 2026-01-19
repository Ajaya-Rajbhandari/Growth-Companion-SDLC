"use client"

import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { LayoutDashboard, CheckSquare, FileText, Sparkles, Clock, User, LogOut, Sun, Moon, Calendar as CalendarIcon, Target, Flame } from "lucide-react"
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
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-screen flex flex-col sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">Companion</h1>
            <p className="text-xs text-muted-foreground">Personal Assistant</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveView(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  activeView === item.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <item.icon className="size-5" />
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

      <div className="p-4 space-y-3 border-t border-border">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {isDark ? "Light Mode" : "Dark Mode"}
        </button>
        {user && (
          <div className="px-3 py-2 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
        >
          <LogOut className="size-4" />
          Sign Out
        </button>
      </div>

      <div className="p-4 m-3 rounded-lg bg-secondary/50 border border-border">
        <p className="text-xs text-muted-foreground">Stay organized and productive with your personal companion.</p>
      </div>
    </aside>
  )
}
