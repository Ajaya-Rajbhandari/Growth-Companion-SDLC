// Pre-warms the dev server's routes before the suite runs. The dev server
// compiles each route on first request (Turbopack); without warming, the first
// tests race through cold compiles and can exceed their timeouts. The whole app
// is two routes — /auth and / (all views render within /) — so warming both is
// enough to make subsequent navigations fast and deterministic.
import type { FullConfig } from "@playwright/test"

async function warm(url: string) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        await res.text() // drain so compilation completes
        return
      }
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`Timed out warming ${url}`)
}

export default async function globalSetup(_config: FullConfig) {
  const base = "http://127.0.0.1:3000"
  await warm(`${base}/auth`)
  await warm(`${base}/`)
}
