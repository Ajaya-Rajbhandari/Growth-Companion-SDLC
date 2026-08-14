// Client-side preparation for screenshots pasted into the task-title fields.
//
// A pasted screenshot is often a 2-4 MB retina PNG. Sending that verbatim would
// make the request slow, expensive, and large enough that the route's body guard
// would have to be loosened to the point of not guarding anything. Downscaling to
// a 1920px long edge and re-encoding as JPEG puts a typical capture in the low
// hundreds of KB while leaving task titles, issue keys, and card headers legible.

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number]

/** Longest edge, in pixels, of the image actually sent to the model. */
export const MAX_IMAGE_EDGE = 1920

/** JPEG quality for the re-encode. High enough to keep small UI text readable. */
export const IMAGE_QUALITY = 0.85

/** Ceiling on the encoded bytes we will send. The route enforces its own. */
export const MAX_ENCODED_BYTES = 1_500_000

export function isAcceptedImageType(type: string): type is AcceptedImageType {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type)
}

/**
 * Scale `width`x`height` down so its longest edge is at most `maxEdge`,
 * preserving aspect ratio. Images already within bounds are returned unchanged,
 * so a small screenshot is never upscaled into a blurry mess.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge = MAX_IMAGE_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge || longest === 0) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Strips the `data:<mime>;base64,` prefix, leaving the payload Gemini wants. */
export function stripDataUrlPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(",")
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1)
}

/** Approximate decoded size of a base64 payload, without decoding it. */
export function base64ByteLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

/**
 * Pulls the first image out of a paste event's clipboard, or null when the paste
 * was plain text. Screenshot pastes arrive as a file item, not as text.
 */
export function imageFromClipboard(items: DataTransferItemList | null | undefined): File | null {
  if (!items) return null
  for (const item of Array.from(items)) {
    if (item.kind !== "file") continue
    const file = item.getAsFile()
    if (file && isAcceptedImageType(file.type)) return file
  }
  return null
}

export interface PreparedScreenshot {
  /** Base64 payload with no data-URL prefix — what the API route expects. */
  data: string
  mimeType: "image/jpeg"
  /** Data URL for the on-screen thumbnail. */
  previewUrl: string
}

/**
 * Decodes, downscales, and re-encodes a screenshot for upload. Runs entirely in
 * the browser; the original file never leaves the machine.
 *
 * Transparent regions are flattened onto white first — JPEG has no alpha channel,
 * and without this a PNG with transparency turns those areas black, which reads
 * as a corrupted screenshot to both the user and the model.
 */
export async function prepareScreenshot(file: File): Promise<PreparedScreenshot> {
  if (!isAcceptedImageType(file.type)) {
    throw new Error("That file is not a PNG, JPEG, or WebP image.")
  }

  const bitmap = await createImageBitmap(file)
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) throw new Error("Could not read the image in this browser.")
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)

    const previewUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY)
    const data = stripDataUrlPrefix(previewUrl)

    if (base64ByteLength(data) > MAX_ENCODED_BYTES) {
      throw new Error("That screenshot is too large to read. Try cropping it first.")
    }

    return { data, mimeType: "image/jpeg", previewUrl }
  } finally {
    bitmap.close()
  }
}
