import { beforeEach, describe, expect, it, vi } from "vitest"

const callDeepSeek = vi.hoisted(() => vi.fn())
vi.mock("@/lib/deepseek", () => ({ callDeepSeek }))

import { analyzeManualCompanyProfile } from "./manual-japan-entry-profile"

const audit = {
  engine: "local_heuristic" as const,
  generated_at: "2026-07-19T00:00:00.000Z",
  score: 40,
  status: { tokushoho_missing: true, appi_missing: true, local_payments_missing: true, japanese_language_missing: true, jpy_currency_missing: true, japan_shipping_missing: true },
  signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
  pages_checked: ["https://screenshottocode.com/"],
  sales_pitch_context: "Public-page observations",
  human_review_required: true,
  legal_disclaimer: "Not legal advice",
}

function response(overrides: Record<string, unknown> = {}) {
  return {
    companyName: "Screenshot to Code",
    countryCode: "us",
    isJapaneseCompany: "false",
    smbStatus: "Qualified",
    smbConfidence: "83",
    smbEvidence: "Public software product; Public pricing",
    japanEntryFitStatus: "review required",
    japanEntryFitConfidence: "78%",
    japanEntryFitEvidence: "Online delivery\nNo Japanese customer path was found",
    businessModel: "ecomerce",
    industry: "Technology / IT",
    productContext: "Model-authored text must be discarded.",
    observedFacts: "Model-authored facts must be discarded.",
    outreachPlaybook: "saas_ai_devtools",
    positioningConcept: { concept: "AIサイト制作" },
    commercialSignals: [],
    ...overrides,
  }
}

const input = {
  domain: "screenshottocode.com",
  fallbackCompanyName: "Screenshot to Code",
  productContext: "Screenshot to Code converts screenshots into editable application code | Public pricing is available",
  title: "Screenshot to Code",
  description: "Convert screenshots into editable application code",
  headings: ["Build software from screenshots"],
  audit,
}

describe("manual company live-model response boundary", () => {
  beforeEach(() => vi.clearAllMocks())

  it("accepts the production screenshot payload and keeps deterministic public evidence", async () => {
    callDeepSeek.mockResolvedValue({ ok: true, text: JSON.stringify(response()) })

    const profile = await analyzeManualCompanyProfile(input)

    expect(callDeepSeek).toHaveBeenCalledTimes(1)
    expect(profile).toMatchObject({
      companyName: "Screenshot to Code",
      countryCode: "US",
      smbConfidence: 83,
      japanEntryFitConfidence: 78,
      businessModel: "ecommerce",
      positioningConcept: null,
      productContext: input.productContext,
      observedFacts: [
        "Screenshot to Code converts screenshots into editable application code",
        "Public pricing is available",
      ],
    })
    expect(JSON.stringify(profile)).not.toContain("Model-authored")
  })

  it("uses at most one shape-only repair for an unknown enum", async () => {
    callDeepSeek
      .mockResolvedValueOnce({ ok: true, text: JSON.stringify(response({ businessModel: "unknown-marketplace" })) })
      .mockResolvedValueOnce({ ok: true, text: JSON.stringify(response({ businessModel: "saas" })) })

    const profile = await analyzeManualCompanyProfile(input)

    expect(callDeepSeek).toHaveBeenCalledTimes(2)
    expect(profile.businessModel).toBe("saas")
    expect(callDeepSeek.mock.calls[1]?.[0]?.[1]?.content).toContain("commercialSignalShape")
  })

  it("returns a concise field-level error when the single repair is still invalid", async () => {
    callDeepSeek.mockResolvedValue({ ok: true, text: JSON.stringify(response({ businessModel: "unknown-marketplace" })) })

    await expect(analyzeManualCompanyProfile(input)).rejects.toThrow(
      "DeepSeek V4 Pro returned an invalid company classification after one repair (businessModel)",
    )
    expect(callDeepSeek).toHaveBeenCalledTimes(2)
  })

  it("repairs malformed JSON once without exposing the parser exception", async () => {
    callDeepSeek
      .mockResolvedValueOnce({ ok: true, text: '{"companyName":' })
      .mockResolvedValueOnce({ ok: true, text: JSON.stringify(response()) })

    await expect(analyzeManualCompanyProfile(input)).resolves.toMatchObject({ companyName: "Screenshot to Code" })
    expect(callDeepSeek).toHaveBeenCalledTimes(2)
  })

  it("returns a stable error when repaired JSON is still malformed", async () => {
    callDeepSeek.mockResolvedValue({ ok: true, text: '{"companyName":' })

    await expect(analyzeManualCompanyProfile(input)).rejects.toThrow(
      "DeepSeek V4 Pro returned invalid JSON after one company-classification repair",
    )
    expect(callDeepSeek).toHaveBeenCalledTimes(2)
  })
})
