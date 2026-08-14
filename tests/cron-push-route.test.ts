import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// vi.mock factories are hoisted above module scope, so the spies and mutable
// results they close over have to be created inside vi.hoisted().
const { sendNotification, setVapidDetails, state, deleteEq, subsSelect } = vi.hoisted(() => {
  const state = {
    subs: { data: [] as unknown[], error: null as { message: string } | null },
    tasks: { data: [] as unknown[], error: null as { message: string } | null },
  }
  return {
    state,
    sendNotification: vi.fn(async () => undefined),
    setVapidDetails: vi.fn(),
    deleteEq: vi.fn(async () => ({})),
    subsSelect: vi.fn(async () => state.subs),
  }
})

vi.mock("web-push", () => ({
  default: { setVapidDetails, sendNotification },
}))

vi.mock("@supabase/supabase-js", () => {
  // The tasks read is a chained builder terminating in .lte(); the subscriptions
  // read terminates at .select(). Mirror both shapes.
  const tasksQuery: Record<string, unknown> = {}
  for (const method of ["select", "in", "eq", "not"]) {
    tasksQuery[method] = () => tasksQuery
  }
  tasksQuery.lte = async () => state.tasks

  return {
    createClient: vi.fn(() => ({
      from: (table: string) =>
        table === "tasks"
          ? tasksQuery
          : {
              select: subsSelect,
              delete: () => ({ eq: deleteEq }),
            },
    })),
  }
})

import { GET } from "@/app/api/cron/push/route"

const ENV_KEYS = [
  "CRON_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
] as const

const saved: Record<string, string | undefined> = {}

function cronRequest(authorization?: string) {
  return new Request("http://localhost/api/cron/push", {
    method: "GET",
    headers: authorization ? { authorization } : {},
  })
}

describe("/api/cron/push authentication", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key]
    // Everything the handler needs *except* the secret. These must be present so
    // a 401 can only come from the auth guard, never from the config check.
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "vapid-public"
    process.env.VAPID_PRIVATE_KEY = "vapid-private"
    state.subs = { data: [], error: null }
    state.tasks = { data: [], error: null }
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
    vi.clearAllMocks()
  })

  // The regression this file exists for. The previous guard read
  // `if (secret && ...)`, so an unset CRON_SECRET skipped authentication
  // entirely and an anonymous GET reached the service-role client below.
  it("rejects an unauthenticated request when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET

    const response = await GET(cronRequest())

    expect(response.status).toBe(401)
    expect(subsSelect).not.toHaveBeenCalled()
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it("rejects a bearer token when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET

    const response = await GET(cronRequest("Bearer anything"))

    expect(response.status).toBe(401)
    expect(subsSelect).not.toHaveBeenCalled()
  })

  it("rejects a missing authorization header", async () => {
    process.env.CRON_SECRET = "correct-secret"

    const response = await GET(cronRequest())

    expect(response.status).toBe(401)
    expect(subsSelect).not.toHaveBeenCalled()
  })

  it("rejects a wrong bearer token", async () => {
    process.env.CRON_SECRET = "correct-secret"

    const response = await GET(cronRequest("Bearer wrong-secret"))

    expect(response.status).toBe(401)
    expect(subsSelect).not.toHaveBeenCalled()
  })

  it("allows the correct bearer token through to the send path", async () => {
    process.env.CRON_SECRET = "correct-secret"

    const response = await GET(cronRequest("Bearer correct-secret"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ sent: 0, subscriptions: 0 })
    expect(subsSelect).toHaveBeenCalled()
  })

  it("still reports missing push config as 503 for an authenticated caller", async () => {
    process.env.CRON_SECRET = "correct-secret"
    delete process.env.VAPID_PRIVATE_KEY

    const response = await GET(cronRequest("Bearer correct-secret"))

    expect(response.status).toBe(503)
    expect(subsSelect).not.toHaveBeenCalled()
  })
})

describe("/api/cron/push failure reporting", () => {
  const subscription = {
    user_id: "user-1",
    endpoint: "https://push.example/endpoint-1",
    p256dh: "p256dh",
    auth: "auth",
  }

  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key]
    process.env.CRON_SECRET = "correct-secret"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "vapid-public"
    process.env.VAPID_PRIVATE_KEY = "vapid-private"
    state.subs = { data: [subscription], error: null }
    state.tasks = { data: [{ user_id: "user-1", due_date: "2000-01-01" }], error: null }
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
    vi.clearAllMocks()
  })

  function authed() {
    return GET(cronRequest("Bearer correct-secret"))
  }

  // Previously the subscriptions error was discarded, leaving subs === null and
  // an early `{ sent: 0 }` with HTTP 200 — a broken run reporting green.
  it("reports a subscriptions read failure as 500 instead of a green empty run", async () => {
    state.subs = { data: [], error: { message: "connection refused" } }

    const response = await authed()

    expect(response.status).toBe(500)
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it("reports a tasks read failure as 500", async () => {
    state.tasks = { data: [], error: { message: "statement timeout" } }

    const response = await authed()

    expect(response.status).toBe(500)
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it("reports a run where every send failed as 500", async () => {
    sendNotification.mockRejectedValueOnce(
      Object.assign(new Error("push service unavailable"), { statusCode: 500 }),
    )

    const response = await authed()

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({ sent: 0, failed: 1 })
  })

  it("counts an expired endpoint as pruned, not failed, and stays 200", async () => {
    sendNotification.mockRejectedValueOnce(
      Object.assign(new Error("gone"), { statusCode: 410 }),
    )

    const response = await authed()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ sent: 0, failed: 0, pruned: 1 })
    expect(deleteEq).toHaveBeenCalledWith("endpoint", subscription.endpoint)
  })

  it("reports a successful send with counts", async () => {
    const response = await authed()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      sent: 1,
      failed: 0,
      pruned: 0,
      subscriptions: 1,
    })
  })
})
