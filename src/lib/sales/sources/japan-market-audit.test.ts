import { afterEach, describe, expect, it, vi } from "vitest"
import { auditJapanMarketReadiness, auditJapanMarketReadinessFromHtml } from "./japan-market-audit"

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
  it("builds a bounded audit from an already verified canonical homepage", () => {
    const audit = auditJapanMarketReadinessFromHtml(
      "https://www.example.com/",
      "<html><body>Global ERP and CRM hosting for project teams</body></html>",
    )

    expect(audit.pages_checked).toEqual(["https://www.example.com/"])
    expect(audit.status.japanese_language_missing).toBe(true)
    expect(audit.presence).toMatchObject({ existing: false, level: "none" })
    expect(audit.legal_disclaimer).toContain("not legal advice")
  })

  it("marks Japan readiness gaps when public pages do not expose disclosure, privacy, or local payments", async () => {
    mockFetch({
      "/": "<html><title>Acme</title><body>Global store for creators</body></html>",
    })

    const audit = await auditJapanMarketReadiness("example.com")

    expect(audit.status).toEqual({
      tokushoho_missing: true,
      appi_missing: true,
      local_payments_missing: true,
      japanese_language_missing: true,
      jpy_currency_missing: true,
      japan_shipping_missing: true,
    })
    expect(audit.score).toBe(10)
    expect(audit.human_review_required).toBe(true)
    expect(audit.sales_pitch_context).toContain("法的断定ではなく")
  })

  it("collects public-page signals without making legal assertions", async () => {
    mockFetch({
      "/": "<html><body>日本語の購入者向けページ JCB PayPay Paidy JPY 12000 shipping to Japan</body></html>",
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

  it("detects an existing Japanese sales path from locale and where-to-buy links", () => {
    const audit = auditJapanMarketReadinessFromHtml(
      "https://brand.example/en/about/",
      `
        <html><head><link rel="alternate" hreflang="ja" href="/ja/about/"></head>
        <body>
          <a href="/en/where-to-buy-jp/">Japan / 日 本</a>
          <a href="/en/support/">Local Support</a>
          <p>Wearable air purifier products for international customers.</p>
        </body></html>
      `,
    )

    expect(audit.presence.existing).toBe(true)
    expect(audit.presence.level).toBe("sales")
    expect(audit.presence.urls).toContain("https://brand.example/en/where-to-buy-jp/")
    expect(audit.status.japanese_language_missing).toBe(false)
    expect(audit.sales_pitch_context).toContain("新規日本参入案件としては原則対象外")
  })
})
