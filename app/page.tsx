"use client"

import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { DashboardView } from "@/components/dashboard-view"
import { AnalyticsView } from "@/components/analytics-view"
import { TasksView } from "@/components/tasks-view"
import { NotesView } from "@/components/notes-view"
import { TimesheetView } from "@/components/timesheet-view"
import { CalendarView } from "@/components/calendar-view"
import { GoalsView } from "@/components/goals-view"
import { HabitsView } from "@/components/habits-view"
import { ProfileView } from "@/components/profile-view"
import { FloatingAssistant } from "@/components/floating-assistant"
import { ReminderNotifier } from "@/components/reminder-notifier"
import { OnboardingModal } from "@/components/onboarding-modal"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { isViewEnabledFrom, lockedViewsFrom } from "@/lib/feature-flags"

export default function Home() {
  const { activeView, setActiveView, isLoggedIn, authInitialized, featureOverrides } = useAppStore(
    useShallow((state) => ({
      activeView: state.activeView,
      setActiveView: state.setActiveView,
      isLoggedIn: state.isLoggedIn,
      authInitialized: state.authInitialized,
      featureOverrides: state.featureOverrides,
    })),
  )
  const router = useRouter()
  const isViewEnabled = (view: typeof activeView) => isViewEnabledFrom(view, featureOverrides)

  useEffect(() => {
    if (authInitialized && !isLoggedIn) {
      router.push("/auth")
    }
  }, [authInitialized, isLoggedIn, router])

  // Redirect to timesheet when a locked view is selected (e.g. from persisted state)
  useEffect(() => {
    if (lockedViewsFrom(featureOverrides).includes(activeView)) {
      setActiveView("timesheet")
    }
  }, [activeView, setActiveView, featureOverrides])

  if (!authInitialized || !isLoggedIn) {
    return null
  }

  return (
    <div className="flex h-screen bg-transparent text-foreground overflow-x-hidden max-w-full">
      {/* Desktop Navigation Sidebar - Now the only sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col lg:ml-64 min-h-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden">
          <MobileHeader />
        </div>

        {/* Main Content - Now has full width without chat sidebar */}
        <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 overflow-x-hidden overflow-y-auto pb-24 lg:pb-8 w-full max-w-full [&>*]:max-w-full min-h-0">
          {activeView === "dashboard" && <DashboardView />}
          {activeView === "analytics" && isViewEnabled("analytics") && <AnalyticsView />}
          {activeView === "tasks" && isViewEnabled("tasks") && <TasksView />}
          {activeView === "notes" && isViewEnabled("notes") && <NotesView />}
          {activeView === "timesheet" && <TimesheetView />}
          {activeView === "calendar" && <CalendarView />}
          {activeView === "goals" && isViewEnabled("goals") && <GoalsView />}
          {activeView === "habits" && isViewEnabled("habits") && <HabitsView />}
          {activeView === "profile" && <ProfileView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      <FloatingAssistant />
      <ReminderNotifier />
      <OnboardingModal />
    </div>
  )
}
