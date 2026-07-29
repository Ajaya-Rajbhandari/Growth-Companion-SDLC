const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"

export type GeminiContent = {
  role: "user" | "model"
  parts: Array<{ text: string }>
}

export function toGeminiContents(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
): GeminiContent[] {
  return messages
    .filter((message) => message.role !== "system" && message.content.trim())
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }))
}

export function geminiEndpoint(action: "generateContent" | "streamGenerateContent") {
  const suffix = action === "streamGenerateContent" ? `${action}?alt=sse` : action
  return `${GEMINI_API_BASE}/models/${encodeURIComponent(GEMINI_MODEL)}:${suffix}`
}

export function geminiHeaders() {
  return {
    "Content-Type": "application/json",
    "x-goog-api-key": process.env.GEMINI_API_KEY || "",
  }
}

export function fetchGemini(
  action: "generateContent" | "streamGenerateContent",
  init: RequestInit,
  timeoutMs = 15_000,
) {
  return fetch(geminiEndpoint(action), {
    ...init,
    headers: {
      ...geminiHeaders(),
      ...init.headers,
    },
    signal: init.signal || AbortSignal.timeout(timeoutMs),
  })
}

export function extractGeminiText(payload: unknown): string {
  const response = payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || ""
  )
}
