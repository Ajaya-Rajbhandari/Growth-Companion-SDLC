import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Captures the cookie handlers Supabase is configured with, so the test can
// invoke setAll directly the way the SSR client does during a token refresh.
const { cookieStore, capturedCookies, createServerClient } = vi.hoisted(() => {
  const capturedCookies: { current: { setAll?: (c: unknown[]) => void } } = { current: {} }
  return {
    capturedCookies,
    cookieStore: { getAll: vi.fn(() => []), set: vi.fn() },
    createServerClient: vi.fn((_url: string, _key: string, opts: { cookies: never }) => {
      capturedCookies.current = opts.cookies
      return { auth: {} }
    }),
  }
})

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }))
vi.mock("@supabase/ssr", () => ({ createServerClient }))

import { createServerSupabase } from "@/lib/server/auth"

const COOKIE = [{ name: "sb-access-token", value: "refreshed", options: {} }]

describe("createServerSupabase cookie handling", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
  })

  afterEach(() => {
    vi.clearAllMocks()
    cookieStore.set.mockReset()
  })

  it("writes refreshed cookies when the store is writable", async () => {
    await createServerSupabase()

    capturedCookies.current.setAll?.(COOKIE)

    expect(cookieStore.set).toHaveBeenCalledWith("sb-access-token", "refreshed", {})
  })

  // Regression for Sentry COMPANION-8/9: "Cookies can only be modified in a
  // Server Action or Route Handler". The admin layout calls this from a Server
  // Component, so a token refresh mid-render threw and took /admin down.
  it("does not throw when the cookie store is read-only (Server Component)", async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler")
    })

    await createServerSupabase()

    expect(() => capturedCookies.current.setAll?.(COOKIE)).not.toThrow()
    expect(cookieStore.set).toHaveBeenCalled()
  })
})
