"use client"

import { useState } from "react"
import { MessageSquare, Bug, Lightbulb, MoreHorizontal, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export type FeedbackCategory = "bug" | "idea" | "other"

const CATEGORIES: Array<{ key: FeedbackCategory; label: string; icon: typeof Bug }> = [
  { key: "bug", label: "Bug", icon: Bug },
  { key: "idea", label: "Idea", icon: Lightbulb },
  { key: "other", label: "Other", icon: MoreHorizontal },
]

export const FEEDBACK_MAX_LENGTH = 2000

export function FeedbackCard() {
  const user = useAppStore((state) => state.user)
  const activeView = useAppStore((state) => state.activeView)
  const [category, setCategory] = useState<FeedbackCategory>("idea")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")

  const trimmed = message.trim()
  const tooLong = trimmed.length > FEEDBACK_MAX_LENGTH

  const submit = async () => {
    if (!user) return
    setError("")
    if (!trimmed) {
      setError("Write a little about what you'd like to share.")
      return
    }
    if (tooLong) {
      setError(`Keep it under ${FEEDBACK_MAX_LENGTH} characters.`)
      return
    }

    setIsSending(true)
    try {
      const { error: insertError } = await supabase.from("user_feedback").insert({
        user_id: user.id,
        category,
        message: trimmed,
        page: activeView || null,
      })
      if (insertError) throw new Error(insertError.message)

      setMessage("")
      toast({ title: "Thanks for the feedback", description: "It's been sent to the team." })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your feedback. Try again.")
    } finally {
      setIsSending(false)
    }
  }

  if (!user) return null

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="size-5" />
          Send Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Found a bug or have an idea? Tell us — it goes straight to the team.
        </p>

        <div className="flex gap-2">
          {CATEGORIES.map((c) => (
            <Button
              key={c.key}
              type="button"
              variant={category === c.key ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(c.key)}
              className="flex-1"
              aria-pressed={category === c.key}
            >
              <c.icon className="size-3.5 mr-1.5" />
              {c.label}
            </Button>
          ))}
        </div>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What happened, or what would you like to see?"
          rows={4}
          className="bg-input border-border resize-none"
          aria-label="Your feedback"
        />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          <span className={cn("text-xs", tooLong ? "text-destructive" : "text-muted-foreground")}>
            {trimmed.length}/{FEEDBACK_MAX_LENGTH}
          </span>
          <Button onClick={submit} disabled={isSending || !trimmed || tooLong}>
            <Send className="size-3.5 mr-1.5" />
            {isSending ? "Sending…" : "Send Feedback"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
