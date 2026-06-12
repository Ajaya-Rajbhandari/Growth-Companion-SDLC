// Sliding-window rate limiter, in-memory per server instance.
// On serverless this state is per warm instance, so the effective global limit
// can be a small multiple of `limit` — acceptable as a cost/abuse guard.
// Swap for a shared store (e.g. @upstash/ratelimit) if strict limits are needed.

const buckets = new Map<string, number[]>()

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const timestamps = (buckets.get(key) ?? []).filter((t) => t > now - windowMs)

  if (timestamps.length >= limit) {
    buckets.set(key, timestamps)
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((timestamps[0] + windowMs - now) / 1000)),
    }
  }

  timestamps.push(now)
  buckets.set(key, timestamps)
  return { allowed: true, retryAfterSeconds: 0 }
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
      },
    }
  )
}
