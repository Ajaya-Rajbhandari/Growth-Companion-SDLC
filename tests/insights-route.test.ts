import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/auth", () => ({
  getAuthenticatedUser: vi.fn(async () => ({ id: "insights-test-user" })),
}))

import { POST } from "@/app/api/insights/route"

const METRICS = {
  weekHours: 102.5,
  daysWorked: 6,
  daysOnTarget: 3,
  targetHours: 8,
  avgHoursPerDay: 17.1,
  tasksCompleted: 5,
  tasksPending: 0,
  tasksOverdue: 0,
  tasksCreatedThisWeek: 2,
  habitConsistencyPct: 0,
  activeGoals: 1,
  avgGoalProgress: 52,
  goalsNearingDeadline: 0,
}

function insightsRequest() {
  return new Request("http://localhost/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metrics: METRICS }),
  })
}

function geminiReply(text: string, finishReason = "STOP") {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )
}

function sentGenerationConfig(fetchMock: ReturnType<typeof vi.fn>) {
  const init = fetchMock.mock.calls[0][1] as RequestInit
  return JSON.parse(init.body as string).generationConfig
}

describe("/api/insights", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key"
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // Gemini 2.5 bills thinking tokens against maxOutputTokens. The route once sent
  // a 400-token cap with thinking on, so ~380 went to thinking and the JSON came
  // back cut off at '{"insight":' — which threw and surfaced as a generic error.
  it("disables thinking and leaves room for the reply", async () => {
    fetchMock.mockResolvedValue(geminiReply(JSON.stringify({ insight: "Nice week", suggestions: [] })))

    await POST(insightsRequest())

    const config = sentGenerationConfig(fetchMock)
    expect(config.thinkingConfig).toEqual({ thinkingBudget: 0 })
    expect(config.maxOutputTokens).toBeGreaterThanOrEqual(800)
  })

  it("returns insight and suggestions from a complete reply", async () => {
    fetchMock.mockResolvedValue(
      geminiReply(
        JSON.stringify({
          insight: "102.5 hours is a big week.",
          suggestions: ["Take a rest day", "Log a habit", 42],
        }),
      ),
    )

    const response = await POST(insightsRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      insight: "102.5 hours is a big week.",
      suggestions: ["Take a rest day", "Log a habit"],
    })
  })

  it("fails cleanly when the reply is truncated mid-JSON", async () => {
    fetchMock.mockResolvedValue(geminiReply('{\n  "insight":', "MAX_TOKENS"))

    const response = await POST(insightsRequest())

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) })
  })

  it("fails cleanly when the model returns no text at all", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS" }] }), { status: 200 }),
    )

    const response = await POST(insightsRequest())

    expect(response.status).toBe(502)
  })
})
