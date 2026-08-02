import { PET_MOVIE_TABLES, requirePetMovieDatabase } from "@/lib/pet-life-movie/data"
import { getPetMarketingConnectorStatuses } from "./publisher"
import { PET_MARKETING_MARKETS } from "./strategy"
import type {
  PetMarketingCampaign,
  PetMarketingDashboard,
  PetMarketingFunnel,
  PetMarketingLocale,
  PetMarketingPost,
  PetMarketingRun,
} from "./types"

type DbRow = Record<string, unknown>

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function nullableStringFrom(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function numberFrom(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

function stringArrayFrom(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

export function campaignFromRow(row: DbRow): PetMarketingCampaign {
  return {
    id: stringFrom(row.id),
    campaignKey: stringFrom(row.campaign_key),
    name: stringFrom(row.name),
    status: row.status as PetMarketingCampaign["status"],
    locales: stringArrayFrom(row.locales) as PetMarketingLocale[],
    markets: stringArrayFrom(row.markets),
    destinationPath: stringFrom(row.destination_path),
    mediaUrl: stringFrom(row.media_url),
    autoApprove: row.auto_approve === true,
    autoPublish: row.auto_publish === true,
    contentPolicyVersion: stringFrom(row.content_policy_version),
    startsAt: stringFrom(row.starts_at),
    endsAt: nullableStringFrom(row.ends_at),
  }
}

export function runFromRow(row: DbRow): PetMarketingRun {
  return {
    id: stringFrom(row.id),
    campaignId: stringFrom(row.campaign_id),
    runKey: stringFrom(row.run_key),
    runDate: stringFrom(row.run_date),
    slot: row.slot as PetMarketingRun["slot"],
    status: row.status as PetMarketingRun["status"],
    generatedPostCount: numberFrom(row.generated_post_count),
    publishedPostCount: numberFrom(row.published_post_count),
    failedPostCount: numberFrom(row.failed_post_count),
    blockedPostCount: numberFrom(row.blocked_post_count),
    blockedReason: nullableStringFrom(row.blocked_reason),
    startedAt: stringFrom(row.started_at),
    completedAt: nullableStringFrom(row.completed_at),
  }
}

export function postFromRow(row: DbRow): PetMarketingPost {
  return {
    id: stringFrom(row.id),
    postKey: stringFrom(row.post_key),
    platform: row.platform as PetMarketingPost["platform"],
    locale: row.locale as PetMarketingPost["locale"],
    market: stringFrom(row.market),
    contentType: stringFrom(row.content_type),
    status: row.status as PetMarketingPost["status"],
    hook: stringFrom(row.hook),
    caption: stringFrom(row.caption),
    hashtags: stringArrayFrom(row.hashtags),
    mediaUrl: stringFrom(row.media_url),
    destinationUrl: stringFrom(row.destination_url),
    scheduledFor: nullableStringFrom(row.scheduled_for),
    publishedAt: nullableStringFrom(row.published_at),
    publishAttempts: numberFrom(row.publish_attempts),
    postUrl: nullableStringFrom(row.post_url),
    errorMessage: nullableStringFrom(row.error_message),
    impressions: numberFrom(row.impressions),
    engagements: numberFrom(row.engagements),
    linkClicks: numberFrom(row.link_clicks),
    conversions: numberFrom(row.conversions),
  }
}

function funnelFromEvents(rows: DbRow[]): PetMarketingFunnel {
  const count = (name: string) => rows.filter((row) => row.event_name === name).length
  const pageViews = count("page_view")
  const projectsCreated = count("project_created")
  return {
    pageViews,
    heroCtaClicks: count("hero_cta"),
    wizardStarts: count("wizard_start"),
    projectsCreated,
    previewsCreated: count("preview_created"),
    checkoutStarts: count("checkout_started"),
    projectConversionRate: pageViews > 0 ? Math.round((projectsCreated / pageViews) * 10_000) / 100 : 0,
  }
}

export async function getPetMarketingDashboard(): Promise<PetMarketingDashboard> {
  const database = requirePetMovieDatabase()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [campaigns, runs, posts, events] = await Promise.all([
    database.from(PET_MOVIE_TABLES.MARKETING_CAMPAIGNS).select("*").order("created_at", { ascending: false }).limit(5),
    database.from(PET_MOVIE_TABLES.MARKETING_RUNS).select("*").order("started_at", { ascending: false }).limit(21),
    database.from(PET_MOVIE_TABLES.MARKETING_POSTS).select("*").order("created_at", { ascending: false }).limit(120),
    database.from(PET_MOVIE_TABLES.MARKETING_EVENTS).select("event_name, occurred_at").gte("occurred_at", since).limit(10_000),
  ])
  for (const result of [campaigns, runs, posts, events]) {
    if (result.error) throw new Error(`Pet marketing dashboard query failed: ${result.error.message}`)
  }
  const campaignRows = (campaigns.data ?? []) as DbRow[]
  const active = campaignRows.find((row) => row.status === "active") ?? campaignRows[0]
  return {
    generatedAt: new Date().toISOString(),
    campaign: active ? campaignFromRow(active) : null,
    connectors: getPetMarketingConnectorStatuses(),
    markets: PET_MARKETING_MARKETS,
    recentRuns: ((runs.data ?? []) as DbRow[]).map(runFromRow),
    posts: ((posts.data ?? []) as DbRow[]).map(postFromRow),
    funnel: funnelFromEvents((events.data ?? []) as DbRow[]),
  }
}

export async function updatePetMarketingCampaignStatus(
  campaignId: string,
  status: PetMarketingCampaign["status"],
): Promise<PetMarketingCampaign> {
  const database = requirePetMovieDatabase()
  const { data, error } = await database.from(PET_MOVIE_TABLES.MARKETING_CAMPAIGNS)
    .update({ status })
    .eq("id", campaignId)
    .select("*")
    .single()
  if (error) throw new Error(`Campaign status update failed: ${error.message}`)
  return campaignFromRow(data as DbRow)
}
