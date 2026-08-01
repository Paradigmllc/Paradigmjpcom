import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  upsertCompanyByDomain: vi.fn(),
  enqueueCompanyEnrichment: vi.fn(),
}))

vi.mock("@/lib/sales/companies", () => ({
  upsertCompanyByDomain: mocks.upsertCompanyByDomain,
}))
vi.mock("@/lib/sales/enrichment-jobs", () => ({
  enqueueCompanyEnrichment: mocks.enqueueCompanyEnrichment,
}))

import { startContactEnrichment } from "./contact-enrichment"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.upsertCompanyByDomain.mockResolvedValue({
    ok: true,
    company: { id: "44444444-4444-4444-8444-444444444444" },
  })
  mocks.enqueueCompanyEnrichment.mockResolvedValue({
    ok: true,
    job: { id: "55555555-5555-4555-8555-555555555555" },
  })
})
describe("startContactEnrichment", () => {
  test("persists a company and durable enrichment job before returning", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111"
    await startContactEnrichment({
      leadId,
      email: "founder@example.com",
      company: "Acme Software",
      message: "Launch in Japan",
      services: ["Japan Entry Package"],
      reportLocale: "en",
      targetCountry: "AU",
    })

    expect(mocks.upsertCompanyByDomain).toHaveBeenCalledWith(expect.objectContaining({
      domain: "example.com",
      company_name: "Acme Software",
      pipeline_status: "scanning",
    }))
    expect(mocks.enqueueCompanyEnrichment).toHaveBeenCalledWith(expect.objectContaining({
      companyId: "44444444-4444-4444-8444-444444444444",
      triggeredBy: "contact_submission",
      payload: expect.objectContaining({ lead_id: leadId }),
    }))
  })

  test("does not enqueue a job when the email has no usable domain", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    await startContactEnrichment({
      leadId: "33333333-3333-4333-8333-333333333333",
      email: "invalid-email",
      company: null,
      message: "Hello",
      services: [],
      reportLocale: "en",
      targetCountry: "US",
    })

    expect(mocks.upsertCompanyByDomain).not.toHaveBeenCalled()
    expect(mocks.enqueueCompanyEnrichment).not.toHaveBeenCalled()
    expect(warn.mock.calls.flat().join(" ")).toContain("33333333-3333-4333-8333-333333333333")
    warn.mockRestore()
  })
})
