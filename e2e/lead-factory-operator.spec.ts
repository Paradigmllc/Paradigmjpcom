import { expect, test, type Page } from "@playwright/test"

const RUN_ID = "11111111-1111-4111-8111-111111111111"
const ITEM_ID = "22222222-2222-4222-8222-222222222222"
const LOCAL_ADMIN_PASSWORD = "lead-factory-e2e-admin-password"

async function mockSharedLeadFactoryApis(page: Page): Promise<void> {
  await page.route(/\/api\/sales\/lead-candidates\/factory\/events$/, (route) => route.fulfill({
    status: 200,
    contentType: "text/event-stream",
    body: `data: ${JSON.stringify({ type: "snapshot", runs: [] })}\n\n`,
  }))
  await page.route(/\/api\/sales\/lead-sources$/, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, sources: [] }),
  }))
}

test.describe("Lead Factory operator gates", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const baseUrl = String(testInfo.project.use.baseURL ?? "")
    test.skip(
      !/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl),
      "This non-mutating mocked operator flow must run against a local build",
    )

    const login = await page.request.post("/api/admin", {
      data: { action: "login", password: LOCAL_ADMIN_PASSWORD },
    })
    expect(login.ok()).toBeTruthy()
  })

  test("starts only an explicit non-sending pilot", async ({ page }) => {
    await mockSharedLeadFactoryApis(page)
    const requestCapture: { submitted?: Record<string, unknown> } = {}
    await page.route(/\/api\/sales\/lead-candidates\/factory(?:\?limit=50)?$/, async (route) => {
      if (route.request().method() === "POST") {
        requestCapture.submitted = route.request().postDataJSON() as Record<string, unknown>
        await route.fulfill({
          status: 202,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, runs: [{ ok: true, runId: RUN_ID }], failed: 0 }),
        })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, runs: [] }) })
    })

    await page.goto("/ja/admin/lead-factory")
    await expect(page.getByRole("heading", { name: "候補収集 → 実フォーム確認 → Twenty追加" })).toBeVisible()
    await expect(page.getByText("外部送信はすべて0件固定です")).toBeVisible()
    await page.getByLabel("担当者名").fill("Sato")
    await page.getByRole("button", { name: "非送信パイロットを開始" }).click()

    await expect.poll(() => requestCapture.submitted).toBeDefined()
    expect(requestCapture.submitted).toMatchObject({
      operatorName: "Sato",
      executionMode: "pilot",
      countryCodes: ["US", "GB", "AU"],
      limitPerCountry: 100,
      verifyPerCountry: 20,
    })
    expect(requestCapture.submitted?.promote).toBeUndefined()
    expect(requestCapture.submitted?.syncTwenty).toBeUndefined()
  })

  test("requires a reason before an explicit Twenty promotion", async ({ page }) => {
    await mockSharedLeadFactoryApis(page)
    const run = {
      id: RUN_ID,
      source_slug: "evidence_first_sources",
      country_code: "US",
      technology: "Shopify",
      status: "completed",
      execution_mode: "pilot",
      operator_status: "pending_review",
      cancel_requested: false,
      requested_limit: 100,
      verify_limit: 20,
      min_opportunity_score: 68,
      min_smb_score: 50,
      min_form_confidence: 80,
      fetched_count: 100,
      verified_count: 20,
      scored_count: 3,
      source_qualified_count: 3,
      quality_rejected_count: 17,
      review_required_count: 0,
      forms_checked_count: 20,
      forms_qualified_count: 3,
      promoted_count: 0,
      operator_approved_count: 0,
      operator_rejected_count: 0,
      twenty_synced_count: 0,
      failure_count: 0,
      error_message: null,
      heartbeat_at: "2026-07-14T10:00:00.000Z",
      started_at: "2026-07-14T10:00:00.000Z",
      created_at: "2026-07-14T10:00:00.000Z",
      updated_at: "2026-07-14T10:00:00.000Z",
    }
    await page.route(/\/api\/sales\/lead-candidates\/factory\?limit=50$/, (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, runs: [run] }),
    }))
    await page.route(new RegExp(`/api/sales/initial-form-drafts\\?runId=${RUN_ID}$`), (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, drafts: [], sent: 0 }),
    }))
    await page.route(new RegExp(`/api/sales/lead-candidates/runs/${RUN_ID}\\?.*$`), (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        run,
        itemTotal: 1,
        recentItems: [{
          id: ITEM_ID,
          company_name: "Example Commerce",
          domain: "example.com",
          source_page_url: "https://directory.example/example",
          status: "awaiting_review",
          quality_status: "passed",
          quality_reasons: [],
          opportunity_score: 82,
          form_url: "https://example.com/contact",
          form_method: "dom",
          form_confidence: 94,
          form_verified: true,
          form_checked_at: "2026-07-14T10:00:00.000Z",
          form_qualification_reason: "verified_form",
          review_status: "pending",
          reviewed_by: null,
          reviewed_at: null,
          review_note: null,
          promotion_attempts: 0,
          promotion_error: null,
          twenty_synced: false,
          updated_at: "2026-07-14T10:00:00.000Z",
        }],
        operatorEvents: [],
      }),
    }))
    const reviewCapture: { body?: Record<string, unknown> } = {}
    await page.route(new RegExp(`/api/sales/lead-candidates/runs/${RUN_ID}/review$`), async (route) => {
      reviewCapture.body = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, approved: 1, failed: 0, invalid: [] }) })
    })

    await page.goto("/ja/admin/lead-factory")
    await page.getByLabel("担当者名").fill("Sato")
    await page.getByRole("button", { name: "USのラン詳細を開く" }).click()
    await expect(page.getByText("人手レビュー・Twenty昇格", { exact: true })).toBeVisible()
    await page.getByLabel("Example Commerceを選択").check()
    await page.getByRole("button", { name: "選択をTwenty同期" }).click()
    await expect(page.getByText("判断理由を3文字以上入力してください")).toBeVisible()
    expect(reviewCapture.body).toBeUndefined()

    await page.getByPlaceholder("承認・除外・停止の判断理由（監査ログに保存）").fill("根拠ページと実フォームを確認")
    await page.getByRole("button", { name: "選択をTwenty同期" }).click()
    await expect.poll(() => reviewCapture.body).toBeDefined()
    expect(reviewCapture.body).toMatchObject({
      action: "approve",
      itemIds: [ITEM_ID],
      operatorName: "Sato",
      note: "根拠ページと実フォームを確認",
    })
  })
})
