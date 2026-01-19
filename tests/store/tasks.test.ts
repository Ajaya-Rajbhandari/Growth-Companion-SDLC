import { describe, it, expect, beforeEach, vi } from "vitest"
import { useAppStore } from "@/lib/store"
import type { Task } from "@/lib/store"

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
        eq: vi.fn(),
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

describe("Tasks Store", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      tasks: [],
      user: { id: "test-user", name: "Test User", email: "test@example.com", createdAt: new Date().toISOString() },
      isLoggedIn: true,
    })
  })

  describe("addTask", () => {
    it("should create a task with all properties", async () => {
      const { addTask } = useAppStore.getState()
      const taskData = {
        title: "Test Task",
        completed: false,
        priority: "high" as const,
        dueDate: "2026-01-20",
      }

      // Mock successful insert
      const { supabase } = await import("@/lib/supabase")
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "task-1",
              ...taskData,
              created_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await addTask(taskData)

      const { tasks } = useAppStore.getState()
      expect(tasks.length).toBeGreaterThan(0)
    })

    it("should handle empty task title", async () => {
      const { addTask } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const taskData = {
        title: "",
        completed: false,
        priority: "low" as const,
      }

      // Mock database error for empty title
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: { message: "Title cannot be empty" },
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await expect(addTask(taskData)).rejects.toThrow()
    })

    it("should handle database errors", async () => {
      const { addTask } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: { message: "Database error" },
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await expect(
        addTask({
          title: "Test Task",
          completed: false,
          priority: "medium",
        }),
      ).rejects.toThrow()
    })

    it("should handle very long task titles", async () => {
      const { addTask } = useAppStore.getState()
      const longTitle = "A".repeat(1000)
      const taskData = {
        title: longTitle,
        completed: false,
        priority: "low" as const,
      }

      // Should not throw, but may be limited by database
      const { supabase } = await import("@/lib/supabase")
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: "task-1", ...taskData, created_at: new Date().toISOString() },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await addTask(taskData)
    })
  })

  describe("toggleTask", () => {
    it("should toggle task completion status", async () => {
      const { addTask, toggleTask } = useAppStore.getState()
      
      // First add a task
      const { supabase } = await import("@/lib/supabase")
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "task-1",
              title: "Test Task",
              completed: false,
              priority: "high",
              created_at: new Date().toISOString(),
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

      await addTask({
        title: "Test Task",
        completed: false,
        priority: "high",
      })

      const { tasks } = useAppStore.getState()
      const taskId = tasks[0]?.id

      if (taskId) {
        await toggleTask(taskId, true)
        const updatedTasks = useAppStore.getState().tasks
        const updatedTask = updatedTasks.find((t) => t.id === taskId)
        expect(updatedTask?.completed).toBe(true)
      }
    })

    it("should handle toggling non-existent task", async () => {
      const { toggleTask } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          error: { message: "Task not found" },
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ update: mockUpdate })

      await expect(toggleTask("non-existent-id", true)).rejects.toThrow()
    })
  })

  describe("deleteTask", () => {
    it("should delete a task", async () => {
      const { addTask, deleteTask } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "task-1",
              title: "Test Task",
              completed: false,
              priority: "high",
              created_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      }))
      const mockDelete = vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null,
        })),
      }))
      ;(supabase.from as any).mockReturnValue({
        insert: mockInsert,
        delete: mockDelete,
      })

      await addTask({
        title: "Test Task",
        completed: false,
        priority: "high",
      })

      const { tasks } = useAppStore.getState()
      const taskId = tasks[0]?.id

      if (taskId) {
        await deleteTask(taskId)
        const remainingTasks = useAppStore.getState().tasks
        expect(remainingTasks.find((t) => t.id === taskId)).toBeUndefined()
      }
    })

    it("should handle deleting non-existent task", async () => {
      const { deleteTask } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      const mockDelete = vi.fn(() => ({
        eq: vi.fn(() => ({
          error: { message: "Task not found" },
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ delete: mockDelete })

      await expect(deleteTask("non-existent-id")).rejects.toThrow()
    })
  })

  describe("Edge Cases", () => {
    it("should handle multiple tasks with same title", async () => {
      const { addTask } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      let callCount = 0
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: `task-${++callCount}`,
              title: "Duplicate Title",
              completed: false,
              priority: "low",
              created_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await addTask({ title: "Duplicate Title", completed: false, priority: "low" })
      await addTask({ title: "Duplicate Title", completed: false, priority: "medium" })

      const { tasks } = useAppStore.getState()
      expect(tasks.filter((t) => t.title === "Duplicate Title").length).toBe(2)
    })

    it("should handle tasks with special characters in title", async () => {
      const { addTask } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "task-1",
              title: "Task with <script>alert('xss')</script> & special chars",
              completed: false,
              priority: "low",
              created_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await addTask({
        title: "Task with <script>alert('xss')</script> & special chars",
        completed: false,
        priority: "low",
      })

      const { tasks } = useAppStore.getState()
      expect(tasks[0]?.title).toContain("special chars")
    })
  })
})
