"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

interface AIMessageProps {
  content: string
  className?: string
}

export function AIMessage({ content, className }: AIMessageProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize heading styles
          h1: ({ node, ...props }) => (
            <h1 className="text-lg font-bold mt-4 mb-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-base font-bold mt-3 mb-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-sm font-semibold mt-2 mb-1" {...props} />
          ),
          // Customize paragraph
          p: ({ node, ...props }) => (
            <p className="text-sm leading-relaxed mb-2 last:mb-0" {...props} />
          ),
          // Customize lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside mb-2 space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-sm leading-relaxed" {...props} />
          ),
          // Customize code blocks
          code: ({ node, className, children, ...props }: any) => {
            const isInline = !className
            return isInline ? (
              <code
                className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className={cn(
                  "block bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto mb-2",
                  className
                )}
                {...props}
              >
                {children}
              </code>
            )
          },
          pre: ({ node, ...props }) => (
            <pre className="bg-muted p-3 rounded-md overflow-x-auto mb-2" {...props} />
          ),
          // Customize blockquote
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-primary pl-3 italic my-2 text-muted-foreground"
              {...props}
            />
          ),
          // Customize links
          a: ({ node, ...props }) => (
            <a
              className="text-primary underline hover:text-primary/80"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // Customize strong/bold
          strong: ({ node, ...props }) => (
            <strong className="font-semibold" {...props} />
          ),
          // Customize emphasis/italic
          em: ({ node, ...props }) => (
            <em className="italic" {...props} />
          ),
          // Customize horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="my-3 border-border" {...props} />
          ),
          // Customize table
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-border" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border border-border px-2 py-1 bg-muted font-semibold text-left" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-border px-2 py-1" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
