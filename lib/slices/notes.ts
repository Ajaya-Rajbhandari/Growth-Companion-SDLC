import type { StateCreator } from "zustand"
import { supabase } from "../supabase"
import { mapNoteFromDb, throwSupabaseError, type DbNote } from "../mappers"
import type { Note } from "../types"
import type { AppState } from "./index"

export interface NotesSlice {
  notes: Note[]

  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => Promise<void>
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  getNotesSummary: () => { total: number; recent: Note[] }
}

export const createNotesSlice: StateCreator<
  AppState,
  [["zustand/persist", unknown]],
  [],
  NotesSlice
> = (set, get) => ({
  notes: [
    {
      id: "1",
      title: "Meeting Notes",
      content: "Discussed Q1 goals and roadmap priorities. Key action items: finalize specs, review budget.",
      category: "work",
      tags: ["Q1", "roadmap"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "Ideas",
      content: "New feature concepts for the dashboard. Consider adding analytics widgets and custom themes.",
      category: "ideas",
      tags: ["dashboard", "features"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],

  addNote: async (note) => {
    const { user } = get()
    if (!user) return

    const { data, error } = await supabase.from("notes").insert({
      title: note.title,
      content: note.content,
      category: note.category || "other",
      tags: note.tags || [],
      user_id: user.id,
    }).select().single()

    if (error) {
      const errorMessage = error.message || JSON.stringify(error)
      throw new Error(`Failed to create note: ${errorMessage}`)
    }
    if (data) {
      set((state) => ({
        notes: [mapNoteFromDb(data as DbNote), ...state.notes],
      }))
    }
  },
  updateNote: async (id, updates) => {
    const { data, error } = await supabase.from("notes").update({
      title: updates.title,
      content: updates.content,
      category: updates.category,
      tags: updates.tags,
      updated_at: new Date().toISOString()
    }).eq("id", id).select().single()

    if (error) throwSupabaseError(error, "Failed to update note")
    if (data) {
      const mappedNote = mapNoteFromDb(data as DbNote)
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? mappedNote : n)),
      }))
    }
  },
  deleteNote: async (id) => {
    const { error } = await supabase.from("notes").delete().eq("id", id)
    if (error) throwSupabaseError(error, "Failed to delete note")
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    }))
  },

  getNotesSummary: () => {
    const state = get()
    const sortedNotes = [...state.notes].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    return {
      total: state.notes.length,
      recent: sortedNotes.slice(0, 3),
    }
  },
})
