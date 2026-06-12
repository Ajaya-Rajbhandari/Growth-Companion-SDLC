import type { AuthSlice } from "./auth"
import type { ChatSlice } from "./chat"
import type { GoalsSlice } from "./goals"
import type { HabitsSlice } from "./habits"
import type { NotesSlice } from "./notes"
import type { TasksSlice } from "./tasks"
import type { TimesheetSlice } from "./timesheet"
import type { UiSlice } from "./ui"

// Combined store state: one store composed from per-domain slices.
export type AppState = AuthSlice &
  TasksSlice &
  NotesSlice &
  TimesheetSlice &
  GoalsSlice &
  HabitsSlice &
  ChatSlice &
  UiSlice

export type {
  AuthSlice,
  ChatSlice,
  GoalsSlice,
  HabitsSlice,
  NotesSlice,
  TasksSlice,
  TimesheetSlice,
  UiSlice,
}

export { createAuthSlice } from "./auth"
export { createChatSlice } from "./chat"
export { createGoalsSlice } from "./goals"
export { createHabitsSlice } from "./habits"
export { createNotesSlice } from "./notes"
export { createTasksSlice } from "./tasks"
export { createTimesheetSlice } from "./timesheet"
export { createUiSlice } from "./ui"
