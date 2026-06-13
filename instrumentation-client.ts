// Sentry configuration for the browser. Runs on the client before hydration.
// In Sentry v9+/Next.js this file replaces sentry.client.config.ts and is
// Turbopack-compatible.
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance monitoring: 100% in dev, 10% in production.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay: record 10% of sessions, 100% of sessions with an error.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Only send events when a DSN is configured.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  debug: false,
})

// Required for Sentry to capture navigation/router transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
