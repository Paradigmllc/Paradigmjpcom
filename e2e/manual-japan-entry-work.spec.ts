import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

const LOCAL_ADMIN_PASSWORD = "lead-factory-e2e-admin-password"

test("preserves /work as the Payload login return target", async ({ page }, testInfo) => {
  const baseUrl = String(testInfo.project.use.baseURL ?? "")
  test.skip(
    !/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl),
    "This authentication redirect check runs only against a local build",
  )

  await page.goto("/work")
  await page.waitForURL((url) => url.pathname === "/admin/login" && url.searchParams.get("redirect") === "/work")
  const currentUrl = new URL(page.url())
  expect(currentUrl.pathname).toBe("/admin/login")
  expect(currentUrl.searchParams.get("redirect")).toBe("/work")
})

test("accepts multiple new URLs and keeps each result visible", async ({ page }, testInfo) => {
  test.setTimeout(90_000)
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

  const submitted: string[] = []
  await page.route(/\/api\/work$/, async (route) => {
    if (route.request().method() === "GET") {
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
    const { url, variant, angle, sourceSlug } = route.request().postDataJSON() as { url: string; variant: string; angle: string; sourceSlug: string }
    expect(variant).toBe("auto")
    expect(angle).toBe("auto")
    expect(sourceSlug).toBe("manual_input")
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
          country_code: "PL",
          is_japanese_company: false,
          smb_status: "qualified",
          smb_confidence: 82,
          japan_entry_fit_status: "qualified",
          japan_entry_fit_confidence: 78,
          business_model: "saas",
          industry: "Technology / IT",
          product_context: "Public product context",
          profile: {
            commercialSignals: [
              { kind: "global_customers", sourcePhrase: "Customers in 30 countries", detail: "Public customer footprint" },
              { kind: "funding", sourcePhrase: "Backed by Example Ventures", detail: "Public funding statement" },
            ],
          }, evidence: {}, form_discovery: {},
          form_url: `https://${domain}/contact`,
          initial_message: `${domain} documents an API-first retail analytics workflow. I’m Sato from Paradigm LLC in Japan.\n\nThe checked public pages did not show a Japanese-language evaluation path, so Japan applicability remains a hypothesis rather than an observed result.\n\nI mapped this buyer-path question in a short Japan opportunity analysis. Are you the right person for me to send it to?`,
          message_review: {
            score: 96,
            uniquenessScore: 91,
            selected_index: 0,
            strategy: { primaryObservation: "API-first retail analytics workflow", whyNow: "Japan applicability remains unverified", japaneseSegment: "Independent Japanese retail operators", japanGap: "No Japanese-language evaluation path was observed", opportunityAngle: "Validate the buyer evaluation path", cta: "Ask for the right recipient", countryAdaptation: "Business-formal without nationality assumptions" },
            candidates: [{ message: `Selected ${domain}`, openingStyle: "product-led", ctaType: "right_person" }, { message: `Alternative ${domain}`, openingStyle: "decision-led", ctaType: "founder_forward" }],
            evidence_pack: [{ id: "japan-audit-language", statement: "No Japanese-language customer path was observed.", source: `https://${domain}`, confidence: 0.76, classification: "observed" }],
          },
          message_variant_requested: "estimate_off_price_off",
          message_variant: "estimate_off_price_off",
          message_variant_fallback_reason: null,
          message_angle_requested: "problem",
          message_angle: "problem",
          message_angle_fallback_reason: null,
          outreach_playbook: "saas_ai_devtools",
          qualification_ledger: {},
          master_lead_ledger: {},
          source_attributions: [{ id: `${domain}-source`, work_id: domain, source_slug: "manual_input", source_page_url: "", observed_on: new Date().toISOString().slice(0, 10), created_at: new Date().toISOString() }],
          report_data: {},
          report_url: "https://paradigmjp.com/en/work-report/11111111-1111-4111-8111-111111111111",
          twenty_company_id: null,
          twenty_sync_status: "skipped",
          error_message: "Human review required",
          attempts: 1,
          sent: false,
          manually_sent_at: null,
          reply_received_at: null,
          founder_forwarded_at: null,
          meeting_converted_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }),
    })
  })

  await page.goto("/work")
  await expect(page.getByRole("heading", { name: "海外SMBの初回営業準備" })).toBeVisible()
  await expect(page.getByText("Zero-send architecture")).toBeVisible()
  await expect(page.getByText("Operator flow")).toBeVisible()
  await expect(page.getByText(/初回文面は「推定あり／なし × 価格あり／なし」の4セル/)).toBeVisible()
  await expect(page.getByRole("button", { name: "自動均等割付" })).toBeVisible()
  await expect(page.getByRole("button", { name: "自動安定割付" })).toBeVisible()
  await expect(page.getByRole("button", { name: "推定あり・価格あり" })).toBeVisible()
  await expect(page.getByLabel("企業を見つけた営業ソース")).toHaveValue("manual_input")
  await page.emulateMedia({ reducedMotion: "reduce" })
  const initialAccessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .disableRules(["region"])
    .analyze()
  expect(initialAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
  await page.getByLabel("解析する海外企業URL").fill("https://one.example\nhttps://two.example")
  await page.getByRole("button", { name: "解析を開始" }).click()
  await expect.poll(() => submitted.sort()).toEqual(["https://one.example", "https://two.example"])
  await expect(page.getByText("one.example", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("two.example", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("自動送信: なし").first()).toBeVisible()
  await expect(page.getByText("PL · Regional主要母集団").first()).toBeVisible()
  await expect(page.getByText("商業根拠 2件 · 出典 1").first()).toBeVisible()
  await expect(page.getByText("市場・企業別の優先判断").first()).toBeVisible()
  await expect(page.getByText("企業別フォーム文面（未送信）").first()).toBeVisible()
  await expect(page.getByText("品質 96").first()).toBeVisible()
  await expect(page.getByText("固有性 91").first()).toBeVisible()
  await expect(page.getByText("企業別メッセージ戦略").first()).toBeVisible()
  await expect(page.getByText("使用可能な根拠・出典（内部確認専用）").first()).toBeVisible()
  const history = page.locator("#history")
  await history.getByLabel("企業名またはドメインを検索").fill("one.example")
  await expect(history.getByText("one.example", { exact: true }).first()).toBeVisible()
  await expect(history.getByText("two.example", { exact: true })).toHaveCount(0)
  await history.getByLabel("企業名またはドメインを検索").fill("")
  await history.getByRole("button", { name: "要確認", exact: true }).click()
  await expect(history.getByText("one.example", { exact: true }).first()).toBeVisible()
  await page.waitForTimeout(600)
  const completedAccessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .disableRules(["region"])
    .analyze()
  expect(completedAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
  await expect(page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  expect(consoleErrors).toEqual([])
})
