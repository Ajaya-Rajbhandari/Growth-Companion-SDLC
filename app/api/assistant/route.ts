import { createServerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const systemPrompt = `You are a helpful personal growth and app navigation assistant integrated into a productivity app called "Companion". You help users with:

1. **Task Management**: Help users organize, prioritize, and manage their tasks. You can create new tasks for them.
   - Location: Click "Tasks" in the left sidebar
   - Features: Create, edit, delete tasks; set priorities (low/medium/high); mark as complete
   
2. **Note Taking**: Help users capture ideas, summarize information, and organize their notes. You can create notes for them.
   - Location: Click "Notes" in the left sidebar
   - Features: Create, edit, delete, search notes; organize by categories (work, personal, ideas, meeting, other); add tags; format text (bold, italic, code)
   
3. **Timesheet Management**: Help users track their working hours. You can clock them in/out, start/end breaks, and check their time status.
   - Location: Click "Timesheet" in the left sidebar
   - Features: Clock in/out, take timed/open-ended breaks, add work descriptions/task titles, switch between tasks mid-session, view time history by daily/weekly/monthly/yearly
   - Task tracking: Every work session can have a descriptive title explaining what work was done
   - Break types: 30-minute fixed breaks, lunch breaks, or custom durations
   
4. **Dashboard**: Get an overview of your productivity and statistics.
   - Location: Click "Dashboard" in the left sidebar
   - Features: View profile, weekly activity stats, productivity rates, task completion percentages, notes count, time entries summary
   
5. **Profile Settings**: Manage your account and personal information.
   - Location: Click "Profile" in the left sidebar or click your profile icon
   - Features: Edit name, email, view account creation date, sign out
   
6. **Personal Growth**: Provide motivation, productivity tips, goal-setting advice, and mindfulness guidance.

7. **Planning**: Help users plan their day, week, or projects effectively.

Be encouraging, supportive, and practical. Keep responses concise but helpful. 
- When users ask "how to" or "where is", provide specific location information and step-by-step guidance
- When users need help navigating, explain which sidebar button to click
- When users ask about features, explain both how to use them and where to find them
- Be specific: use feature names, button locations, and sidebar tabs

IMPORTANT NAVIGATION TIPS:
- The left sidebar has main navigation: Dashboard, Tasks, Notes, Timesheet, Profile
- The floating AI assistant bubble is on the bottom left of the screen
- Time history shows all work sessions with task descriptions, timestamps, and breaks
- The AI assistant can help with tasks, notes, and timesheet management directly

IMPORTANT TIMESHEET RULES:
- When user says "clock in", "start work", "begin my day", etc. - use clockIn tool
- When user says "clock out", "end work", "finish my day", "going home", etc. - use clockOut tool  
- When user asks about their time, hours worked, or timesheet status - use getTimesheetStatus tool first
- When user wants a break - use startBreak tool (ask for duration if not specified, or use 30 minute default)
- When user wants to end break or resume work - use endBreak tool
- Remind users they can add task descriptions when clocking in to track what work they're doing`

const tools = [
  {
    type: "function" as const,
    function: {
      name: "createTask",
      description: "Create a new task for the user",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The title of the task" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "The priority level" },
          dueDate: { type: "string", description: "Optional due date in YYYY-MM-DD format" },
        },
        required: ["title", "priority"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "createNote",
      description: "Create a new note for the user",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The title of the note" },
          content: { type: "string", description: "The content of the note" },
          category: {
            type: "string",
            enum: ["work", "personal", "ideas", "meeting", "other"],
            description: "Optional category for the note",
          },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags for the note" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "clockIn",
      description: "Clock in to start tracking work time. Use when user wants to start working or begin their day.",
      parameters: {
        type: "object",
        properties: {
          taskDescription: { type: "string", description: "Optional description of the task being worked on" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "clockOut",
      description: "Clock out to stop tracking work time. Use when user wants to end their workday.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "startBreak",
      description:
        "Start a break from work. Can specify duration in minutes for a timed break, or leave empty for an open-ended break.",
      parameters: {
        type: "object",
        properties: {
          durationMinutes: {
            type: "number",
            description: "Optional break duration in minutes. If not specified, creates a 30 minute break.",
          },
          breakType: { type: "string", enum: ["fixed", "lunch", "custom"], description: "Optional type of break" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "endBreak",
      description: "End the current break and resume work.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getTimesheetStatus",
      description:
        "Get the current timesheet status including whether user is clocked in, on break, hours worked today and this week.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getAppSummary",
      description: "Get a summary of the user's tasks, notes, and timesheet status for planning or daily review.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
]

function executeTool(
  toolName: string | undefined,
  toolInput: any,
  state: any,
): { message: string; action?: { type: string; payload: any } } {
  try {
    if (!toolName) {
      return { message: "Tool execution skipped - no tool specified." }
    }

    switch (toolName) {
      case "createTask": {
        const { title, priority } = toolInput as { title: string; priority: string }
        if (!title?.trim() || !priority?.trim())
          return { message: "Error: Missing required task parameters (title and priority)" }
        return {
          message: `Task created: "${title}" with ${priority} priority`,
          action: { type: "createTask", payload: { title, completed: false, priority: priority || "medium" } },
        }
      }

      case "createNote": {
        const { title, content, category, tags } = toolInput as {
          title: string
          content: string
          category?: string
          tags?: string[]
        }
        if (!title?.trim() || !content?.trim())
          return { message: "Error: Missing required note parameters (title and content)" }
        return {
          message: `Note created: "${title}"`,
          action: { type: "createNote", payload: { title, content, category: category || "other", tags: tags || [] } },
        }
      }

      case "clockIn": {
        const { taskDescription } = toolInput as { taskDescription?: string }
        return {
          message: taskDescription
            ? `Clocked in for "${taskDescription}". Your work session has started.`
            : "Clocked in successfully. Your work session has started.",
          action: { type: "clockIn", payload: { taskDescription } },
        }
      }

      case "clockOut": {
        return {
          message: "Clocked out successfully. Great work today!",
          action: { type: "clockOut", payload: {} },
        }
      }

      case "startBreak": {
        const { durationMinutes, breakType } = toolInput as { durationMinutes?: number; breakType?: string }
        const duration = durationMinutes ? `${durationMinutes} minute` : "30 minute"
        return {
          message: `Break started! Enjoy your ${duration} break.`,
          action: { type: "startBreak", payload: { durationMinutes: durationMinutes || 30, breakType } },
        }
      }

      case "endBreak": {
        return {
          message: "Break ended. Welcome back! Ready to continue working.",
          action: { type: "endBreak", payload: {} },
        }
      }

      case "getTimesheetStatus": {
        const today = new Date().toISOString().split("T")[0]
        const todayEntries = (state.timeEntries || []).filter((entry: { date: string }) => entry.date === today)

        let todayHours = todayEntries.reduce(
          (total: number, entry: { clockOut?: string; clockIn: string; breakMinutes: number }) => {
            const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now()
            const start = new Date(entry.clockIn).getTime()
            const diffMs = end - start - (entry.breakMinutes || 0) * 60 * 1000
            return total + diffMs / (1000 * 60 * 60)
          },
          0,
        )

        let sessionCount = todayEntries.length

        if (state.currentEntry) {
          const currentEntry = state.currentEntry as { clockIn: string; breakMinutes?: number; date?: string }
          const entryDate = currentEntry.date || new Date(currentEntry.clockIn).toISOString().split("T")[0]
          if (entryDate === today) {
            const start = new Date(currentEntry.clockIn).getTime()
            const diffMs = Date.now() - start - (currentEntry.breakMinutes || 0) * 60 * 1000
            todayHours += diffMs / (1000 * 60 * 60)
            sessionCount += 1
          }
        }

        let status = state.currentEntry ? "Currently clocked in" : "Not working"
        if (state.currentEntry && (state.currentEntry as { onBreak?: boolean }).onBreak) status = "On break"

        return {
          message: `Status: ${status}\nToday's hours: ${todayHours.toFixed(2)}h\nSessions today: ${sessionCount}`,
        }
      }

      case "getAppSummary": {
        const pendingTasks = (state.tasks || []).filter((t: { completed: boolean }) => !t.completed).length
        const highPriorityTasks = (state.tasks || []).filter(
          (t: { priority: string; completed: boolean }) => t.priority === "high" && !t.completed,
        ).length

        const today = new Date().toISOString().split("T")[0]
        const todayEntries = (state.timeEntries || []).filter((entry: { date: string }) => entry.date === today)

        let todayHours = todayEntries.reduce(
          (total: number, entry: { clockOut?: string; clockIn: string; breakMinutes: number }) => {
            const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now()
            const start = new Date(entry.clockIn).getTime()
            const diffMs = end - start - (entry.breakMinutes || 0) * 60 * 1000
            return total + diffMs / (1000 * 60 * 60)
          },
          0,
        )

        let sessionCount = todayEntries.length

        if (state.currentEntry) {
          const currentEntry = state.currentEntry as { clockIn: string; breakMinutes?: number; date?: string }
          const entryDate = currentEntry.date || new Date(currentEntry.clockIn).toISOString().split("T")[0]
          if (entryDate === today) {
            const start = new Date(currentEntry.clockIn).getTime()
            const diffMs = Date.now() - start - (currentEntry.breakMinutes || 0) * 60 * 1000
            todayHours += diffMs / (1000 * 60 * 60)
            sessionCount += 1
          }
        }

        return {
          message: `Daily Summary:\nTasks: ${state.tasks?.length || 0} total (${pendingTasks} pending, ${highPriorityTasks} high priority)\nNotes: ${state.notes?.length || 0} total\nToday's work: ${todayHours.toFixed(2)}h across ${sessionCount} session(s)\n${state.currentEntry ? "Currently working" : "Not working"}`,
        }
      }

      default:
        return { message: `Unknown tool: ${toolName}` }
    }
  } catch (error) {
    console.error("[v0] Tool error:", error)
    return { message: `Error executing tool: ${String(error)}` }
  }
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const body = await request.json()
    const { messages, appState } = body

    // 1. Basic validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid messages format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 2. Rate limiting check (Placeholder: in production, use Redis or Supabase check)
    // For now, we'll just log the request
    console.log(`[v0] Assistant request from user: ${session.user.id}`)

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("[v0] Processing request with app state:", !!appState)
    console.log("[v0] Messages count:", messages.length)

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] OpenAI API Error:", error)
      return new Response(JSON.stringify({ error }), { status: response.status })
    }

    const reader = response.body?.getReader()
    if (!reader) {
      return
    }

    const encoder = new TextEncoder()
    let buffer = ""
    let hasContent = false

    // Store both the function name AND arguments for each tool call index
    const toolCallAccumulator: { [key: string]: { name: string; arguments: string } } = {}

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += new TextDecoder().decode(value)
            const lines = buffer.split("\n")
            buffer = lines[lines.length - 1]

            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim()
              if (!line || !line.startsWith("data:")) continue

              const data = line.slice(6).trim()
              if (data === "[DONE]") continue

              try {
                const json = JSON.parse(data)
                const chunk = json.choices?.[0]?.delta

                if (!chunk) continue

                // Handle text content
                if (chunk.content) {
                  hasContent = true
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ delta: { content: chunk.content } })}\n\n`),
                  )
                }

                if (chunk.tool_calls) {
                  for (const toolCall of chunk.tool_calls) {
                    const toolIndex = toolCall.index ?? 0
                    const toolId = `tool_${toolIndex}`

                    // Initialize accumulator for this tool if not exists
                    if (!toolCallAccumulator[toolId]) {
                      toolCallAccumulator[toolId] = { name: "", arguments: "" }
                    }

                    // Accumulate function name (comes in first chunk)
                    if (toolCall.function?.name) {
                      toolCallAccumulator[toolId].name = toolCall.function.name
                      console.log("[v0] Tool call name received:", toolCall.function.name)
                    }

                    // Accumulate function arguments (comes in subsequent chunks)
                    if (toolCall.function?.arguments) {
                      toolCallAccumulator[toolId].arguments += toolCall.function.arguments
                    }

                    // Try to execute once we have both name and complete arguments
                    const accumulated = toolCallAccumulator[toolId]
                    if (accumulated.name && accumulated.arguments && accumulated.arguments.trim().endsWith("}")) {
                      try {
                        console.log("[v0] Executing tool:", accumulated.name, "with args:", accumulated.arguments)
                        const parsedArgs = JSON.parse(accumulated.arguments)
                        const toolResult = executeTool(accumulated.name, parsedArgs || {}, appState)

                        hasContent = true // Mark that we have content from tool execution
                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({ toolResult: toolResult.message, toolName: accumulated.name, toolAction: toolResult.action })}\n\n`,
                          ),
                        )

                        // Clear the accumulator for this tool
                        delete toolCallAccumulator[toolId]
                      } catch (parseError) {
                        console.error("[v0] Failed to parse tool arguments:", parseError)
                      }
                    }
                  }
                }
              } catch (e) {
                console.error("[v0] Parse error:", e)
              }
            }
          }

          for (const toolId of Object.keys(toolCallAccumulator)) {
            const accumulated = toolCallAccumulator[toolId]
            if (accumulated.name && accumulated.arguments) {
              try {
                // Try to parse even if not ending with }
                const parsedArgs = JSON.parse(accumulated.arguments || "{}")
                const toolResult = executeTool(accumulated.name, parsedArgs, appState)
                hasContent = true
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ toolResult: toolResult.message, toolName: accumulated.name, toolAction: toolResult.action })}\n\n`,
                  ),
                )
              } catch (e) {
                console.log("[v0] Skipping incomplete tool call:", accumulated.name)
              }
            }
          }

          if (!hasContent) {
            console.log("[v0] No content received, sending context-aware response")
            // Generate a more helpful response based on app state
            const tasks = (appState?.tasks as unknown[]) || []
            const notes = (appState?.notes as unknown[]) || []
            const currentEntry = appState?.currentEntry

            let summaryMessage = "Here's your current summary:\n\n"
            summaryMessage += `**Tasks:** You have ${tasks.length} task(s)\n`
            summaryMessage += `**Notes:** You have ${notes.length} note(s)\n`
            summaryMessage += `**Timesheet:** ${currentEntry ? "Currently clocked in" : "Not clocked in"}\n\n`
            summaryMessage += "How can I help you further?"

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: { content: summaryMessage } })}\n\n`))
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (error) {
          console.error("[v0] Stream error:", error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
