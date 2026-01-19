import { describe, it, expect, beforeEach, vi } from "vitest"
import { useAppStore } from "@/lib/store"

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(),
        })),
      })),
    })),
  },
}))

describe("Timesheet Workflow Integration Tests", () => {
  beforeEach(() => {
    useAppStore.setState({
      currentEntry: null,
      activeBreak: null,
      timeEntries: [],
      user: { id: "test-user", name: "Test User", email: "test@example.com", createdAt: new Date().toISOString() },
      isLoggedIn: true,
    })
  })

  describe("Complete Work Session Workflow", () => {
    it("should complete full workflow: clock in → switch task → take break → clock out", async () => {
      const { clockIn, switchTask, startBreak, endBreak, clockOut } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      let entryData: any = {
        id: "entry-1",
        date: new Date().toISOString().split("T")[0],
        clock_in: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        clock_out: null,
        break_minutes: 0,
        breaks: [],
        title: "Initial Task",
        subtasks: [],
        user_id: "test-user",
      }

      // Clock in
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { ...entryData },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn("Initial Task")

      // Switch task
      entryData = {
        ...entryData,
        title: "Second Task",
        subtasks: [
          {
            id: "subtask-1",
            title: "Initial Task",
            clockIn: entryData.clock_in,
            clockOut: new Date().toISOString(),
          },
        ],
      }

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: entryData,
              error: null,
            })),
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({
        insert: mockInsert,
        update: mockUpdate,
      })

      await switchTask("Second Task")

      // Start break
      startBreak(15, "short", "Coffee break")

      // End break
      entryData = {
        ...entryData,
        break_minutes: 15,
        breaks: [
          {
            id: "break-1",
            startTime: new Date(Date.now() - 900000).toISOString(),
            endTime: new Date().toISOString(),
            type: "short",
            title: "Coffee break",
          },
        ],
      }

      ;(supabase.from as any).mockReturnValue({
        insert: mockInsert,
        update: mockUpdate,
      })

      await endBreak()

      // Clock out
      entryData = {
        ...entryData,
        clock_out: new Date().toISOString(),
      }

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [entryData],
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({
        update: mockUpdate,
        select: mockSelect,
      })

      await clockOut()

      const { currentEntry, timeEntries } = useAppStore.getState()
      expect(currentEntry).toBeNull()
      expect(timeEntries.length).toBeGreaterThan(0)
      
      const completedEntry = timeEntries.find((e) => e.id === "entry-1")
      expect(completedEntry?.clockOut).toBeDefined()
      expect(completedEntry?.subtasks?.length).toBe(1)
      expect(completedEntry?.breaks?.length).toBe(1)
      expect(completedEntry?.breaks?.[0]?.title).toBe("Coffee break")
    })
  })

  describe("Multiple Task Switches Workflow", () => {
    it("should handle multiple task switches in one session", async () => {
      const { clockIn, switchTask } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      let entryData: any = {
        id: "entry-1",
        date: new Date().toISOString().split("T")[0],
        clock_in: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        clock_out: null,
        break_minutes: 0,
        breaks: [],
        title: "Task 1",
        subtasks: [],
        user_id: "test-user",
      }

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: entryData,
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn("Task 1")

      // Switch to Task 2
      entryData = {
        ...entryData,
        title: "Task 2",
        subtasks: [
          {
            id: "subtask-1",
            title: "Task 1",
            clockIn: entryData.clock_in,
            clockOut: new Date().toISOString(),
          },
        ],
      }

      let updateCount = 0
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => {
            updateCount++
            if (updateCount === 1) {
              entryData = {
                ...entryData,
                title: "Task 2",
                subtasks: [
                  {
                    id: "subtask-1",
                    title: "Task 1",
                    clockIn: entryData.clock_in,
                    clockOut: new Date().toISOString(),
                  },
                ],
              }
            } else if (updateCount === 2) {
              entryData = {
                ...entryData,
                title: "Task 3",
                subtasks: [
                  {
                    id: "subtask-1",
                    title: "Task 1",
                    clockIn: entryData.clock_in,
                    clockOut: new Date(Date.now() - 3600000).toISOString(),
                  },
                  {
                    id: "subtask-2",
                    title: "Task 2",
                    clockIn: new Date(Date.now() - 3600000).toISOString(),
                    clockOut: new Date().toISOString(),
                  },
                ],
              }
            }
            return {
              single: vi.fn(() => ({
                data: entryData,
                error: null,
              })),
            }
          }),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({
        insert: mockInsert,
        update: mockUpdate,
      })

      await switchTask("Task 2")
      await switchTask("Task 3")

      const { currentEntry } = useAppStore.getState()
      expect(currentEntry?.title).toBe("Task 3")
      expect(currentEntry?.subtasks?.length).toBe(2)
      expect(currentEntry?.subtasks?.[0]?.title).toBe("Task 1")
      expect(currentEntry?.subtasks?.[1]?.title).toBe("Task 2")
    })
  })

  describe("Break Management Workflow", () => {
    it("should handle multiple breaks in one session", async () => {
      const { clockIn, startBreak, endBreak } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      let entryData: any = {
        id: "entry-1",
        date: new Date().toISOString().split("T")[0],
        clock_in: new Date(Date.now() - 10800000).toISOString(),
        clock_out: null,
        break_minutes: 0,
        breaks: [],
        title: "Test Task",
        user_id: "test-user",
      }

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: entryData,
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn("Test Task")

      // First break
      startBreak(15, "short", "Coffee break")
      
      entryData = {
        ...entryData,
        break_minutes: 15,
        breaks: [
          {
            id: "break-1",
            startTime: new Date(Date.now() - 900000).toISOString(),
            endTime: new Date().toISOString(),
            type: "short",
            title: "Coffee break",
          },
        ],
      }

      let breakCount = 0
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => {
          breakCount++
          if (breakCount === 1) {
            entryData = {
              ...entryData,
              break_minutes: 15,
              breaks: [
                {
                  id: "break-1",
                  startTime: new Date(Date.now() - 900000).toISOString(),
                  endTime: new Date().toISOString(),
                  type: "short",
                  title: "Coffee break",
                },
              ],
            }
          } else if (breakCount === 2) {
            entryData = {
              ...entryData,
              break_minutes: 75, // 15 + 60
              breaks: [
                {
                  id: "break-1",
                  startTime: new Date(Date.now() - 5400000).toISOString(),
                  endTime: new Date(Date.now() - 3600000).toISOString(),
                  type: "short",
                  title: "Coffee break",
                },
                {
                  id: "break-2",
                  startTime: new Date(Date.now() - 3600000).toISOString(),
                  endTime: new Date().toISOString(),
                  type: "lunch",
                  title: "Lunch break",
                },
              ],
            }
          }
          return {
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: entryData,
                error: null,
              })),
            })),
          }
        }),
      }))
      ;(supabase.from as any).mockReturnValue({
        insert: mockInsert,
        update: mockUpdate,
      })

      await endBreak()

      // Second break
      startBreak(60, "lunch", "Lunch break")
      await endBreak()

      const { currentEntry } = useAppStore.getState()
      expect(currentEntry?.breaks?.length).toBe(2)
      expect(currentEntry?.breakMinutes).toBe(75)
      expect(currentEntry?.breaks?.[0]?.title).toBe("Coffee break")
      expect(currentEntry?.breaks?.[1]?.title).toBe("Lunch break")
    })
  })
})
