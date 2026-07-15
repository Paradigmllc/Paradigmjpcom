import { expect, test } from "@playwright/test"

const LOCAL_ADMIN_PASSWORD = "lead-factory-e2e-admin-password"

test("accepts multiple new URLs and keeps each result visible", async ({ page }, testInfo) => {
  const baseUrl = String(testInfo.project.use.baseURL ?? "")
  test.skip(
    !/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl),
    "This mocked non-mutating workbench flow runs only against a local build",
  )
  const login = await page.request.post("/api/admin", {
    data: { action: "login", password: LOCAL_ADMIN_PASSWORD },
  })
  expect(login.ok()).toBeTruthy()

  const submitted: string[] = []
  await page.route(/\/api\/work$/, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, items: [] }) })
      return
    }
    const { url } = route.request().postDataJSON() as { url: string }
    submitted.push(url)
    const domain = new URL(url).hostname
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        duplicate: false,
        item: {
          id: domain,
          report_token: "11111111-1111-4111-8111-111111111111",
          input_url: url,
          canonical_url: `https://${domain}`,
          domain,
          status: "needs_review",
          stage: "complete",
          company_name: domain,
          country_code: "US",
          is_japanese_company: false,
          smb_status: "qualified",
          smb_confidence: 82,
          japan_entry_fit_status: "qualified",
          japan_entry_fit_confidence: 78,
          business_model: "saas",
          industry: "Technology / IT",
          product_context: "Public product context",
          profile: {}, evidence: {}, form_discovery: {},
          form_url: `https://${domain}/contact`,
          initial_message: `Hello ${domain}`,
          message_review: {}, report_data: {},
          report_url: "https://paradigmjp.com/en/work-report/11111111-1111-4111-8111-111111111111",
          twenty_company_id: null,
          twenty_sync_status: "skipped",
          error_message: "Human review required",
          attempts: 1,
          sent: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }),
    })
  })

  await page.goto("/work")
  await expect(page.getByRole("heading", { name: "海外SMBの初回営業準備" })).toBeVisible()
  await page.getByLabel("解析する海外企業URL").fill("https://one.example\nhttps://two.example")
  await page.getByRole("button", { name: "解析を開始" }).click()
  await expect.poll(() => submitted.sort()).toEqual(["https://one.example", "https://two.example"])
  await expect(page.getByText("one.example", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("two.example", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("自動送信: なし").first()).toBeVisible()
})
