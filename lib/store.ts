import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  createAuthSlice,
  createChatSlice,
  createGoalsSlice,
  createHabitsSlice,
  createNotesSlice,
  createTasksSlice,
  createTimesheetSlice,
  createUiSlice,
  type AppState,
} from "./slices"

// Re-export all domain types so existing imports from "@/lib/store" keep working.
export type {
  BreakPeriod,
  ChatMessage,
  ChatSession,
  Goal,
  Habit,
  HabitLog,
  Milestone,
  Note,
  Task,
  TimeCategory,
  TimeEntry,
  User,
  WorkTemplate,
} from "./types"

// Composition root: a single store (one localStorage key) combining all
// domain slices defined under lib/slices/.
export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createTasksSlice(...a),
      ...createNotesSlice(...a),
      ...createTimesheetSlice(...a),
      ...createGoalsSlice(...a),
      ...createHabitsSlice(...a),
      ...createChatSlice(...a),
      ...createUiSlice(...a),
    }),
    {
      name: "app-store",
      // Bump `version` and handle the old shape in `migrate` whenever the
      // persisted state shape changes, so existing users' localStorage
      // rehydrates cleanly instead of corrupting the store.
      version: 2,
      // Keep only account-neutral UI preferences in localStorage. User data is
      // always reloaded from Supabase after authentication.
      partialize: (state) => ({
        activeView: state.activeView,
      }) as AppState,
      migrate: (persistedState) => {
        const previous = persistedState as Partial<AppState> | undefined
        return {
          activeView: previous?.activeView ?? "dashboard",
        } as AppState
      },
    },
  ),
)
