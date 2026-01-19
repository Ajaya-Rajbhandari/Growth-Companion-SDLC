import { describe, expect, it } from "vitest"
import { cn } from "../lib/utils"

describe("cn", () => {
  it("merges conditional class names", () => {
    const value = cn("base", false && "hidden", "active")
    expect(value).toBe("base active")
  })

  it("deduplicates tailwind classes", () => {
    const value = cn("px-2", "px-4")
    expect(value).toBe("px-4")
  })
})
