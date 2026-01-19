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

describe("Notes Store", () => {
  beforeEach(() => {
    useAppStore.setState({
      notes: [],
      user: { id: "test-user", name: "Test User", email: "test@example.com", createdAt: new Date().toISOString() },
      isLoggedIn: true,
    })
  })

  describe("addNote", () => {
    it("should create a note with all properties", async () => {
      const { addNote } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "note-1",
              title: "Test Note",
              content: "Test content",
              category: "work",
              tags: ["test", "important"],
              user_id: "test-user",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await addNote({
        title: "Test Note",
        content: "Test content",
        category: "work",
        tags: ["test", "important"],
      })

      const { notes } = useAppStore.getState()
      expect(notes.length).toBeGreaterThan(0)
      expect(notes[0]?.title).toBe("Test Note")
    })

    it("should handle empty note title", async () => {
      const { addNote } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: { message: "Title is required" },
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await expect(
        addNote({
          title: "",
          content: "Content",
        }),
      ).rejects.toThrow()
    })

    it("should handle empty note content", async () => {
      const { addNote } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: { message: "Content is required" },
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await expect(
        addNote({
          title: "Title",
          content: "",
        }),
      ).rejects.toThrow()
    })

    it("should handle notes with special characters", async () => {
      const { addNote } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "note-1",
              title: "Note with <script> & special chars",
              content: "Content with 'quotes' and \"double quotes\"",
              category: "work",
              tags: [],
              user_id: "test-user",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await addNote({
        title: "Note with <script> & special chars",
        content: "Content with 'quotes' and \"double quotes\"",
        category: "work",
      })

      const { notes } = useAppStore.getState()
      expect(notes[0]?.title).toContain("special chars")
    })
  })

  describe("updateNote", () => {
    it("should update note properties", async () => {
      const { addNote, updateNote } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      // Add note first
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "note-1",
              title: "Original Title",
              content: "Original content",
              category: "work",
              tags: [],
              user_id: "test-user",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      }))
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null,
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: noteId,
                title: "Updated Title",
                content: "Updated content",
                category: "personal",
                tags: [],
                user_id: "test-user",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
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

      await addNote({
        title: "Original Title",
        content: "Original content",
        category: "work",
      })

      const { notes } = useAppStore.getState()
      const noteId = notes[0]?.id

      if (noteId) {
        await updateNote(noteId, {
          title: "Updated Title",
          content: "Updated content",
          category: "personal",
        })

        const updatedNotes = useAppStore.getState().notes
        const updatedNote = updatedNotes.find((n) => n.id === noteId)
        expect(updatedNote?.title).toBe("Updated Title")
        expect(updatedNote?.category).toBe("personal")
      }
    })
  })

  describe("deleteNote", () => {
    it("should delete a note", async () => {
      const { addNote, deleteNote } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "note-1",
              title: "Test Note",
              content: "Content",
              category: "work",
              tags: [],
              user_id: "test-user",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
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

      await addNote({
        title: "Test Note",
        content: "Content",
      })

      const { notes } = useAppStore.getState()
      const noteId = notes[0]?.id

      if (noteId) {
        await deleteNote(noteId)
        const remainingNotes = useAppStore.getState().notes
        expect(remainingNotes.find((n) => n.id === noteId)).toBeUndefined()
      }
    })
  })

  describe("Edge Cases", () => {
    it("should handle notes with many tags", async () => {
      const { addNote } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag-${i}`)
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "note-1",
              title: "Note with many tags",
              content: "Content",
              category: "work",
              tags: manyTags,
              user_id: "test-user",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await addNote({
        title: "Note with many tags",
        content: "Content",
        tags: manyTags,
      })

      const { notes } = useAppStore.getState()
      expect(notes[0]?.tags?.length).toBe(50)
    })

    it("should handle very long note content", async () => {
      const { addNote } = useAppStore.getState()
      const { supabase } = await import("@/lib/supabase")
      
      const longContent = "A".repeat(10000)
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: "note-1",
              title: "Long Note",
              content: longContent,
              category: "work",
              tags: [],
              user_id: "test-user",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      }))
      ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

      await addNote({
        title: "Long Note",
        content: longContent,
      })

      const { notes } = useAppStore.getState()
      expect(notes[0]?.content.length).toBe(10000)
    })
  })
})
