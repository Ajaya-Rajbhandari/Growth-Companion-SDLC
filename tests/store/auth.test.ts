import { beforeEach, describe, expect, it, vi } from "vitest"

const { signOut, from } = vi.hoisted(() => ({
  signOut: vi.fn(() => Promise.resolve({ error: null })),
  from: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { signOut },
    from,
  },
}))

import { useAppStore } from "@/lib/store"

function queryResult(data: unknown[] = [], error: { message: string } | null = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data, error })),
      })),
    })),
  }
}

describe("authentication data isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    from.mockImplementation(() => queryResult())
    useAppStore.setState({
      user: {
        id: "user-a",
        name: "User A",
        email: "a@example.com",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      isLoggedIn: true,
      authInitialized: true,
      initialDataStatus: "ready",
      initialDataError: "",
      initialDataLoaded: true,
      tasks: [],
      notes: [],
      timeEntries: [],
      workTemplates: [],
      timeCategories: [],
      goals: [],
      habits: [],
      habitLogs: [],
      chatMessages: [],
      chatSessions: [],
      currentChatSessionId: null,
      currentEntry: null,
      activeBreak: null,
    })
  })

  it("clears every user-scoped domain when signing out", async () => {
    useAppStore.setState({
      tasks: [{ id: "task", title: "Private", completed: false, priority: "high", createdAt: "now" }],
      notes: [{ id: "note", title: "Private", content: "Secret", createdAt: "now", updatedAt: "now" }],
      timeEntries: [{ id: "entry", date: "2026-01-01", clockIn: "now", breakMinutes: 0, breaks: [] }],
      workTemplates: [{ id: "template", title: "Private", usageCount: 1, createdAt: "now" }],
      timeCategories: [{ id: "category", name: "Private", color: "#000", createdAt: "now" }],
      goals: [{
        id: "goal",
        title: "Private",
        progress: 0,
        status: "active",
        milestones: [],
        createdAt: "now",
        updatedAt: "now",
      }],
      habits: [{
        id: "habit",
        title: "Private",
        frequency: "daily",
        targetCount: 1,
        color: "#000",
        createdAt: "now",
        updatedAt: "now",
      }],
      habitLogs: [{ id: "log", habitId: "habit", date: "2026-01-01", count: 1, createdAt: "now" }],
      chatMessages: [{ id: "message", role: "user", content: "Private" }],
      chatSessions: [{
        id: "session",
        title: "Private",
        messages: [],
        createdAt: "now",
        updatedAt: "now",
      }],
    })

    await useAppStore.getState().logout()

    const state = useAppStore.getState()
    expect(signOut).toHaveBeenCalledOnce()
    expect(state.user).toBeNull()
    expect(state.isLoggedIn).toBe(false)
    expect(state.initialDataStatus).toBe("idle")
    expect([
      state.tasks,
      state.notes,
      state.timeEntries,
      state.workTemplates,
      state.timeCategories,
      state.goals,
      state.habits,
      state.habitLogs,
      state.chatMessages,
      state.chatSessions,
    ]).toEqual([[], [], [], [], [], [], [], [], [], []])
  })

  it("persists only account-neutral UI state", () => {
    useAppStore.setState({
      activeView: "notes",
      tasks: [{ id: "task", title: "Private", completed: false, priority: "high", createdAt: "now" }],
    })

    const persisted = JSON.parse(localStorage.getItem("app-store") || "{}")
    expect(persisted.state).toEqual({ activeView: "notes" })
  })

  it("surfaces partial hydration failures instead of silently showing empty data", async () => {
    from.mockImplementation((table: string) =>
      queryResult([], table === "goals" ? { message: "goals table unavailable" } : null),
    )

    await useAppStore.getState().fetchInitialData()

    const state = useAppStore.getState()
    expect(state.initialDataLoaded).toBe(true)
    expect(state.initialDataStatus).toBe("error")
    expect(state.initialDataError).toContain("goals table unavailable")
  })

  it("restores an unfinished break from the persisted time entry", async () => {
    const breakStart = "2026-01-01T10:00:00.000Z"
    from.mockImplementation((table: string) =>
      queryResult(
        table === "time_entries"
          ? [{
              id: "entry-1",
              date: "2026-01-01",
              clock_in: "2026-01-01T09:00:00.000Z",
              clock_out: null,
              break_minutes: 0,
              breaks: [
                { id: "break-done", startTime: "2026-01-01T09:30:00.000Z", endTime: "2026-01-01T09:40:00.000Z", type: "short" },
                { id: "break-open", startTime: breakStart, type: "lunch", durationMinutes: 30 },
              ],
              title: "Deep work",
            }]
          : [],
      ),
    )

    await useAppStore.getState().fetchInitialData()

    const state = useAppStore.getState()
    expect(state.currentEntry?.id).toBe("entry-1")
    expect(state.activeBreak?.id).toBe("break-open")
    expect(state.activeBreak?.startTime).toBe(breakStart)
  })

  it("leaves the break inactive when every persisted break is finished", async () => {
    from.mockImplementation((table: string) =>
      queryResult(
        table === "time_entries"
          ? [{
              id: "entry-1",
              date: "2026-01-01",
              clock_in: "2026-01-01T09:00:00.000Z",
              clock_out: null,
              break_minutes: 10,
              breaks: [
                { id: "break-done", startTime: "2026-01-01T09:30:00.000Z", endTime: "2026-01-01T09:40:00.000Z", type: "short" },
              ],
              title: "Deep work",
            }]
          : [],
      ),
    )

    await useAppStore.getState().fetchInitialData()

    expect(useAppStore.getState().currentEntry?.id).toBe("entry-1")
    expect(useAppStore.getState().activeBreak).toBeNull()
  })

  it("ignores stale hydration results after an account switch", async () => {
    let resolveTasks!: (value: { data: unknown[]; error: null }) => void
    const pendingTasks = new Promise<{ data: unknown[]; error: null }>((resolve) => {
      resolveTasks = resolve
    })

    from.mockImplementation((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => table === "tasks" ? pendingTasks : Promise.resolve({ data: [], error: null })),
        })),
      })),
    }))

    const hydration = useAppStore.getState().fetchInitialData()
    useAppStore.getState().setUser({
      id: "user-b",
      name: "User B",
      email: "b@example.com",
      createdAt: "2026-01-02T00:00:00.000Z",
    })
    resolveTasks({
      data: [{
        id: "task-a",
        title: "User A private task",
        completed: false,
        priority: "high",
        urgency: "medium",
        due_date: null,
        created_at: "2026-01-01T00:00:00.000Z",
      }],
      error: null,
    })
    await hydration

    expect(useAppStore.getState().user?.id).toBe("user-b")
    expect(useAppStore.getState().tasks).toEqual([])
  })
})
