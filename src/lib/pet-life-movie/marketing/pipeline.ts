import { randomUUID } from "node:crypto"
import { PET_MOVIE_TABLES, requirePetMovieDatabase } from "@/lib/pet-life-movie/data"
import {
  getPetMarketingConnectorStatuses,
  isDirectPetMarketingPlatform,
  publishPetMarketingPost,
} from "./publisher"
import { campaignFromRow, runFromRow } from "./repository"
import { planPetMarketingPosts } from "./strategy"
import type {
  PetMarketingCampaign,
  PetMarketingConnectorStatus,
  PetMarketingRun,
  PetMarketingSlot,
} from "./types"

type DbRow = Record<string, unknown>
type Database = ReturnType<typeof requirePetMovieDatabase>

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

export function globalRunDate(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

async function loadCampaign(database: Database): Promise<PetMarketingCampaign> {
  const { data, error } = await database.from(PET_MOVIE_TABLES.MARKETING_CAMPAIGNS)
    .select("*")
    .eq("campaign_key", "pet-life-movie-global-launch")
    .maybeSingle()
  if (error) throw new Error(`Global campaign lookup failed: ${error.message}`)
  if (!data) throw new Error("Pet Life Movie global campaign is not provisioned")
  return campaignFromRow(data as DbRow)
}

async function ensureRun(
  database: Database,
  campaign: PetMarketingCampaign,
  slot: PetMarketingSlot,
  runDate: string,
): Promise<string> {
  const runKey = `${campaign.campaignKey}:${runDate}:${slot}`
  const { data: existing, error: existingError } = await database.from(PET_MOVIE_TABLES.MARKETING_RUNS)
    .select("id")
    .eq("run_key", runKey)
    .maybeSingle()
  if (existingError) throw new Error(`Marketing run lookup failed: ${existingError.message}`)
  if (existing) {
    const runId = stringFrom((existing as DbRow).id)
    const { error } = await database.from(PET_MOVIE_TABLES.MARKETING_RUNS).update({
      status: "running",
      started_at: new Date().toISOString(),
      completed_at: null,
      blocked_reason: null,
    }).eq("id", runId)
    if (error) throw new Error(`Marketing run restart failed: ${error.message}`)
    return runId
  }
  const runId = randomUUID()
  const { error } = await database.from(PET_MOVIE_TABLES.MARKETING_RUNS).insert({
    id: runId,
    campaign_id: campaign.id,
    run_key: runKey,
    run_date: runDate,
    slot,
    status: "running",
  })
  if (error) throw new Error(`Marketing run creation failed: ${error.message}`)
  return runId
}

async function finishBlockedRun(
  database: Database,
  runId: string,
  reason: string,
): Promise<PetMarketingRun> {
  const completedAt = new Date().toISOString()
  const { data, error } = await database.from(PET_MOVIE_TABLES.MARKETING_RUNS).update({
    status: "blocked",
    blocked_reason: reason,
    completed_at: completedAt,
    summary: { safePosture: "fail_closed" },
  }).eq("id", runId).select("*").single()
  if (error) throw new Error(`Blocked marketing run persistence failed: ${error.message}`)
  return runFromRow(data as DbRow)
}

async function publishDuePosts(
  database: Database,
  connectors: PetMarketingConnectorStatus[],
): Promise<{ published: number; failed: number; blocked: number }> {
  const { data, error } = await database.from(PET_MOVIE_TABLES.MARKETING_POSTS)
    .select("*")
    .eq("status", "scheduled")
    .not("approved_at", "is", null)
    .is("external_post_id", null)
    .lte("scheduled_for", new Date().toISOString())
    .in("platform", ["instagram", "pinterest"])
    .order("scheduled_for", { ascending: true })
    .limit(12)
  if (error) throw new Error(`Due marketing post lookup failed: ${error.message}`)
  const connectorMap = new Map(connectors.map((connector) => [connector.platform, connector]))
  let published = 0
  let failed = 0
  let blocked = 0
  for (const row of (data ?? []) as DbRow[]) {
    const platform = row.platform
    if (typeof platform !== "string" || !isDirectPetMarketingPlatform(platform)) {
      blocked += 1
      continue
    }
    if (!connectorMap.get(platform)?.configured) {
      blocked += 1
      continue
    }
    const hook = nullableStringFrom(row.hook)
    const caption = nullableStringFrom(row.caption)
    const mediaUrl = nullableStringFrom(row.media_url)
    const destinationUrl = nullableStringFrom(row.destination_url)
    if (!hook || !caption || !mediaUrl || !destinationUrl) {
      blocked += 1
      const { error: updateError } = await database.from(PET_MOVIE_TABLES.MARKETING_POSTS).update({
        status: "blocked",
        error_message: "Hook, caption, media URL, or destination URL is missing",
      }).eq("id", row.id)
      if (updateError) console.error("[pet-marketing] invalid post update failed", updateError.message)
      continue
    }
    try {
      const result = await publishPetMarketingPost({
        platform,
        hook,
        caption,
        mediaUrl,
        destinationUrl,
      })
      const now = new Date().toISOString()
      const { error: updateError } = await database.from(PET_MOVIE_TABLES.MARKETING_POSTS).update({
        status: "published",
        external_post_id: result.externalPostId,
        post_url: result.postUrl,
        published_at: now,
        last_publish_attempt_at: now,
        publish_attempts: numberFrom(row.publish_attempts) + 1,
        error_message: null,
      }).eq("id", row.id)
      if (updateError) throw new Error(updateError.message)
      published += 1
    } catch (error) {
      console.error(`[pet-marketing] ${platform} publish failed`, error)
      failed += 1
      const attempts = numberFrom(row.publish_attempts) + 1
      const { error: updateError } = await database.from(PET_MOVIE_TABLES.MARKETING_POSTS).update({
        status: attempts >= 3 ? "blocked" : "scheduled",
        publish_attempts: attempts,
        last_publish_attempt_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message.slice(0, 500) : "Social publishing failed",
      }).eq("id", row.id)
      if (updateError) console.error("[pet-marketing] publish failure persistence failed", updateError.message)
    }
  }
  return { published, failed, blocked }
}

export async function runGlobalPetMarketingPipeline(
  slot: PetMarketingSlot,
  runDate = globalRunDate(),
): Promise<PetMarketingRun> {
  const database = requirePetMovieDatabase()
  const campaign = await loadCampaign(database)
  const runId = await ensureRun(database, campaign, slot, runDate)
  const now = new Date()
  if (campaign.status !== "active") {
    return finishBlockedRun(database, runId, `Campaign is ${campaign.status}`)
  }
  if (new Date(campaign.startsAt).getTime() > now.getTime()) {
    return finishBlockedRun(database, runId, "Campaign has not started")
  }
  if (campaign.endsAt && new Date(campaign.endsAt).getTime() <= now.getTime()) {
    return finishBlockedRun(database, runId, "Campaign has ended")
  }

  try {
    const plan = planPetMarketingPosts({
      campaignKey: campaign.campaignKey,
      destinationPath: campaign.destinationPath,
      mediaUrl: campaign.mediaUrl,
      slot,
      runDate,
    })
    const postRows = plan.map((post) => {
      const approved = campaign.autoApprove && post.directPublishingEligible
      return {
        campaign_id: campaign.id,
        run_id: runId,
        post_key: post.postKey,
        platform: post.platform,
        locale: post.locale,
        market: post.market,
        content_type: post.contentType,
        status: approved && campaign.autoPublish ? "scheduled" : approved ? "approved" : "draft",
        hook: post.hook,
        caption: post.caption,
        hashtags: post.hashtags,
        media_url: post.mediaUrl,
        destination_url: post.destinationUrl,
        utm_source: post.utmSource,
        utm_medium: post.utmMedium,
        utm_campaign: post.utmCampaign,
        utm_content: post.utmContent,
        scheduled_for: post.scheduledFor,
        approved_at: approved ? new Date().toISOString() : null,
        approved_by: approved ? campaign.contentPolicyVersion : null,
      }
    })
    const { error: upsertError } = await database.from(PET_MOVIE_TABLES.MARKETING_POSTS)
      .upsert(postRows, { onConflict: "post_key", ignoreDuplicates: true })
    if (upsertError) throw new Error(`Marketing post generation failed: ${upsertError.message}`)

    const connectors = getPetMarketingConnectorStatuses()
    const directConnectors = connectors.filter((connector) => connector.directPublishingSupported)
    const configuredCount = directConnectors.filter((connector) => connector.configured).length
    const delivery = campaign.autoPublish
      ? await publishDuePosts(database, connectors)
      : { published: 0, failed: 0, blocked: 0 }
    const expectedDrafts = plan.filter((post) => !post.directPublishingEligible).length
    const missingDirectConnectors = directConnectors.length - configuredCount
    const blockedReason = configuredCount === 0
      ? "Pet専用Instagram/Pinterest認証待ち。世界向け投稿案は生成済みです。"
      : missingDirectConnectors > 0
        ? "一部のdirect connectorが未認証です。認証済みchannelのみ配信しました。"
        : null
    const status = configuredCount === 0
      ? "blocked"
      : delivery.failed > 0 || delivery.blocked > 0 || missingDirectConnectors > 0
        ? "degraded"
        : "succeeded"
    const completedAt = new Date().toISOString()
    const { data: updated, error: updateError } = await database.from(PET_MOVIE_TABLES.MARKETING_RUNS).update({
      status,
      generated_post_count: plan.length,
      published_post_count: delivery.published,
      failed_post_count: delivery.failed,
      blocked_post_count: delivery.blocked,
      blocked_reason: blockedReason,
      completed_at: completedAt,
      summary: {
        connectors,
        expectedDrafts,
        policy: campaign.contentPolicyVersion,
        markets: plan.map((post) => post.market),
      },
    }).eq("id", runId).select("*").single()
    if (updateError) throw new Error(`Marketing run completion failed: ${updateError.message}`)
    return runFromRow(updated as DbRow)
  } catch (error) {
    console.error("[pet-marketing] global pipeline failed", error)
    const completedAt = new Date().toISOString()
    const { error: updateError } = await database.from(PET_MOVIE_TABLES.MARKETING_RUNS).update({
      status: "failed",
      failed_post_count: 1,
      blocked_reason: error instanceof Error ? error.message.slice(0, 500) : "Global marketing pipeline failed",
      completed_at: completedAt,
    }).eq("id", runId)
    if (updateError) console.error("[pet-marketing] failed run persistence failed", updateError.message)
    throw error
  }
}
