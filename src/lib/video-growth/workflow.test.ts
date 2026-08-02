import { describe, expect, it } from "vitest"
import { campaignReviewReadiness, nextCampaignActions, variantIsComplete } from "./workflow"
import type { VideoGrowthCampaign, VideoGrowthVariant } from "./types"

function variant(overrides: Partial<VideoGrowthVariant> = {}): VideoGrowthVariant {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    campaignId: "22222222-2222-4222-8222-222222222222",
    channel: "x",
    variantName: "X Feed",
    aspectRatio: "1:1",
    width: 1080,
    height: 1080,
    durationSeconds: 30,
    hook: "制作速度を商談機会に変える",
    caption: "承認済みの動画を媒体別に展開し、成果を一つの台帳で計測します。",
    cta: "詳細を見る",
    deliverableName: "social-ja-square",
    status: "review_ready",
    scheduledFor: null,
    publishedAt: null,
    publishUrl: null,
    impressions: 0,
    views: 0,
    clicks: 0,
    replies: 0,
    meetings: 0,
    errorMessage: null,
    revision: 1,
    updatedAt: "2026-08-02T00:00:00.000Z",
    ...overrides,
  }
}

function campaign(overrides: Partial<VideoGrowthCampaign> = {}): VideoGrowthCampaign {
  const variants = (["x", "instagram", "linkedin", "cold_email"] as const).map((channel, index) => variant({ id: `${index + 1}1111111-1111-4111-8111-111111111111`, channel }))
  return {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Video subscription launch",
    studioProjectId: "video-subscription-launch",
    studioProjectName: "Video subscription launch",
    studioProjectStatus: "delivered",
    objective: "Direct acquisition meetings",
    audience: "B2B marketing leaders",
    offer: "Video subscription diagnostic",
    landingUrl: "https://paradigmjp.com/ja/video-as-a-service",
    status: "draft",
    owner: "Sato",
    approvedBy: null,
    approvalNote: null,
    approvedAt: null,
    scheduledFor: null,
    revision: 1,
    createdAt: "2026-08-02T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    variants,
    ...overrides,
  }
}

describe("video growth approval workflow", () => {
  it("requires meaningful copy and a Studio deliverable", () => {
    expect(variantIsComplete(variant({ deliverableName: null }))).toBe(false)
    expect(variantIsComplete(variant({ caption: "short" }))).toBe(false)
    expect(variantIsComplete(variant())).toBe(true)
  })

  it("blocks review until Studio approval and all four variants are ready", () => {
    expect(campaignReviewReadiness(campaign({ studioProjectStatus: "draft_review_required" }))).toMatchObject({ ready: false })
    const incomplete = campaign()
    incomplete.variants[2] = variant({ channel: "linkedin", status: "draft" })
    expect(campaignReviewReadiness(incomplete).missing).toContain("LinkedInをレビュー準備済みにする")
    expect(campaignReviewReadiness(campaign())).toEqual({ ready: true, missing: [] })
  })

  it("never exposes an external-send campaign action", () => {
    const actions = ["draft", "review_ready", "human_approved", "scheduled", "active", "paused"]
      .flatMap((status) => nextCampaignActions(status as VideoGrowthCampaign["status"]))
    expect(actions).not.toContain("send")
    expect(actions).not.toContain("publish")
    expect(nextCampaignActions("active")).toContain("complete")
  })
})
