// @vitest-environment jsdom
import "../setup-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { act } from "react"

const toast = vi.fn()
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
  useToast: () => ({ toast, dismiss: vi.fn(), toasts: [] }),
}))

const insert = vi.fn()
vi.mock("@/lib/supabase", () => ({
  supabase: { from: (table: string) => ({ insert: (values: unknown) => insert(table, values) }) },
}))

const storeState: Record<string, any> = {}
vi.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: any) => unknown) => selector(storeState),
}))

import { FeedbackCard } from "@/components/feedback-card"

async function click(name: RegExp) {
  await act(async () => {
    screen.getByRole("button", { name }).click()
  })
}

async function type(value: string) {
  const box = screen.getByLabelText(/your feedback/i) as HTMLTextAreaElement
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!
  await act(async () => {
    setter.call(box, value)
    box.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

describe("FeedbackCard", () => {
  beforeEach(() => {
    toast.mockClear()
    insert.mockReset()
    insert.mockResolvedValue({ error: null })
    storeState.user = { id: "user-1", name: "T", email: "t@e.com" }
    storeState.activeView = "dashboard"
  })

  it("renders nothing when signed out", () => {
    storeState.user = null
    const { container } = render(<FeedbackCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it("submits the message with category and originating view", async () => {
    render(<FeedbackCard />)
    await click(/bug/i)
    await type("Timer keeps running after I close the app")
    await click(/send feedback/i)

    expect(insert).toHaveBeenCalledWith("user_feedback", {
      user_id: "user-1",
      category: "bug",
      message: "Timer keeps running after I close the app",
      page: "dashboard",
    })
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringMatching(/thanks/i) }))
  })

  it("defaults to the idea category and trims whitespace", async () => {
    render(<FeedbackCard />)
    await type("   Add a weekly summary email   ")
    await click(/send feedback/i)

    expect(insert).toHaveBeenCalledWith(
      "user_feedback",
      expect.objectContaining({ category: "idea", message: "Add a weekly summary email" }),
    )
  })

  it("never sends an empty message", async () => {
    render(<FeedbackCard />)
    await type("    ")
    const send = screen.getByRole("button", { name: /send feedback/i }) as HTMLButtonElement

    expect(send.disabled).toBe(true)
    expect(insert).not.toHaveBeenCalled()
  })

  it("surfaces a failed write instead of claiming success", async () => {
    insert.mockResolvedValue({ error: { message: "permission denied" } })
    render(<FeedbackCard />)
    await type("Something broke")
    await click(/send feedback/i)

    expect(await screen.findByText(/permission denied/i)).toBeTruthy()
    expect(toast).not.toHaveBeenCalled()
  })

  it("keeps the message in the box when sending fails, so it is not lost", async () => {
    insert.mockResolvedValue({ error: { message: "network down" } })
    render(<FeedbackCard />)
    await type("Worth keeping")
    await click(/send feedback/i)

    expect((screen.getByLabelText(/your feedback/i) as HTMLTextAreaElement).value).toBe("Worth keeping")
  })
})
