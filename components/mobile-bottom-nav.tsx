"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { NAV_VIEW_IDS } from "@/lib/feature-flags"
import type { ViewId } from "@/lib/feature-flags"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Clock,
  Calendar as CalendarIcon,
  Target,
  Flame,
  User,
  BarChart3,
  Shield,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react"

type NavItem = {
  id: ViewId
  label: string
  icon: LucideIcon
  badge?: number | "•"
}

// Priority order for the bottom bar. The first 4 enabled views become the
// primary tabs; anything beyond that moves into the "More" sheet.
const PRIORITY: ViewId[] = [
  "dashboard",
  "timesheet",
  "tasks",
  "notes",
  "analytics",
  "calendar",
  "goals",
  "habits",
  "profile",
]

// Show all items inline when there are this many or fewer; otherwise reserve
// the last slot for a "More" button.
const MAX_INLINE = 5

export function MobileBottomNav() {
  const { activeView, setActiveView, tasks, notes, currentEntry, isAdmin } = useAppStore(
    useShallow((state) => ({
      activeView: state.activeView,
      setActiveView: state.setActiveView,
      tasks: state.tasks,
      notes: state.notes,
      currentEntry: state.currentEntry,
      isAdmin: state.isAdmin,
    })),
  )

  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const pendingTasks = tasks.filter((t) => !t.completed).length

  const meta: Record<ViewId, { label: string; icon: LucideIcon; badge?: number | "•" }> = {
    dashboard: { label: "Dashboard", icon: LayoutDashboard },
    analytics: { label: "Analytics", icon: BarChart3 },
    tasks: { label: "Tasks", icon: CheckSquare, badge: pendingTasks > 0 ? pendingTasks : undefined },
    notes: { label: "Notes", icon: FileText, badge: notes.length > 0 ? notes.length : undefined },
    timesheet: { label: "Timesheet", icon: Clock, badge: currentEntry ? "•" : undefined },
    calendar: { label: "Calendar", icon: CalendarIcon },
    goals: { label: "Goals", icon: Target },
    habits: { label: "Habits", icon: Flame },
    profile: { label: "Profile", icon: User },
    admin: { label: "Admin", icon: Shield },
  }

  // Enabled views in priority order; admins get the Admin view appended (it lands
  // in the "More" sheet so it never displaces a primary tab).
  const enabled: NavItem[] = PRIORITY.filter((id) => NAV_VIEW_IDS.includes(id)).map((id) => ({
    id,
    ...meta[id],
  }))
  if (isAdmin) enabled.push({ id: "admin", ...meta.admin })

  const needsMore = enabled.length > MAX_INLINE
  const primary = needsMore ? enabled.slice(0, MAX_INLINE - 1) : enabled
  const overflow = needsMore ? enabled.slice(MAX_INLINE - 1) : []
  const overflowActive = overflow.some((item) => item.id === activeView)

  const handleSelect = (id: ViewId) => {
    setMoreOpen(false)
    if (id === "admin") {
      router.push("/admin")
      return
    }
    setActiveView(id)
  }

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/85 backdrop-blur-xl border-t border-sidebar-border pb-safe shadow-2xl shadow-black/20">
        <div className="flex items-stretch justify-around gap-1 px-2 py-2 min-h-[60px]">
          {primary.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeView === item.id}
              onClick={() => handleSelect(item.id)}
            />
          ))}

          {needsMore && (
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition-all max-w-[100px] relative touch-manipulation",
                overflowActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border"
                  : "text-muted-foreground active:text-sidebar-foreground active:bg-sidebar-accent/60",
              )}
              aria-label="More"
            >
              <div className="relative flex items-center justify-center">
                <MoreHorizontal className="size-5 shrink-0" />
                {overflowActive && (
                  <span className="absolute -top-0.5 -right-1.5 size-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight text-center w-full truncate">
                More
              </span>
            </button>
          )}
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="lg:hidden rounded-t-2xl pb-safe">
          <SheetHeader className="text-left">
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-2 p-2">
            {overflow.map((item) => {
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl transition-all touch-manipulation",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border"
                      : "text-muted-foreground active:bg-sidebar-accent/60",
                  )}
                  aria-label={item.label}
                >
                  <div className="relative flex items-center justify-center">
                    <item.icon className="size-6 shrink-0" />
                    {item.badge && item.badge !== "•" && (
                      <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium leading-tight text-center truncate w-full">
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition-all max-w-[100px] relative touch-manipulation",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border"
          : "text-muted-foreground active:text-sidebar-foreground active:bg-sidebar-accent/60",
      )}
      aria-label={item.label}
    >
      <div className="relative flex items-center justify-center">
        <item.icon className="size-5 shrink-0" />
        {item.badge && (
          <span
            className={cn(
              "absolute -top-0.5 -right-1.5 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full text-[9px] font-semibold",
              item.badge === "•"
                ? "bg-chart-2 text-chart-2 animate-pulse w-2 h-2 -right-1"
                : "bg-primary text-primary-foreground",
            )}
          >
            {item.badge !== "•" && item.badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium leading-tight text-center line-clamp-1 w-full truncate">
        {item.label}
      </span>
    </button>
  )
}
