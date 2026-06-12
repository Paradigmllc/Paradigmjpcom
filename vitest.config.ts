/**
 * Minimal Vitest configuration for Paradigm.
 *
 * Unit tests cover shared sales logic, API helpers, and complex business rules.
 * React component tests run in jsdom when needed.
 */

import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist", "src/payload-types.ts", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "src/payload-types.ts",
        "src/migrations/**",
        "**/*.config.{ts,js}",
        "**/_registry.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@payload-config": path.resolve(__dirname, "./payload.config.ts"),
      "@browserbasehq/stagehand": path.resolve(__dirname, "./src/lib/sales/__mocks__/stagehand-stub.ts"),
    },
  },
})
