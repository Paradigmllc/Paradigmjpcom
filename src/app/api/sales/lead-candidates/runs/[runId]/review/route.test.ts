import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  approvePilot: vi.fn(),
  recover: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/lead-candidate-review", () => ({
  approveLeadCandidateItems: mocks.approve,
  rejectLeadCandidateItems: mocks.reject,
  approvePilotRun: mocks.approvePilot,
  recoverStaleLeadCandidatePromotions: mocks.recover,
}))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))

import { POST } from "./route"

const runId = "11111111-1111-4111-8111-111111111111"
const itemId = "22222222-2222-4222-8222-222222222222"
const context = { params: Promise.resolve({ runId }) }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.approve.mockResolvedValue({ approved: 1, failed: 0, invalid: [], skipped: 0 })
  mocks.reject.mockResolvedValue({ rejected: 1, skipped: 0 })
  mocks.approvePilot.mockResolvedValue({ approvedSources: 1, approvedAt: "2026-07-14T00:00:00.000Z" })
  mocks.recover.mockResolvedValue({ recovered: 2 })
  mocks.notify.mockResolvedValue({ ok: true })
})

describe("lead candidate operator review route", () => {
  it("syncs only explicitly selected candidates", async () => {
    const response = await POST(new NextRequest(`https://paradigmjp.com/api/sales/lead-candidates/runs/${runId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "approve", itemIds: [itemId], operatorName: "Sato", note: "Evidence and form checked" }),
    }), context)

    expect(response.status).toBe(200)
    expect(mocks.approve).toHaveBeenCalledWith({ runId, itemIds: [itemId], operatorName: "Sato", note: "Evidence and form checked" })
    expect(mocks.reject).not.toHaveBeenCalled()
  })

  it("requires a review note and operator identity", async () => {
    const response = await POST(new NextRequest(`https://paradigmjp.com/api/sales/lead-candidates/runs/${runId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "approve", itemIds: [itemId], operatorName: "", note: "" }),
    }), context)

    expect(response.status).toBe(400)
    expect(mocks.approve).not.toHaveBeenCalled()
  })

  it("keeps unauthenticated review requests out", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await POST(new NextRequest(`https://paradigmjp.com/api/sales/lead-candidates/runs/${runId}/review`, {
      method: "POST",
      body: JSON.stringify({ action: "approve_pilot", operatorName: "Sato", note: "Pilot quality confirmed" }),
    }), context)

    expect(response.status).toBe(401)
    expect(mocks.approvePilot).not.toHaveBeenCalled()
  })

  it("recovers stale promotions only through an explicit operator action", async () => {
    const response = await POST(new NextRequest(`https://paradigmjp.com/api/sales/lead-candidates/runs/${runId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "recover_stale_promotions", operatorName: "Sato", note: "Twenty state checked" }),
    }), context)

    expect(response.status).toBe(200)
    expect(mocks.recover).toHaveBeenCalledWith({ runId, operatorName: "Sato", note: "Twenty state checked" })
    expect(mocks.approve).not.toHaveBeenCalled()
  })
})
