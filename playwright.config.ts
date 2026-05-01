/**
 * playwright.config.ts — minimal viable E2E configuration
 *
 * 役割: 主要ユーザーフロー (homepage / contact form / blog / proposal page) を
 *       Playwright で smoke test する。
 *
 * Run:
 *   npm run e2e          # all tests against E2E_BASE_URL (default: prod)
 *   npm run e2e:local    # against http://localhost:3000 (要 npm run dev 別 terminal)
 *   npm run e2e:headed   # ブラウザ可視化 (debugging)
 *
 * 永久ルール (LL): 主要ユーザーフローは Playwright で E2E カバー。
 */

import { defineConfig, devices } from "@playwright/test"

const BASE_URL = process.env.E2E_BASE_URL ?? "https://paradigmjp.com"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "ja-JP",
    extraHTTPHeaders: { "Accept-Language": "ja,en;q=0.8" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
    },
  ],
})
