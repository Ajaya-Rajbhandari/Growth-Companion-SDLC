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
      version: 1,
      migrate: (persistedState, version) => {
        if (version < 1) {
          // v0 → v1: no shape change; versioning introduced.
          return persistedState as AppState
        }
        return persistedState as AppState
      },
    },
  ),
)
