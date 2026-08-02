import { expect, test } from "@playwright/test"

const LOCAL_ADMIN_PASSWORD = "lead-factory-e2e-admin-password"

test("renders the four-channel direct growth queue without external-send controls", async ({ page }, testInfo) => {
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
    const variants = (["x", "instagram", "linkedin", "cold_email"] as const).map((channel, index) => ({
      id: `${index + 1}1111111-1111-4111-8111-111111111111`, campaignId: "55555555-5555-4555-8555-555555555555", channel,
      variantName: channel, aspectRatio: channel === "instagram" ? "9:16" : "1:1", width: 1080, height: channel === "instagram" ? 1920 : 1080,
      durationSeconds: 30, hook: "Direct acquisition hook", caption: "Evidence-led direct acquisition campaign copy.", cta: "Learn more",
      deliverableName: "social-ja-square", status: "review_ready", scheduledFor: null, publishedAt: null, publishUrl: null,
      impressions: 0, views: 0, clicks: 0, replies: 0, meetings: 0, errorMessage: null, revision: 1, updatedAt: new Date().toISOString(),
    }))
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, dashboard: {
      generatedAt: new Date().toISOString(),
      studioProjects: [{ projectId: "video-subscription-launch", projectName: "Video Subscription Launch", status: "delivered", updatedAt: new Date().toISOString(), deliverables: [{ name: "social-ja-square", aspectRatio: "1:1", width: 1080, height: 1080, durationSeconds: 30, language: "ja" }] }],
      campaigns: [{ id: "55555555-5555-4555-8555-555555555555", name: "Video Subscription Direct Launch", studioProjectId: "video-subscription-launch", studioProjectName: "Video Subscription Launch", studioProjectStatus: "delivered", objective: "Qualified direct meetings", audience: "B2B marketing leaders", offer: "Video diagnostic", landingUrl: "https://paradigmjp.com/ja/video-as-a-service", status: "draft", owner: "Sato", approvedBy: null, approvalNote: null, approvedAt: null, scheduledFor: null, revision: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), variants }],
      recentEvents: [], kpis: { campaigns: 1, approvedCampaigns: 0, publishedVariants: 0, impressions: 0, views: 0, clicks: 0, replies: 0, meetings: 0, clickThroughRate: 0 },
    } }) })
  })
  await page.route("**/video-factory-console?*", (route) => route.fulfill({ status: 200, contentType: "text/x-component", body: "" }))

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
  await expect(page.getByRole("heading", { name: "動画直販キャンペーンOS" })).toBeVisible()
  await expect.poll(
    () => dashboardRequests > 0 ? "ready" : errors[0] ?? "pending",
    { timeout: 120_000, message: "client hydration should request the video growth dashboard" },
  ).toBe("ready")
  await expect(page.getByLabel("Video Growthを読み込み中")).toBeHidden({ timeout: 30_000 })
  await expect(page.getByText("X", { exact: true })).toBeVisible()
  await expect(page.getByText("Instagram", { exact: true })).toBeVisible()
  await expect(page.getByText("LinkedIn", { exact: true })).toBeVisible()
  await expect(page.getByText("コールド営業", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: /送信/ })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  expect(errors).toEqual([])
})
