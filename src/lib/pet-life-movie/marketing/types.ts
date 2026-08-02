export const PET_MARKETING_LOCALES = ["ja", "en", "es", "pt"] as const
export const PET_MARKETING_SLOTS = ["apac", "europe", "americas"] as const
export const PET_MARKETING_PLATFORMS = ["instagram", "pinterest", "tiktok", "youtube"] as const
export const PET_MARKETING_CAMPAIGN_STATUSES = ["draft", "active", "paused", "archived"] as const
export const PET_MARKETING_RUN_STATUSES = ["running", "succeeded", "degraded", "blocked", "failed"] as const
export const PET_MARKETING_POST_STATUSES = ["draft", "approved", "scheduled", "published", "blocked", "failed"] as const
export const PET_MARKETING_EVENT_NAMES = [
  "page_view",
  "hero_cta",
  "experience_cta",
  "wizard_start",
  "project_created",
  "preview_created",
  "checkout_started",
] as const

export type PetMarketingLocale = (typeof PET_MARKETING_LOCALES)[number]
export type PetMarketingSlot = (typeof PET_MARKETING_SLOTS)[number]
export type PetMarketingPlatform = (typeof PET_MARKETING_PLATFORMS)[number]
export type PetMarketingCampaignStatus = (typeof PET_MARKETING_CAMPAIGN_STATUSES)[number]
export type PetMarketingRunStatus = (typeof PET_MARKETING_RUN_STATUSES)[number]
export type PetMarketingPostStatus = (typeof PET_MARKETING_POST_STATUSES)[number]
export type PetMarketingEventName = (typeof PET_MARKETING_EVENT_NAMES)[number]

export type PetMarketingConnectorStatus = {
  platform: PetMarketingPlatform
  configured: boolean
  directPublishingSupported: boolean
  reason: string
}

export type PetMarketingCampaign = {
  id: string
  campaignKey: string
  name: string
  status: PetMarketingCampaignStatus
  locales: PetMarketingLocale[]
  markets: string[]
  destinationPath: string
  mediaUrl: string
  autoApprove: boolean
  autoPublish: boolean
  contentPolicyVersion: string
  startsAt: string
  endsAt: string | null
}

export type PetMarketingRun = {
  id: string
  campaignId: string
  runKey: string
  runDate: string
  slot: PetMarketingSlot
  status: PetMarketingRunStatus
  generatedPostCount: number
  publishedPostCount: number
  failedPostCount: number
  blockedPostCount: number
  blockedReason: string | null
  startedAt: string
  completedAt: string | null
}

export type PetMarketingPost = {
  id: string
  postKey: string
  platform: PetMarketingPlatform
  locale: PetMarketingLocale
  market: string
  contentType: string
  status: PetMarketingPostStatus
  hook: string
  caption: string
  hashtags: string[]
  mediaUrl: string
  destinationUrl: string
  scheduledFor: string | null
  publishedAt: string | null
  publishAttempts: number
  postUrl: string | null
  errorMessage: string | null
  impressions: number
  engagements: number
  linkClicks: number
  conversions: number
}

export type PetMarketingFunnel = {
  pageViews: number
  heroCtaClicks: number
  wizardStarts: number
  projectsCreated: number
  previewsCreated: number
  checkoutStarts: number
  projectConversionRate: number
}

export type PetMarketingMarket = {
  code: string
  label: string
  locale: PetMarketingLocale
  slot: PetMarketingSlot
}

export type PetMarketingDashboard = {
  generatedAt: string
  campaign: PetMarketingCampaign | null
  connectors: PetMarketingConnectorStatus[]
  markets: PetMarketingMarket[]
  recentRuns: PetMarketingRun[]
  posts: PetMarketingPost[]
  funnel: PetMarketingFunnel
}

export type PlannedPetMarketingPost = {
  postKey: string
  platform: PetMarketingPlatform
  locale: PetMarketingLocale
  market: string
  contentType: string
  hook: string
  caption: string
  hashtags: string[]
  mediaUrl: string
  destinationUrl: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  scheduledFor: string
  directPublishingEligible: boolean
}

export type PetMarketingAttributionInput = {
  eventName: PetMarketingEventName
  anonymousId: string
  locale: PetMarketingLocale
  market?: string
  path: string
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
}
