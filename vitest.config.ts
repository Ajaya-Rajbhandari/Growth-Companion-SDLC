import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    // Default stays "node" so the existing store/unit suite is untouched.
    // Component and hook tests opt in per file with a
    // `// @vitest-environment jsdom` docblock plus `import "./setup-dom"`.
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
