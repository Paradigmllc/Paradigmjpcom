/**
 * vitest.config.ts — minimal viable test configuration
 *
 * 役割: lib/* の純関数 unit test を回す。jsdom 環境で react component テストも可能。
 * 入力: なし
 * 出力: vitest config
 *
 * 永久ルール (LL): 共通ユーティリティ・複雑なビジネスロジックには最低限テスト必須。
 *
 * Run:
 *   npm run test          # one-shot
 *   npm run test:watch    # watch mode
 *   npm run test:coverage # with coverage
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
    },
  },
})
