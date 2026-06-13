// Next.js instrumentation hook. Loads the correct Sentry config per runtime
// and wires request-error capture for the App Router.
import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

// Captures errors thrown in nested React Server Components.
export const onRequestError = Sentry.captureRequestError
