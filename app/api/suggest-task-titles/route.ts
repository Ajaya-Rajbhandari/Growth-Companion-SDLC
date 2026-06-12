import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/server/auth"
import { checkRateLimit } from "@/lib/server/rate-limit"

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

    const body = await request.json()
    const draft = typeof body.draft === "string" ? body.draft.trim() : ""
    const recentTitles: string[] = Array.isArray(body.recentTitles)
      ? body.recentTitles.filter((t: unknown) => typeof t === "string").slice(0, 20)
      : []
    const currentTask = typeof body.currentTask === "string" ? body.currentTask.trim() : ""

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { suggestions: [], error: "OPENAI_API_KEY not configured" },
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent || "Suggest 3-5 task titles for a work log." },
        ],
        temperature: 0.5,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[suggest-task-titles] OpenAI error:", err)
      return NextResponse.json({ error: "Suggestions unavailable", suggestions: [] }, { status: 502 })
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw =
      data.choices?.[0]?.message?.content?.trim() || ""

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
      const lines = raw.split("\n").map((s) => s.replace(/^[-*]\s*/, "").trim()).filter(Boolean)
      suggestions = lines.slice(0, 5)
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
