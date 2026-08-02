import { expect, test, type Page } from "@playwright/test"

const LOCAL_ADMIN_PASSWORD = "lead-factory-e2e-admin-password"
const CASE_ID = "11111111-1111-4111-8111-111111111111"
const COMPANY_ID = "22222222-2222-4222-8222-222222222222"

async function mockOperatorApis(page: Page, capture: { workspace?: Record<string, unknown> }) {
  await page.route(/\/api\/sales\/opportunity-briefs\/batch\/events$/, (route) => route.fulfill({
    status: 200, contentType: "text/event-stream", body: `data: ${JSON.stringify({ type: "snapshot", jobs: [] })}\n\n`,
  }))
  await page.route(/\/api\/sales\/opportunity-briefs\/batch(?:\?.*)?$/, (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, jobs: [] }),
  }))
  await page.route(/\/api\/sales\/japan-operator\/cases$/, (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({
      ok: true, principal: { key: "session:legacy-admin", email: null, role: "admin", authSource: "legacy" },
      cases: [{
        id: CASE_ID, company_id: COMPANY_ID, engagement_no: 1, offer_code: "standard_operator_v1", offer_version: "2026-08-02",
        offer_snapshot: {}, stage: "evidence_verified", status: "active", owner: "Paradigm commercial lead", reviewer: null,
        next_action: "Create memo", next_action_due_at: "2026-08-04T00:00:00.000Z", gate_data: {}, blocker_codes: [],
        stage_entered_at: "2026-08-02T00:00:00.000Z", revision: 1, updated_at: "2026-08-02T00:00:00.000Z",
        sales_companies: { id: COMPANY_ID, company_name: "Example Global Brand", domain: "example.com" },
      }], events: [],
    }),
  }))
  await page.route(/\/api\/sales\/japan-operator\/workspace(?:\?.*)?$/, async (route) => {
    if (route.request().method() === "POST") {
      capture.workspace = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, result: { id: "approval-1" }, notification: { ok: true } }) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ok: true, principal: { key: "session:legacy-admin", email: null, role: "admin", authSource: "legacy" },
      workspace: { evidence: [], approvals: [], authorizations: [], contracts: [], invoices: [], skus: [], deliverables: [], financePeriods: [], operations: [], incidents: [], kpis: [], offboarding: null, suppressions: [], sourceLinks: [] },
    }) })
  })
}

test("authenticated operator uses server identity and exact outbound approval", async ({ page }, testInfo) => {
  const baseUrl = String(testInfo.project.use.baseURL ?? "")
  test.skip(!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl), "Mocked admin flow runs only against a local build")
  const login = await page.request.post("/api/admin", { data: { action: "login", password: LOCAL_ADMIN_PASSWORD } })
  expect(login.ok()).toBeTruthy()
  const capture: { workspace?: Record<string, unknown> } = {}
  await mockOperatorApis(page, capture)
  await page.goto("/ja/admin/opportunity-briefs")
  await expect(page.getByRole("heading", { name: "Japan Market Operator 運用OS" })).toBeVisible()
  await expect(page.getByText("session:legacy-admin ・ admin")).toBeVisible()
  await expect(page.getByLabel("操作者名")).toHaveCount(0)
  await page.getByRole("button", { name: "実務ワークスペース" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByLabel("送信先").fill("https://example.com/contact")
  await page.getByLabel("承認対象本文").fill("May we send you the Japan opportunity memo?")
  await page.getByLabel("申請理由").fill("Permission-first outreach")
  await page.getByRole("button", { name: "送信承認を申請" }).click()
  await expect.poll(() => capture.workspace).toBeDefined()
  expect(capture.workspace).toMatchObject({ action: "request_outbound", caseId: CASE_ID, channel: "contact_form", recipient: "https://example.com/contact" })
  expect(capture.workspace).not.toHaveProperty("actor")
})
