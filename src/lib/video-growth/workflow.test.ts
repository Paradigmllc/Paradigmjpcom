import { describe, expect, it } from "vitest"
import { approvalForRevision, campaignReviewReadiness, nextCampaignActions, variantHasReleaseApproval, variantIsComplete } from "./workflow"
import type { VideoGrowthCampaign, VideoGrowthReadinessCheck, VideoGrowthVariant } from "./types"

function variant(overrides: Partial<VideoGrowthVariant> = {}): VideoGrowthVariant {
  return {
    id: "11111111-1111-4111-8111-111111111111", campaignId: "22222222-2222-4222-8222-222222222222",
    channel: "x", variantName: "X Feed", aspectRatio: "1:1", width: 1080, height: 1080, durationSeconds: 30,
    hook: "制作速度を商談機会へ変える", caption: "承認済み動画を媒体別に展開し、成果を一つの台帳で計測します。",
    cta: "詳細を見る", deliverableName: "social-ja-square", status: "review_ready", scheduledFor: null,
    publishedAt: null, publishUrl: null, impressions: 0, views: 0, clicks: 0, replies: 0, meetings: 0,
    errorMessage: null, contentRevision: 1, revision: 1, updatedAt: "2026-08-02T00:00:00.000Z",
    approvals: [], revisions: [], dailyMetrics: [], ...overrides,
  }
}

function readinessChecks(status: VideoGrowthReadinessCheck["status"] = "passed"): VideoGrowthReadinessCheck[] {
  return (["contract", "payment", "brief", "brand_assets", "usage_rights", "landing_page", "tracking"] as const).map((checkKey, index) => ({
    id: `${index + 1}1111111-1111-4111-8111-111111111111`, campaignId: "22222222-2222-4222-8222-222222222222",
    checkKey, status, note: "確認済み", evidenceUrl: null, checkedBy: "operator@example.com", checkedByRole: "delivery",
    checkedAt: "2026-08-02T00:00:00.000Z", revision: 1, updatedAt: "2026-08-02T00:00:00.000Z",
  }))
}

function campaign(overrides: Partial<VideoGrowthCampaign> = {}): VideoGrowthCampaign {
  const variants = (["x", "instagram", "linkedin", "cold_email"] as const).map((channel, index) => variant({ id: `${index + 1}1111111-1111-4111-8111-111111111111`, channel }))
  return {
    id: "22222222-2222-4222-8222-222222222222", name: "Video subscription launch",
    studioProjectId: "video-subscription-launch", studioProjectName: "Video subscription launch",
    studioProjectStatus: "delivered", objective: "Direct acquisition meetings", audience: "B2B marketing leaders",
    offer: "Video subscription diagnostic", landingUrl: "https://paradigmjp.com/ja/video-as-a-service",
    status: "draft", owner: "operator@example.com", approvedBy: null, approvalNote: null, approvedAt: null,
    scheduledFor: null, revision: 1, createdAt: "2026-08-02T00:00:00.000Z", updatedAt: "2026-08-02T00:00:00.000Z",
    workOrder: {
      campaignId: "22222222-2222-4222-8222-222222222222", clientName: "Example Inc.", clientContactName: null,
      clientContactEmail: null, plan: "growth", monthlyVideoQuota: 8, billingStatus: "contracted", workStatus: "intake",
      priority: "normal", timezone: "Asia/Tokyo", languages: ["ja"], contractReference: null,
      purchaseOrderReference: null, deliveryOwner: "operator@example.com", clientApprover: null, kickoffAt: null,
      deliveryDueAt: "2026-08-20T00:00:00.000Z", revision: 1, updatedAt: "2026-08-02T00:00:00.000Z",
    },
    readinessChecks: readinessChecks(), variants, ...overrides,
  }
}

describe("video growth commercial workflow", () => {
  it("requires meaningful copy and a Studio deliverable", () => {
    expect(variantIsComplete(variant({ deliverableName: null }))).toBe(false)
    expect(variantIsComplete(variant({ caption: "short" }))).toBe(false)
    expect(variantIsComplete(variant())).toBe(true)
  })

  it("blocks campaign review until Studio, work order, seven checks and four variants are ready", () => {
    expect(campaignReviewReadiness(campaign({ studioProjectStatus: "draft_review_required" })).ready).toBe(false)
    expect(campaignReviewReadiness(campaign({ workOrder: null })).missing).toContain("商用ワークオーダーを登録する")
    expect(campaignReviewReadiness(campaign({ readinessChecks: readinessChecks("pending") })).missing[0]).toContain("残り7件")
    expect(campaignReviewReadiness(campaign())).toEqual({ ready: true, missing: [] })
  })

  it("binds both release approvals to the current content revision", () => {
    const approved = variant({ approvals: [
      { id: "a", campaignId: "c", variantId: "v", stage: "internal_quality", contentRevision: 1, decision: "approved", requestNote: "qa", evidenceUrl: null, requestedBy: "a", requestedByRole: "delivery", requestedAt: "now", decisionNote: "ok", decidedBy: "b", decidedByRole: "delivery", decidedAt: "now", revision: 2 },
      { id: "b", campaignId: "c", variantId: "v", stage: "client_release", contentRevision: 1, decision: "approved", requestNote: "client", evidenceUrl: null, requestedBy: "a", requestedByRole: "delivery", requestedAt: "now", decisionNote: "ok", decidedBy: "c", decidedByRole: "commercial_lead", decidedAt: "now", revision: 2 },
    ] })
    expect(variantHasReleaseApproval(approved)).toBe(true)
    expect(approvalForRevision({ ...approved, contentRevision: 2 }, "client_release")).toBeNull()
    expect(variantHasReleaseApproval({ ...approved, contentRevision: 2 })).toBe(false)
  })

  it("never exposes an external-send campaign action", () => {
    const actions = ["draft", "review_ready", "human_approved", "scheduled", "active", "paused"]
      .flatMap((status) => nextCampaignActions(status as VideoGrowthCampaign["status"]))
    expect(actions).not.toContain("send")
    expect(actions).not.toContain("publish")
    expect(nextCampaignActions("active")).toContain("complete")
  })
})
