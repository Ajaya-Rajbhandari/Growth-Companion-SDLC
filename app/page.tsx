"use client"

import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { DashboardView } from "@/components/dashboard-view"
import { TasksView } from "@/components/tasks-view"
import { NotesView } from "@/components/notes-view"
import { TimesheetView } from "@/components/timesheet-view"
import { CalendarView } from "@/components/calendar-view"
import { GoalsView } from "@/components/goals-view"
import { HabitsView } from "@/components/habits-view"
import { ProfileView } from "@/components/profile-view"
import { FloatingAssistant } from "@/components/floating-assistant"
import { OnboardingModal } from "@/components/onboarding-modal"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Home() {
  const { activeView, isLoggedIn, authInitialized } = useAppStore(
    useShallow((state) => ({
      activeView: state.activeView,
      isLoggedIn: state.isLoggedIn,
      authInitialized: state.authInitialized,
    })),
  )
  const router = useRouter()

  useEffect(() => {
    if (authInitialized && !isLoggedIn) {
      router.push("/auth")
    }
  }, [authInitialized, isLoggedIn, router])

  if (!authInitialized || !isLoggedIn) {
    return null
  }

  return (
    <div className="flex h-screen bg-background overflow-x-hidden max-w-full">
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
        <main className="flex-1 p-2 sm:p-3 md:p-4 lg:p-5 overflow-x-hidden overflow-y-auto pb-36 lg:pb-8 w-full max-w-full [&>*]:max-w-full min-h-0">
          {activeView === "dashboard" && <DashboardView />}
          {activeView === "tasks" && <TasksView />}
          {activeView === "notes" && <NotesView />}
          {activeView === "timesheet" && <TimesheetView />}
          {activeView === "calendar" && <CalendarView />}
          {activeView === "goals" && <GoalsView />}
          {activeView === "habits" && <HabitsView />}
          {activeView === "profile" && <ProfileView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      <FloatingAssistant />
      <OnboardingModal />
    </div>
  )
}
