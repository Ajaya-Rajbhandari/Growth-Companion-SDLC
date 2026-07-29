export type JsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; status: 400 | 413; error: string }

export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  const declaredLength = Number(request.headers.get("content-length") || "0")
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, status: 413, error: "Request body is too large." }
  }

  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { ok: false, status: 413, error: "Request body is too large." }
  }

  try {
    return { ok: true, data: JSON.parse(raw) }
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON request body." }
  }
}
