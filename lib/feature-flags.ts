/**
 * Feature Flag System
 * Manages feature rollout and A/B testing
 *
 * To enable/disable features:
 * 1. Set enabled: boolean to control feature availability
 * 2. Use rolloutPercentage for gradual rollout (0-100)
 * 3. Use beta flag to mark experimental features
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

export type FeatureName =
  | "TIMESHEET"
  | "TASKS"
  | "NOTES"
  | "GOALS"
  | "HABITS"
  | "CALENDAR"
  | "AI_ASSISTANT"
  | "WIDGET"
  | "PWA"
  | "PRIORITY_MATRIX"
  | "ADVANCED_ANALYTICS"
  | "TEAM_COLLABORATION"
  | "EXPORT_FORMATS"

export interface FeatureFlag {
  enabled: boolean
  beta?: boolean
  rolloutPercentage?: number
  description?: string
  linkedView?: ViewId
}

// Feature flag configuration
export const FEATURE_FLAGS: Record<FeatureName, FeatureFlag> = {
  // Core features (100% rollout)
  TIMESHEET: {
    enabled: true,
    beta: false,
    rolloutPercentage: 100,
    description: "Timesheet management with clock in/out",
    linkedView: "timesheet",
  },
  TASKS: {
    enabled: true,
    beta: false,
    rolloutPercentage: 100,
    description: "Task management with priorities and due dates",
    linkedView: "tasks",
  },
  NOTES: {
    enabled: true,
    beta: false,
    rolloutPercentage: 100,
    description: "Note taking with categories",
    linkedView: "notes",
  },
  GOALS: {
    enabled: true,
    beta: false,
    rolloutPercentage: 100,
    description: "Goal tracking with milestones",
    linkedView: "goals",
  },
  HABITS: {
    enabled: true,
    beta: false,
    rolloutPercentage: 100,
    description: "Habit tracking with streaks and statistics",
    linkedView: "habits",
  },
  CALENDAR: {
    enabled: true,
    beta: false,
    rolloutPercentage: 100,
    description: "Calendar view for events",
    linkedView: "calendar",
  },
  AI_ASSISTANT: {
    enabled: true,
    beta: false,
    rolloutPercentage: 100,
    description: "AI-powered assistant",
  },
  WIDGET: {
    enabled: true,
    beta: false,
    rolloutPercentage: 100,
    description: "Floating widget for quick actions",
  },
  PWA: {
    enabled: true,
    beta: false,
    rolloutPercentage: 100,
    description: "Progressive Web App support",
  },

  // Beta/experimental features
  PRIORITY_MATRIX: {
    enabled: true,
    beta: true,
    rolloutPercentage: 50,
    description: "Eisenhower matrix (BETA)",
  },
  ADVANCED_ANALYTICS: {
    enabled: false,
    beta: true,
    rolloutPercentage: 0,
    description: "Advanced analytics (BETA)",
  },
  TEAM_COLLABORATION: {
    enabled: false,
    beta: true,
    rolloutPercentage: 0,
    description: "Team workspaces (BETA)",
  },
  EXPORT_FORMATS: {
    enabled: true,
    beta: false,
    rolloutPercentage: 100,
    description: "Export to CSV/JSON/Excel",
  },
}

// Canonical navigation order. "dashboard" and "profile" are always-on core
// views (no feature flag); the rest are shown only when their flag is enabled.
const NAV_ORDER: ViewId[] = [
  "dashboard",
  "tasks",
  "notes",
  "timesheet",
  "calendar",
  "goals",
  "habits",
  "profile",
]

// Views hidden because their feature flag is disabled.
export const LOCKED_VIEWS = Object.entries(FEATURE_FLAGS)
  .filter(([, flag]) => !flag.enabled && flag.linkedView)
  .map(([, flag]) => flag.linkedView!)

// Views shown in the sidebar / bottom nav, in canonical order. Core views
// (dashboard, profile) are always included; flagged views only when enabled.
export const NAV_VIEW_IDS: ViewId[] = NAV_ORDER.filter(
  (view) => !LOCKED_VIEWS.includes(view),
)

// Check if feature is enabled for a user
export function isFeatureEnabled(featureName: FeatureName, userId?: string): boolean {
  const flag = FEATURE_FLAGS[featureName]

  if (!flag) {
    console.warn(`[Feature Flags] Unknown feature: ${featureName}`)
    return false
  }

  if (!flag.enabled) {
    return false
  }

  const rollout = flag.rolloutPercentage ?? 100
  if (rollout === 100) {
    return true
  }

  if (!userId) {
    return false
  }

  // Consistent rollout per user (hash-based)
  const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return (hash % 100) + 1 <= rollout
}

export function isViewEnabled(view: ViewId): boolean {
  return !LOCKED_VIEWS.includes(view)
}
