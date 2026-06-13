// Sentry configuration for the Node.js server runtime.
// Loaded via instrumentation.ts -> register().
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 100% of transactions in dev, 10% in production.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Only send events when a DSN is configured.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  debug: false,
})
