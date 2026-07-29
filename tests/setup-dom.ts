// DOM-test setup. Import this from any test file that also carries a
// `// @vitest-environment jsdom` docblock; it is deliberately NOT a global
// setupFile so the node-environment store suite stays unaffected.
import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

afterEach(() => {
  cleanup()
})
