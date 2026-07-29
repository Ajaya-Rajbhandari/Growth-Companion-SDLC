import { getAuthenticatedUser } from "@/lib/server/auth"
import { extractGeminiText, fetchGemini } from "@/lib/server/gemini"
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rate-limit"
import { InsightsRequestSchema } from "@/lib/server/schemas"
import { readJsonBody } from "@/lib/server/request"

const INSIGHTS_RATE_LIMIT = 10
const INSIGHTS_RATE_WINDOW_MS = 60_000

const SYSTEM = `You are a concise, encouraging productivity coach inside a personal time-tracking app.
Given a user's "week in numbers", reply with JSON: {"insight": string, "suggestions": string[]}.
- "insight": 2-3 warm, specific sentences that reference the actual numbers (hours, on-target days, overdue tasks, habit consistency, goal progress). Celebrate wins, gently flag risks.
- "suggestions": 2-3 short, concrete, actionable next steps tailored to the data.
Never invent data that isn't in the metrics. If the week is empty, encourage a small first step. Keep it human and tight.`

export async function POST(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "AI is not configured." }, { status: 503 })
  }

  const rate = checkRateLimit(`insights:${user.id}`, INSIGHTS_RATE_LIMIT, INSIGHTS_RATE_WINDOW_MS)
  if (!rate.allowed) return rateLimitResponse(rate)

  const body = await readJsonBody(request, 32_000)
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status })
  const parsedBody = InsightsRequestSchema.safeParse(body.data)
  if (!parsedBody.success) {
    return Response.json({ error: "Invalid metrics." }, { status: 400 })
  }
  const { metrics } = parsedBody.data

  try {
    const res = await fetchGemini("generateContent", {
      method: "POST",
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [
          {
            role: "user",
            parts: [{ text: `This week's metrics:\n${JSON.stringify(metrics, null, 2)}` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.6,
          maxOutputTokens: 400,
        },
      }),
    }, 12_000)

    if (!res.ok) {
      return Response.json({ error: "The coach is unavailable right now." }, { status: 502 })
    }

    const json = await res.json()
    const content = extractGeminiText(json) || "{}"
    const parsed = JSON.parse(content)
    return Response.json({
      insight: typeof parsed.insight === "string" ? parsed.insight : "",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 4) : [],
    })
  } catch {
    return Response.json({ error: "Couldn't generate insights." }, { status: 500 })
  }
}
