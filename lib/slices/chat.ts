import type { StateCreator } from "zustand"
import { supabase } from "../supabase"
import type { ChatMessage, ChatSession } from "../types"
import type { AppState } from "./index"

export interface ChatSlice {
  chatMessages: ChatMessage[]
  chatSessions: ChatSession[]
  currentChatSessionId: string | null
  isChatOpen: boolean

  setChatMessages: (messages: ChatMessage[]) => void
  addChatMessage: (message: ChatMessage) => void
  updateLastChatMessage: (updates: Partial<ChatMessage>) => void
  toggleChat: () => void
  setIsChatOpen: (open: boolean) => void
  clearChatHistory: () => void
  createNewChatSession: () => void
  saveCurrentChatSession: () => void
  loadChatSession: (sessionId: string) => void
  deleteChatSession: (sessionId: string) => void
}

export const createChatSlice: StateCreator<
  AppState,
  [["zustand/persist", unknown]],
  [],
  ChatSlice
> = (set, get) => ({
  chatMessages: [],
  chatSessions: [],
  currentChatSessionId: null,
  isChatOpen: false,

  setChatMessages: (messages) => set({ chatMessages: messages }),
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  updateLastChatMessage: (updates) =>
    set((state) => {
      const messages = [...state.chatMessages]
      if (messages.length > 0) {
        messages[messages.length - 1] = { ...messages[messages.length - 1], ...updates }
      }
      return { chatMessages: messages }
    }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setIsChatOpen: (open) => set({ isChatOpen: open }),
  clearChatHistory: () => set({ chatMessages: [] }),

  createNewChatSession: () => {
    // Generate a proper UUID v4
    const newSessionId = crypto.randomUUID()
    set({
      currentChatSessionId: newSessionId,
      chatMessages: [],
    })
  },

  saveCurrentChatSession: async () => {
    const { currentChatSessionId, chatMessages, user, chatSessions } = get()
    if (!currentChatSessionId || chatMessages.length === 0 || !user) {
      return
    }

    const firstUserMessage = chatMessages.find((m) => m.role === "user")
    const title = firstUserMessage ? firstUserMessage.content.substring(0, 50) : "Untitled Chat"

    // Only use currentChatSessionId if it's a valid UUID format
    // If it's not (e.g., old timestamp-based ID), generate a new UUID
    const sessionId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentChatSessionId)
      ? currentChatSessionId
      : crypto.randomUUID()

    const sessionData = {
      id: sessionId,
      title,
      messages: chatMessages,
      user_id: user.id,
      updated_at: new Date().toISOString()
    }

    // Check if session exists in local state
    const existingSession = chatSessions.find((s) => s.id === sessionId)

    // Also check database to handle cases where local state might be out of sync
    const { data: dbSession } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .single()

    const sessionExists = existingSession || dbSession

    if (sessionExists) {
      // Update existing session
      const { error } = await supabase
        .from("chat_sessions")
        .update(sessionData)
        .eq("id", sessionId)

      if (error) {
        const errorMessage = error.message || JSON.stringify(error)
        throw new Error(`Failed to update chat session: ${errorMessage}`)
      }
    } else {
      // Insert new session
      const { error } = await supabase
        .from("chat_sessions")
        .insert(sessionData)
        .select()
        .single()

      // If we get a duplicate key error, the session was created between our check and insert
      // Fall back to updating it instead
      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
          // Session was created concurrently, update it instead
          const { error: updateError } = await supabase
            .from("chat_sessions")
            .update(sessionData)
            .eq("id", sessionId)

          if (updateError) {
            const errorMessage = updateError.message || JSON.stringify(updateError)
            throw new Error(`Failed to update chat session: ${errorMessage}`)
          }
        } else {
          const errorMessage = error.message || JSON.stringify(error)
          throw new Error(`Failed to create chat session: ${errorMessage}`)
        }
      }

      // Update the current session ID if we generated a new one
      if (sessionId !== currentChatSessionId) {
        set({ currentChatSessionId: sessionId })
      }
    }

    await get().fetchInitialData()
  },

  loadChatSession: (sessionId: string) => {
    set((state) => {
      const session = state.chatSessions.find((s) => s.id === sessionId)
      if (session) {
        return {
          currentChatSessionId: sessionId,
          chatMessages: session.messages,
        }
      }
      return state
    })
  },

  deleteChatSession: (sessionId: string) => {
    set((state) => {
      const newSessions = state.chatSessions.filter((s) => s.id !== sessionId)
      return {
        chatSessions: newSessions,
        currentChatSessionId: state.currentChatSessionId === sessionId ? null : state.currentChatSessionId,
        chatMessages: state.currentChatSessionId === sessionId ? [] : state.chatMessages,
      }
    })
  },
})
