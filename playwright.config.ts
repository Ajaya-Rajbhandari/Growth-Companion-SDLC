import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  // Warm /auth and / before tests so first-compile cost is paid once, up front.
  globalSetup: "./tests/e2e/global-setup.ts",
  // Generous timeouts as a safety net for slow cold compiles.
  timeout: 60_000,
  expect: {
    timeout: 20_000,
  },
  // Serial execution: the first test warms the browser-side route compile so the
  // rest reuse it. With a tiny suite this is more reliable than racing parallel
  // workers through cold Turbopack compiles.
  fullyParallel: false,
  workers: 1,
  // One retry absorbs any residual first-compile flakiness on a cold server.
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
