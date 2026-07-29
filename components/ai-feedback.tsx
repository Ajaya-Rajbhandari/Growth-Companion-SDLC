"use client"

import { useState } from "react"
import * as React from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useAppStore } from "@/lib/store"
import { toast } from "@/components/ui/use-toast"

interface AIFeedbackProps {
  messageId: string
  sessionId?: string | null
  className?: string
}

export function AIFeedback({ messageId, sessionId, className }: AIFeedbackProps) {
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingFeedbackId, setExistingFeedbackId] = useState<string | null>(null)
  // A thumb alone says a reply was bad but never why, which is all the admin
  // inbox could ever show. Offer an optional one-line reason after a thumbs-down.
  const [showReason, setShowReason] = useState(false)
  const [reason, setReason] = useState("")
  const [isSavingReason, setIsSavingReason] = useState(false)
  const user = useAppStore((state) => state.user)

  const saveReason = async () => {
    const text = reason.trim()
    if (!text || !existingFeedbackId) {
      setShowReason(false)
      return
    }
    setIsSavingReason(true)
    try {
      const { error } = await supabase
        .from("chat_feedback")
        .update({ feedback_text: text.slice(0, 500) })
        .eq("id", existingFeedbackId)
      if (error) throw new Error(error.message)

      setShowReason(false)
      setReason("")
      toast({ title: "Thanks — that helps", duration: 2000 })
    } catch (error) {
      toast({
        title: "Couldn't save your note",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setIsSavingReason(false)
    }
  }

  // Load existing feedback on mount
  React.useEffect(() => {
    if (!user || !messageId) return

    const loadExistingFeedback = async () => {
      try {
        const { data, error } = await supabase
          .from("chat_feedback")
          .select("id, feedback_type")
          .eq("user_id", user.id)
          .eq("message_id", messageId)
          .maybeSingle()

        if (!error && data) {
          setExistingFeedbackId(data.id)
          setFeedback(data.feedback_type as "positive" | "negative")
        }
      } catch (error) {
        // Silently fail - table might not exist yet
        console.debug("Could not load existing feedback:", error)
      }
    }

    loadExistingFeedback()
  }, [user, messageId])

  const handleFeedback = async (type: "positive" | "negative") => {
    if (!user) return

    // If clicking the same feedback again, remove it
    if (feedback === type) {
      // Delete existing feedback
      if (existingFeedbackId) {
        setIsSubmitting(true)
        try {
          const { error } = await supabase
            .from("chat_feedback")
            .delete()
            .eq("id", existingFeedbackId)

          if (!error) {
            setFeedback(null)
            setExistingFeedbackId(null)
            setShowReason(false)
            setReason("")
            toast({
              title: "Feedback removed",
              description: "Your feedback has been removed.",
              duration: 2000,
            })
          }
        } catch (error) {
          console.error("Failed to remove feedback:", error)
        } finally {
          setIsSubmitting(false)
        }
      } else {
        setFeedback(null)
      }
      return
    }

    setFeedback(type)
    setIsSubmitting(true)

    try {
      // Validate session_id format if provided (must be UUID)
      let validSessionId: string | null = null
      if (sessionId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(sessionId)) {
          validSessionId = sessionId
        } else {
          console.warn("Invalid session_id format, ignoring:", sessionId)
        }
      }

      const feedbackData = {
        user_id: user.id,
        message_id: messageId,
        session_id: validSessionId,
        feedback_type: type,
      }

      let data, error

      if (existingFeedbackId) {
        // Update existing feedback
        const { data: updateData, error: updateError } = await supabase
          .from("chat_feedback")
          .update({ feedback_type: type })
          .eq("id", existingFeedbackId)
          .select()
          .single()
        data = updateData
        error = updateError
      } else {
        // Insert new feedback
        const { data: insertData, error: insertError } = await supabase
          .from("chat_feedback")
          .insert(feedbackData)
          .select()
          .single()
        data = insertData
        error = insertError
        if (data) {
          setExistingFeedbackId(data.id)
        }
      }

      if (error) {
        // Provide more detailed error information
        const errorDetails = {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
        console.error("Failed to submit feedback - Supabase error:", errorDetails)
        
        // Check if it's a table not found error
        if (error.message?.includes("does not exist") || error.message?.includes("relation") || error.code === "42P01") {
          throw new Error("The feedback feature requires database setup. Please run the migration: migrations/005_add_ai_analytics.sql")
        }
        
        throw new Error(error.message || error.details || "Failed to submit feedback")
      }

      setShowReason(type === "negative")

      toast({
        title: "Feedback recorded",
        description: `Your ${type} feedback was saved.`,
        duration: 2000,
      })
    } catch (error) {
      console.error("Failed to submit feedback:", error)
      setFeedback(null)
      
      // Provide user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : "Failed to submit feedback. Please try again."
      
      toast({
        title: "Error",
        description: errorMessage.includes("database setup") || errorMessage.includes("migration")
          ? "Feedback feature requires database setup. Please contact support or check migrations."
          : errorMessage.includes("relation") || errorMessage.includes("does not exist")
          ? "Feedback feature is being set up. Please run the migration first."
          : errorMessage,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-8 rounded-lg",
          feedback === "positive" && "bg-green-500/10 text-green-600 dark:text-green-400"
        )}
        onClick={() => handleFeedback("positive")}
        disabled={isSubmitting}
        aria-label={feedback === "positive" ? "Remove helpful feedback" : "Mark response as helpful"}
        title="Helpful"
      >
        <ThumbsUp className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-8 rounded-lg",
          feedback === "negative" && "bg-red-500/10 text-red-600 dark:text-red-400"
        )}
        onClick={() => handleFeedback("negative")}
        disabled={isSubmitting}
        aria-label={feedback === "negative" ? "Remove not-helpful feedback" : "Mark response as not helpful"}
        title="Not helpful"
      >
        <ThumbsDown className="size-3.5" />
      </Button>
      </div>

      {showReason && (
        <div className="flex items-center gap-1.5">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveReason()
              if (e.key === "Escape") setShowReason(false)
            }}
            placeholder="What was wrong? (optional)"
            maxLength={500}
            className="h-8 text-xs"
            aria-label="Why was this reply not helpful?"
          />
          <Button size="sm" className="h-8" onClick={saveReason} disabled={isSavingReason || !reason.trim()}>
            {isSavingReason ? "Saving…" : "Send"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowReason(false)}>
            Skip
          </Button>
        </div>
      )}
    </div>
  )
}
