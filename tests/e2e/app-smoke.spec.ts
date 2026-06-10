import { expect, test, type Page } from "@playwright/test"

const todayKey = new Date().toLocaleDateString("en-CA")
const now = new Date()
const clockIn = new Date(now.getTime() - 45 * 60 * 1000).toISOString()

const user = {
  id: "e2e-user",
  email: "e2e@example.com",
  created_at: "2024-01-01T00:00:00.000Z",
  user_metadata: {
    full_name: "E2E User",
    hasCompletedOnboarding: true,
  },
}

const activeEntry = {
  id: "entry-active",
  user_id: user.id,
  date: todayKey,
  clock_in: clockIn,
  clock_out: null,
  break_minutes: 0,
  breaks: [],
  title: "Initial smoke task",
  notes: null,
  template_id: null,
  category: null,
  subtasks: [],
}

async function mockSupabase(page: Page) {
  await page.route("**/auth/v1/token**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "e2e-access-token",
        refresh_token: "e2e-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user,
      }),
    })
  })

  await page.route("**/auth/v1/user**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    })
  })

  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split("/").pop()

    if (table === "time_entries" && request.method() === "PATCH") {
      const body = request.postDataJSON() as { title?: string; subtasks?: unknown[]; category?: string | null }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...activeEntry,
          title: body.title ?? activeEntry.title,
          category: body.category ?? null,
          subtasks: body.subtasks ?? [],
        }),
      })
      return
    }

    const fixtures: Record<string, unknown[]> = {
      tasks: [
        {
          id: "task-1",
          user_id: user.id,
          title: "Smoke task from API",
          completed: false,
          priority: "high",
          urgency: "medium",
          due_date: todayKey,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      notes: [],
      time_entries: [activeEntry],
      work_templates: [],
      chat_sessions: [],
      time_categories: [],
      goals: [],
      habits: [],
      habit_logs: [],
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fixtures[table || ""] ?? []),
    })
  })
}

test("core app smoke: login, dashboard, and timesheet task switch", async ({ page }) => {
  await mockSupabase(page)

  await page.goto("/auth")
  await page.getByPlaceholder("you@example.com").fill(user.email)
  await page.getByPlaceholder("Enter your password").fill("password123")
  await page.getByRole("button", { name: "Sign In" }).click()

  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening), E2E!/ })).toBeVisible()
  await expect(page.getByText("Currently Working")).toBeVisible()

  await page.getByRole("button", { name: "Timesheet Active" }).click()
  await expect(page.getByRole("heading", { name: "Timesheet" })).toBeVisible()
  await expect(page.getByText("Initial smoke task").first()).toBeVisible()

  await page.getByRole("button", { name: "Log new task" }).click()
  await page.getByPlaceholder(/Team standup, Code review/).fill("Smoke switched task")
  await page.getByRole("button", { name: "Log & switch" }).click()

  await expect(page.getByText("Smoke switched task").first()).toBeVisible()
  await expect(page.getByText("Initial smoke task").first()).toBeVisible()
})
