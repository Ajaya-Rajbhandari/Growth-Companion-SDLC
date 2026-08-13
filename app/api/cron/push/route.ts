import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Daily Web Push sender. Triggered by Vercel Cron (see vercel.json). Sends a
// reminder to users who have overdue or due-today tasks. Reads across users with
// the service-role key, so it must never be exposed — Vercel Cron authenticates
// via the CRON_SECRET bearer token.
export async function GET(request: Request) {
  // Fail closed. A missing CRON_SECRET used to skip this check entirely, which
  // left an unauthenticated caller running the service-role branch below with
  // RLS bypassed. An unset secret is now a misconfiguration, not an open door.
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!url || !serviceKey || !vapidPublic || !vapidPrivate) {
    return Response.json({ error: "Push not configured (missing env)" }, { status: 503 })
  }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", vapidPublic, vapidPrivate)
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const today = new Date().toISOString().slice(0, 10)

  // Query errors used to be discarded here, so a failed read produced `subs = null`
  // and an early `{ sent: 0 }` with HTTP 200 — a fully broken run that reported
  // green in the Vercel cron log. Surface them instead.
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
  if (subsError) {
    console.error("[cron/push] failed to read push_subscriptions:", subsError.message)
    return Response.json({ error: "Failed to read subscriptions" }, { status: 500 })
  }
  if (!subs || subs.length === 0) return Response.json({ sent: 0, subscriptions: 0 })

  const userIds = [...new Set(subs.map((s) => s.user_id))]
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("user_id, due_date")
    .in("user_id", userIds)
    .eq("completed", false)
    .not("due_date", "is", null)
    .lte("due_date", today)
  if (tasksError) {
    console.error("[cron/push] failed to read tasks:", tasksError.message)
    return Response.json({ error: "Failed to read tasks" }, { status: 500 })
  }

  const counts: Record<string, { overdue: number; today: number }> = {}
  for (const t of tasks || []) {
    if (!t.due_date) continue
    const c = (counts[t.user_id] ||= { overdue: 0, today: 0 })
    if (t.due_date < today) c.overdue++
    else c.today++
  }

  let sent = 0
  let failed = 0
  let pruned = 0
  for (const sub of subs) {
    const c = counts[sub.user_id]
    if (!c || (c.overdue === 0 && c.today === 0)) continue
    const parts: string[] = []
    if (c.overdue) parts.push(`${c.overdue} overdue`)
    if (c.today) parts.push(`${c.today} due today`)
    const payload = JSON.stringify({
      title: "Companion reminders",
      body: `You have ${parts.join(" · ")}.`,
      url: "/",
      tag: "companion-daily",
    })
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
      sent++
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) {
        // Expected: the endpoint is gone. Pruning it is success, not failure.
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
        pruned++
      } else {
        failed++
        console.error(`[cron/push] send failed (status ${status ?? "unknown"}):`, err)
      }
    }
  }

  // A run where every attempted send failed is a failed run. Reporting HTTP 200
  // would leave the cron log green while no user received anything.
  if (failed > 0 && sent === 0) {
    return Response.json(
      { error: "All push sends failed", sent, failed, pruned },
      { status: 500 },
    )
  }

  return Response.json({ sent, failed, pruned, subscriptions: subs.length })
}
