import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    ".agents/**",
    ".codex/**",
    "test-results/**",
    "coverage/**",
    "dist/**",
    "astro-demo/dist/**",
    "src/payload-types.ts",
  ]),
])
