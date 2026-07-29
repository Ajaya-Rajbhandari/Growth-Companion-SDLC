"use client"

import type { ReactNode } from "react"
import { Copy, RotateCw } from "lucide-react"
import { AIMessage } from "@/components/ai-message"
import { AIFeedback } from "@/components/ai-feedback"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface AssistantResponseProps {
  content: string
  messageId: string
  sessionId?: string | null
  toolResults?: ReactNode
  onRegenerate: () => void
}

export function AssistantResponse({
  content,
  messageId,
  sessionId,
  toolResults,
  onRegenerate,
}: AssistantResponseProps) {
  const copyMessage = async () => {
    await navigator.clipboard.writeText(content)
    toast({
      title: "Copied",
      description: "Message copied to clipboard.",
      duration: 2_000,
    })
  }

  return (
    <article className="group/message min-w-0 max-w-[88%]">
      <div className="rounded-2xl rounded-tl-md bg-secondary/35 px-3.5 py-3 text-foreground">
        {content.trim() && <AIMessage content={content} />}
        {toolResults}
      </div>

      {content.trim() && (
        <div className="mt-1.5 flex min-h-8 items-center gap-0.5 text-muted-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-hover/message:opacity-100 sm:focus-within:opacity-100">
          <AIFeedback messageId={messageId} sessionId={sessionId} />
          <span className="mx-1 h-3.5 w-px bg-border" aria-hidden="true" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => void copyMessage()}
            aria-label="Copy response"
            title="Copy response"
          >
            <Copy className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={onRegenerate}
            aria-label="Regenerate response"
            title="Regenerate response"
          >
            <RotateCw className="size-3.5" />
          </Button>
        </div>
      )}
    </article>
  )
}
