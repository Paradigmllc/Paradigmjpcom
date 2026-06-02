import { afterEach, describe, expect, it, vi } from "vitest"
import { auditJapanMarketReadiness } from "./japan-market-audit"

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

function mockFetch(htmlByPath: Record<string, string>) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const path = new URL(url).pathname
    const html = htmlByPath[path]
    if (!html) {
      return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } })
    }
    return new Response(html, { status: 200, headers: { "content-type": "text/html" } })
  }) as typeof fetch
}

describe("auditJapanMarketReadiness", () => {
  it("marks Japan readiness gaps when public pages do not expose disclosure, privacy, or local payments", async () => {
    mockFetch({
      "/": "<html><title>Acme</title><body>Global store for creators</body></html>",
    })

    const audit = await auditJapanMarketReadiness("example.com")

    expect(audit.status).toEqual({
      tokushoho_missing: true,
      appi_missing: true,
      local_payments_missing: true,
    })
    expect(audit.score).toBe(10)
    expect(audit.human_review_required).toBe(true)
    expect(audit.sales_pitch_context).toContain("法的断定ではなく")
  })

  it("collects public-page signals without making legal assertions", async () => {
    mockFetch({
      "/": "<html><body>JCB PayPay Paidy</body></html>",
      "/privacy": "<html><body>Privacy Policy and APPI personal information</body></html>",
      "/tokushoho": "<html><body>特定商取引法 販売業者 所在地 電話番号 返品 返金</body></html>",
    })

    const audit = await auditJapanMarketReadiness("https://example.com")

    expect(audit.status.tokushoho_missing).toBe(false)
    expect(audit.status.appi_missing).toBe(false)
    expect(audit.status.local_payments_missing).toBe(false)
    expect(audit.score).toBe(100)
    expect(audit.legal_disclaimer).toContain("not legal advice")
  })
})
