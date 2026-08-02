import { describe, expect, it } from "vitest"
import { videoGrowthDashboardToCsv } from "./export"
import type { VideoGrowthDashboard } from "./types"

describe("video growth operations CSV", () => {
  it("exports commercial, approval and outcome columns with spreadsheet injection protection", () => {
    const dashboard: VideoGrowthDashboard = {
      generatedAt: "2026-08-02T00:00:00.000Z", studioProjects: [], recentEvents: [],
      kpis: { campaigns: 1, openWorkOrders: 1, overdueDeliveries: 0, blockedIntakes: 0, pendingApprovals: 0, openRevisions: 0, approvedCampaigns: 1, publishedVariants: 1, monthlyQuotaUsed: 1, monthlyQuotaLimit: 8, impressions: 100, views: 80, clicks: 4, replies: 1, meetings: 1, clickThroughRate: 4 },
      campaigns: [{
        id: "campaign-1", name: "=unsafe campaign", studioProjectId: "studio", studioProjectName: "Studio",
        studioProjectStatus: "delivered", objective: "Meetings", audience: "B2B", offer: "Audit",
        landingUrl: "https://example.com", status: "active", owner: "operator", approvedBy: "approver",
        approvalNote: "approved", approvedAt: "2026-08-01T00:00:00.000Z", scheduledFor: "2026-08-02T00:00:00.000Z",
        revision: 3, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-02T00:00:00.000Z",
        readinessChecks: [], workOrder: {
          campaignId: "campaign-1", clientName: "Example Inc.", clientContactName: null, clientContactEmail: null,
          plan: "growth", monthlyVideoQuota: 8, billingStatus: "paid", workStatus: "ready", priority: "normal",
          timezone: "Asia/Tokyo", languages: ["ja"], contractReference: null, purchaseOrderReference: null,
          deliveryOwner: "operator", clientApprover: "client", kickoffAt: null,
          deliveryDueAt: "2026-08-10T00:00:00.000Z", revision: 2, updatedAt: "2026-08-02T00:00:00.000Z",
        },
        variants: [{
          id: "variant-1", campaignId: "campaign-1", channel: "linkedin", variantName: "LinkedIn",
          aspectRatio: "1:1", width: 1080, height: 1080, durationSeconds: 45, hook: "Hook", caption: "Caption",
          cta: "CTA", deliverableName: "social", status: "published", scheduledFor: null,
          publishedAt: "2026-08-02T00:00:00.000Z", publishUrl: "https://linkedin.com/example",
          impressions: 100, views: 80, clicks: 4, replies: 1, meetings: 1, errorMessage: null,
          contentRevision: 2, revision: 8, updatedAt: "2026-08-02T00:00:00.000Z", revisions: [], dailyMetrics: [],
          approvals: [
            { id: "a", campaignId: "campaign-1", variantId: "variant-1", stage: "internal_quality", contentRevision: 2, decision: "approved", requestNote: "qa", evidenceUrl: null, requestedBy: "a", requestedByRole: "delivery", requestedAt: "now", decisionNote: "ok", decidedBy: "b", decidedByRole: "delivery", decidedAt: "now", revision: 2 },
            { id: "b", campaignId: "campaign-1", variantId: "variant-1", stage: "client_release", contentRevision: 2, decision: "approved", requestNote: "client", evidenceUrl: null, requestedBy: "a", requestedByRole: "delivery", requestedAt: "now", decisionNote: "ok", decidedBy: "c", decidedByRole: "commercial_lead", decidedAt: "now", revision: 2 },
          ],
        }],
      }],
    }
    const csv = videoGrowthDashboardToCsv(dashboard)
    expect(csv.startsWith("\uFEFF")).toBe(true)
    expect(csv).toContain("internal_quality")
    expect(csv).toContain('"approved","approved"')
    expect(csv).toContain('"\'=unsafe campaign"')
  })
})
