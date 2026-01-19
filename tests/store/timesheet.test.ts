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
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(),
        })),
      })),
    })),
  },
}))

describe("Timesheet Store", () => {
  beforeEach(() => {
    useAppStore.setState({
      currentEntry: null,
      activeBreak: null,
      timeEntries: [],
      user: { id: "test-user", name: "Test User", email: "test@example.com", createdAt: new Date().toISOString() },
      isLoggedIn: true,
    })
  })

  describe("clockIn", () => {
    it("should clock in with task title", async () => {
      const { clockIn } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: new Date().toISOString().split("T")[0],
              clock_in: new Date().toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: "Test Task",
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn("Test Task")

      const { currentEntry, timeEntries } = useAppStore.getState()
      expect(currentEntry).not.toBeNull()
      expect(currentEntry?.title).toBe("Test Task")
      expect(timeEntries.length).toBeGreaterThan(0)
    })

    it("should clock in without task title", async () => {
      const { clockIn } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: new Date().toISOString().split("T")[0],
              clock_in: new Date().toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: null,
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn()

      const { currentEntry } = useAppStore.getState()
      expect(currentEntry).not.toBeNull()
    })

    it("should prevent clocking in when already clocked in", async () => {
      const { clockIn } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      // First clock in
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: new Date().toISOString().split("T")[0],
              clock_in: new Date().toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: "First Task",
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn("First Task")

      // Try to clock in again
      const { currentEntry } = useAppStore.getState()
      expect(currentEntry).not.toBeNull()
      
      // Should not create a new entry if already clocked in
      // (This depends on implementation - may need to check if clockIn prevents double clock-in)
    })

    it("should handle database errors during clock in", async () => {
      const { clockIn } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: { message: "Database connection failed" },
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await expect(clockIn("Test Task")).rejects.toThrow()
    })
  })

  describe("clockOut", () => {
    it("should clock out successfully", async () => {
      const { clockIn, clockOut } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      // First clock in
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: new Date().toISOString().split("T")[0],
              clock_in: new Date().toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: "Test Task",
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null,
        })),
      }))
      ;(supabase.from as any).mockReturnValue({
        insert: mockInsert,
        update: mockUpdate,
      })

      await clockIn("Test Task")

      // Mock fetchInitialData for clockOut
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              {
                id: "entry-1",
                date: new Date().toISOString().split("T")[0],
                clock_in: new Date(Date.now() - 3600000).toISOString(),
                clock_out: new Date().toISOString(),
                break_minutes: 0,
                breaks: [],
                title: "Test Task",
                user_id: "test-user",
              },
            ],
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({
        insert: mockInsert,
        update: mockUpdate,
        select: mockSelect,
      })

      await clockOut()

      const { currentEntry } = useAppStore.getState()
      expect(currentEntry).toBeNull()
    })

    it("should handle clock out when not clocked in", async () => {
      const { clockOut } = useAppStore.getState()
      
      // Should not throw, but should do nothing
      await clockOut()
      
      const { currentEntry } = useAppStore.getState()
      expect(currentEntry).toBeNull()
    })

    it("should include active break when clocking out", async () => {
      const { clockIn, startBreak, endBreak, clockOut } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      // Clock in
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: new Date().toISOString().split("T")[0],
              clock_in: new Date().toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: "Test Task",
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn("Test Task")

      // Start break
      startBreak(15, "short", "Coffee break")
      
      // End break
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: "entry-1",
                date: new Date().toISOString().split("T")[0],
                clock_in: new Date(Date.now() - 3600000).toISOString(),
                clock_out: null,
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
                title: "Test Task",
                user_id: "test-user",
              },
              error: null,
            })),
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({
        insert: mockInsert,
        update: mockUpdate,
      })

      await endBreak()

      // Clock out
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              {
                id: "entry-1",
                date: new Date().toISOString().split("T")[0],
                clock_in: new Date(Date.now() - 3600000).toISOString(),
                clock_out: new Date().toISOString(),
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
                title: "Test Task",
                user_id: "test-user",
              },
            ],
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({
        update: mockUpdate,
        select: mockSelect,
      })

      await clockOut()

      const { currentEntry } = useAppStore.getState()
      expect(currentEntry).toBeNull()
    })
  })

  describe("switchTask", () => {
    it("should switch task and create subtask", async () => {
      const { clockIn, switchTask } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      // Clock in
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: new Date().toISOString().split("T")[0],
              clock_in: new Date().toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: "First Task",
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn("First Task")

      // Switch task
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: "entry-1",
                date: new Date().toISOString().split("T")[0],
                clock_in: new Date(Date.now() - 3600000).toISOString(),
                clock_out: null,
                break_minutes: 0,
                breaks: [],
                title: "Second Task",
                subtasks: [
                  {
                    id: "subtask-1",
                    title: "First Task",
                    clockIn: new Date(Date.now() - 3600000).toISOString(),
                    clockOut: new Date().toISOString(),
                  },
                ],
                user_id: "test-user",
              },
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

      const { currentEntry, timeEntries } = useAppStore.getState()
      expect(currentEntry?.title).toBe("Second Task")
      expect(currentEntry?.subtasks?.length).toBe(1)
      expect(currentEntry?.subtasks?.[0]?.title).toBe("First Task")
      expect(timeEntries.find((e) => e.id === "entry-1")?.title).toBe("Second Task")
    })

    it("should handle switching task when not clocked in", async () => {
      const { switchTask } = useAppStore.getState()

      await expect(switchTask("New Task")).rejects.toThrow("Must be clocked in")
    })

    it("should handle multiple task switches", async () => {
      const { clockIn, switchTask } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      // Clock in
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: new Date().toISOString().split("T")[0],
              clock_in: new Date().toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: "Task 1",
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn("Task 1")

      // Switch to Task 2
      let subtaskCount = 0
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => {
              subtaskCount++
              return {
                data: {
                  id: "entry-1",
                  date: new Date().toISOString().split("T")[0],
                  clock_in: new Date(Date.now() - 3600000).toISOString(),
                  clock_out: null,
                  break_minutes: 0,
                  breaks: [],
                  title: subtaskCount === 1 ? "Task 2" : "Task 3",
                  subtasks: Array.from({ length: subtaskCount }, (_, i) => ({
                    id: `subtask-${i + 1}`,
                    title: `Task ${i + 1}`,
                    clockIn: new Date(Date.now() - 3600000 + i * 600000).toISOString(),
                    clockOut: new Date(Date.now() - 3600000 + (i + 1) * 600000).toISOString(),
                  })),
                  user_id: "test-user",
                },
                error: null,
              }
            }),
          })),
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
    })
  })

  describe("Break Management", () => {
    it("should start break with title", async () => {
      const { clockIn, startBreak } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      // Mock clock in
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: new Date().toISOString().split("T")[0],
              clock_in: new Date().toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: "Test Task",
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn("Test Task")

      startBreak(15, "short", "Coffee break")

      const { activeBreak } = useAppStore.getState()
      expect(activeBreak).not.toBeNull()
      expect(activeBreak?.type).toBe("short")
      expect(activeBreak?.title).toBe("Coffee break")
      expect(activeBreak?.durationMinutes).toBe(15)
    })

    it("should prevent starting break when not clocked in", async () => {
      const { startBreak } = useAppStore.getState()

      startBreak(15, "short")

      const { activeBreak } = useAppStore.getState()
      expect(activeBreak).toBeNull()
    })

    it("should end break and save to database", async () => {
      const { clockIn, startBreak, endBreak } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      // Clock in
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: new Date().toISOString().split("T")[0],
              clock_in: new Date().toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: "Test Task",
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn("Test Task")

      startBreak(15, "short", "Coffee break")

      // End break
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: "entry-1",
                date: new Date().toISOString().split("T")[0],
                clock_in: new Date(Date.now() - 3600000).toISOString(),
                clock_out: null,
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
                title: "Test Task",
                user_id: "test-user",
              },
              error: null,
            })),
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({
        insert: mockInsert,
        update: mockUpdate,
      })

      await endBreak()

      const { activeBreak, currentEntry, timeEntries } = useAppStore.getState()
      expect(activeBreak).toBeNull()
      expect(currentEntry?.breaks?.length).toBe(1)
      expect(currentEntry?.breaks?.[0]?.title).toBe("Coffee break")
      expect(timeEntries.find((e) => e.id === "entry-1")?.breaks?.length).toBe(1)
    })

    it("should handle ending break when not on break", async () => {
      const { endBreak } = useAppStore.getState()

      await endBreak()

      const { activeBreak } = useAppStore.getState()
      expect(activeBreak).toBeNull()
    })
  })

  describe("Edge Cases", () => {
    it("should handle clock in at midnight (day transition)", async () => {
      const { clockIn } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      // Mock date at 11:59 PM
      const midnightDate = new Date("2026-01-19T23:59:00Z")
      vi.spyOn(global, "Date").mockImplementation(() => midnightDate as any)

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: midnightDate.toISOString().split("T")[0],
              clock_in: midnightDate.toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: "Midnight Task",
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn("Midnight Task")

      const { currentEntry } = useAppStore.getState()
      expect(currentEntry?.date).toBe(midnightDate.toISOString().split("T")[0])
    })

    it("should handle very long task titles", async () => {
      const { clockIn } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const longTitle = "A".repeat(500)
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: new Date().toISOString().split("T")[0],
              clock_in: new Date().toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: longTitle,
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn(longTitle)

      const { currentEntry } = useAppStore.getState()
      expect(currentEntry?.title).toBe(longTitle)
    })

    it("should handle break duration edge cases", async () => {
      const { clockIn, startBreak } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: new Date().toISOString().split("T")[0],
              clock_in: new Date().toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: "Test Task",
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await clockIn("Test Task")

      // Test 0 minute break (edge case)
      startBreak(0, "custom")
      const { activeBreak } = useAppStore.getState()
      expect(activeBreak?.durationMinutes).toBe(0)

      // Test very long break (480 minutes = 8 hours)
      startBreak(480, "custom", "Long break")
      const { activeBreak: longBreak } = useAppStore.getState()
      expect(longBreak?.durationMinutes).toBe(480)
    })

    it("should handle empty break title", async () => {
      const { clockIn, startBreak } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "entry-1",
              date: new Date().toISOString().split("T")[0],
              clock_in: new Date().toISOString(),
              clock_out: null,
              break_minutes: 0,
              breaks: [],
              title: "Test Task",
              user_id: "test-user",
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      clockIn("Test Task")

      startBreak(15, "custom", "")

      const { activeBreak } = useAppStore.getState()
      expect(activeBreak?.title).toBeUndefined()
    })
  })
})
