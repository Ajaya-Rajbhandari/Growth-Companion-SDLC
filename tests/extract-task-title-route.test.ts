import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// The rate limiter is module-level and keyed by user id, so every test signs in
// as a different user. Otherwise the eleventh request in the file 429s for
// reasons that have nothing to do with what it is testing.
const { authState } = vi.hoisted(() => ({ authState: { user: { id: "user-0" } as { id: string } | null } }))

vi.mock("@/lib/server/auth", () => ({
  getAuthenticatedUser: vi.fn(async () => authState.user),
}))

import { POST } from "@/app/api/extract-task-title/route"

let userCounter = 0
function signInAsFreshUser() {
  userCounter += 1
  authState.user = { id: `extract-user-${userCounter}` }
}

const PIXEL = "iVBORw0KGgoAAAANSUhEUg"

function extractRequest(body: unknown) {
  return new Request("http://localhost/api/extract-task-title", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    image: { mimeType: "image/jpeg", data: PIXEL },
    recentTitles: ["Code Review"],
    ...overrides,
  }
}

function geminiReply(payload: unknown) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] }, finishReason: "STOP" }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>) {
  const init = fetchMock.mock.calls[0][1] as RequestInit
  return JSON.parse(init.body as string)
}

describe("/api/extract-task-title", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key"
    signInAsFreshUser()
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("rejects a signed-out caller before touching Gemini", async () => {
    authState.user = null

    const res = await POST(extractRequest(validBody()))

    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns the extracted titles and what the model saw", async () => {
    fetchMock.mockResolvedValue(
      geminiReply({
        summary: "Linear issue GC-142 about break panel contrast",
        suggestions: ["Fix Break Panel Contrast", "Break Panel A11y Pass"],
      }),
    )

    const res = await POST(extractRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.suggestions).toEqual(["Fix Break Panel Contrast", "Break Panel A11y Pass"])
    expect(data.summary).toBe("Linear issue GC-142 about break panel contrast")
  })

  it("sends the image as inline data alongside the recent-title context", async () => {
    fetchMock.mockResolvedValue(geminiReply({ summary: "A card", suggestions: ["Ship It"] }))

    await POST(extractRequest(validBody()))

    const parts = sentBody(fetchMock).contents[0].parts
    expect(parts[0].text).toContain("Code Review")
    expect(parts[1].inlineData).toEqual({ mimeType: "image/jpeg", data: PIXEL })
  })

  // Gemini 2.5 bills thinking tokens against maxOutputTokens; the sibling routes
  // learned this the hard way and truncated their JSON mid-object.
  it("disables thinking and leaves room for the reply", async () => {
    fetchMock.mockResolvedValue(geminiReply({ summary: "A card", suggestions: ["Ship It"] }))

    await POST(extractRequest(validBody()))

    const config = sentBody(fetchMock).generationConfig
    expect(config.thinkingConfig).toEqual({ thinkingBudget: 0 })
    expect(config.maxOutputTokens).toBeGreaterThanOrEqual(400)
    expect(config.responseSchema).toBeDefined()
  })

  it("drops blank and overlong titles and caps the list at five", async () => {
    fetchMock.mockResolvedValue(
      geminiReply({
        summary: "A busy board",
        suggestions: ["One", "  ", "Two", "x".repeat(101), "Three", "Four", "Five", "Six"],
      }),
    )

    const data = await (await POST(extractRequest(validBody()))).json()

    expect(data.suggestions).toEqual(["One", "Two", "Three", "Four", "Five"])
  })

  it("explains itself when the screenshot holds no recognisable task", async () => {
    fetchMock.mockResolvedValue(
      geminiReply({ summary: "A desktop wallpaper, no task visible", suggestions: [] }),
    )

    const data = await (await POST(extractRequest(validBody()))).json()

    expect(data.suggestions).toEqual([])
    expect(data.summary).toBe("A desktop wallpaper, no task visible")
  })

  it("salvages titles from a reply that was cut short", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: '{"summary":"A card","suggestions":["Fix Login Redirect","Audit Se' }] },
              finishReason: "MAX_TOKENS",
            },
          ],
        }),
        { status: 200 },
      ),
    )

    const data = await (await POST(extractRequest(validBody()))).json()

    expect(data.suggestions).toContain("Fix Login Redirect")
  })

  it("degrades gracefully when no Gemini key is configured", async () => {
    delete process.env.GEMINI_API_KEY

    const res = await POST(extractRequest(validBody()))
    const data = await res.json()

    // 200, not 5xx: the feature is optional and the user can still type a title.
    expect(res.status).toBe(200)
    expect(data.suggestions).toEqual([])
    expect(data.error).toMatch(/GEMINI_API_KEY/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects a data-URL prefix instead of forwarding it to Gemini", async () => {
    const res = await POST(
      extractRequest(validBody({ image: { mimeType: "image/jpeg", data: `data:image/jpeg;base64,${PIXEL}` } })),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/base64/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects a mime type outside the allowed raster set", async () => {
    const res = await POST(
      extractRequest(validBody({ image: { mimeType: "image/svg+xml", data: PIXEL } })),
    )

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("names the size limit rather than saying 'invalid request body'", async () => {
    const res = await POST(
      extractRequest(validBody({ image: { mimeType: "image/png", data: "A".repeat(2_100_004) } })),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too large/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("keeps the screenshot out of the server log when Gemini fails", async () => {
    fetchMock.mockResolvedValue(new Response("upstream exploded", { status: 500 }))

    const res = await POST(extractRequest(validBody()))

    expect(res.status).toBe(502)
    const logged = errorSpy.mock.calls.flat().join(" ")
    expect(logged).not.toContain(PIXEL)
  })

  it("tells the user to retry when the model times out", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("timed out"), { name: "TimeoutError" }))

    const res = await POST(extractRequest(validBody()))

    expect(res.status).toBe(504)
    expect((await res.json()).error).toMatch(/too long/i)
  })

  it("rate limits a user who pastes screenshot after screenshot", async () => {
    // A Response body reads once, so each call needs its own instance.
    fetchMock.mockImplementation(async () => geminiReply({ summary: "A card", suggestions: ["Ship It"] }))

    // The limit is 10/min per user, and this test keeps one user for all of them.
    for (let i = 0; i < 10; i += 1) {
      expect((await POST(extractRequest(validBody()))).status).toBe(200)
    }

    const res = await POST(extractRequest(validBody()))

    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBeTruthy()
  })
})
