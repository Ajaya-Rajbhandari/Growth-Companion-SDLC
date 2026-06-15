import { getAuthenticatedUser, createServerSupabase } from "@/lib/server/auth"

// Save (or refresh) this device's push subscription for the signed-in user.
export async function POST(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const endpoint = body?.endpoint as string | undefined
  const p256dh = body?.keys?.p256dh as string | undefined
  const auth = body?.keys?.auth as string | undefined
  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 })
  }

  const supabase = await createServerSupabase()
  if (!supabase) return Response.json({ error: "Server not configured" }, { status: 503 })

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: user.id, endpoint, p256dh, auth }, { onConflict: "endpoint" })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}

// Remove this device's subscription.
export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const endpoint = body?.endpoint as string | undefined
  if (!endpoint) return Response.json({ error: "Missing endpoint" }, { status: 400 })

  const supabase = await createServerSupabase()
  if (!supabase) return Response.json({ error: "Server not configured" }, { status: 503 })

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
  return Response.json({ ok: true })
}
