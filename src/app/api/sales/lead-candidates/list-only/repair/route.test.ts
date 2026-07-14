import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  repair: vi.fn(),
  audit: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/list-lead-sync-repair", () => ({ inspectAndRepairListLeadSync: mocks.repair }))
vi.mock("@/lib/sales/lead-operator-audit", () => ({ recordLeadOperatorEvent: mocks.audit }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))

import { POST } from "./route"

const anomaly = {
  companyId: "93db83ea-5310-4c4e-8dc7-0f14d6b041d4",
  domain: "example.com",
  reasons: ["twenty_summary_drift"],
  repaired: false,
  error: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.audit.mockResolvedValue(undefined)
  mocks.notify.mockResolvedValue({ ok: true })
})

describe("list-only Twenty repair route", () => {
  it("previews drift without writing audit events", async () => {
    mocks.repair.mockResolvedValue({ scanned: 79, drifted: 1, repaired: 0, failed: 0, anomalies: [anomaly] })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/list-only/repair", {
      method: "POST",
      body: JSON.stringify({ action: "preview", operatorName: "Sato", limit: 100 }),
    }))

    expect(response.status).toBe(200)
    expect(mocks.repair).toHaveBeenCalledWith({ dryRun: true, limit: 100 })
    expect(mocks.audit).not.toHaveBeenCalled()
  })

  it("records requested and completed audit events around the repair", async () => {
    mocks.repair
      .mockResolvedValueOnce({ scanned: 79, drifted: 1, repaired: 0, failed: 0, anomalies: [anomaly] })
      .mockResolvedValueOnce({ scanned: 79, drifted: 1, repaired: 1, failed: 0, anomalies: [{ ...anomaly, repaired: true }] })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/list-only/repair", {
      method: "POST",
      body: JSON.stringify({ action: "repair", operatorName: "Sato", limit: 100 }),
    }))

    expect(response.status).toBe(200)
    expect(mocks.audit).toHaveBeenCalledTimes(2)
    expect(mocks.notify).toHaveBeenCalledWith("sales", expect.objectContaining({ type: "list_lead_twenty_repaired" }))
  })

  it("rejects unauthenticated repair requests", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-candidates/list-only/repair", {
      method: "POST",
      body: JSON.stringify({ action: "repair", operatorName: "Sato", limit: 100 }),
    }))

    expect(response.status).toBe(401)
    expect(mocks.repair).not.toHaveBeenCalled()
  })
})
