import { supabase } from "./supabase"

/**
 * Fire-and-forget product analytics. Appends one row to `analytics_events`.
 * Never throws and never blocks the caller — analytics must not break a user
 * action. Read the data globally from the Supabase SQL Editor
 * (see scripts/analytics-queries.sql).
 *
 * @param event       a stable snake_case name, e.g. "task_created"
 * @param userId      the acting user's id (null for anonymous/pre-auth events)
 * @param properties  optional extra context, stored as JSONB
 */
export function trackEvent(
  event: string,
  userId?: string | null,
  properties: Record<string, unknown> = {},
): void {
  try {
    const path = typeof window !== "undefined" ? window.location.pathname : null
    void supabase
      .from("analytics_events")
      .insert({ event, user_id: userId ?? null, properties, path })
      .then(({ error }) => {
        if (error && process.env.NODE_ENV === "development") {
          console.warn(`trackEvent("${event}") failed:`, error.message)
        }
      })
  } catch {
    // Swallow — telemetry should never surface to the user.
  }
}
