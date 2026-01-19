import { createServerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (allCookies) => {
            allCookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const today = new Date().toISOString().split("T")[0]

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
        const end = entry.clock_out ? new Date(entry.clock_out).getTime() : Date.now()
        const breakMs = (entry.break_minutes || 0) * 60 * 1000
        const diffMs = Math.max(0, end - start - breakMs)
        return total + diffMs / (1000 * 60 * 60)
      }, 0) || 0

    return Response.json({
      tasks: { total: taskCount || 0, pending: pendingCount },
      notes: { total: noteCount || 0 },
      timesheet: { todayHours: Math.round(todayHours * 100) / 100, sessionsToday: timeEntries?.length || 0 },
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}

