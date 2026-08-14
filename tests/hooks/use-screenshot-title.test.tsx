// @vitest-environment jsdom
import "../setup-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { useScreenshotTitle } from "@/components/timesheet/use-screenshot-title"

// The real prepareScreenshot needs createImageBitmap and a canvas, neither of
// which jsdom provides. The paste plumbing is what these tests are about.
vi.mock("@/lib/screenshot", async () => {
  const actual = await vi.importActual<typeof import("@/lib/screenshot")>("@/lib/screenshot")
  return {
    ...actual,
    prepareScreenshot: vi.fn(async () => ({
      data: "QUJD",
      mimeType: "image/jpeg" as const,
      previewUrl: "data:image/jpeg;base64,QUJD",
    })),
  }
})

vi.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({ timeEntries: [], getTopTemplates: () => [] }),
}))

function Surface({ active, onTitles }: { active: boolean; onTitles?: (titles: string[]) => void }) {
  const screenshot = useScreenshotTitle(active)
  onTitles?.(screenshot.suggestions)
  return <div data-testid="surface">{screenshot.status}</div>
}

/**
 * A paste event carrying a screenshot. Dispatched on `document` — which is where
 * it lands when the user has not clicked into any field first, the case that made
 * pasting silently do nothing when the listener lived on the card subtree.
 */
function pasteImage(target: EventTarget = document) {
  const file = new File(["fake"], "shot.png", { type: "image/png" })
  const event = new Event("paste", { bubbles: true, cancelable: true }) as Event & {
    clipboardData: unknown
  }
  event.clipboardData = {
    items: [{ kind: "file", type: "image/png", getAsFile: () => file }],
  }
  target.dispatchEvent(event)
  return event
}

function pasteText(target: EventTarget = document) {
  const event = new Event("paste", { bubbles: true, cancelable: true }) as Event & {
    clipboardData: unknown
  }
  event.clipboardData = {
    items: [{ kind: "string", type: "text/plain", getAsFile: () => null }],
  }
  target.dispatchEvent(event)
  return event
}

describe("useScreenshotTitle paste capture", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ summary: "A card", suggestions: ["Fix Login Redirect"] }),
    }))
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // The bug this guards: the handler was on the card subtree, so a paste with
  // focus still on <body> never reached it and the feature looked broken.
  it("catches a paste when nothing inside the surface has focus", async () => {
    render(<Surface active />)

    pasteImage(document)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0]).toBe("/api/extract-task-title")
  })

  it("leaves a plain text paste alone", async () => {
    render(<Surface active />)

    const event = pasteText(document)

    expect(event.defaultPrevented).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("claims the image paste so it does not also land in the focused input", () => {
    render(<Surface active />)

    const event = pasteImage(document)

    expect(event.defaultPrevented).toBe(true)
  })

  it("ignores pastes while the surface is inactive", () => {
    render(<Surface active={false} />)

    pasteImage(document)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  // The clock-in card stays mounted behind an open dialog. One paste must fill in
  // one field, not both.
  it("gives the paste to the most recently activated surface only", async () => {
    const cardTitles: string[][] = []
    const dialogTitles: string[][] = []

    render(
      <>
        <Surface active onTitles={(titles) => cardTitles.push(titles)} />
        <Surface active onTitles={(titles) => dialogTitles.push(titles)} />
      </>,
    )

    pasteImage(document)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(dialogTitles.at(-1)).toEqual(["Fix Login Redirect"]))
    expect(cardTitles.at(-1)).toEqual([])
  })

  it("stops listening once every surface has unmounted", () => {
    const { unmount } = render(<Surface active />)
    unmount()

    pasteImage(document)

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
