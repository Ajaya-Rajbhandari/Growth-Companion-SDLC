import { describe, expect, it } from "vitest"
import {
  extractGeminiText,
  geminiFinishReason,
  THINKING_DISABLED,
  toGeminiContents,
} from "@/lib/server/gemini"

describe("Gemini request helpers", () => {
  it("maps assistant history to Gemini roles and excludes system messages", () => {
    expect(
      toGeminiContents([
        { role: "system", content: "Handled separately" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ]),
    ).toEqual([
      { role: "user", parts: [{ text: "Hello" }] },
      { role: "model", parts: [{ text: "Hi there" }] },
    ])
  })

  it("combines text parts from a Gemini response", () => {
    expect(
      extractGeminiText({
        candidates: [{ content: { parts: [{ text: "First " }, { text: "second" }] } }],
      }),
    ).toBe("First second")
  })

  it("returns an empty string for a response without text", () => {
    expect(extractGeminiText({ candidates: [] })).toBe("")
  })

  // A 2.5-model reply truncated by MAX_TOKENS carries partial JSON. Callers must
  // be able to tell that apart from a genuine parse failure.
  it("reports the finish reason so truncated replies are detectable", () => {
    const truncated = {
      candidates: [{ content: { parts: [{ text: '{\n  "insight":' }] }, finishReason: "MAX_TOKENS" }],
    }

    expect(geminiFinishReason(truncated)).toBe("MAX_TOKENS")
    expect(() => JSON.parse(extractGeminiText(truncated))).toThrow()
  })

  it("falls back to UNKNOWN when no finish reason is present", () => {
    expect(geminiFinishReason({ candidates: [] })).toBe("UNKNOWN")
  })

  it("disables thinking with a zero budget", () => {
    expect(THINKING_DISABLED).toEqual({ thinkingBudget: 0 })
  })
})
