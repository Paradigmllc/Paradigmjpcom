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
  const submissions: Array<Record<string, unknown>> = []
  await page.route("**/api/sales/video-studio-library*", (route) => route.fulfill({ json: { ok: true, versions: [], nextOffset: null, canWrite: false } }))
  await page.route("**/api/sales/video-studio-control*", async (route) => {
    if (route.request().method() === "POST") {
      submissions.push(route.request().postDataJSON() as Record<string, unknown>)
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) })
      return
    }
    getRequests += 1
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, dashboard: {
      generatedAt: now,
      policy: { id: "studio-default", enabled: true, dailyBudgetCents: 5000, perRunBudgetCents: 1200, perRunLlmTokenLimit: 30000, perRunGpuSecondsLimit: 900, maxAttempts: 2, circuitFailureThreshold: 3, circuitCooldownMinutes: 30, reservationTtlMinutes: 20, updatedBy: "admin", updatedAt: now },
      providers: ["vast_oss", "runway", "kling", "seedance", "heygen"].map((provider) => ({ provider, circuitState: "closed", consecutiveFailures: 0, retryAfter: null, lastFailureFingerprint: null, lastSuccessAt: null, updatedAt: now })),
      runs: [{ id: "11111111-1111-4111-8111-111111111111", idempotencyKey: "canary-001", projectId: null, shotKind: "cinematic", qualityTier: "premium", requestedProvider: "auto", selectedProvider: "kling", state: "succeeded", decision: "allow", blockReason: null, estimatedCostCents: 500, reservedCostCents: 500, actualCostCents: 480, estimatedLlmTokens: 3000, llmTokensUsed: 2500, estimatedGpuSeconds: 0, gpuSecondsUsed: 0, attemptCount: 1, maxAttempts: 2, cacheSourceRunId: null, requestedBy: "admin", expiresAt: null, createdAt: now, completedAt: now }],
      events: [], qualityReviews: [], providerBenchmarks: [], benchmarkGroups: [],
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
  await expect(page.getByText("同条件・ジャンル別の品質比較")).toBeVisible()
  await expect(page.getByText("8項目・実映像ベンチマーク")).toBeVisible()
  await expect(page.getByLabel("品質合格", { exact: true })).not.toBeChecked()
  await expect(page.getByLabel("被写体の一貫性", { exact: true })).toHaveValue("")
  await expect(page.getByRole("button", { name: "実映像の評価を保存" })).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.waitForTimeout(1_000)
  expect(getRequests).toBe(1)
  const fixture = process.env.E2E_VIDEO_REVIEW_FIXTURE
  if (fixture) {
    await page.getByLabel("品質レビュー対象run").selectOption("11111111-1111-4111-8111-111111111111")
    await page.getByLabel("評価ケースID", { exact: true }).fill("coffee-steam-v1")
    await page.getByLabel("固定の比較条件", { exact: true }).fill("UI-only source fixture: synthetic ceramic cup, 24fps, approximately two seconds, 640x360. Not a quality benchmark.")
    await page.getByLabel("評価する動画", { exact: true }).setInputFiles(fixture)
    await expect(page.getByText(/SHA-256:/)).toBeVisible()
    for (const label of ["被写体の一貫性", "演出指示の遵守", "動きの自然さ", "画作り", "商品・ブランドの正確さ", "音声・字幕", "編集完成度", "納品適合性"]) {
      await page.getByLabel(label, { exact: true }).fill("95")
    }
    await page.getByLabel("レビュー根拠", { exact: true }).fill("UI regression fixture only. These scores are not an owner quality review.")
    await page.getByLabel("全編を確認済み", { exact: true }).check()
    await page.getByLabel("意図しない静止", { exact: true }).check()
    await expect(page.getByLabel("品質合格", { exact: true })).toBeDisabled()
    await page.getByRole("button", { name: "実映像の評価を保存" }).click()
    await expect.poll(() => submissions.length).toBe(1)
    expect(submissions[0]).toMatchObject({ action: "review_benchmark", approved: false,
      benchmark: { blockingDefects: ["frozen_motion"], totalCostCents: null, repairMinutes: null } })
    await expect.poll(() => getRequests).toBe(2)
    await expect(page.getByRole("button", { name: "実映像の評価を保存" })).toBeEnabled()
    await page.getByLabel("意図しない静止", { exact: true }).uncheck()
    await page.getByLabel("品質合格", { exact: true }).check()
    await page.getByRole("button", { name: "実映像の評価を保存" }).click()
    await expect.poll(() => submissions.length).toBe(2)
    expect(submissions[1]).toMatchObject({ approved: true, benchmark: { blockingDefects: [] } })
    await expect.poll(() => getRequests).toBe(3)
    await page.getByRole("button", { name: "実映像の評価を保存" }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath("benchmark-review.png"), fullPage: true })
  }
  expect(errors).toEqual([])
})
