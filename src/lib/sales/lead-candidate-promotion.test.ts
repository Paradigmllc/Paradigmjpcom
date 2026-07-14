import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  sync: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  getSupabase: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: mocks.getSupabase }))
vi.mock("./companies", () => ({ upsertCompanyByDomain: mocks.upsert }))
vi.mock("./twenty-sync-list-lead", () => ({ syncListLeadToTwenty: mocks.sync }))

import { promoteFormQualifiedCandidate } from "./lead-candidate-promotion"

const input = {
  runId: "run-1",
  countryCode: "US",
  syncTwenty: true,
  candidateId: "candidate-1",
  domain: "example.com",
  score: { stackFitScore: 80, smbScore: 58, freshnessScore: 74, geoConfidence: 80, contactabilityScore: 70, websiteAbsenceScore: 0, opportunityScore: 72, falsePositiveRisk: 12, details: {} },
  detections: [{ name: "Shopify", category: "Ecommerce", confidence: 95 }],
  form: { formUrl: "https://example.com/contact", method: "regex" as const, verification: "form" as const, confidence: 88, candidates: ["https://example.com/contact"], traceMs: 10 },
  source: "multi_source_domains",
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.eq.mockResolvedValue({ error: null })
  mocks.update.mockReturnValue({ eq: mocks.eq })
  mocks.from.mockReturnValue({ update: mocks.update })
  mocks.getSupabase.mockReturnValue({ from: mocks.from })
  mocks.upsert.mockResolvedValue({ ok: true, company: { id: "company-1" } })
  mocks.sync.mockResolvedValue({ ok: true, configured: true, companyId: "twenty-1" })
})

describe("promoteFormQualifiedCandidate", () => {
  it("syncs only the Twenty company home and marks the candidate after success", async () => {
    const result = await promoteFormQualifiedCandidate(input)

    expect(result).toMatchObject({ promoted: true, twentySynced: true, twentyCompanyId: "twenty-1" })
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      pipeline_status: "pending",
      generate_report_url: false,
      meta: expect.objectContaining({
        skip_enrichment: true,
        list_only: true,
        contact_form_url: input.form.formUrl,
      }),
    }))
    expect(mocks.sync).toHaveBeenCalledWith("company-1")
    expect(mocks.update).toHaveBeenCalledWith({ status: "promoted", company_id: "company-1" })
  })

  it("fails closed and does not mark the candidate when Twenty sync fails", async () => {
    mocks.sync.mockResolvedValue({ ok: false, configured: true, error: "Twenty unavailable" })

    const result = await promoteFormQualifiedCandidate(input)

    expect(result).toMatchObject({ promoted: false, twentySynced: false, error: "Twenty unavailable" })
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
