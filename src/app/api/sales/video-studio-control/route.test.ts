import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(), dashboard: vi.fn(), reserve: vi.fn(), updatePolicy: vi.fn(), review: vi.fn(), notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ authorizeSalesApiRequest: mocks.authorize }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/video-studio-control/repository", () => ({
  getGenerationControlDashboard: mocks.dashboard,
  reserveGenerationRun: mocks.reserve,
  updateGenerationPolicy: mocks.updatePolicy,
  recordGenerationQualityReview: mocks.review,
}))

import { GET, POST } from "./route"

function request(method: string, body?: Record<string, unknown>) {
  return new NextRequest("https://paradigmjp.com/api/sales/video-studio-control", {
    method, headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

const preflight = {
  action: "preflight", idempotencyKey: "console-request-001", contentHash: "b".repeat(64), projectId: "",
  shotKind: "cinematic", qualityTier: "balanced", requestedProvider: "auto",
  estimatedCostCents: 300, estimatedLlmTokens: 4_000, estimatedGpuSeconds: 180,
}

describe("Video Studio control API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authorize.mockResolvedValue({ ok: true, principal: { key: "payload:1", email: "admin@example.com", role: "admin", authSource: "payload" } })
    mocks.dashboard.mockResolvedValue({ policy: {}, providers: [], runs: [], events: [], totals: {} })
    mocks.reserve.mockResolvedValue({ run: { id: "run-1", decision: "allow", selected_provider: "seedance" } })
    mocks.updatePolicy.mockResolvedValue({ dailyBudgetCents: 5000, perRunBudgetCents: 1200, maxAttempts: 2, updatedAt: "2026-09-07T00:00:00Z" })
    mocks.review.mockResolvedValue({ id: "review-1", runId: "11111111-1111-4111-8111-111111111111", overallScore: 88, approved: true, note: "Commercial quality passed" })
    mocks.notify.mockResolvedValue({ ok: true, slack: { ok: true }, database: { ok: true } })
  })

  it("rejects unauthenticated reads", async () => {
    mocks.authorize.mockResolvedValue({ ok: false, principal: null })
    expect((await GET(request("GET"))).status).toBe(401)
    expect(mocks.dashboard).not.toHaveBeenCalled()
  })

  it("records preflight without invoking any provider", async () => {
    const response = await POST(request("POST", preflight))
    expect(response.status).toBe(201)
    expect(mocks.reserve).toHaveBeenCalledOnce()
    expect(mocks.notify).toHaveBeenCalledWith(expect.stringContaining("allow"), expect.objectContaining({ type: "video_studio_preflight_allow" }))
  })

  it("returns conflict when the database guard blocks spend", async () => {
    mocks.reserve.mockResolvedValue({ run: { id: "run-2", decision: "block", selected_provider: "kling", block_reason: "daily_cost_limit" } })
    const response = await POST(request("POST", { ...preflight, qualityTier: "premium" }))
    expect(response.status).toBe(409)
    expect(mocks.notify).toHaveBeenCalledWith(expect.stringContaining("block"), expect.objectContaining({ priority: 90 }))
  })

  it("does not allow viewers to change budgets", async () => {
    mocks.authorize.mockResolvedValue({ ok: true, principal: { key: "payload:2", email: null, role: "viewer", authSource: "payload" } })
    const response = await POST(request("POST", preflight))
    expect(response.status).toBe(403)
    expect(mocks.reserve).not.toHaveBeenCalled()
  })

  it("records a six-axis quality decision for cache eligibility", async () => {
    const response = await POST(request("POST", { action: "review_quality", runId: "11111111-1111-4111-8111-111111111111", identityScore: 90, motionScore: 88, promptScore: 91, artifactScore: 84, audioScore: 86, commercialScore: 89, approved: true, note: "Commercial quality passed" }))
    expect(response.status).toBe(201)
    expect(mocks.review).toHaveBeenCalledOnce()
    expect(mocks.notify).toHaveBeenCalledWith(expect.stringContaining("品質比較"), expect.objectContaining({ type: "video_studio_quality_reviewed" }))
  })
})
