import { getAuthenticatedUser } from "@/lib/server/auth"

const SYSTEM = `You are a concise, encouraging productivity coach inside a personal time-tracking app.
Given a user's "week in numbers", reply with JSON: {"insight": string, "suggestions": string[]}.
- "insight": 2-3 warm, specific sentences that reference the actual numbers (hours, on-target days, overdue tasks, habit consistency, goal progress). Celebrate wins, gently flag risks.
- "suggestions": 2-3 short, concrete, actionable next steps tailored to the data.
Never invent data that isn't in the metrics. If the week is empty, encourage a small first step. Keep it human and tight.`

export async function POST(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "AI is not configured." }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const metrics = body?.metrics
  if (!metrics || typeof metrics !== "object") {
    return Response.json({ error: "Missing metrics." }, { status: 400 })
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `This week's metrics:\n${JSON.stringify(metrics, null, 2)}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 400,
      }),
    })

    if (!res.ok) {
      return Response.json({ error: "The coach is unavailable right now." }, { status: 502 })
    }

    const json = await res.json()
    const content = json.choices?.[0]?.message?.content || "{}"
    const parsed = JSON.parse(content)
    return Response.json({
      insight: typeof parsed.insight === "string" ? parsed.insight : "",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 4) : [],
    })
  } catch {
    return Response.json({ error: "Couldn't generate insights." }, { status: 500 })
  }
}
