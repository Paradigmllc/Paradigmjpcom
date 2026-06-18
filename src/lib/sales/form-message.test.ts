/**
 * form-message.test.ts — generateFormMessage / fillReportUrl の単体テスト
 */

import { describe, it, expect, vi, afterEach } from "vitest"

const mocks = vi.hoisted(() => ({
  findCompanyById: vi.fn(),
  matchTemplate: vi.fn(),
  getAiPrompt: vi.fn(),
  callDeepSeek: vi.fn(),
  getServiceSalesSupabase: vi.fn(),
}))

vi.mock("./companies", () => ({
  findCompanyById: mocks.findCompanyById,
}))

vi.mock("./templates", () => ({
  matchTemplate: mocks.matchTemplate,
}))

vi.mock("./ai-prompts", () => ({
  getAiPrompt: mocks.getAiPrompt,
}))

vi.mock("@/lib/deepseek", () => ({
  callDeepSeek: mocks.callDeepSeek,
}))

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: mocks.getServiceSalesSupabase,
}))

vi.mock("./dify-cloud", () => ({
  normalizeDifyCloudApiUrl: (u: string) => u,
  normalizeDifyCloudBaseUrl: (u: string) => u,
}))

import { generateFormMessage, fillReportUrl } from "./form-message"
import type { SalesCompany } from "./types"

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe("fillReportUrl", () => {
  it("replaces {{report_url}} placeholder with actual URL", () => {
    const message = "レポートはこちら: {{report_url}} にアクセスしてください"
    const result = fillReportUrl(message, "https://paradigmjp.com/ja/report/example")
    expect(result).toBe("レポートはこちら: https://paradigmjp.com/ja/report/example にアクセスしてください")
    expect(result).not.toContain("{{report_url}}")
  })

  it("replaces all occurrences of {{report_url}}", () => {
    const message = "URL: {{report_url}} 予備: {{report_url}}"
    const result = fillReportUrl(message, "https://example.com/report")
    expect(result).toBe("URL: https://example.com/report 予備: https://example.com/report")
  })
})

describe("generateFormMessage", () => {
  it("returns error for invalid companyId (company not found)", async () => {
    mocks.findCompanyById.mockResolvedValue(null)

    const result = await generateFormMessage("nonexistent-id")

    expect(result.ok).toBe(false)
    expect(result.error).toBe("company not found")
    expect(mocks.findCompanyById).toHaveBeenCalledWith("nonexistent-id")
  })

  it("uses safe outreach fallbacks when Twenty has not normalized industry and issues yet", async () => {
    vi.stubEnv("DIFY_API_KEY", "")
    const company = {
      id: "company-1",
      region: "global",
      slug: "example",
      name_key: null,
      report_locale: "en",
      target_country: "US",
      template_variant: "website_diagnostic",
      domain: "https://example.com",
      company_name: "Example Inc",
      industry: null,
      prefecture: null,
      pipeline_status: "report_ready",
      deal_stage: "未対応",
      pagespeed_mobile: null,
      pagespeed_desktop: null,
      detected_issues: [],
      report_views: 0,
      is_hot_lead: false,
      send_result: null,
      sent_at: null,
      report_url: null,
      follow_up_date: null,
      memo: null,
      assigned_to: null,
      notion_page_id: null,
      source: "twenty",
      tech_stack: null,
      pain_diagnosis: null,
      dify_result: null,
      japan_market_audit: null,
      demo_site: null,
      visual_evidence: null,
      report_generated_at: null,
      meta: {},
      created_at: "2026-06-18T00:00:00.000Z",
      updated_at: "2026-06-18T00:00:00.000Z",
    } as SalesCompany
    mocks.findCompanyById.mockResolvedValue(company)
    mocks.matchTemplate.mockResolvedValue(null)
    mocks.getAiPrompt.mockResolvedValue("system prompt")
    mocks.callDeepSeek.mockResolvedValue({ ok: true, text: "Please review {{report_url}}" })
    mocks.getServiceSalesSupabase.mockReturnValue(null)

    const result = await generateFormMessage("company-1")

    expect(result.ok).toBe(true)
    expect(result.fallbacks).toEqual({ industry: true, issueCode: true })
    expect(mocks.matchTemplate).toHaveBeenCalledWith("consulting", "no_ogp", "global", {
      reportLocale: "en",
      targetCountry: "US",
      templateVariant: "website_diagnostic",
    })
    expect(mocks.callDeepSeek).toHaveBeenCalled()
  })
})
