"use client"

import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Clock,
  Calendar as CalendarIcon,
  Target,
  Flame,
  User,
} from "lucide-react"

export function MobileBottomNav() {
  const { activeView, setActiveView, tasks, notes, currentEntry } = useAppStore(
    useShallow((state) => ({
      activeView: state.activeView,
      setActiveView: state.setActiveView,
      tasks: state.tasks,
      notes: state.notes,
      currentEntry: state.currentEntry,
    })),
  )

  const pendingTasks = tasks.filter((t) => !t.completed).length

  const navItems = [
    {
      id: "dashboard" as const,
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: undefined,
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
      badge: currentEntry ? "•" : undefined,
    },
    {
      id: "calendar" as const,
      label: "Calendar",
      icon: CalendarIcon,
      badge: undefined,
    },
    {
      id: "goals" as const,
      label: "Goals",
      icon: Target,
      badge: undefined,
    },
    {
      id: "habits" as const,
      label: "Habits",
      icon: Flame,
      badge: undefined,
    },
    {
      id: "profile" as const,
      label: "Profile",
      icon: User,
      badge: undefined,
    },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar/95 backdrop-blur-sm border-t border-sidebar-border pb-safe">
      <div className="flex overflow-x-auto scrollbar-hide gap-1 px-1 py-2 max-h-[80px] snap-x snap-mandatory">
        {navItems.map((item) => {
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg transition-colors min-h-[64px] min-w-[70px] flex-shrink-0 relative touch-manipulation snap-start",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground active:text-sidebar-foreground active:bg-sidebar-accent/50",
              )}
              aria-label={item.label}
            >
              <div className="relative">
                <item.icon className="size-5" />
                {item.badge && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold",
                      item.badge === "•"
                        ? "bg-chart-2 text-chart-2 animate-pulse w-2 h-2"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {item.badge !== "•" && item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight text-center line-clamp-1 max-w-full truncate">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
