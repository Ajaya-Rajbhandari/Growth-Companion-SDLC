/**
 * Temporarily locked views — focus on the enabled production modules.
 * Set LOCKED_VIEWS to [] to re-enable all features; then set NAV_VIEW_IDS to all view ids.
 */
export type ViewId =
  | "dashboard"
  | "tasks"
  | "notes"
  | "timesheet"
  | "calendar"
  | "goals"
  | "habits"
  | "profile"

export const LOCKED_VIEWS = ["tasks", "goals", "habits"] as const

/** View IDs that appear in sidebar and bottom nav. Only these are shown. */
export const NAV_VIEW_IDS: ViewId[] = ["dashboard", "notes", "timesheet", "calendar", "profile"]

export function isViewEnabled(view: ViewId): boolean {
  return !LOCKED_VIEWS.includes(view as (typeof LOCKED_VIEWS)[number])
}
