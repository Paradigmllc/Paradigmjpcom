import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

const LOCAL_ADMIN_PASSWORD = "lead-factory-e2e-admin-password"

test("preserves /work as the Payload login return target", async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const baseUrl = String(testInfo.project.use.baseURL ?? "")
  test.skip(
    !/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl),
    "This authentication redirect check runs only against a local build",
  )

  await page.goto("/work", { waitUntil: "commit" })
  await expect.poll(() => page.url()).toContain("/admin/login?redirect=%2Fwork")
  const currentUrl = new URL(page.url())
  expect(currentUrl.pathname).toBe("/admin/login")
  expect(currentUrl.searchParams.get("redirect")).toBe("/work")
})

test("fills the active desktop or mobile viewport without horizontal overflow", async ({ page }, testInfo) => {
  test.setTimeout(45_000)
  const baseUrl = String(testInfo.project.use.baseURL ?? "")
  test.skip(
    !/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl),
    "This mocked non-mutating workbench flow runs only against a local build",
  )
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  const login = await page.request.post("/api/admin", {
    data: { action: "login", password: LOCAL_ADMIN_PASSWORD },
  })
  expect(login.ok()).toBeTruthy()

  await page.route("**/api/work**", async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (route.request().method() === "GET" && pathname === "/api/work") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          items: [],
          metrics: [],
          angleMetrics: [],
          sources: [{ slug: "manual_input", name: "Manual input", tier: "s_plus", roles: ["discovery"], sectors: ["all"], source_url: null, access_mode: "manual_review", priority: 1, active: true, notes: "Direct operator input" }],
        }),
      })
      return
    }
    if (route.request().method() === "GET" && pathname === "/api/work/batches") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          activeBatch: null,
          queueSummary: { batchCount: 0, companyCount: 0, runningBatchId: null, queuedBatchCount: 0, queuedCompanyCount: 0 },
        }),
      })
      return
    }
    await route.fallback()
  })

  await page.goto("/work")
  await expect(page.getByRole("heading", { name: "海外SMBの初回営業準備" })).toBeVisible()
  const viewport = page.viewportSize()
  const workbench = await page.locator("main").boundingBox()
  expect(viewport).not.toBeNull()
  expect(workbench).not.toBeNull()
  expect(workbench?.x).toBe(0)
  expect(workbench?.width).toBeGreaterThanOrEqual((viewport?.width ?? 0) - 1)
  await expect(page.getByText("Zero-send architecture")).toBeVisible()
  await expect(page.getByText("Operator flow")).toBeVisible()
  await expect(page.getByText(/初回文面は「推定あり／なし × 価格あり／なし」の4セル/)).toBeVisible()
  await expect(page.getByRole("button", { name: /標準（推定あり・価格なし）/ })).toBeVisible()
  await expect(page.getByRole("button", { name: "自動安定割付" })).toBeVisible()
  await expect(page.getByRole("button", { name: "推定あり・価格あり" })).toBeVisible()
  await page.emulateMedia({ reducedMotion: "reduce" })
  const initialAccessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .disableRules(["region"])
    .analyze()
  expect(initialAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
  await expect(page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  expect(consoleErrors).toEqual([])
})
