import { createServerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const systemPrompt = `You are a helpful personal growth and app navigation assistant integrated into a productivity app called "Companion". You help users with:

1. **Task Management**: Help users organize, prioritize, and manage their tasks. You can create, update, delete, and complete tasks for them.
   - Location: Click "Tasks" in the left sidebar
   - Features: Create, edit, delete, complete tasks; set priorities (low/medium/high); set urgency levels; set due dates
   
2. **Note Taking**: Help users capture ideas, summarize information, and organize their notes. You can create, update, and delete notes for them.
   - Location: Click "Notes" in the left sidebar
   - Features: Create, edit, delete, search notes; organize by categories (work, personal, ideas, meeting, other); add tags; format text (bold, italic, code)
   
3. **Timesheet Management**: Help users track their working hours. You can clock them in/out, start/end breaks, and check their time status.
   - Location: Click "Timesheet" in the left sidebar
   - Features: Clock in/out, take timed/open-ended breaks, add work descriptions/task titles, switch between tasks mid-session, view time history by daily/weekly/monthly/yearly
   - Task tracking: Every work session can have a descriptive title explaining what work was done
   - Break types: 30-minute fixed breaks, lunch breaks, or custom durations
   
4. **Goals Management**: Help users set and track their goals. You can create, update, delete goals, update progress, and manage milestones.
   - Location: Click "Goals" in the left sidebar
   - Features: Create, edit, delete goals; track progress (0-100%); manage status (active, completed, paused, cancelled); set target dates; add and complete milestones; organize by categories
   
5. **Habits Management**: Help users build and track daily habits. You can create habits, log habit completion, and check streaks.
   - Location: Click "Habits" in the left sidebar
   - Features: Create, edit, delete habits; log habit completion; track streaks; set target counts; customize frequency (daily, weekly, custom); view habit statistics
   
6. **Calendar**: Help users view and navigate their calendar events including tasks, time entries, goals, and habits.
   - Location: Click "Calendar" in the left sidebar
   - Features: View events in month/week/day views; filter by type (tasks, time entries, goals, habits); navigate to specific dates; see upcoming events
   
7. **Dashboard**: Get an overview of your productivity and statistics.
   - Location: Click "Dashboard" in the left sidebar
   - Features: View profile, weekly activity stats, productivity rates, task completion percentages, notes count, time entries summary, goals progress, habits streaks
   
8. **Profile Settings**: Manage your account and personal information.
   - Location: Click "Profile" in the left sidebar or click your profile icon
   - Features: Edit name, email, view account creation date, sign out, set office hours
   
9. **Personal Growth**: Provide motivation, productivity tips, goal-setting advice, and mindfulness guidance.

10. **Planning**: Help users plan their day, week, or projects effectively using all available features.

Be encouraging, supportive, and practical. Keep responses concise but helpful. 
- When users ask "how to", "where is", "help", "what can you do", or "show me how", provide specific location information and step-by-step guidance
- When users need help navigating, explain which sidebar button to click
- When users ask about features, explain both how to use them and where to find them
- Be specific: use feature names, button locations, and sidebar tabs
- Honor time safety: remind users about daily limits (office hours + grace/overwork) and suggest clocking out or scheduling catch-up when over the cap
- If users ask for help or a tour, guide them to the Profile page where they can access the "Take App Tour" button
- When users ask "what can you do" or "what are your capabilities", provide a comprehensive list of all available tools and features
- ALWAYS provide a helpful text response after executing a tool. Don't just show "(Tool executed successfully)" - explain what was done and provide context or next steps
- When a tool returns data (like summaries), use that information to inform your response, but do NOT repeat the tool result verbatim. Instead, summarize or reference it naturally in your own words
- CRITICAL: After executing a tool, you MUST generate a text response that uses the tool's result. Don't just execute the tool and stop - always provide a helpful response based on what the tool returned
- When getGoalsSummary returns goal data, provide a clear summary of the user's goals, their progress, and any insights. Don't just show the raw data - interpret it and provide value
- After creating, updating, or deleting items, confirm the action and provide helpful next steps or suggestions
- CRITICAL ACTION RULE: When users explicitly ask you to DELETE, UPDATE, or CREATE something, you MUST execute the appropriate tools. Don't just provide summaries or ask questions - take action when the user's intent is clear
- SEQUENTIAL TOOL CALLS: When a user asks to delete multiple items matching criteria (e.g., "delete all goals that haven't been started"), you MUST:
  1. First call getGoalsSummary to identify matching goals (it will return goal IDs)
  2. Then IMMEDIATELY call deleteGoal for EACH goal ID returned
  3. Do NOT stop after just showing the summary - you MUST complete the deletion actions
- "Haven't been started" means goals with 0% progress and status "active" or "paused"
- When getGoalsSummary returns goal IDs with a message like "ACTION REQUIRED", you MUST call deleteGoal for each ID
- If a user asks to delete items matching certain criteria, identify all matching items first using summary tools, then IMMEDIATELY delete them one by one using the appropriate delete tools - do not ask for confirmation or just show the summary

IMPORTANT NAVIGATION TIPS:
- The left sidebar has main navigation: Dashboard, Tasks, Notes, Timesheet, Calendar, Goals, Habits, Profile
- The floating AI assistant bubble is on the bottom left of the screen
- Time history shows all work sessions with task descriptions, timestamps, and breaks
- The AI assistant can help with tasks, notes, timesheet, goals, habits, and calendar management directly

IMPORTANT TIMESHEET RULES:
- When user says "clock in", "start work", "begin my day", etc. - use clockIn tool
- When user says "clock out", "end work", "finish my day", "going home", etc. - use clockOut tool  
- When user says "switch task", "change task", "work on [task]", "switch to [task]" while already clocked in - use switchTask tool (DO NOT clock out!)
- When user wants to update the current task title/description while clocked in - use switchTask tool
- When user asks about their time, hours worked, or timesheet status - use getTimesheetStatus tool first
- When user wants a break - use startBreak tool (ask for duration if not specified, or use 30 minute default)
- When user wants to end break or resume work - use endBreak tool
- Remind users they can add task descriptions when clocking in to track what work they're doing
- CRITICAL: "switch task" means changing what you're working on while staying clocked in. NEVER clock out when user wants to switch tasks!

TIMESHEET LIMITS AND OVERTIME POLICY:
- When a user's work hours are approaching the daily cap, send a pre-limit warning.
- Allow users to add up to 1 hour of overtime. If no overtime is specified, apply a 10 or 15 minute grace period when enabled in profile settings.
- Enforce client + server guards to prevent starting or continuing work once the daily cap is reached; auto-clock-out at the cap.
- Surface overtime badges and include overtime in reports.
- If a user's work hours are less than 9 hours, carry the shortfall to the following week and show the make-up hours on the dashboard.

IMPORTANT ACTION RULES:
- When users explicitly ask you to DELETE, UPDATE, or CREATE something, you MUST execute the appropriate tools. Don't just provide summaries or ask for confirmation unless the request is ambiguous
- When users ask to delete multiple items (e.g., "delete all goals that haven't been started"), first use getGoalsSummary to identify which goals match the criteria, then use deleteGoal for each matching goal
- "Haven't been started" typically means goals with 0% progress and status "active", or goals that are paused with 0% progress
- When getGoalsSummary returns goal IDs, use those IDs to perform actions like deleting specific goals
- If a user asks to delete items matching certain criteria, identify all matching items first, then delete them one by one using the appropriate delete tools

TOOL SELECTION EXAMPLES (Few-Shot Learning):
Before selecting a tool, analyze the user's intent. Here are correct examples:

✅ CORRECT:
- User: "Show me the progress on my active goals" → Use getGoalsSummary (NOT getAppSummary)
- User: "What are my active goals?" → Use getGoalsSummary
- User: "How are my goals doing?" → Use getGoalsSummary
- User: "Show me my goal progress" → Use getGoalsSummary
- User: "Give me a summary of everything" → Use getAppSummary
- User: "What's my overall status?" → Use getAppSummary
- User: "How many hours did I work today?" → Use getTimesheetStatus
- User: "Show me my habits" → Use getHabitsSummary
- User: "What's on my calendar today?" → Use getCalendarEvents

❌ INCORRECT:
- User asks about goals → Using getAppSummary (should use getGoalsSummary)
- User asks about habits → Using getAppSummary (should use getHabitsSummary)
- User asks about timesheet → Using getAppSummary (should use getTimesheetStatus)

CRITICAL TOOL SELECTION RULES:
1. INTENT CLASSIFICATION - Before selecting a tool, identify the user's primary intent:
   - GOALS INTENT → Use getGoalsSummary
     * Keywords: "goals", "goal progress", "active goals", "goal status", "goal completion", "goal tracking"
     * Questions: "How are my goals?", "What's my goal progress?", "Show me my goals"
   
   - HABITS INTENT → Use getHabitsSummary
     * Keywords: "habits", "habit streak", "habit completion", "daily habits"
     * Questions: "How are my habits?", "What's my habit streak?", "Show me my habits"
   
   - TIMESHEET INTENT → Use getTimesheetStatus
     * Keywords: "time", "hours", "timesheet", "work hours", "clocked in", "worked"
     * Questions: "How many hours did I work?", "Am I clocked in?", "What's my timesheet status?"
   
   - CALENDAR INTENT → Use getCalendarEvents
     * Keywords: "calendar", "events", "schedule", "today", "tomorrow", "this week"
     * Questions: "What's on my calendar?", "What events do I have?", "Show me my schedule"
   
   - GENERAL/OVERALL INTENT → Use getAppSummary
     * Keywords: "summary", "overview", "everything", "all", "general", "status", "dashboard"
     * Questions: "Give me a summary", "What's my overall status?", "Show me everything"
     * When user asks about MULTIPLE different features at once

2. TOOL PRIORITY RULES:
   - Specific tools (getGoalsSummary, getHabitsSummary, getTimesheetStatus, getCalendarEvents) have HIGHER priority than getAppSummary
   - Only use getAppSummary if:
     a) User explicitly asks for "overall" or "general" summary
     b) User asks about MULTIPLE different features in one question
     c) No specific tool matches the user's intent
   - When in doubt between specific tool and getAppSummary → Choose the specific tool

3. REASONING PROCESS:
   Before calling tools, think step by step:
   Step 1: What is the user asking about? (goals, habits, timesheet, tasks, notes, or general?)
   Step 2: Is this about ONE specific feature or MULTIPLE features?
   Step 3: Which tool matches this intent?
   Step 4: Call that specific tool, NOT a general summary tool`

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
      description: "Get the current timesheet status including whether user is clocked in, on break, hours worked today and this week. USE THIS when user asks about: time, hours, timesheet, work hours, clocked in, worked, time tracking. DO NOT use getAppSummary when user specifically asks about timesheet or work hours.",
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
      description: "Get a general overview summary of ALL features (tasks, notes, timesheet, goals, habits). USE THIS when user asks for: overall summary, general status, everything, all my data, complete overview, or when asking about MULTIPLE different features at once. DO NOT use this when user asks about ONE specific feature (use the specific tool instead: getGoalsSummary for goals, getHabitsSummary for habits, getTimesheetStatus for timesheet, getCalendarEvents for calendar).",
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
      name: "switchTask",
      description: "Switch to a different task while staying clocked in. Use this when the user wants to change what they're working on without clocking out. This updates the current work session's task description.",
      parameters: {
        type: "object",
        properties: {
          newTaskTitle: {
            type: "string",
            description: "The new task title or description to switch to",
          },
        },
        required: ["newTaskTitle"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "updateTask",
      description: "Update an existing task. Use this to modify task title, priority, urgency, due date, or completion status.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "The ID of the task to update" },
          title: { type: "string", description: "Optional new title for the task" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Optional priority level" },
          urgency: { type: "string", enum: ["low", "medium", "high"], description: "Optional urgency level" },
          dueDate: { type: "string", description: "Optional due date in YYYY-MM-DD format" },
          completed: { type: "boolean", description: "Optional completion status" },
        },
        required: ["taskId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "deleteTask",
      description: "Delete a task permanently. Use this when user wants to remove a task.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "The ID of the task to delete" },
        },
        required: ["taskId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "completeTask",
      description: "Mark a task as completed. Use this when user wants to finish a task.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "The ID of the task to complete" },
        },
        required: ["taskId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "updateNote",
      description: "Update an existing note. Use this to modify note title, content, category, or tags.",
      parameters: {
        type: "object",
        properties: {
          noteId: { type: "string", description: "The ID of the note to update" },
          title: { type: "string", description: "Optional new title for the note" },
          content: { type: "string", description: "Optional new content for the note" },
          category: {
            type: "string",
            enum: ["work", "personal", "ideas", "meeting", "other"],
            description: "Optional category for the note",
          },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags for the note" },
        },
        required: ["noteId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "deleteNote",
      description: "Delete a note permanently. Use this when user wants to remove a note.",
      parameters: {
        type: "object",
        properties: {
          noteId: { type: "string", description: "The ID of the note to delete" },
        },
        required: ["noteId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "createGoal",
      description: "Create a new goal for the user. Goals help users track long-term objectives with progress tracking and milestones.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The title of the goal" },
          description: { type: "string", description: "Optional description of the goal" },
          targetDate: { type: "string", description: "Optional target date in YYYY-MM-DD format" },
          category: { type: "string", description: "Optional category for the goal" },
          status: {
            type: "string",
            enum: ["active", "completed", "paused", "cancelled"],
            description: "The status of the goal (default: active)",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "updateGoal",
      description: "Update an existing goal. Use this to modify goal details, progress, or status. You can find the goal by ID or by title. If the user mentions a goal by name, use goalTitle instead of goalId.",
      parameters: {
        type: "object",
        properties: {
          goalId: { type: "string", description: "The ID of the goal to update (UUID format)" },
          goalTitle: { type: "string", description: "The title or name of the goal (use this if user mentions goal by name instead of ID)" },
          title: { type: "string", description: "Optional new title for the goal" },
          description: { type: "string", description: "Optional new description" },
          targetDate: { type: "string", description: "Optional target date in YYYY-MM-DD format" },
          progress: { type: "number", description: "Optional progress percentage (0-100)" },
          status: {
            type: "string",
            enum: ["active", "completed", "paused", "cancelled"],
            description: "Optional status of the goal",
          },
          category: { type: "string", description: "Optional category" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "deleteGoal",
      description: "Delete a goal permanently. Use this when user wants to remove a goal. You can find the goal by ID or by title. If the user mentions a goal by name, use goalTitle instead of goalId.",
      parameters: {
        type: "object",
        properties: {
          goalId: { type: "string", description: "The ID of the goal to delete (UUID format)" },
          goalTitle: { type: "string", description: "The title or name of the goal (use this if user mentions goal by name instead of ID)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "updateGoalProgress",
      description: "Update the progress percentage of a goal (0-100). Use this when user wants to track goal completion. You can find the goal by ID or by title. If the user mentions a goal by name, use goalTitle instead of goalId.",
      parameters: {
        type: "object",
        properties: {
          goalId: { type: "string", description: "The ID of the goal (UUID format)" },
          goalTitle: { type: "string", description: "The title or name of the goal (use this if user mentions goal by name instead of ID)" },
          progress: { type: "number", description: "Progress percentage from 0 to 100" },
        },
        required: ["progress"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "createHabit",
      description: "Create a new habit for the user. Habits help users build consistent daily routines.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The title of the habit" },
          description: { type: "string", description: "Optional description of the habit" },
          frequency: {
            type: "string",
            enum: ["daily", "weekly", "custom"],
            description: "How often the habit should be performed (default: daily)",
          },
          targetCount: { type: "number", description: "Target count per period (default: 1)" },
          color: { type: "string", description: "Optional color in hex format (default: #3b82f6)" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "updateHabit",
      description: "Update an existing habit. Use this to modify habit details.",
      parameters: {
        type: "object",
        properties: {
          habitId: { type: "string", description: "The ID of the habit to update" },
          title: { type: "string", description: "Optional new title" },
          description: { type: "string", description: "Optional new description" },
          frequency: {
            type: "string",
            enum: ["daily", "weekly", "custom"],
            description: "Optional frequency",
          },
          targetCount: { type: "number", description: "Optional target count" },
          color: { type: "string", description: "Optional color in hex format" },
        },
        required: ["habitId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "deleteHabit",
      description: "Delete a habit permanently. Use this when user wants to remove a habit.",
      parameters: {
        type: "object",
        properties: {
          habitId: { type: "string", description: "The ID of the habit to delete" },
        },
        required: ["habitId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "logHabit",
      description: "Log habit completion for a specific date. Use this when user wants to mark a habit as done.",
      parameters: {
        type: "object",
        properties: {
          habitId: { type: "string", description: "The ID of the habit to log" },
          date: { type: "string", description: "Date in YYYY-MM-DD format (default: today)" },
          count: { type: "number", description: "Count for the habit (default: 1)" },
        },
        required: ["habitId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getGoalsSummary",
      description: "Get a summary of the user's goals including active goals, progress, upcoming milestones, and goals that haven't been started (0% progress). USE THIS when user asks about: goals, goal progress, active goals, goal status, goal completion, goal tracking, goal milestones. DO NOT use getAppSummary when user specifically asks about goals. CRITICAL: If the user asked to delete goals that haven't been started, this tool will return goal IDs. You MUST then immediately call deleteGoal for each goal ID provided.",
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
      name: "getHabitsSummary",
      description: "Get a summary of the user's habits including current streaks, completion rates, and recent activity. USE THIS when user asks about: habits, habit streak, habit completion, daily habits, habit tracking. DO NOT use getAppSummary when user specifically asks about habits.",
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
      name: "getCalendarEvents",
      description: "Get calendar events for a specific date or date range. Returns tasks, time entries, goals, and habits. USE THIS when user asks about: calendar, events, schedule, today, tomorrow, this week, upcoming events. DO NOT use getAppSummary when user specifically asks about calendar or schedule.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format (default: today)" },
          startDate: { type: "string", description: "Start date in YYYY-MM-DD format for range queries" },
          endDate: { type: "string", description: "End date in YYYY-MM-DD format for range queries" },
        },
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

        // Goals summary
        const goals = (state.goals || []) as Array<{ status: string; progress: number }>
        const activeGoals = goals.filter((g) => g.status === "active").length
        const avgProgress =
          activeGoals > 0
            ? goals
                .filter((g) => g.status === "active")
                .reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals
            : 0

        // Habits summary
        const habits = (state.habits || []) as Array<{ id: string }>
        const habitLogs = (state.habitLogs || []) as Array<{ habitId: string; date: string }>
        const todayHabitLogs = habitLogs.filter((log) => log.date === today).length

        return {
          message: `Daily Summary:\nTasks: ${state.tasks?.length || 0} total (${pendingTasks} pending, ${highPriorityTasks} high priority)\nNotes: ${state.notes?.length || 0} total\nGoals: ${goals.length} total (${activeGoals} active, avg progress: ${avgProgress.toFixed(1)}%)\nHabits: ${habits.length} total (${todayHabitLogs} logged today)\nToday's work: ${todayHours.toFixed(2)}h across ${sessionCount} session(s)\n${state.currentEntry ? "Currently working" : "Not working"}`,
        }
      }

      case "switchTask": {
        const { newTaskTitle } = toolInput as { newTaskTitle: string }
        if (!newTaskTitle?.trim()) {
          return { message: "Error: Task title is required to switch tasks" }
        }
        if (!state.currentEntry) {
          return { message: "Error: You must be clocked in to switch tasks. Please clock in first." }
        }
        return {
          message: `Switched to working on "${newTaskTitle}". You're still clocked in.`,
          action: { type: "switchTask", payload: { newTaskTitle: newTaskTitle.trim() } },
        }
      }

      case "updateTask": {
        const { taskId, title, priority, urgency, dueDate, completed } = toolInput as {
          taskId: string
          title?: string
          priority?: string
          urgency?: string
          dueDate?: string
          completed?: boolean
        }
        if (!taskId) return { message: "Error: Task ID is required" }
        const task = (state.tasks || []).find((t: { id: string }) => t.id === taskId)
        if (!task) return { message: "Error: Task not found" }
        return {
          message: `Task updated: "${title || task.title || 'Untitled'}"`,
          action: {
            type: "updateTask",
            payload: { id: taskId, title, priority, urgency, dueDate, completed },
          },
        }
      }

      case "deleteTask": {
        const { taskId } = toolInput as { taskId: string }
        if (!taskId) return { message: "Error: Task ID is required" }
        const task = (state.tasks || []).find((t: { id: string }) => t.id === taskId)
        if (!task) return { message: "Error: Task not found" }
        return {
          message: `Task "${task.title}" deleted successfully.`,
          action: { type: "deleteTask", payload: { id: taskId } },
        }
      }

      case "completeTask": {
        const { taskId } = toolInput as { taskId: string }
        if (!taskId) return { message: "Error: Task ID is required" }
        const task = (state.tasks || []).find((t: { id: string }) => t.id === taskId)
        if (!task) return { message: "Error: Task not found" }
        return {
          message: `Task "${task.title}" marked as completed!`,
          action: { type: "completeTask", payload: { id: taskId, completed: true } },
        }
      }

      case "updateNote": {
        const { noteId, title, content, category, tags } = toolInput as {
          noteId: string
          title?: string
          content?: string
          category?: string
          tags?: string[]
        }
        if (!noteId) return { message: "Error: Note ID is required" }
        const note = (state.notes || []).find((n: { id: string }) => n.id === noteId)
        if (!note) return { message: "Error: Note not found" }
        return {
          message: `Note updated: "${title || note.title || 'Untitled'}"`,
          action: { type: "updateNote", payload: { id: noteId, title, content, category, tags } },
        }
      }

      case "deleteNote": {
        const { noteId } = toolInput as { noteId: string }
        if (!noteId) return { message: "Error: Note ID is required" }
        const note = (state.notes || []).find((n: { id: string }) => n.id === noteId)
        if (!note) return { message: "Error: Note not found" }
        return {
          message: `Note "${note.title}" deleted successfully.`,
          action: { type: "deleteNote", payload: { id: noteId } },
        }
      }

      case "createGoal": {
        const { title, description, targetDate, category, status } = toolInput as {
          title: string
          description?: string
          targetDate?: string
          category?: string
          status?: string
        }
        if (!title?.trim()) return { message: "Error: Goal title is required" }
        return {
          message: `Goal created: "${title}"`,
          action: {
            type: "createGoal",
            payload: {
              title,
              description: description || null,
              targetDate: targetDate || null,
              category: category || null,
              status: status || "active",
              progress: 0,
            },
          },
        }
      }

      case "updateGoal": {
        const { goalId, goalTitle, title, description, targetDate, progress, status, category } = toolInput as {
          goalId?: string
          goalTitle?: string
          title?: string
          description?: string
          targetDate?: string
          progress?: number
          status?: string
          category?: string
        }
        
        let goal: { id: string; title: string } | undefined
        
        if (goalId) {
          goal = (state.goals || []).find((g: { id: string }) => g.id === goalId)
        }
        
        if (!goal && goalTitle) {
          goal = (state.goals || []).find((g: { title: string }) => 
            g.title.toLowerCase().includes(goalTitle.toLowerCase())
          )
        }
        
        if (!goal) {
          return { message: `Error: Goal not found. ${goalTitle ? `Could not find goal "${goalTitle}"` : "Please specify which goal to update."}` }
        }
        
        return {
          message: `Goal updated: "${title || goal.title || 'Untitled'}"`,
          action: {
            type: "updateGoal",
            payload: { id: goal.id, title, description, targetDate, progress, status, category },
          },
        }
      }

      case "deleteGoal": {
        const { goalId, goalTitle } = toolInput as { goalId?: string; goalTitle?: string }
        
        let goal: { id: string; title: string } | undefined
        
        if (goalId) {
          goal = (state.goals || []).find((g: { id: string }) => g.id === goalId)
        }
        
        if (!goal && goalTitle) {
          goal = (state.goals || []).find((g: { title: string }) => 
            g.title.toLowerCase().includes(goalTitle.toLowerCase())
          )
        }
        
        if (!goal) {
          return { message: `Error: Goal not found. ${goalTitle ? `Could not find goal "${goalTitle}"` : "Please specify which goal to delete."}` }
        }
        
        return {
          message: `Goal "${goal.title}" deleted successfully.`,
          action: { type: "deleteGoal", payload: { id: goal.id } },
        }
      }

      case "updateGoalProgress": {
        const { goalId, progress, goalTitle } = toolInput as { goalId?: string; progress: number; goalTitle?: string }
        if (progress === undefined || progress < 0 || progress > 100) {
          return { message: "Error: Progress must be a number between 0 and 100" }
        }
        
        let goal: { id: string; title: string } | undefined
        
        if (goalId) {
          // Try to find by ID first
          goal = (state.goals || []).find((g: { id: string }) => g.id === goalId)
        }
        
        // If not found by ID, try to find by title
        if (!goal && goalTitle) {
          goal = (state.goals || []).find((g: { title: string }) => 
            g.title.toLowerCase().includes(goalTitle.toLowerCase())
          )
        }
        
        // If still not found and we have goals, use the first active goal
        if (!goal && (state.goals || []).length > 0) {
          const activeGoals = (state.goals || []).filter((g: { status: string }) => g.status === "active")
          if (activeGoals.length === 1) {
            goal = activeGoals[0]
          }
        }
        
        if (!goal) {
          const availableGoals = (state.goals || [])
            .slice(0, 5)
            .map((g: { title: string }) => g.title)
            .join(", ")
          return { 
            message: `Error: Goal not found. ${goalTitle ? `Could not find goal "${goalTitle}"` : "Please specify which goal to update."} Available goals: ${availableGoals || "None"}` 
          }
        }
        
        return {
          message: `Goal "${goal.title}" progress updated to ${progress}%`,
          action: { type: "updateGoalProgress", payload: { id: goal.id, progress } },
        }
      }

      case "createHabit": {
        const { title, description, frequency, targetCount, color } = toolInput as {
          title: string
          description?: string
          frequency?: string
          targetCount?: number
          color?: string
        }
        if (!title?.trim()) return { message: "Error: Habit title is required" }
        return {
          message: `Habit created: "${title}"`,
          action: {
            type: "createHabit",
            payload: {
              title,
              description: description || null,
              frequency: frequency || "daily",
              targetCount: targetCount || 1,
              color: color || "#3b82f6",
            },
          },
        }
      }

      case "updateHabit": {
        const { habitId, title, description, frequency, targetCount, color } = toolInput as {
          habitId: string
          title?: string
          description?: string
          frequency?: string
          targetCount?: number
          color?: string
        }
        if (!habitId) return { message: "Error: Habit ID is required" }
        const habit = (state.habits || []).find((h: { id: string }) => h.id === habitId)
        if (!habit) return { message: "Error: Habit not found" }
        return {
          message: `Habit updated: "${title || habit.title || 'Untitled'}"`,
          action: {
            type: "updateHabit",
            payload: { id: habitId, title, description, frequency, targetCount, color },
          },
        }
      }

      case "deleteHabit": {
        const { habitId } = toolInput as { habitId: string }
        if (!habitId) return { message: "Error: Habit ID is required" }
        const habit = (state.habits || []).find((h: { id: string }) => h.id === habitId)
        if (!habit) return { message: "Error: Habit not found" }
        return {
          message: `Habit "${habit.title}" deleted successfully.`,
          action: { type: "deleteHabit", payload: { id: habitId } },
        }
      }

      case "logHabit": {
        const { habitId, date, count } = toolInput as { habitId: string; date?: string; count?: number }
        if (!habitId) return { message: "Error: Habit ID is required" }
        const habit = (state.habits || []).find((h: { id: string }) => h.id === habitId)
        if (!habit) return { message: "Error: Habit not found" }
        const logDate = date || new Date().toISOString().split("T")[0]
        return {
          message: `Habit "${habit.title}" logged for ${logDate}`,
          action: { type: "logHabit", payload: { habitId, date: logDate, count: count || 1 } },
        }
      }

      case "getGoalsSummary": {
        const goals = (state.goals || []) as Array<{
          id: string
          title: string
          status: string
          progress: number
          targetDate?: string
          milestones?: Array<{ title: string; completed: boolean }>
        }>
        const activeGoals = goals.filter((g) => g.status === "active")
        const completedGoals = goals.filter((g) => g.status === "completed")
        const pausedGoals = goals.filter((g) => g.status === "paused")
        const notStartedGoals = goals.filter((g) => (g.progress || 0) === 0 && (g.status === "active" || g.status === "paused"))
        const avgProgress =
          activeGoals.length > 0
            ? activeGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals.length
            : 0
        const upcomingMilestones = activeGoals
          .flatMap((g) =>
            (g.milestones || [])
              .filter((m) => !m.completed)
              .map((m) => ({ goal: g.title, milestone: m.title }))
          )
          .slice(0, 5)

        let summary = `Goals Summary:\n`
        summary += `Total: ${goals.length} (${activeGoals.length} active, ${completedGoals.length} completed, ${pausedGoals.length} paused)\n`
        summary += `Average progress: ${avgProgress.toFixed(1)}%\n`
        if (notStartedGoals.length > 0) {
          // Format for user display - don't show IDs, just show title and status
          summary += `\n\nGoals that haven't been started (0% progress):\n`
          summary += notStartedGoals.map((g) => `- "${g.title}" (${g.status})`).join("\n")
          // Note: The full goal data with IDs is available in the appState for the AI to use if deletion is requested
        }
        if (upcomingMilestones.length > 0) {
          summary += `\nUpcoming milestones:\n${upcomingMilestones.map((m) => `- ${m.milestone} (${m.goal})`).join("\n")}`
        }
        return { message: summary }
      }

      case "getHabitsSummary": {
        const habits = (state.habits || []) as Array<{ id: string; title: string }>
        const habitLogs = (state.habitLogs || []) as Array<{
          habitId: string
          date: string
          count: number
        }>
        const today = new Date().toISOString().split("T")[0]
        const todayLogs = habitLogs.filter((log) => log.date === today)

        // Calculate streaks (simplified - would need proper streak calculation from store)
        let summary = `Habits Summary:\n`
        summary += `Total habits: ${habits.length}\n`
        summary += `Logged today: ${todayLogs.length}/${habits.length}\n`
        if (habits.length > 0) {
          summary += `Active habits:\n${habits.slice(0, 5).map((h) => `- ${h.title}`).join("\n")}`
        }
        return { message: summary }
      }

      case "getCalendarEvents": {
        const { date, startDate, endDate } = toolInput as {
          date?: string
          startDate?: string
          endDate?: string
        }
        const targetDate = date || new Date().toISOString().split("T")[0]
        const tasks = (state.tasks || []) as Array<{ title: string; dueDate?: string; completed: boolean }>
        const timeEntries = (state.timeEntries || []) as Array<{ date: string; clockIn: string }>
        const goals = (state.goals || []) as Array<{ title: string; targetDate?: string }>
        const habits = (state.habits || []) as Array<{ id: string; title: string }>
        const habitLogs = (state.habitLogs || []) as Array<{ habitId: string; date: string }>

        let events: string[] = []

        // Tasks
        const dayTasks = tasks.filter((t) => t.dueDate === targetDate)
        if (dayTasks.length > 0) {
          events.push(`Tasks (${dayTasks.length}): ${dayTasks.map((t) => t.title).join(", ")}`)
        }

        // Time entries
        const dayEntries = timeEntries.filter((e) => e.date === targetDate)
        if (dayEntries.length > 0) {
          events.push(`Time entries: ${dayEntries.length} session(s)`)
        }

        // Goals
        const dayGoals = goals.filter((g) => g.targetDate === targetDate)
        if (dayGoals.length > 0) {
          events.push(`Goals: ${dayGoals.map((g) => g.title).join(", ")}`)
        }

        // Habits
        const dayHabitLogs = habitLogs.filter((log) => log.date === targetDate)
        if (dayHabitLogs.length > 0) {
          const loggedHabits = dayHabitLogs
            .map((log) => habits.find((h) => h.id === log.habitId)?.title)
            .filter(Boolean)
          events.push(`Habits logged: ${loggedHabits.join(", ")}`)
        }

        const summary = events.length > 0 ? events.join("\n") : `No events found for ${targetDate}`
        return { message: `Calendar Events for ${targetDate}:\n${summary}` }
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

    // Load user preferences and patterns from feedback (LEARNING CAPABILITY)
    let userPreferences = ""
    try {
      const { data: feedbackData } = await supabase
        .from("chat_feedback")
        .select("feedback_type, feedback_text, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (feedbackData && feedbackData.length > 0) {
        const negativeFeedback = feedbackData.filter((f) => f.feedback_type === "negative")
        const positiveFeedback = feedbackData.filter((f) => f.feedback_type === "positive")

        if (negativeFeedback.length > 0) {
          userPreferences += "\n\nUSER PREFERENCES (learned from feedback):\n"
          userPreferences += "- The user has given negative feedback on some responses. Pay attention to:\n"
          negativeFeedback.slice(0, 3).forEach((f) => {
            if (f.feedback_text) {
              userPreferences += `  * ${f.feedback_text}\n`
            }
          })
        }

        // Analyze tool usage patterns
        const { data: analyticsData } = await supabase
          .from("ai_usage_analytics")
          .select("tool_name, success")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(20)

        if (analyticsData && analyticsData.length > 0) {
          const toolUsage = analyticsData.reduce((acc: any, item: any) => {
            if (!acc[item.tool_name]) {
              acc[item.tool_name] = { success: 0, total: 0 }
            }
            acc[item.tool_name].total++
            if (item.success) acc[item.tool_name].success++
            return acc
          }, {})

          const preferredTools = Object.entries(toolUsage)
            .filter(([_, stats]: any) => stats.success / stats.total > 0.8 && stats.total >= 3)
            .map(([tool]) => tool)

          if (preferredTools.length > 0) {
            userPreferences += `- User frequently uses these tools successfully: ${preferredTools.join(", ")}\n`
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error loading user preferences:", error)
      // Continue without preferences if there's an error
    }

    const enhancedSystemPrompt = systemPrompt + userPreferences

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
        messages: [{ role: "system", content: enhancedSystemPrompt }, ...messages],
        tools,
        temperature: 0.3, // Lower temperature for more focused, deterministic responses
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
    let assistantContent = "" // Track accumulated assistant content

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
                  assistantContent += chunk.content
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
                        const startTime = Date.now()
                        const toolResult = executeTool(accumulated.name, parsedArgs || {}, appState)
                        const responseTime = Date.now() - startTime

                        // Track tool usage for learning (async, don't wait)
                        ;(async () => {
                          try {
                            await supabase.from("ai_usage_analytics").insert({
                              user_id: session.user.id,
                              tool_name: accumulated.name,
                              success: !toolResult.message.includes("Error"),
                              response_time_ms: responseTime,
                              error_message: toolResult.message.includes("Error") ? toolResult.message : null,
                            })
                          } catch (err) {
                            console.error("[v0] Failed to track tool usage:", err)
                          }
                        })()

                        hasContent = true // Mark that we have content from tool execution
                        // Send tool result as both a tool result AND as content so AI can respond
                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({ toolResult: toolResult.message, toolName: accumulated.name, toolAction: toolResult.action })}\n\n`,
                          ),
                        )
                        // For summary tools, we need to include the tool result in the AI's context so it can generate a response
                        // But we need to clean it first - remove internal instructions meant for the AI, not the user
                        const isSummaryTool = ["getGoalsSummary", "getHabitsSummary", "getCalendarEvents", "getTimesheetStatus", "getAppSummary", "getNotesSummary"].includes(accumulated.name)
                        if (isSummaryTool) {
                          // Clean the tool result - remove internal AI instructions and user-facing technical details
                          let cleanedResult = toolResult.message
                          // Remove "IMPORTANT" warnings and "ACTION REQUIRED" instructions that are for the AI, not the user
                          // Use [\s\S] instead of . with s flag for broader compatibility
                          cleanedResult = cleanedResult.replace(/⚠️\s*IMPORTANT:[\s\S]*?ACTION REQUIRED:[\s\S]*?\n\n/g, '')
                          cleanedResult = cleanedResult.replace(/⚠️\s*IMPORTANT:[\s\S]*?\n\n/g, '')
                          cleanedResult = cleanedResult.replace(/ACTION REQUIRED:.*?\n\n?/g, '')
                          // Remove lines that are instructions to the AI
                          cleanedResult = cleanedResult.split('\n').filter(line => {
                            return !line.includes('If the user asked to delete') &&
                                   !line.includes('you MUST call') &&
                                   !line.includes('Use deleteGoal tool') &&
                                   !line.includes('MUST call deleteGoal')
                          }).join('\n')
                          
                          // Remove goal IDs and other technical details from user-facing output
                          // IDs are useful for the AI but shouldn't be shown to users
                          cleanedResult = cleanedResult.replace(/\(ID: [^)]+\)/g, '')
                          cleanedResult = cleanedResult.replace(/ID: [a-f0-9-]+/gi, '')
                          cleanedResult = cleanedResult.replace(/, Status: [^)]+/g, '')
                          // Clean up any double spaces or formatting issues
                          cleanedResult = cleanedResult.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim()
                          
                          // Include the cleaned tool result directly in the content stream
                          // This allows the AI to see the data and generate a proper response
                          // The tool result is already sent as toolResult for the frontend to display
                          // But we also need to include it in content so the AI can process it and respond
                          if (cleanedResult.trim()) {
                            // Send the cleaned result as content - the AI will see it and generate a summary
                            controller.enqueue(
                              encoder.encode(`data: ${JSON.stringify({ delta: { content: cleanedResult + "\n\n" } })}\n\n`),
                            )
                            assistantContent += cleanedResult + "\n\n"
                          }
                        } else {
                          // For action tools, send the result as content so the AI can confirm the action
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ delta: { content: toolResult.message + "\n\n" } })}\n\n`),
                          )
                          assistantContent += toolResult.message + "\n\n"
                        }

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
                const startTime = Date.now()
                const toolResult = executeTool(accumulated.name, parsedArgs, appState)
                const responseTime = Date.now() - startTime

                // Track tool usage for learning (async, don't wait)
                ;(async () => {
                  try {
                    await supabase.from("ai_usage_analytics").insert({
                      user_id: session.user.id,
                      tool_name: accumulated.name,
                      success: !toolResult.message.includes("Error"),
                      response_time_ms: responseTime,
                      error_message: toolResult.message.includes("Error") ? toolResult.message : null,
                    })
                  } catch (err) {
                    console.error("[v0] Failed to track tool usage:", err)
                  }
                })()

                hasContent = true
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ toolResult: toolResult.message, toolName: accumulated.name, toolAction: toolResult.action })}\n\n`,
                  ),
                )
                // For summary tools, don't send as content to avoid duplication - the AI will generate its own response
                // For action tools (create, update, delete), send as content so the AI can confirm the action
                const isSummaryTool = ["getGoalsSummary", "getHabitsSummary", "getCalendarEvents", "getTimesheetStatus", "getAppSummary", "getNotesSummary"].includes(accumulated.name)
                if (!isSummaryTool) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ delta: { content: toolResult.message + "\n\n" } })}\n\n`),
                  )
                }
              } catch (e) {
                console.log("[v0] Skipping incomplete tool call:", accumulated.name)
              }
            }
          }

          // If we only have tool results but no AI-generated content, check if we should wait or provide fallback
          // The AI should generate a response after seeing tool results, but if it doesn't, we provide context-aware response
          const hasToolResults = hasContent && Object.keys(toolCallAccumulator).length === 0
          const hasNoTextContent = !assistantContent || assistantContent.trim().length === 0
          
          // If we have tool results but no text content, it means the AI didn't generate a response
          // This can happen if the tool result wasn't properly included in the content
          // In that case, we should still provide a helpful response based on the tool result
          if (hasToolResults && hasNoTextContent) {
            console.log("[v0] Tool executed but no AI text response - providing fallback based on tool result")
            // The tool result should have been included in content above, but if not, provide a basic response
            // This shouldn't normally happen, but it's a safety net
          }
          
          if (!hasContent || (!hasToolResults && hasNoTextContent)) {
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
          const errorMessage = error instanceof Error ? error.message : String(error)
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
            )
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          } catch (e) {
            // If we can't send error through stream, just close
          }
          controller.close()
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
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : JSON.stringify(error)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
