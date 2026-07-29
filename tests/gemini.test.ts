import { describe, expect, it } from "vitest"
import { extractGeminiText, toGeminiContents } from "@/lib/server/gemini"

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
})
