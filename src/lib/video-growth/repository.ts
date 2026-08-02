import "server-only"

import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"
import type {
  CreateVideoGrowthCampaignInput,
  TransitionVideoGrowthCampaignInput,
  UpdateVideoGrowthVariantInput,
} from "./schemas"
import type {
  StudioDeliverable,
  StudioProjectSummary,
  VideoGrowthCampaign,
  VideoGrowthDashboard,
  VideoGrowthEvent,
  VideoGrowthVariant,
} from "./types"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
type DbRow = Record<string, unknown>

function requireDatabase(): ServiceSupabase {
  const database = getServiceSalesSupabase()
  if (!database) throw new Error("Video Growthのデータベース接続が設定されていません")
  return database
}

function recordFrom(value: unknown): DbRow {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DbRow : {}
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function nullableStringFrom(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function numberFrom(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function deliverablesFromManifest(value: unknown): StudioDeliverable[] {
  const deliverables = recordFrom(value).deliverables
  if (!Array.isArray(deliverables)) return []
  return deliverables.flatMap((item) => {
    const row = recordFrom(item)
    const name = stringFrom(row.name)
    if (!name) return []
    return [{
      name,
      aspectRatio: stringFrom(row.aspect_ratio),
      width: numberFrom(row.width),
      height: numberFrom(row.height),
      durationSeconds: numberFrom(row.duration_seconds),
      language: stringFrom(row.language),
    }]
  })
}

function studioProjectFromRow(row: DbRow): StudioProjectSummary {
  return {
    projectId: stringFrom(row.project_id),
    projectName: stringFrom(row.project_name),
    status: stringFrom(row.status),
    updatedAt: stringFrom(row.updated_at),
    deliverables: deliverablesFromManifest(row.manifest),
  }
}

function variantFromRow(row: DbRow): VideoGrowthVariant {
  return {
    id: stringFrom(row.id),
    campaignId: stringFrom(row.campaign_id),
    channel: row.channel as VideoGrowthVariant["channel"],
    variantName: stringFrom(row.variant_name),
    aspectRatio: stringFrom(row.aspect_ratio),
    width: numberFrom(row.width),
    height: numberFrom(row.height),
    durationSeconds: numberFrom(row.duration_seconds),
    hook: stringFrom(row.hook),
    caption: stringFrom(row.caption),
    cta: stringFrom(row.cta),
    deliverableName: nullableStringFrom(row.deliverable_name),
    status: row.status as VideoGrowthVariant["status"],
    scheduledFor: nullableStringFrom(row.scheduled_for),
    publishedAt: nullableStringFrom(row.published_at),
    publishUrl: nullableStringFrom(row.publish_url),
    impressions: numberFrom(row.impressions),
    views: numberFrom(row.views),
    clicks: numberFrom(row.clicks),
    replies: numberFrom(row.replies),
    meetings: numberFrom(row.meetings),
    errorMessage: nullableStringFrom(row.error_message),
    revision: numberFrom(row.revision),
    updatedAt: stringFrom(row.updated_at),
  }
}

function campaignFromRow(
  row: DbRow,
  project: StudioProjectSummary | undefined,
  variants: VideoGrowthVariant[],
): VideoGrowthCampaign {
  return {
    id: stringFrom(row.id),
    name: stringFrom(row.name),
    studioProjectId: stringFrom(row.studio_project_id),
    studioProjectName: project?.projectName ?? stringFrom(row.studio_project_id),
    studioProjectStatus: project?.status ?? "unknown",
    objective: stringFrom(row.objective),
    audience: stringFrom(row.audience),
    offer: stringFrom(row.offer),
    landingUrl: stringFrom(row.landing_url),
    status: row.status as VideoGrowthCampaign["status"],
    owner: stringFrom(row.owner),
    approvedBy: nullableStringFrom(row.approved_by),
    approvalNote: nullableStringFrom(row.approval_note),
    approvedAt: nullableStringFrom(row.approved_at),
    scheduledFor: nullableStringFrom(row.scheduled_for),
    revision: numberFrom(row.revision),
    createdAt: stringFrom(row.created_at),
    updatedAt: stringFrom(row.updated_at),
    variants,
  }
}

function eventFromRow(row: DbRow): VideoGrowthEvent {
  return {
    id: stringFrom(row.id),
    campaignId: stringFrom(row.campaign_id),
    variantId: nullableStringFrom(row.variant_id),
    eventType: stringFrom(row.event_type),
    channel: nullableStringFrom(row.channel) as VideoGrowthEvent["channel"],
    actor: stringFrom(row.actor),
    note: stringFrom(row.note),
    createdAt: stringFrom(row.created_at),
  }
}

export async function getVideoGrowthDashboard(): Promise<VideoGrowthDashboard> {
  const database = requireDatabase()
  const [campaignResult, projectResult] = await Promise.all([
    database.from(DB_TABLES.VIDEO_GROWTH_CAMPAIGNS).select("*").order("updated_at", { ascending: false }).limit(100),
    database.from(DB_TABLES.VIDEO_FACTORY_STUDIO_PROJECTS).select("project_id,project_name,status,manifest,updated_at").order("updated_at", { ascending: false }).limit(100),
  ])

  const firstError = campaignResult.error ?? projectResult.error
  if (firstError) throw new Error(`Video Growthデータの取得に失敗しました: ${firstError.message}`)

  const campaignRows = (campaignResult.data ?? []) as DbRow[]
  const campaignIds = campaignRows.map((row) => stringFrom(row.id)).filter(Boolean)
  const idsForQuery = campaignIds.length > 0 ? campaignIds : ["00000000-0000-0000-0000-000000000000"]
  const [variantResult, eventResult] = await Promise.all([
    database.from(DB_TABLES.VIDEO_GROWTH_VARIANTS).select("*").in("campaign_id", idsForQuery).order("created_at", { ascending: true }).limit(400),
    database.from(DB_TABLES.VIDEO_GROWTH_EVENTS).select("id,campaign_id,variant_id,event_type,channel,actor,note,created_at").order("created_at", { ascending: false }).limit(200),
  ])
  const relatedError = variantResult.error ?? eventResult.error
  if (relatedError) throw new Error(`Video Growthデータの取得に失敗しました: ${relatedError.message}`)

  const studioProjects = ((projectResult.data ?? []) as DbRow[]).map(studioProjectFromRow)
  const projectMap = new Map(studioProjects.map((project) => [project.projectId, project]))
  const allVariants = ((variantResult.data ?? []) as DbRow[]).map(variantFromRow)
  const variantsByCampaign = new Map<string, VideoGrowthVariant[]>()
  for (const variant of allVariants) {
    variantsByCampaign.set(variant.campaignId, [...(variantsByCampaign.get(variant.campaignId) ?? []), variant])
  }
  const campaigns = campaignRows.map((row) => {
    const id = stringFrom(row.id)
    return campaignFromRow(row, projectMap.get(stringFrom(row.studio_project_id)), variantsByCampaign.get(id) ?? [])
  })
  const recentEvents = ((eventResult.data ?? []) as DbRow[]).map(eventFromRow)
  const totals = allVariants.reduce((sum, variant) => ({
    impressions: sum.impressions + variant.impressions,
    views: sum.views + variant.views,
    clicks: sum.clicks + variant.clicks,
    replies: sum.replies + variant.replies,
    meetings: sum.meetings + variant.meetings,
  }), { impressions: 0, views: 0, clicks: 0, replies: 0, meetings: 0 })

  return {
    generatedAt: new Date().toISOString(),
    campaigns,
    studioProjects,
    recentEvents,
    kpis: {
      campaigns: campaigns.length,
      approvedCampaigns: campaigns.filter((item) => ["human_approved", "scheduled", "active", "paused", "completed"].includes(item.status)).length,
      publishedVariants: allVariants.filter((item) => item.status === "published").length,
      ...totals,
      clickThroughRate: totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10_000) / 100 : 0,
    },
  }
}

function rpcRow(value: unknown): DbRow {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") throw new Error("Video Growth操作から結果が返りませんでした")
  return row as DbRow
}

export async function createVideoGrowthCampaign(input: CreateVideoGrowthCampaignInput): Promise<string> {
  const database = requireDatabase()
  const { data, error } = await database.rpc("video_growth_create_campaign", {
    p_name: input.name,
    p_studio_project_id: input.studioProjectId,
    p_objective: input.objective,
    p_audience: input.audience,
    p_offer: input.offer,
    p_landing_url: input.landingUrl,
    p_owner: input.owner,
    p_actor: input.actor,
  })
  if (error) throw new Error(error.message)
  return stringFrom(rpcRow(data).id)
}

export async function transitionVideoGrowthCampaign(input: TransitionVideoGrowthCampaignInput): Promise<string> {
  const database = requireDatabase()
  const { data, error } = await database.rpc("video_growth_transition_campaign", {
    p_campaign_id: input.campaignId,
    p_expected_revision: input.expectedRevision,
    p_action: input.action,
    p_actor: input.actor,
    p_note: input.note,
    p_scheduled_for: input.action === "schedule" ? input.scheduledFor : null,
  })
  if (error) throw new Error(error.message)
  return stringFrom(rpcRow(data).status)
}

export async function updateVideoGrowthVariant(input: UpdateVideoGrowthVariantInput): Promise<string> {
  const database = requireDatabase()
  const params: Record<string, unknown> = {
    p_variant_id: input.variantId,
    p_expected_revision: input.expectedRevision,
    p_action: input.action,
    p_actor: input.actor,
    p_note: input.note,
    p_hook: null,
    p_caption: null,
    p_cta: null,
    p_deliverable_name: null,
    p_publish_url: null,
    p_impressions: null,
    p_views: null,
    p_clicks: null,
    p_replies: null,
    p_meetings: null,
    p_error_message: null,
  }
  if (input.action === "update_copy") {
    Object.assign(params, { p_hook: input.hook, p_caption: input.caption, p_cta: input.cta, p_deliverable_name: input.deliverableName })
  } else if (input.action === "publish") {
    params.p_publish_url = input.publishUrl
  } else if (input.action === "record_metrics") {
    Object.assign(params, {
      p_impressions: input.impressions,
      p_views: input.views,
      p_clicks: input.clicks,
      p_replies: input.replies,
      p_meetings: input.meetings,
    })
  } else if (input.action === "fail") {
    params.p_error_message = input.errorMessage
  }
  const { data, error } = await database.rpc("video_growth_update_variant", params)
  if (error) throw new Error(error.message)
  return stringFrom(rpcRow(data).status)
}
