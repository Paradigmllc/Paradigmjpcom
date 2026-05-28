import { afterEach, describe, expect, it, vi } from "vitest"
import { runDifyDiagnosis } from "./dify-diagnosis"
import type { SalesCompany } from "./types"

const baseCompany: SalesCompany = {
  id: "00000000-0000-0000-0000-000000000001",
  region: "jp",
  slug: "example",
  name_key: "example",
  report_locale: "ja",
  target_country: "JP",
  template_variant: "website_diagnostic",
  domain: "example.com",
  company_name: "Example",
  industry: "consulting",
  prefecture: "Tokyo",
  pipeline_status: "scanning",
  deal_stage: "未対応" as SalesCompany["deal_stage"],
  pagespeed_mobile: 38,
  pagespeed_desktop: 71,
  detected_issues: ["speed_critical", "no_ogp"],
  report_views: 0,
  is_hot_lead: false,
  send_result: null,
  sent_at: null,
  report_url: "https://paradigmjp.com/ja/report/example",
  follow_up_date: null,
  memo: null,
  assigned_to: null,
  notion_page_id: null,
  source: "test",
  meta: { tech: { count: 2 }, scan: { is_wordpress: true } },
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}

describe("runDifyDiagnosis", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("returns local fallback when Dify is not configured", async () => {
    vi.stubEnv("DIFY_DIAGNOSIS_API_KEY", "")
    vi.stubEnv("DIFY_API_KEY", "")

    const result = await runDifyDiagnosis(baseCompany)

    expect(result.ok).toBe(true)
    expect(result.configured).toBe(false)
    expect(result.summary.primaryPain).toContain("表示速度")
    expect(result.summary.evidence.join(" ")).toContain("38/100")
  })

  it("normalizes workflow outputs when Dify responds", async () => {
    vi.stubEnv("DIFY_DIAGNOSIS_API_KEY", "test-key")
    vi.stubEnv("DIFY_DIAGNOSIS_API_URL", "https://dify.test/workflows/run")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: {
              outputs: {
                primary_pain: "問い合わせ導線が弱い",
                evidence: ["フォームが深い", "速度が遅い"],
                recommended_offer: "フォーム改善",
                confidence: 0.91,
              },
            },
          }),
          { status: 200 },
        ),
      ),
    )

    const result = await runDifyDiagnosis(baseCompany)

    expect(result.ok).toBe(true)
    expect(result.configured).toBe(true)
    expect(result.summary.primaryPain).toBe("問い合わせ導線が弱い")
    expect(result.summary.confidence).toBe(0.91)
  })
})
