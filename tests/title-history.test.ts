import { describe, expect, it } from "vitest"
import { buildTitleHistory, matchTitleHistory, normalizeTitle } from "@/lib/title-history"
import type { TimeEntry } from "@/lib/types"

const NOW = new Date("2026-11-02T12:00:00Z")

function entry(
  date: string,
  title: string,
  subtasks: Array<[string, string, string]> = [],
  category?: string,
): TimeEntry {
  return {
    id: `e-${date}`,
    date,
    // Postgres returns timestamptz with "+00:00"; subtasks use toISOString().
    clockIn: `${date}T09:00:00+00:00`,
    clockOut: `${date}T17:00:00+00:00`,
    breakMinutes: 0,
    breaks: [],
    title,
    category,
    subtasks: subtasks.map(([t, from, to], i) => ({
      id: `s-${date}-${i}`,
      title: t,
      clockIn: `${date}T${from}:00.000Z`,
      clockOut: `${date}T${to}:00.000Z`,
    })),
  }
}

describe("buildTitleHistory", () => {
  it("offers the tasks switched away from, not only each day's final title", () => {
    const history = buildTitleHistory(
      [entry("2026-10-30", "Email", [["Payroll run", "09:00", "11:00"], ["Client call", "11:00", "13:00"]])],
      NOW,
    )
    expect(history.map((s) => s.title).sort()).toEqual(["Client call", "Email", "Payroll run"])
  })

  it("ranks this week's work above the oldest entries (timeEntries is newest-first)", () => {
    const history = buildTitleHistory(
      [entry("2026-10-31", "BAS lodgement"), entry("2026-03-01", "Old onboarding")],
      NOW,
    )
    expect(history[0].title).toBe("BAS lodgement")
  })

  it("lets frequency beat a single recent one-off", () => {
    const days = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"]
    const history = buildTitleHistory(
      [entry("2026-11-01", "Typo tset"), ...days.map((d) => entry(d, "Reconciliation"))],
      NOW,
    )
    expect(history[0]).toMatchObject({ title: "Reconciliation", count: 4 })
  })

  it("merges case and punctuation variants and keeps the latest spelling", () => {
    const history = buildTitleHistory(
      [entry("2026-11-01", "Code review"), entry("2026-10-01", "code review.")],
      NOW,
    )
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ title: "Code review", count: 2 })
  })

  it("compares times as instants across the two timestamp formats", () => {
    // 18:00+10:00 is 08:00Z: earlier than the 09:00Z subtask, though it sorts
    // later as a string.
    const offsetEntry = { ...entry("2026-10-30", "Standup"), clockIn: "2026-10-30T18:00:00+10:00" }
    const history = buildTitleHistory(
      [entry("2026-10-30", "Wrap up", [["standup", "09:00", "10:30"]]), offsetEntry],
      NOW,
    )
    expect(history.find((s) => normalizeTitle(s.title) === "standup")?.title).toBe("standup")
  })

  it("attaches the session category only to the title it was chosen for", () => {
    const history = buildTitleHistory(
      [entry("2026-10-30", "Later task", [["First task", "09:00", "12:00"]], "cat-1")],
      NOW,
    )
    expect(history.find((s) => s.title === "First task")?.category).toBe("cat-1")
    expect(history.find((s) => s.title === "Later task")?.category).toBeUndefined()
  })

  it("ignores blank titles", () => {
    expect(buildTitleHistory([entry("2026-10-30", "   ")], NOW)).toEqual([])
  })
})

describe("matchTitleHistory", () => {
  const history = buildTitleHistory(
    [
      entry("2026-11-01", "Client call - Smith"),
      entry("2026-10-31", "Payroll run"),
      entry("2026-10-30", "Weekly client report"),
      entry("2026-10-29", "Bookkeeping catch-up"),
    ],
    NOW,
  )

  it("returns the top ranked titles when nothing is typed", () => {
    expect(matchTitleHistory(history, "", { limit: 2 }).map((s) => s.title)).toEqual([
      "Client call - Smith",
      "Payroll run",
    ])
  })

  it("orders prefix matches before word matches before substrings", () => {
    const titles = (q: string) => matchTitleHistory(history, q).map((s) => s.title)
    expect(titles("cl")).toEqual(["Client call - Smith", "Weekly client report"])
    expect(titles("ook")).toEqual(["Bookkeeping catch-up"])
  })

  it("drops the title already typed and any excluded ones", () => {
    expect(matchTitleHistory(history, "payroll run")).toEqual([])
    expect(
      matchTitleHistory(history, "", { exclude: ["Client call - Smith", undefined] }).map((s) => s.title),
    ).not.toContain("Client call - Smith")
  })
})
