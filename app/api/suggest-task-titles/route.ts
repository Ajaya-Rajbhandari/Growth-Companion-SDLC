import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/server/auth"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { SuggestTaskTitlesRequestSchema } from "@/lib/server/schemas"
import { extractGeminiText, fetchGemini, THINKING_DISABLED } from "@/lib/server/gemini"
import { readJsonBody } from "@/lib/server/request"

export const dynamic = "force-dynamic"
export const maxDuration = 15

const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

const systemPrompt = `You suggest short, professional task titles for a timesheet / work log. 
Rules:
- Return exactly 3 to 5 suggestions, each 2-6 words, title case (e.g. "Team standup", "Code review", "Deep work").
- Base suggestions on: (1) the user's recent task titles if provided, (2) the user's draft/typed input if provided, (3) common work activities (meetings, coding, email, reviews, planning, breaks).
- If the user typed a draft (e.g. "meeting with john"), suggest a polished version plus 2-3 related variants (e.g. "Meeting with John", "Sync with John", "1:1 with John").
- If no draft, suggest titles that fit the user's recent work pattern plus 1-2 generic options.
- Do not repeat titles from recentTitles in your suggestions unless the user's draft is clearly asking for that.
- Output ONLY a valid JSON array of strings, no other text. Example: ["Team standup","Sprint planning","Code review"]`

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", suggestions: [] }, { status: 401 })
    }

    const rate = checkRateLimit(`suggest-task-titles:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests", suggestions: [] },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      )
    }

    const body = await readJsonBody(request, 32_000)
    if (!body.ok) {
      return NextResponse.json({ error: body.error, suggestions: [] }, { status: body.status })
    }
    const parsed = SuggestTaskTitlesRequestSchema.safeParse(body.data)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", suggestions: [] }, { status: 400 })
    }

    const { draft, recentTitles, currentTask } = parsed.data

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { suggestions: [], error: "GEMINI_API_KEY not configured" },
        { status: 200 }
      )
    }

    const userContent = [
      currentTask ? `Current task being ended: ${currentTask}` : "",
      recentTitles.length > 0 ? `Recent task titles: ${recentTitles.join(", ")}` : "",
      draft ? `User's draft for next task: "${draft}"` : "User has not typed anything yet; suggest based on recent work and common activities.",
    ]
      .filter(Boolean)
      .join("\n")

    const response = await fetchGemini("generateContent", {
      method: "POST",
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            role: "user",
            parts: [{ text: userContent || "Suggest 3-5 task titles for a work log." }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.5,
          maxOutputTokens: 400,
          thinkingConfig: THINKING_DISABLED,
        },
      }),
    }, 12_000)

    if (!response.ok) {
      const err = await response.text()
      console.error("[suggest-task-titles] Gemini error:", err)
      return NextResponse.json({ error: "Suggestions unavailable", suggestions: [] }, { status: 502 })
    }

    const data = await response.json()
    const raw = extractGeminiText(data)

    let suggestions: string[] = []
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length <= 100)
          .slice(0, 5)
      }
    } catch {
      // A truncated JSON array still holds usable titles; strip the punctuation.
      suggestions = raw
        .split("\n")
        .map((line) => line.trim().replace(/^[-*]\s*/, "").replace(/^\[|[,\]]+$/g, "").trim())
        .map((line) => line.replace(/^"(.*)"$/, "$1").trim())
        .filter((line) => line.length > 0 && line.length <= 100)
        .slice(0, 5)
    }

    return NextResponse.json({ suggestions })
  } catch (e) {
    console.error("[suggest-task-titles]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed", suggestions: [] },
      { status: 500 }
    )
  }
}
