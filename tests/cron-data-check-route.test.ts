import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { state, captureMessage, captureException, flush, limit } = vi.hoisted(() => {
  const state = {
    rows: [] as Array<Record<string, unknown>>,
    error: null as { message: string } | null,
  }
  return {
    state,
    captureMessage: vi.fn(),
    captureException: vi.fn(),
    flush: vi.fn(async () => true),
    limit: vi.fn(async () => ({ data: state.rows, error: state.error })),
  }
})

vi.mock("@sentry/nextjs", () => ({ captureMessage, captureException, flush }))

vi.mock("@supabase/supabase-js", () => {
  const query: Record<string, unknown> = {}
  query.select = () => query
  query.order = () => query
  query.limit = limit
  return { createClient: vi.fn(() => ({ from: () => query })) }
})

import { GET } from "@/app/api/cron/data-check/route"

const ENV_KEYS = ["CRON_SECRET", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const
const saved: Record<string, string | undefined> = {}

function req(authorization?: string) {
  return new Request("http://localhost/api/cron/data-check", {
    method: "GET",
    headers: authorization ? { authorization } : {},
  })
}

const authed = () => GET(req("Bearer correct-secret"))

const overCap = {
  id: "entry-1",
  user_id: "user-1",
  date: "2026-02-13",
  reason: "over_cap_closed",
  recorded_hours: 12.4,
  capped_hours: 11.4,
}
const abandoned = { ...overCap, id: "entry-2", reason: "abandoned_open", recorded_hours: 30.6 }

describe("/api/cron/data-check", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key]
    process.env.CRON_SECRET = "correct-secret"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
    state.rows = []
    state.error = null
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
    vi.clearAllMocks()
  })

  it("fails closed when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET

    const response = await GET(req())

    expect(response.status).toBe(401)
    expect(limit).not.toHaveBeenCalled()
  })

  it("rejects a wrong bearer token", async () => {
    expect((await GET(req("Bearer wrong"))).status).toBe(401)
    expect(limit).not.toHaveBeenCalled()
  })

  it("returns 503 when Supabase env is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    expect((await authed()).status).toBe(503)
    expect(limit).not.toHaveBeenCalled()
  })

  it("reports a clean check as 200 with no Sentry event", async () => {
    const response = await authed()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ candidates: 0 })
    expect(captureMessage).not.toHaveBeenCalled()
  })

  it("reports candidates to Sentry and returns 500 so the cron log goes red", async () => {
    state.rows = [overCap]

    const response = await authed()

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({ candidates: 1, abandonedOpen: 0 })
    expect(captureMessage).toHaveBeenCalledTimes(1)
    expect(flush).toHaveBeenCalled()
  })

  // An abandoned open session is corruption accruing right now; a closed entry
  // over the configured cap is usually a real long day. Only the former is error.
  it("raises the Sentry level to error when an abandoned session is present", async () => {
    state.rows = [overCap, abandoned]

    const response = await authed()

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({ candidates: 2, abandonedOpen: 1 })
    expect(captureMessage.mock.calls[0][1]).toMatchObject({ level: "error" })
  })

  it("uses warning level when every candidate is merely over cap", async () => {
    state.rows = [overCap]

    await authed()

    expect(captureMessage.mock.calls[0][1]).toMatchObject({ level: "warning" })
  })

  it("surfaces a query failure as 500 and a Sentry exception", async () => {
    state.error = { message: "relation does not exist" }

    const response = await authed()

    expect(response.status).toBe(500)
    expect(captureException).toHaveBeenCalled()
    expect(flush).toHaveBeenCalled()
  })
})
