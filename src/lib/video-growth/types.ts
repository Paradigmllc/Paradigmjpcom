import type { OperatorRole } from "@/lib/sales/api-auth"

export const VIDEO_GROWTH_CHANNELS = ["x", "instagram", "linkedin", "cold_email"] as const
export type VideoGrowthChannel = (typeof VIDEO_GROWTH_CHANNELS)[number]

export const VIDEO_GROWTH_CAMPAIGN_STATUSES = [
  "draft", "review_ready", "human_approved", "scheduled", "active",
  "paused", "completed", "cancelled",
] as const
export type VideoGrowthCampaignStatus = (typeof VIDEO_GROWTH_CAMPAIGN_STATUSES)[number]

export const VIDEO_GROWTH_VARIANT_STATUSES = [
  "draft", "review_ready", "approved", "scheduled", "published", "failed",
] as const
export type VideoGrowthVariantStatus = (typeof VIDEO_GROWTH_VARIANT_STATUSES)[number]

export const VIDEO_GROWTH_PLANS = ["essential", "growth", "scale", "custom"] as const
export type VideoGrowthPlan = (typeof VIDEO_GROWTH_PLANS)[number]
export const VIDEO_GROWTH_BILLING_STATUSES = ["trial", "contracted", "invoiced", "paid", "overdue", "cancelled"] as const
export type VideoGrowthBillingStatus = (typeof VIDEO_GROWTH_BILLING_STATUSES)[number]
export const VIDEO_GROWTH_WORK_STATUSES = [
  "intake", "production", "internal_review", "client_review", "revision",
  "ready", "delivered", "on_hold", "closed",
] as const
export type VideoGrowthWorkStatus = (typeof VIDEO_GROWTH_WORK_STATUSES)[number]
export const VIDEO_GROWTH_PRIORITIES = ["normal", "high", "urgent"] as const
export type VideoGrowthPriority = (typeof VIDEO_GROWTH_PRIORITIES)[number]

export const VIDEO_GROWTH_CHECK_KEYS = [
  "contract", "payment", "brief", "brand_assets", "usage_rights", "landing_page", "tracking",
] as const
export type VideoGrowthCheckKey = (typeof VIDEO_GROWTH_CHECK_KEYS)[number]
export type VideoGrowthCheckStatus = "pending" | "passed" | "waived" | "failed"
export type VideoGrowthApprovalStage = "internal_quality" | "client_release"
export type VideoGrowthApprovalDecision = "pending" | "approved" | "changes_requested" | "rejected"
export type VideoGrowthRevisionCategory = "copy" | "visual" | "audio" | "subtitles" | "legal" | "other"
export type VideoGrowthRevisionSeverity = "minor" | "major" | "blocking"
export type VideoGrowthRevisionStatus = "open" | "in_progress" | "resolved" | "rejected"

export type VideoGrowthPrincipal = {
  key: string
  email: string | null
  displayName: string
  role: OperatorRole
  authSource: "payload" | "legacy" | "work" | "webhook"
}

export type StudioDeliverable = {
  name: string
  aspectRatio: string
  width: number
  height: number
  durationSeconds: number
  language: string
}

export type StudioProjectSummary = {
  projectId: string
  projectName: string
  status: string
  updatedAt: string
  deliverables: StudioDeliverable[]
}

export type VideoGrowthWorkOrder = {
  campaignId: string
  clientName: string
  clientContactName: string | null
  clientContactEmail: string | null
  plan: VideoGrowthPlan
  monthlyVideoQuota: number
  billingStatus: VideoGrowthBillingStatus
  workStatus: VideoGrowthWorkStatus
  priority: VideoGrowthPriority
  timezone: string
  languages: string[]
  contractReference: string | null
  purchaseOrderReference: string | null
  deliveryOwner: string
  clientApprover: string | null
  kickoffAt: string | null
  deliveryDueAt: string
  revision: number
  updatedAt: string
}

export type VideoGrowthReadinessCheck = {
  id: string
  campaignId: string
  checkKey: VideoGrowthCheckKey
  status: VideoGrowthCheckStatus
  note: string
  evidenceUrl: string | null
  checkedBy: string | null
  checkedByRole: string | null
  checkedAt: string | null
  revision: number
  updatedAt: string
}

export type VideoGrowthApproval = {
  id: string
  campaignId: string
  variantId: string
  stage: VideoGrowthApprovalStage
  contentRevision: number
  decision: VideoGrowthApprovalDecision
  requestNote: string
  evidenceUrl: string | null
  requestedBy: string
  requestedByRole: string
  requestedAt: string
  decisionNote: string | null
  decidedBy: string | null
  decidedByRole: string | null
  decidedAt: string | null
  revision: number
}

export type VideoGrowthRevisionRequest = {
  id: string
  campaignId: string
  variantId: string
  category: VideoGrowthRevisionCategory
  severity: VideoGrowthRevisionSeverity
  description: string
  status: VideoGrowthRevisionStatus
  requestedBy: string
  requestedByRole: string
  assignedTo: string | null
  dueAt: string | null
  resolutionNote: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  revision: number
  createdAt: string
  updatedAt: string
}

export type VideoGrowthDailyMetric = {
  id: string
  campaignId: string
  variantId: string
  metricDate: string
  impressions: number
  views: number
  clicks: number
  replies: number
  meetings: number
  source: "manual" | "csv" | "api"
  recordedBy: string
  revision: number
  updatedAt: string
}

export type VideoGrowthVariant = {
  id: string
  campaignId: string
  channel: VideoGrowthChannel
  variantName: string
  aspectRatio: string
  width: number
  height: number
  durationSeconds: number
  hook: string
  caption: string
  cta: string
  deliverableName: string | null
  status: VideoGrowthVariantStatus
  scheduledFor: string | null
  publishedAt: string | null
  publishUrl: string | null
  impressions: number
  views: number
  clicks: number
  replies: number
  meetings: number
  errorMessage: string | null
  contentRevision: number
  revision: number
  updatedAt: string
  approvals: VideoGrowthApproval[]
  revisions: VideoGrowthRevisionRequest[]
  dailyMetrics: VideoGrowthDailyMetric[]
}

export type VideoGrowthCampaign = {
  id: string
  name: string
  studioProjectId: string
  studioProjectName: string
  studioProjectStatus: string
  objective: string
  audience: string
  offer: string
  landingUrl: string
  status: VideoGrowthCampaignStatus
  owner: string
  approvedBy: string | null
  approvalNote: string | null
  approvedAt: string | null
  scheduledFor: string | null
  revision: number
  createdAt: string
  updatedAt: string
  workOrder: VideoGrowthWorkOrder | null
  readinessChecks: VideoGrowthReadinessCheck[]
  variants: VideoGrowthVariant[]
}

export type VideoGrowthEvent = {
  id: string
  campaignId: string
  variantId: string | null
  eventType: string
  channel: VideoGrowthChannel | null
  actor: string
  actorRole: string | null
  note: string
  createdAt: string
}

export type VideoGrowthKpis = {
  campaigns: number
  openWorkOrders: number
  overdueDeliveries: number
  blockedIntakes: number
  pendingApprovals: number
  openRevisions: number
  approvedCampaigns: number
  publishedVariants: number
  monthlyQuotaUsed: number
  monthlyQuotaLimit: number
  impressions: number
  views: number
  clicks: number
  replies: number
  meetings: number
  clickThroughRate: number
}

export type VideoGrowthDashboard = {
  generatedAt: string
  campaigns: VideoGrowthCampaign[]
  studioProjects: StudioProjectSummary[]
  recentEvents: VideoGrowthEvent[]
  kpis: VideoGrowthKpis
}
