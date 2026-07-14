import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  ingest: vi.fn(),
  notify: vi.fn(),
  readiness: vi.fn(),
  audit: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/lead-candidate-runs", () => ({ ingestLeadCandidatesDurable: mocks.ingest }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/sales/lead-source-records", () => ({ getLeadSourceReadiness: mocks.readiness }))
vi.mock("@/lib/sales/lead-operator-audit", () => ({ recordLeadOperatorEvent: mocks.audit }))

import { POST } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.notify.mockResolvedValue({ ok: true })
  mocks.audit.mockResolvedValue(undefined)
  mocks.readiness.mockImplementation(async (countryCodes: string[]) => Object.fromEntries(countryCodes.map((countryCode) => [countryCode, { sourceIds: [`source-${countryCode}`], scaleReadySourceIds: [`source-${countryCode}`], recordCount: 100, scaleReadyRecordCount: 100 }])))
  mocks.ingest.mockImplementation(async ({ countryCode }: { countryCode: string }) => ({
    ok: true,
    runId: `run-${countryCode}`,
    countryCode,
  }))
})

describe("form-qualified lead factory route", () => {
  it("starts one pilot per unique country with automatic promotion and Twenty sync fixed off", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/factory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ countryCodes: ["us", "GB", "us"], verifyPerCountry: 20, operatorName: "Sato", executionMode: "pilot" }),
    }))

    expect(response.status).toBe(202)
    expect(mocks.ingest).toHaveBeenCalledTimes(2)
    expect(mocks.ingest).toHaveBeenCalledWith(expect.objectContaining({
      countryCode: "US",
      sourceConfigIds: ["source-US"],
      verifyLimit: 20,
      promote: false,
      requireVerifiedForm: true,
      minFormConfidence: 80,
      minSmbScore: 50,
      syncTwenty: false,
      executionMode: "pilot",
    }))
    expect(mocks.notify).toHaveBeenCalledWith("sales", expect.objectContaining({
      type: "form_qualified_lead_factory_started",
    }))
    expect(JSON.stringify(await response.json())).not.toContain('"candidates"')
  })

  it("rejects batch execution without the explicit confirmation phrase", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/factory", {
      method: "POST",
      body: JSON.stringify({ countryCodes: ["US"], operatorName: "Sato", executionMode: "batch" }),
    }))

    expect(response.status).toBe(400)
    expect(mocks.ingest).not.toHaveBeenCalled()
  })

  it("fails closed when a country has no approved evidence-bearing source records", async () => {
    mocks.readiness.mockResolvedValue({ US: { sourceIds: [], scaleReadySourceIds: [], recordCount: 0, scaleReadyRecordCount: 0 } })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/factory", {
      method: "POST",
      body: JSON.stringify({ countryCodes: ["US"], operatorName: "Sato" }),
    }))

    expect(response.status).toBe(409)
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
