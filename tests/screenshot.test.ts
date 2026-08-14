import { describe, expect, it } from "vitest"
import {
  MAX_IMAGE_EDGE,
  base64ByteLength,
  fitWithin,
  imageFromClipboard,
  isAcceptedImageType,
  stripDataUrlPrefix,
} from "@/lib/screenshot"

describe("isAcceptedImageType", () => {
  it("accepts the three raster types the route allows", () => {
    expect(isAcceptedImageType("image/png")).toBe(true)
    expect(isAcceptedImageType("image/jpeg")).toBe(true)
    expect(isAcceptedImageType("image/webp")).toBe(true)
  })

  // SVG is markup, not a raster image: it can carry script and external
  // references, and Gemini rejects it anyway.
  it("rejects SVG and non-images", () => {
    expect(isAcceptedImageType("image/svg+xml")).toBe(false)
    expect(isAcceptedImageType("application/pdf")).toBe(false)
    expect(isAcceptedImageType("text/plain")).toBe(false)
    expect(isAcceptedImageType("")).toBe(false)
  })
})

describe("fitWithin", () => {
  it("leaves an image that already fits alone rather than upscaling it", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(MAX_IMAGE_EDGE, 400)).toEqual({ width: MAX_IMAGE_EDGE, height: 400 })
  })

  it("scales a wide retina screenshot down by its longest edge", () => {
    expect(fitWithin(3840, 2160)).toEqual({ width: 1920, height: 1080 })
  })

  it("scales by height when the image is taller than it is wide", () => {
    expect(fitWithin(1000, 4000)).toEqual({ width: 480, height: 1920 })
  })

  it("keeps a very thin image at least one pixel wide", () => {
    // A 1x5000 strip scales to 0.384 wide, which would produce a zero-width
    // canvas and a blank capture.
    expect(fitWithin(1, 5000).width).toBe(1)
  })

  it("does not divide by zero on a degenerate size", () => {
    expect(fitWithin(0, 0)).toEqual({ width: 0, height: 0 })
  })
})

describe("stripDataUrlPrefix", () => {
  it("removes the data-URL header the canvas produces", () => {
    expect(stripDataUrlPrefix("data:image/jpeg;base64,AAAA")).toBe("AAAA")
  })

  it("leaves a bare base64 payload untouched", () => {
    expect(stripDataUrlPrefix("AAAA")).toBe("AAAA")
  })
})

describe("base64ByteLength", () => {
  it("accounts for padding when sizing the decoded payload", () => {
    // "AAAA" -> 3 bytes, "AAA=" -> 2 bytes, "AA==" -> 1 byte.
    expect(base64ByteLength("AAAA")).toBe(3)
    expect(base64ByteLength("AAA=")).toBe(2)
    expect(base64ByteLength("AA==")).toBe(1)
  })

  it("never reports a negative size", () => {
    expect(base64ByteLength("")).toBe(0)
  })
})

describe("imageFromClipboard", () => {
  function items(
    entries: Array<{ kind: string; type: string; file?: File | null }>,
  ): DataTransferItemList {
    return entries.map((entry) => ({
      kind: entry.kind,
      type: entry.type,
      getAsFile: () => entry.file ?? null,
    })) as unknown as DataTransferItemList
  }

  const png = new File([""], "shot.png", { type: "image/png" })

  it("finds the image in a clipboard that also carries text", () => {
    const result = imageFromClipboard(
      items([
        { kind: "string", type: "text/plain" },
        { kind: "file", type: "image/png", file: png },
      ]),
    )
    expect(result).toBe(png)
  })

  // A plain text paste must fall through to the input untouched, or typing
  // breaks for everyone who never pastes a screenshot.
  it("returns null for a text-only paste", () => {
    expect(imageFromClipboard(items([{ kind: "string", type: "text/plain" }]))).toBeNull()
  })

  it("ignores a file the route would refuse", () => {
    const pdf = new File([""], "spec.pdf", { type: "application/pdf" })
    expect(imageFromClipboard(items([{ kind: "file", type: "application/pdf", file: pdf }]))).toBeNull()
  })

  it("survives an empty or missing clipboard", () => {
    expect(imageFromClipboard(items([]))).toBeNull()
    expect(imageFromClipboard(null)).toBeNull()
    expect(imageFromClipboard(undefined)).toBeNull()
  })
})
