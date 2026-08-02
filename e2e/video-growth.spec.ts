import { expect, test } from "@playwright/test"

const LOCAL_ADMIN_PASSWORD = "lead-factory-e2e-admin-password"

test("renders the commercial video subscription work order without external-send controls", async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  const baseUrl = String(testInfo.project.use.baseURL ?? "")
  test.skip(!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl), "Video Growth mocked flow runs only against a local build")
  if (process.env.VIDEO_GROWTH_MOBILE === "1") await page.setViewportSize({ width: 390, height: 844 })

  const login = await page.request.post("/api/admin", { data: { action: "login", password: LOCAL_ADMIN_PASSWORD } })
  expect(login.ok()).toBeTruthy()

  await page.route("**/api/sales/video-growth", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, status: "draft" }) })
      return
    }
    const campaignId = "55555555-5555-4555-8555-555555555555"
    const now = new Date().toISOString()
    const variants = (["x", "instagram", "linkedin", "cold_email"] as const).map((channel, index) => ({
      id: `${index + 1}1111111-1111-4111-8111-111111111111`, campaignId, channel, variantName: channel,
      aspectRatio: channel === "instagram" ? "9:16" : channel === "cold_email" ? "16:9" : "1:1",
      width: channel === "cold_email" ? 1280 : 1080, height: channel === "instagram" ? 1920 : channel === "cold_email" ? 720 : 1080,
      durationSeconds: 30, hook: "Direct acquisition hook", caption: "Evidence-led direct acquisition campaign copy.",
      cta: "Learn more", deliverableName: "social-ja-square", status: "review_ready", scheduledFor: null,
      publishedAt: null, publishUrl: null, impressions: 0, views: 0, clicks: 0, replies: 0, meetings: 0,
      errorMessage: null, contentRevision: 1, revision: 1, updatedAt: now, approvals: [], revisions: [], dailyMetrics: [],
    }))
    const checks = (["contract", "payment", "brief", "brand_assets", "usage_rights", "landing_page", "tracking"] as const).map((checkKey, index) => ({
      id: `${index + 1}3333333-3333-4333-8333-333333333333`, campaignId, checkKey, status: "passed",
      note: "Evidence confirmed", evidenceUrl: null, checkedBy: "operator@example.com", checkedByRole: "admin",
      checkedAt: now, revision: 1, updatedAt: now,
    }))
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ok: true,
      principal: { key: "session:work", email: null, displayName: "session:work", role: "admin", authSource: "work" },
      dashboard: {
        generatedAt: now,
        studioProjects: [{ projectId: "video-subscription-launch", projectName: "Video Subscription Launch", status: "delivered", updatedAt: now, deliverables: [{ name: "social-ja-square", aspectRatio: "1:1", width: 1080, height: 1080, durationSeconds: 30, language: "ja" }] }],
        campaigns: [{
          id: campaignId, name: "Video Subscription Direct Launch", studioProjectId: "video-subscription-launch",
          studioProjectName: "Video Subscription Launch", studioProjectStatus: "delivered",
          objective: "Qualified direct meetings", audience: "B2B marketing leaders", offer: "Video diagnostic",
          landingUrl: "https://paradigmjp.com/ja/video-as-a-service", status: "draft", owner: "operator@example.com",
          approvedBy: null, approvalNote: null, approvedAt: null, scheduledFor: null, revision: 1, createdAt: now, updatedAt: now,
          workOrder: { campaignId, clientName: "Example Inc.", clientContactName: "Client", clientContactEmail: "client@example.com", plan: "growth", monthlyVideoQuota: 8, billingStatus: "contracted", workStatus: "intake", priority: "normal", timezone: "Asia/Tokyo", languages: ["ja"], contractReference: "C-001", purchaseOrderReference: null, deliveryOwner: "operator@example.com", clientApprover: "Client Approver", kickoffAt: now, deliveryDueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(), revision: 1, updatedAt: now },
          readinessChecks: checks, variants,
        }],
        recentEvents: [],
        kpis: { campaigns: 1, openWorkOrders: 1, overdueDeliveries: 0, blockedIntakes: 0, pendingApprovals: 0, openRevisions: 0, approvedCampaigns: 0, publishedVariants: 0, monthlyQuotaUsed: 0, monthlyQuotaLimit: 8, impressions: 0, views: 0, clicks: 0, replies: 0, meetings: 0, clickThroughRate: 0 },
      },
    }) })
  })

  const errors: string[] = []
  let dashboardRequests = 0
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/sales/video-growth") dashboardRequests += 1
  })
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${message.text()} ${message.location().url}`.trim())
  })
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("requestfailed", (request) => errors.push(`${request.url()}: ${request.failure()?.errorText ?? "request failed"}`))
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`)
  })
  await page.goto("/ja/admin/video-growth", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "動画サブスク商用運用OS" })).toBeVisible()
  await expect.poll(() => dashboardRequests > 0 ? "ready" : errors[0] ?? "pending", { timeout: 120_000 }).toBe("ready")
  await expect(page.getByLabel("Video Growthを読み込み中")).toBeHidden({ timeout: 30_000 })
  await expect(page.getByText("商用ワークオーダー", { exact: true })).toBeVisible()
  await expect(page.getByText("7/7 完了", { exact: true })).toBeVisible()
  await expect(page.getByText("X", { exact: true })).toBeVisible()
  await expect(page.getByText("Instagram", { exact: true })).toBeVisible()
  await expect(page.getByText("LinkedIn", { exact: true })).toBeVisible()
  await expect(page.getByText("コールド営業", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: /外部送信|メール送信|SNS投稿/ })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  expect(errors).toEqual([])
})
