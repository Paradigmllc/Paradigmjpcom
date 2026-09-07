import { expect, test } from "@playwright/test"

const LOCAL_ADMIN_PASSWORD = "lead-factory-e2e-admin-password"

test("renders cost, circuit, and quality controls without provider execution", async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  const baseUrl = String(testInfo.project.use.baseURL ?? "")
  test.skip(!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl), "Mocked control-plane flow runs only against a local build")
  const login = await page.request.post("/api/admin", { data: { action: "login", password: LOCAL_ADMIN_PASSWORD } })
  expect(login.ok()).toBeTruthy()
  const now = new Date().toISOString()
  let getRequests = 0
  await page.route("**/api/sales/video-studio-control*", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) })
      return
    }
    getRequests += 1
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, dashboard: {
      generatedAt: now,
      policy: { id: "studio-default", enabled: true, dailyBudgetCents: 5000, perRunBudgetCents: 1200, perRunLlmTokenLimit: 30000, perRunGpuSecondsLimit: 900, maxAttempts: 2, circuitFailureThreshold: 3, circuitCooldownMinutes: 30, reservationTtlMinutes: 20, updatedBy: "admin", updatedAt: now },
      providers: ["vast_oss", "runway", "kling", "seedance", "heygen"].map((provider) => ({ provider, circuitState: "closed", consecutiveFailures: 0, retryAfter: null, lastFailureFingerprint: null, lastSuccessAt: null, updatedAt: now })),
      runs: [{ id: "11111111-1111-4111-8111-111111111111", idempotencyKey: "canary-001", projectId: null, shotKind: "cinematic", qualityTier: "premium", requestedProvider: "auto", selectedProvider: "kling", state: "succeeded", decision: "allow", blockReason: null, estimatedCostCents: 500, reservedCostCents: 500, actualCostCents: 480, estimatedLlmTokens: 3000, llmTokensUsed: 2500, estimatedGpuSeconds: 0, gpuSecondsUsed: 0, attemptCount: 1, maxAttempts: 2, cacheSourceRunId: null, requestedBy: "admin", expiresAt: null, createdAt: now, completedAt: now }],
      events: [], qualityReviews: [], providerBenchmarks: ["vast_oss", "runway", "kling", "seedance", "heygen"].map((provider) => ({ provider, reviewCount: provider === "kling" ? 1 : 0, averageScore: provider === "kling" ? 88 : 0, approvalRate: provider === "kling" ? 100 : 0 })),
      totals: { todayCommittedCents: 480, todayActualCents: 480, todayLlmTokens: 2500, todayGpuSeconds: 0, blockedRuns: 0, cacheHits: 0 },
    } }) })
  })
  const errors: string[] = []
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()) })
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("requestfailed", (request) => errors.push(`${request.url()}: ${request.failure()?.errorText ?? "request failed"}`))
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  await page.goto("/ja/admin/video-studio-control", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "品質・費用・Vast.ai安定運用" })).toBeVisible()
  await expect.poll(() => getRequests > 0 ? "ready" : errors[0] ?? "pending", { timeout: 30_000 }).toBe("ready")
  await expect(page.getByRole("button", { name: "GPU/APIを起動せず判定" })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText("Provider品質ベンチマーク")).toBeVisible()
  await expect(page.getByText("6軸品質比較")).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.waitForTimeout(1_000)
  expect(getRequests).toBe(1)
  expect(errors).toEqual([])
})
