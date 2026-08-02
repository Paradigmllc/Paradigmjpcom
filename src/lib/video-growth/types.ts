export const VIDEO_GROWTH_CHANNELS = ["x", "instagram", "linkedin", "cold_email"] as const
export type VideoGrowthChannel = (typeof VIDEO_GROWTH_CHANNELS)[number]

export const VIDEO_GROWTH_CAMPAIGN_STATUSES = [
  "draft",
  "review_ready",
  "human_approved",
  "scheduled",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const
export type VideoGrowthCampaignStatus = (typeof VIDEO_GROWTH_CAMPAIGN_STATUSES)[number]

export const VIDEO_GROWTH_VARIANT_STATUSES = [
  "draft",
  "review_ready",
  "approved",
  "scheduled",
  "published",
  "failed",
] as const
export type VideoGrowthVariantStatus = (typeof VIDEO_GROWTH_VARIANT_STATUSES)[number]

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
  revision: number
  updatedAt: string
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
  variants: VideoGrowthVariant[]
}

export type VideoGrowthEvent = {
  id: string
  campaignId: string
  variantId: string | null
  eventType: string
  channel: VideoGrowthChannel | null
  actor: string
  note: string
  createdAt: string
}

export type VideoGrowthKpis = {
  campaigns: number
  approvedCampaigns: number
  publishedVariants: number
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
