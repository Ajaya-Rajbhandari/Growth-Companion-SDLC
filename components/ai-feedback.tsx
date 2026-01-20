"use client"

import { useState } from "react"
import * as React from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  const user = useAppStore((state) => state.user)

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

      toast({
        title: "Feedback recorded",
        description: `Thank you for your ${type} feedback!`,
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
    <div className={cn("flex items-center gap-1 mt-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-2 text-xs",
          feedback === "positive" && "bg-green-500/10 text-green-600 dark:text-green-400"
        )}
        onClick={() => handleFeedback("positive")}
        disabled={isSubmitting}
      >
        <ThumbsUp className="size-3.5 mr-1" />
        Helpful
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-2 text-xs",
          feedback === "negative" && "bg-red-500/10 text-red-600 dark:text-red-400"
        )}
        onClick={() => handleFeedback("negative")}
        disabled={isSubmitting}
      >
        <ThumbsDown className="size-3.5 mr-1" />
        Not helpful
      </Button>
    </div>
  )
}
