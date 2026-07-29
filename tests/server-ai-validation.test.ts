import { describe, expect, it } from "vitest"
import {
  AssistantRequestSchema,
  InsightsRequestSchema,
  SuggestTaskTitlesRequestSchema,
} from "@/lib/server/schemas"
import { readJsonBody } from "@/lib/server/request"

describe("AI request validation", () => {
  it("bounds assistant history and message size", () => {
    expect(
      AssistantRequestSchema.safeParse({
        messages: Array.from({ length: 41 }, () => ({ role: "user", content: "hello" })),
      }).success,
    ).toBe(false)
    expect(
      AssistantRequestSchema.safeParse({
        messages: [{ role: "user", content: "x".repeat(4_001) }],
      }).success,
    ).toBe(false)
  })

  it("bounds assistant state collections", () => {
    expect(
      AssistantRequestSchema.safeParse({
        messages: [{ role: "user", content: "hello" }],
        appState: { tasks: Array.from({ length: 501 }, () => ({})) },
      }).success,
    ).toBe(false)
  })

  it("bounds title suggestion context", () => {
    expect(
      SuggestTaskTitlesRequestSchema.safeParse({
        draft: "x".repeat(201),
        recentTitles: [],
      }).success,
    ).toBe(false)
  })

  it("rejects invalid weekly metrics", () => {
    expect(
      InsightsRequestSchema.safeParse({
        metrics: {
          weekHours: 10,
          daysWorked: 8,
          daysOnTarget: 2,
          targetHours: 9,
          avgHoursPerDay: 5,
          tasksCompleted: 1,
          tasksPending: 1,
          tasksOverdue: 0,
          tasksCreatedThisWeek: 1,
          habitConsistencyPct: 50,
          activeGoals: 1,
          avgGoalProgress: 20,
          goalsNearingDeadline: 0,
        },
      }).success,
    ).toBe(false)
  })
})

describe("bounded JSON body parsing", () => {
  it("parses a valid JSON body", async () => {
    const result = await readJsonBody(
      new Request("http://localhost/test", {
        method: "POST",
        body: JSON.stringify({ value: 1 }),
      }),
      1_000,
    )
    expect(result).toEqual({ ok: true, data: { value: 1 } })
  })

  it("rejects malformed and oversized JSON bodies", async () => {
    const malformed = await readJsonBody(
      new Request("http://localhost/test", { method: "POST", body: "{" }),
      1_000,
    )
    expect(malformed).toMatchObject({ ok: false, status: 400 })

    const oversized = await readJsonBody(
      new Request("http://localhost/test", {
        method: "POST",
        body: JSON.stringify({ value: "x".repeat(100) }),
      }),
      32,
    )
    expect(oversized).toMatchObject({ ok: false, status: 413 })
  })
})
