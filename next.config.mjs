import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { withSentryConfig } from "@sentry/nextjs"

const projectRoot = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    unoptimized: true,
  },
  // PWA configuration
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: "sns-tech-services",
  project: "companion",

  // Suppress SDK build logs.
  silent: !process.env.CI,

  // Upload source maps only when an auth token is present (CI/Vercel).
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Route Sentry requests through a Next.js rewrite to bypass ad-blockers.
  tunnelRoute: "/monitoring",

  // Tree-shake Sentry logger statements to reduce bundle size.
  disableLogger: true,

  // Hide source maps from the generated client bundles.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})
