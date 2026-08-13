import { getLocalDateKey, resolveEntryEnd } from "@/lib/utils"
import { createServerSupabase, getAuthenticatedUser } from "@/lib/server/auth"
import { SummaryResponseSchema } from "@/lib/server/schemas"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET() {
  try {
    // Shared helper rather than a hand-rolled client: it verifies the user
    // against the auth server with getUser() instead of trusting the cookie via
    // getSession(), matching every other route, and it tolerates the read-only
    // cookie store of a Server Component render.
    const user = await getAuthenticatedUser()
    const supabase = await createServerSupabase()

    if (!user || !supabase) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id
    const today = getLocalDateKey()

    const [{ count: taskCount }, { count: noteCount }, { data: timeEntries }] = await Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase
        .from("time_entries")
        .select("clock_in, clock_out, break_minutes, date")
        .eq("user_id", userId)
        .eq("date", today),
    ])

    const pendingCountResponse = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", false)

    const pendingCount = pendingCountResponse.count || 0

    const todayHours =
      timeEntries?.reduce((total, entry) => {
        const start = new Date(entry.clock_in).getTime()
        // resolveEntryEnd, not Date.now(): an open entry stops accruing at
        // midnight of the day it started. dc50cc2 fixed this everywhere else and
        // missed this file, so a forgotten clock-out inflated todayHours here.
        const end = resolveEntryEnd(entry.clock_in, entry.clock_out ?? undefined)
        const breakMs = (entry.break_minutes || 0) * 60 * 1000
        const diffMs = Math.max(0, end - start - breakMs)
        return total + diffMs / (1000 * 60 * 60)
      }, 0) || 0

    const response = {
      tasks: { total: taskCount || 0, pending: pendingCount },
      notes: { total: noteCount || 0 },
      timesheet: { todayHours: Math.round(todayHours * 100) / 100, sessionsToday: timeEntries?.length || 0 },
    }

    const validated = SummaryResponseSchema.safeParse(response)
    if (!validated.success) {
      console.error("[summary] Response validation failed:", validated.error)
      return Response.json({ error: "Invalid response format" }, { status: 500 })
    }

    return Response.json(validated.data)
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
