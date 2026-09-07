import { test, expect } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

test("existing Factory dashboard shows runtime evidence and clears stale success", async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const assets = resolve("services/video-factory/src/video_factory/static")
  const requests: string[] = []
  let fail = false
  const snapshot = {
    status: "conditional", score: 82, template_count: 12, ready_capabilities: 1,
    generated_at: "2026-09-07T09:00:00Z", capacity: { safe_parallel_jobs: 1 },
    capabilities: ["ready", "conditional", "blocked"].map((state, i) => ({
      shot_kind: ["text_motion", "generative", "lip_sync"][i], state,
      primary_engine: "fixture", selected_engine: "fixture", dedicated_template: false,
      template_ids: [], summary: "検証用の環境情報。品質評価ではありません。",
    })),
    checks: [{ passed: false, label: "生成ワーカー", evidence: "接続未確認" }],
    gaps: ["権利と作品の実映像レビューが必要", '<img src=x onerror="window.injected=true">'],
    automated_stages: [], human_gates: ["draft_creative_review", "final_delivery_approval"],
  }
  // Offline fixture: serve real committed assets, never reach production or a provider.
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url())
    requests.push(`${route.request().method()} ${url.pathname}`)
    if (url.hostname !== "factory-fixture.test") return route.abort()
    if (url.pathname === "/v1/console/bootstrap") return route.fulfill({ status: 401, json: { detail: "Fixture starts disconnected" } })
    if (url.pathname === "/v1/studio/readiness") return route.fulfill({ status: fail ? 503 : 200, json: fail ? { detail: "Fixture unavailable" } : snapshot })
    const filename = url.pathname === "/console/" ? "console.html" : url.pathname.slice("/console/".length)
    if (!url.pathname.startsWith("/console/") || !/^[a-z-]+\.(html|js|css)$/.test(filename)) return route.fulfill({ status: 404, body: "Unknown fixture route" })
    return route.fulfill({ body: await readFile(resolve(assets, filename)), contentType: filename.endsWith(".js") ? "application/javascript" : filename.endsWith(".css") ? "text/css" : "text/html" })
  })
  const pageErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  await page.goto("https://factory-fixture.test/console/")
  await expect(page.locator("#dashboard-readiness")).toContainText("未接続")
  await expect(page.getByRole("heading", { name: "今できること・次に確認すること" })).toBeVisible()
  await expect(page.getByRole("link", { name: "8項目品質・費用台帳を別タブで開く" })).toHaveAttribute("rel", "noopener noreferrer")
  // Simulate authenticated connection only for this read-only component flow.
  await page.evaluate("state.connected = true; window.loadStudioReadiness()")
  await expect(page.locator(".dashboard-capability-counts > div")).toHaveCount(3)
  await expect(page.locator("#dashboard-readiness")).toContainText("接続未確認")
  await expect(page.locator("#dashboard-readiness")).toContainText('<img src=x onerror="window.injected=true">')
  expect(await page.evaluate("window.injected")).toBeUndefined()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath("factory-overview.png"), fullPage: true })
  await page.getByRole("button", { name: "1. 短尺・長編の台本を準備" }).click()
  await expect(page.locator("#page-title")).toHaveText("新しい動画")
  await page.locator('.nav-item[data-view="dashboard"]').click()
  fail = true
  await page.evaluate("window.loadStudioReadiness()")
  await expect(page.locator("#dashboard-readiness")).toContainText("現在の対応状況は不明")
  await expect(page.locator(".dashboard-capability-counts")).toHaveCount(0)
  await expect(page.locator("#studio-readiness-score")).toHaveText("—")
  fail = false
  await page.getByRole("button", { name: "対応状況を詳しく見る" }).click()
  await expect(page.locator("#studio-readiness-badge")).toHaveText("条件付き")
  await page.locator("#refresh-all").click()
  await expect(page.locator("#dashboard-readiness")).toContainText("未接続")
  expect(pageErrors).toEqual([])
  expect(requests.every((request) => request.startsWith("GET "))).toBe(true)
})
