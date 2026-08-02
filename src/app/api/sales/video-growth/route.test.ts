import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  dashboard: vi.fn(),
  create: vi.fn(),
  transition: vi.fn(),
  updateVariant: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/video-growth/repository", () => ({
  getVideoGrowthDashboard: mocks.dashboard,
  createVideoGrowthCampaign: mocks.create,
  transitionVideoGrowthCampaign: mocks.transition,
  updateVideoGrowthVariant: mocks.updateVariant,
}))

import { GET, PATCH, POST } from "./route"

const campaignId = "11111111-1111-4111-8111-111111111111"
const variantId = "22222222-2222-4222-8222-222222222222"

function request(method: string, body?: Record<string, unknown>) {
  return new NextRequest("https://paradigmjp.com/api/sales/video-growth", {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe("Video Growth API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authorize.mockResolvedValue(true)
    mocks.dashboard.mockResolvedValue({ campaigns: [], studioProjects: [], recentEvents: [], kpis: {} })
    mocks.create.mockResolvedValue(campaignId)
    mocks.transition.mockResolvedValue("human_approved")
    mocks.updateVariant.mockResolvedValue("published")
    mocks.notify.mockResolvedValue({ ok: true, slack: { ok: true }, database: { ok: true } })
  })

  it("rejects unauthenticated reads", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await GET(request("GET"))
    expect(response.status).toBe(401)
    expect(mocks.dashboard).not.toHaveBeenCalled()
  })

  it("creates a four-channel campaign through the audited repository and notifies both channels", async () => {
    const response = await POST(request("POST", {
      name: "Video subscription direct launch",
      studioProjectId: "video-subscription-launch",
      objective: "Generate qualified direct sales meetings",
      audience: "Japanese B2B marketing leaders",
      offer: "Video subscription production diagnostic",
      landingUrl: "https://paradigmjp.com/ja/video-as-a-service",
      owner: "Sato",
      actor: "Sato",
    }))
    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledOnce()
    expect(mocks.notify).toHaveBeenCalledWith(expect.stringContaining("作成"), expect.objectContaining({ type: "video_growth_campaign_created" }))
  })

  it("records human approval but exposes no send-message action", async () => {
    const approved = await PATCH(request("PATCH", {
      target: "campaign",
      action: "approve",
      campaignId,
      expectedRevision: 2,
      actor: "Sato",
      note: "All creative and claims reviewed",
    }))
    expect(approved.status).toBe(200)
    expect(mocks.transition).toHaveBeenCalledWith(expect.objectContaining({ action: "approve" }))

    const rejected = await PATCH(request("PATCH", {
      target: "campaign",
      action: "send_message",
      campaignId,
      expectedRevision: 3,
      actor: "Sato",
      note: "Attempt automated send",
    }))
    expect(rejected.status).toBe(400)
    expect(mocks.transition).toHaveBeenCalledTimes(1)
  })

  it("records a verified publication URL without calling an external publisher", async () => {
    const response = await PATCH(request("PATCH", {
      target: "variant",
      action: "publish",
      variantId,
      expectedRevision: 4,
      actor: "Sato",
      note: "Publication verified manually",
      publishUrl: "https://www.linkedin.com/posts/example",
    }))
    expect(response.status).toBe(200)
    expect(mocks.updateVariant).toHaveBeenCalledWith(expect.objectContaining({ action: "publish" }))
    expect(mocks.notify).toHaveBeenCalledWith(expect.stringContaining("公開"), expect.any(Object))
  })
})
