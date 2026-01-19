"use client"

import type React from "react"

import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { MessageCircle, Trash2, Plus, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function ChatHistorySidebar() {
  const {
    chatSessions,
    currentChatSessionId,
    createNewChatSession,
    loadChatSession,
    deleteChatSession,
    saveCurrentChatSession,
  } = useAppStore()

  const handleNewChat = () => {
    // Save current session before creating a new one
    saveCurrentChatSession()
    createNewChatSession()
  }

  const handleLoadSession = (sessionId: string) => {
    // Save current session first
    saveCurrentChatSession()
    // Then load the selected session
    loadChatSession(sessionId)
  }

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    deleteChatSession(sessionId)
  }

  return (
    <div className="hidden lg:flex flex-col w-64 bg-background border-r border-border h-screen" data-chat-sidebar>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="size-5 text-primary" />
          <h2 className="font-semibold text-foreground">Chat History</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs bg-transparent transition-all hover:bg-primary/10"
          onClick={handleNewChat}
        >
          <Plus className="size-3.5 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {chatSessions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            <p>No chat history yet</p>
            <p className="text-xs mt-1">Start a conversation to see it here</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {chatSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleLoadSession(session.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg text-sm transition-colors group",
                  "hover:bg-secondary/50 text-foreground",
                  currentChatSessionId === session.id ? "bg-primary/10 text-primary" : "",
                )}
              >
                <p className="font-medium truncate">{session.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{session.messages.length} messages</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                      title="Delete session"
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </button>
                    <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer - removed Clear All History as it's now less relevant with session management */}
      <div className="p-4 border-t border-border text-xs text-muted-foreground text-center">
        {chatSessions.length} session{chatSessions.length !== 1 ? "s" : ""}
      </div>
    </div>
  )
}
