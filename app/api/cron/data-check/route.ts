import * as Sentry from "@sentry/nextjs"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Daily data-integrity check. Triggered by Vercel Cron (see vercel.json).
//
// Migration 019 makes invalid time entries impossible to write, but a rejected
// write surfaces only as a toast to whoever hit it — handled errors never reach
// Sentry, so nothing tells the operator. And 015's repair view catches a wider
// class than the constraints do: entries over the user's configured cap are
// legitimate-but-notable, not schema violations.
//
// This closes that loop by reporting into the one alerting system that exists.
// Two independent signals when something is found: a Sentry issue, and a non-200
// that turns the Vercel cron log red. Silence means clean.
//
// Reads across all users with the service-role key, so it must never be exposed —
// the CRON_SECRET check below fails closed.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return Response.json({ error: "Data check not configured (missing env)" }, { status: 503 })
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  // The detector is migration 015's view, whose correctness is already proven —
  // it sized and executed the real repair after the abandoned-sessions incident.
  const { data, error } = await supabase
    .from("time_entry_repair_candidates")
    .select("id, user_id, date, reason, recorded_hours, capped_hours")
    .order("recorded_hours", { ascending: false })
    .limit(20)

  if (error) {
    console.error("[cron/data-check] failed to read time_entry_repair_candidates:", error.message)
    Sentry.captureException(new Error(`data-check query failed: ${error.message}`))
    await Sentry.flush(2000)
    return Response.json({ error: "Failed to run data check" }, { status: 500 })
  }

  const candidates = data ?? []
  if (candidates.length === 0) {
    return Response.json({ candidates: 0 })
  }

  // Split the two classes: an abandoned open session is corruption accruing right
  // now, while a closed entry over the user's configured cap is usually a real
  // long day. Both are worth surfacing; only the first is urgent.
  const abandoned = candidates.filter((row) => row.reason === "abandoned_open")

  Sentry.captureMessage(
    `time_entry_repair_candidates: ${candidates.length} row(s), ${abandoned.length} abandoned-open`,
    {
      level: abandoned.length > 0 ? "error" : "warning",
      tags: { check: "time_entry_integrity" },
      // User ids only — no titles, notes, or other entry content.
      extra: {
        total: candidates.length,
        abandonedOpen: abandoned.length,
        worst: candidates.slice(0, 5).map((row) => ({
          id: row.id,
          date: row.date,
          reason: row.reason,
          recordedHours: row.recorded_hours,
          cappedHours: row.capped_hours,
        })),
      },
    },
  )
  // Serverless functions freeze on return; without an explicit flush the event
  // can be dropped before it is sent.
  await Sentry.flush(2000)

  // Non-200 so the Vercel cron log shows red even if the Sentry issue is missed.
  return Response.json(
    { candidates: candidates.length, abandonedOpen: abandoned.length },
    { status: 500 },
  )
}
