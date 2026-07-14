import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  ingest: vi.fn(),
  notify: vi.fn(),
  getCrmConfig: vi.fn(),
  applyMetadata: vi.fn(),
  readiness: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/lead-candidate-runs", () => ({ ingestLeadCandidatesDurable: mocks.ingest }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/sales/crm-field-config", () => ({ getSalesCrmFieldConfig: mocks.getCrmConfig }))
vi.mock("@/lib/sales/twenty-crm-metadata", () => ({ applyTwentyCrmMetadata: mocks.applyMetadata }))
vi.mock("@/lib/sales/lead-source-records", () => ({ getLeadSourceReadiness: mocks.readiness }))

import { POST } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.notify.mockResolvedValue({ ok: true })
  mocks.getCrmConfig.mockResolvedValue({ fields: [], options: [] })
  mocks.applyMetadata.mockResolvedValue({ configured: true, appliedFields: 16, selectFields: 4, error: null })
  mocks.readiness.mockImplementation(async (countryCodes: string[]) => Object.fromEntries(countryCodes.map((countryCode) => [countryCode, { sourceIds: [`source-${countryCode}`], recordCount: 100 }])))
  mocks.ingest.mockImplementation(async ({ countryCode }: { countryCode: string }) => ({
    ok: true,
    runId: `run-${countryCode}`,
    countryCode,
  }))
})

describe("form-qualified lead factory route", () => {
  it("starts one run per unique country with form and Twenty gates fixed on", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/factory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ countryCodes: ["us", "GB", "us"], verifyPerCountry: 50 }),
    }))

    expect(response.status).toBe(202)
    expect(mocks.applyMetadata).toHaveBeenCalledTimes(1)
    expect(mocks.ingest).toHaveBeenCalledTimes(2)
    expect(mocks.ingest).toHaveBeenCalledWith(expect.objectContaining({
      countryCode: "US",
      sourceConfigIds: ["source-US"],
      verifyLimit: 50,
      promote: true,
      requireVerifiedForm: true,
      minFormConfidence: 80,
      minSmbScore: 50,
      syncTwenty: true,
    }))
    expect(mocks.notify).toHaveBeenCalledWith("sales", expect.objectContaining({
      type: "form_qualified_lead_factory_started",
    }))
  })

  it("fails closed before creating runs when Twenty country/view metadata cannot be repaired", async () => {
    mocks.applyMetadata.mockResolvedValue({ configured: true, appliedFields: 0, selectFields: 0, error: "country field unavailable" })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/factory", {
      method: "POST",
      body: JSON.stringify({ countryCodes: ["US"] }),
    }))

    expect(response.status).toBe(503)
    expect(mocks.ingest).not.toHaveBeenCalled()
  })

  it("fails closed before Twenty setup when a country has no evidence-bearing source records", async () => {
    mocks.readiness.mockResolvedValue({ US: { sourceIds: [], recordCount: 0 } })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/factory", {
      method: "POST",
      body: JSON.stringify({ countryCodes: ["US"] }),
    }))

    expect(response.status).toBe(409)
    expect(mocks.applyMetadata).not.toHaveBeenCalled()
    expect(mocks.ingest).not.toHaveBeenCalled()
  })

  it("rejects unauthorized starts before creating runs", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/factory", {
      method: "POST",
      body: JSON.stringify({ countryCodes: ["US"] }),
    }))

    expect(response.status).toBe(401)
    expect(mocks.ingest).not.toHaveBeenCalled()
  })
})
