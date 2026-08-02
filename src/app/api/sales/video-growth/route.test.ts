import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const principal = { key: "payload:operator-1", email: "operator@example.com", role: "admin", authSource: "payload" }
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(), dashboard: vi.fn(), create: vi.fn(), transition: vi.fn(), updateVariant: vi.fn(),
  updateWorkOrder: vi.fn(), updateReadiness: vi.fn(), approval: vi.fn(), revision: vi.fn(), metrics: vi.fn(), notify: vi.fn(),
  updateBilling: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ authorizeSalesApiRequest: mocks.authorize }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/video-growth/repository", () => ({
  getVideoGrowthDashboard: mocks.dashboard, createVideoGrowthCampaign: mocks.create,
  transitionVideoGrowthCampaign: mocks.transition, updateVideoGrowthVariant: mocks.updateVariant,
  updateVideoGrowthWorkOrder: mocks.updateWorkOrder, updateVideoGrowthReadiness: mocks.updateReadiness,
  updateVideoGrowthBilling: mocks.updateBilling,
  manageVideoGrowthApproval: mocks.approval, manageVideoGrowthRevision: mocks.revision,
  recordVideoGrowthDailyMetrics: mocks.metrics,
}))

import { GET, PATCH, POST } from "./route"

const campaignId = "11111111-1111-4111-8111-111111111111"
const variantId = "22222222-2222-4222-8222-222222222222"

function request(method: string, body?: Record<string, unknown>) {
  return new NextRequest("https://paradigmjp.com/api/sales/video-growth", {
    method, headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe("Video Growth commercial API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authorize.mockResolvedValue({ ok: true, principal })
    mocks.dashboard.mockResolvedValue({ campaigns: [], studioProjects: [], recentEvents: [], kpis: {} })
    mocks.create.mockResolvedValue(campaignId)
    mocks.transition.mockResolvedValue("human_approved")
    mocks.updateVariant.mockResolvedValue("published")
    mocks.updateWorkOrder.mockResolvedValue("production")
    mocks.updateReadiness.mockResolvedValue("passed")
    mocks.updateBilling.mockResolvedValue("paid")
    mocks.approval.mockResolvedValue("approved")
    mocks.revision.mockResolvedValue("open")
    mocks.metrics.mockResolvedValue("2026-08-02")
    mocks.notify.mockResolvedValue({ ok: true, slack: { ok: true }, database: { ok: true } })
  })

  it("rejects unauthenticated reads", async () => {
    mocks.authorize.mockResolvedValue({ ok: false, principal: null })
    const response = await GET(request("GET"))
    expect(response.status).toBe(401)
    expect(mocks.dashboard).not.toHaveBeenCalled()
  })

  it("returns the authenticated principal instead of accepting a typed actor", async () => {
    const response = await GET(request("GET"))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ principal: { key: principal.key, role: "admin", displayName: principal.email } })
  })

  it("creates a commercial work order and ignores a spoofed actor", async () => {
    const response = await POST(request("POST", {
      name: "Video subscription direct launch", studioProjectId: "video-subscription-launch",
      objective: "Generate qualified direct sales meetings", audience: "Japanese B2B marketing leaders",
      offer: "Video subscription production diagnostic", landingUrl: "https://paradigmjp.com/ja/video-as-a-service",
      clientName: "Example Inc.", clientContactName: "Client Owner", clientContactEmail: "client@example.com",
      plan: "growth", monthlyVideoQuota: 8, billingStatus: "contracted", priority: "normal",
      timezone: "Asia/Tokyo", languages: ["ja"], contractReference: "CONTRACT-001",
      purchaseOrderReference: "", deliveryOwner: "Delivery Owner", clientApprover: "Client Approver",
      kickoffAt: new Date(Date.now() + 60_000).toISOString(),
      deliveryDueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      actor: "spoofed@example.com",
    }))
    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith(expect.not.objectContaining({ actor: expect.anything() }), principal)
    expect(mocks.notify).toHaveBeenCalledWith(expect.stringContaining("商用ワークオーダー"), expect.objectContaining({ type: "video_growth_commercial_created" }))
  })

  it("records campaign approval but exposes no send-message action", async () => {
    const approved = await PATCH(request("PATCH", {
      target: "campaign", action: "approve", campaignId, expectedRevision: 2,
      note: "All creative, rights and claims reviewed",
    }))
    expect(approved.status).toBe(200)
    expect(mocks.transition).toHaveBeenCalledWith(expect.objectContaining({ action: "approve" }), principal)

    const rejected = await PATCH(request("PATCH", {
      target: "campaign", action: "send_message", campaignId, expectedRevision: 3, note: "Attempt send",
    }))
    expect(rejected.status).toBe(400)
    expect(mocks.transition).toHaveBeenCalledTimes(1)
  })

  it("records a verified publication URL without calling an external publisher", async () => {
    const response = await PATCH(request("PATCH", {
      target: "variant", action: "publish", variantId, expectedRevision: 4,
      note: "Publication verified manually", publishUrl: "https://www.linkedin.com/posts/example",
    }))
    expect(response.status).toBe(200)
    expect(mocks.updateVariant).toHaveBeenCalledWith(expect.objectContaining({ action: "publish" }), principal)
    expect(mocks.notify).toHaveBeenCalledWith(expect.stringContaining("手動公開"), expect.any(Object))
  })

  it("limits finance operators to the payment readiness check", async () => {
    mocks.authorize.mockResolvedValue({ ok: true, principal: { ...principal, role: "finance" } })
    const legalCheck = await PATCH(request("PATCH", {
      target: "readiness", action: "update", checkId: campaignId, checkKey: "usage_rights",
      expectedRevision: 1, status: "passed", note: "rights evidence", evidenceUrl: "",
    }))
    expect(legalCheck.status).toBe(403)
    const paymentCheck = await PATCH(request("PATCH", {
      target: "readiness", action: "update", checkId: campaignId, checkKey: "payment",
      expectedRevision: 1, status: "passed", note: "payment confirmed", evidenceUrl: "",
    }))
    expect(paymentCheck.status).toBe(200)
    expect(mocks.updateReadiness).toHaveBeenCalledOnce()
    const billing = await PATCH(request("PATCH", {
      target: "billing", action: "update", campaignId, expectedRevision: 2,
      billingStatus: "paid", note: "Payment settled",
    }))
    expect(billing.status).toBe(200)
    expect(mocks.updateBilling).toHaveBeenCalledOnce()
  })
})
