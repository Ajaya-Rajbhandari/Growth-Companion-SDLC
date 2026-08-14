import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/server/auth"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { ExtractTaskTitleRequestSchema } from "@/lib/server/schemas"
import { extractGeminiText, fetchGemini, THINKING_DISABLED } from "@/lib/server/gemini"
import { readJsonBody } from "@/lib/server/request"

export const dynamic = "force-dynamic"
// Vision calls run longer than the text-only title suggestions, which cap at 15s.
export const maxDuration = 30

// Deliberately half the text route's 20/min. Every call here ships an image and
// costs materially more than a prompt made of recent titles.
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

// The schema caps base64 at ~2.1M chars; this leaves room for the JSON envelope
// around it without letting an unbounded body through to the parser.
const MAX_BODY_BYTES = 2_400_000

const GEMINI_TIMEOUT_MS = 25_000

const systemPrompt = `You read a screenshot and name the work it shows, for a timesheet / work log.

The screenshot is usually one of: an issue tracker (Jira, Linear, GitHub, Asana, Trello, Azure DevOps), a project board card, a Notion or Confluence page, a design file, a chat message assigning work, an email, or a terminal / editor window.

Return JSON with two fields:
- "summary": one short sentence naming what you actually saw, so the user can tell you read the right thing. Include the issue key or card ID when one is visible (e.g. "Linear issue GC-142 about break panel contrast"). Max 120 characters.
- "suggestions": 3 to 5 timesheet titles, each 2-6 words, title case (e.g. "Fix Break Panel Contrast"). Order them best-first.

Rules:
- Describe the WORK, not the tool. "Fix Break Panel Contrast", never "Looking At Linear".
- Prefer the issue or card title over surrounding UI chrome, navigation, and comment threads.
- Keep any issue key out of the suggestions themselves; it belongs in the summary.
- Do not invent detail that is not visible. If the screenshot shows no identifiable task, return an empty suggestions array and say so in the summary.
- Match the phrasing style of the user's recent titles when they are provided.
- Never include personal data, email addresses, or names from the screenshot in the suggestions.`

const responseSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    suggestions: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "suggestions"],
}

function cleanTitles(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.length <= 100)
    .slice(0, 5)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", suggestions: [] }, { status: 401 })
    }

    const rate = checkRateLimit(`extract-task-title:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many screenshots. Wait a moment and try again.", suggestions: [] },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      )
    }

    const body = await readJsonBody(request, MAX_BODY_BYTES)
    if (!body.ok) {
      return NextResponse.json({ error: body.error, suggestions: [] }, { status: body.status })
    }

    const parsed = ExtractTaskTitleRequestSchema.safeParse(body.data)
    if (!parsed.success) {
      // Surface the first field message — "Image is too large" is actionable in a
      // way that a bare "Invalid request body" is not.
      const issue = parsed.error.issues[0]
      return NextResponse.json(
        { error: issue?.message || "Invalid request body", suggestions: [] },
        { status: 400 },
      )
    }

    const { image, recentTitles } = parsed.data

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { suggestions: [], error: "Screenshot reading is unavailable — GEMINI_API_KEY is not configured." },
        { status: 200 },
      )
    }

    const contextLine =
      recentTitles.length > 0
        ? `The user's recent timesheet titles, for phrasing style: ${recentTitles.join(", ")}`
        : "The user has no recent titles to match."

    const response = await fetchGemini(
      "generateContent",
      {
        method: "POST",
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: "user",
              parts: [
                { text: contextLine },
                { inlineData: { mimeType: image.mimeType, data: image.data } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.3,
            maxOutputTokens: 600,
            thinkingConfig: THINKING_DISABLED,
          },
        }),
      },
      GEMINI_TIMEOUT_MS,
    )

    if (!response.ok) {
      // The image is never logged — only the failure. Screenshots routinely carry
      // client names and ticket contents that have no business in a server log.
      console.error("[extract-task-title] Gemini error:", response.status, await response.text())
      return NextResponse.json(
        { error: "Couldn't read that screenshot. Try again or type the title.", suggestions: [] },
        { status: 502 },
      )
    }

    const raw = extractGeminiText(await response.json())

    let suggestions: string[] = []
    let summary = ""
    try {
      const result = JSON.parse(raw) as { summary?: unknown; suggestions?: unknown }
      suggestions = cleanTitles(result.suggestions)
      summary = typeof result.summary === "string" ? result.summary.trim().slice(0, 200) : ""
    } catch {
      // responseSchema makes malformed output unlikely, but a truncated reply is
      // still possible. Salvage any quoted strings rather than failing outright.
      suggestions = cleanTitles(raw.match(/"([^"\\]{2,100})"/g)?.map((match) => match.slice(1, -1)))
    }

    if (suggestions.length === 0) {
      return NextResponse.json({
        suggestions: [],
        summary: summary || "No task was recognisable in that screenshot.",
      })
    }

    return NextResponse.json({ suggestions, summary })
  } catch (e) {
    // AbortSignal.timeout rejects with a TimeoutError once GEMINI_TIMEOUT_MS passes.
    const timedOut = e instanceof Error && e.name === "TimeoutError"
    console.error("[extract-task-title]", e)
    return NextResponse.json(
      {
        error: timedOut
          ? "Reading the screenshot took too long. Try again or type the title."
          : "Request failed",
        suggestions: [],
      },
      { status: timedOut ? 504 : 500 },
    )
  }
}
