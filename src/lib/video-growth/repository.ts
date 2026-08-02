import "server-only"

import type { SalesApiPrincipal } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"
import type {
  CreateVideoGrowthCampaignInput,
  ManageVideoGrowthApprovalInput,
  ManageVideoGrowthRevisionInput,
  RecordVideoGrowthDailyMetricsInput,
  TransitionVideoGrowthCampaignInput,
  UpdateVideoGrowthBillingInput,
  UpdateVideoGrowthReadinessInput,
  UpdateVideoGrowthVariantInput,
  UpdateVideoGrowthWorkOrderInput,
} from "./schemas"
import type {
  StudioDeliverable,
  StudioProjectSummary,
  VideoGrowthApproval,
  VideoGrowthCampaign,
  VideoGrowthDailyMetric,
  VideoGrowthDashboard,
  VideoGrowthEvent,
  VideoGrowthReadinessCheck,
  VideoGrowthRevisionRequest,
  VideoGrowthVariant,
  VideoGrowthWorkOrder,
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
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value)
  return 0
}

function stringsFrom(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function identityFrom(row: DbRow, key: string, email: string): string {
  return nullableStringFrom(row[email]) ?? stringFrom(row[key])
}

function principalParams(principal: SalesApiPrincipal) {
  return {
    p_actor_key: principal.key,
    p_actor_email: principal.email,
    p_actor_role: principal.role,
    p_auth_source: principal.authSource,
  }
}

function deliverablesFromManifest(value: unknown): StudioDeliverable[] {
  const deliverables = recordFrom(value).deliverables
  if (!Array.isArray(deliverables)) return []
  return deliverables.flatMap((item) => {
    const row = recordFrom(item)
    const name = stringFrom(row.name)
    return name ? [{
      name, aspectRatio: stringFrom(row.aspect_ratio), width: numberFrom(row.width),
      height: numberFrom(row.height), durationSeconds: numberFrom(row.duration_seconds),
      language: stringFrom(row.language),
    }] : []
  })
}

function studioProjectFromRow(row: DbRow): StudioProjectSummary {
  return {
    projectId: stringFrom(row.project_id), projectName: stringFrom(row.project_name),
    status: stringFrom(row.status), updatedAt: stringFrom(row.updated_at),
    deliverables: deliverablesFromManifest(row.manifest),
  }
}

function workOrderFromRow(row: DbRow): VideoGrowthWorkOrder {
  return {
    campaignId: stringFrom(row.campaign_id), clientName: stringFrom(row.client_name),
    clientContactName: nullableStringFrom(row.client_contact_name),
    clientContactEmail: nullableStringFrom(row.client_contact_email),
    plan: row.plan as VideoGrowthWorkOrder["plan"], monthlyVideoQuota: numberFrom(row.monthly_video_quota),
    billingStatus: row.billing_status as VideoGrowthWorkOrder["billingStatus"],
    workStatus: row.work_status as VideoGrowthWorkOrder["workStatus"],
    priority: row.priority as VideoGrowthWorkOrder["priority"], timezone: stringFrom(row.timezone),
    languages: stringsFrom(row.languages), contractReference: nullableStringFrom(row.contract_reference),
    purchaseOrderReference: nullableStringFrom(row.purchase_order_reference),
    deliveryOwner: stringFrom(row.delivery_owner), clientApprover: nullableStringFrom(row.client_approver),
    kickoffAt: nullableStringFrom(row.kickoff_at), deliveryDueAt: stringFrom(row.delivery_due_at),
    revision: numberFrom(row.revision), updatedAt: stringFrom(row.updated_at),
  }
}

function readinessFromRow(row: DbRow): VideoGrowthReadinessCheck {
  return {
    id: stringFrom(row.id), campaignId: stringFrom(row.campaign_id),
    checkKey: row.check_key as VideoGrowthReadinessCheck["checkKey"],
    status: row.status as VideoGrowthReadinessCheck["status"], note: stringFrom(row.note),
    evidenceUrl: nullableStringFrom(row.evidence_url),
    checkedBy: nullableStringFrom(row.checked_by_email) ?? nullableStringFrom(row.checked_by_key),
    checkedByRole: nullableStringFrom(row.checked_by_role), checkedAt: nullableStringFrom(row.checked_at),
    revision: numberFrom(row.revision), updatedAt: stringFrom(row.updated_at),
  }
}

function approvalFromRow(row: DbRow): VideoGrowthApproval {
  return {
    id: stringFrom(row.id), campaignId: stringFrom(row.campaign_id), variantId: stringFrom(row.variant_id),
    stage: row.stage as VideoGrowthApproval["stage"],
    contentRevision: numberFrom(row.content_revision), decision: row.decision as VideoGrowthApproval["decision"],
    requestNote: stringFrom(row.request_note), evidenceUrl: nullableStringFrom(row.evidence_url),
    requestedBy: identityFrom(row, "requested_by_key", "requested_by_email"),
    requestedByRole: stringFrom(row.requested_by_role), requestedAt: stringFrom(row.requested_at),
    decisionNote: nullableStringFrom(row.decision_note),
    decidedBy: nullableStringFrom(row.decided_by_email) ?? nullableStringFrom(row.decided_by_key),
    decidedByRole: nullableStringFrom(row.decided_by_role), decidedAt: nullableStringFrom(row.decided_at),
    revision: numberFrom(row.revision),
  }
}

function revisionFromRow(row: DbRow): VideoGrowthRevisionRequest {
  return {
    id: stringFrom(row.id), campaignId: stringFrom(row.campaign_id), variantId: stringFrom(row.variant_id),
    category: row.category as VideoGrowthRevisionRequest["category"],
    severity: row.severity as VideoGrowthRevisionRequest["severity"],
    description: stringFrom(row.description), status: row.status as VideoGrowthRevisionRequest["status"],
    requestedBy: identityFrom(row, "requested_by_key", "requested_by_email"),
    requestedByRole: stringFrom(row.requested_by_role), assignedTo: nullableStringFrom(row.assigned_to),
    dueAt: nullableStringFrom(row.due_at), resolutionNote: nullableStringFrom(row.resolution_note),
    resolvedBy: nullableStringFrom(row.resolved_by_email) ?? nullableStringFrom(row.resolved_by_key),
    resolvedAt: nullableStringFrom(row.resolved_at), revision: numberFrom(row.revision),
    createdAt: stringFrom(row.created_at), updatedAt: stringFrom(row.updated_at),
  }
}

function metricFromRow(row: DbRow): VideoGrowthDailyMetric {
  return {
    id: stringFrom(row.id), campaignId: stringFrom(row.campaign_id), variantId: stringFrom(row.variant_id),
    metricDate: stringFrom(row.metric_date), impressions: numberFrom(row.impressions), views: numberFrom(row.views),
    clicks: numberFrom(row.clicks), replies: numberFrom(row.replies), meetings: numberFrom(row.meetings),
    source: row.source as VideoGrowthDailyMetric["source"],
    recordedBy: identityFrom(row, "recorded_by_key", "recorded_by_email"),
    revision: numberFrom(row.revision), updatedAt: stringFrom(row.updated_at),
  }
}

function variantFromRow(
  row: DbRow,
  approvals: VideoGrowthApproval[],
  revisions: VideoGrowthRevisionRequest[],
  dailyMetrics: VideoGrowthDailyMetric[],
): VideoGrowthVariant {
  return {
    id: stringFrom(row.id), campaignId: stringFrom(row.campaign_id), channel: row.channel as VideoGrowthVariant["channel"],
    variantName: stringFrom(row.variant_name), aspectRatio: stringFrom(row.aspect_ratio), width: numberFrom(row.width),
    height: numberFrom(row.height), durationSeconds: numberFrom(row.duration_seconds), hook: stringFrom(row.hook),
    caption: stringFrom(row.caption), cta: stringFrom(row.cta), deliverableName: nullableStringFrom(row.deliverable_name),
    status: row.status as VideoGrowthVariant["status"], scheduledFor: nullableStringFrom(row.scheduled_for),
    publishedAt: nullableStringFrom(row.published_at), publishUrl: nullableStringFrom(row.publish_url),
    impressions: numberFrom(row.impressions), views: numberFrom(row.views), clicks: numberFrom(row.clicks),
    replies: numberFrom(row.replies), meetings: numberFrom(row.meetings), errorMessage: nullableStringFrom(row.error_message),
    contentRevision: numberFrom(row.content_revision), revision: numberFrom(row.revision),
    updatedAt: stringFrom(row.updated_at), approvals, revisions, dailyMetrics,
  }
}

function campaignFromRow(
  row: DbRow, project: StudioProjectSummary | undefined, variants: VideoGrowthVariant[],
  workOrder: VideoGrowthWorkOrder | undefined, readinessChecks: VideoGrowthReadinessCheck[],
): VideoGrowthCampaign {
  return {
    id: stringFrom(row.id), name: stringFrom(row.name), studioProjectId: stringFrom(row.studio_project_id),
    studioProjectName: project?.projectName ?? stringFrom(row.studio_project_id),
    studioProjectStatus: project?.status ?? "unknown", objective: stringFrom(row.objective),
    audience: stringFrom(row.audience), offer: stringFrom(row.offer), landingUrl: stringFrom(row.landing_url),
    status: row.status as VideoGrowthCampaign["status"], owner: stringFrom(row.owner),
    approvedBy: nullableStringFrom(row.approved_by), approvalNote: nullableStringFrom(row.approval_note),
    approvedAt: nullableStringFrom(row.approved_at), scheduledFor: nullableStringFrom(row.scheduled_for),
    revision: numberFrom(row.revision), createdAt: stringFrom(row.created_at), updatedAt: stringFrom(row.updated_at),
    workOrder: workOrder ?? null, readinessChecks, variants,
  }
}

function eventFromRow(row: DbRow): VideoGrowthEvent {
  return {
    id: stringFrom(row.id), campaignId: stringFrom(row.campaign_id), variantId: nullableStringFrom(row.variant_id),
    eventType: stringFrom(row.event_type), channel: nullableStringFrom(row.channel) as VideoGrowthEvent["channel"],
    actor: stringFrom(row.actor), actorRole: nullableStringFrom(row.actor_role), note: stringFrom(row.note),
    createdAt: stringFrom(row.created_at),
  }
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const item of items) grouped.set(key(item), [...(grouped.get(key(item)) ?? []), item])
  return grouped
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
  const ids = campaignIds.length > 0 ? campaignIds : ["00000000-0000-0000-0000-000000000000"]
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString().slice(0, 10)
  const [variantResult, eventResult, workOrderResult, readinessResult, approvalResult, revisionResult, metricResult] = await Promise.all([
    database.from(DB_TABLES.VIDEO_GROWTH_VARIANTS).select("*").in("campaign_id", ids).order("created_at", { ascending: true }).limit(400),
    database.from(DB_TABLES.VIDEO_GROWTH_EVENTS).select("id,campaign_id,variant_id,event_type,channel,actor,actor_role,note,created_at").order("created_at", { ascending: false }).limit(200),
    database.from(DB_TABLES.VIDEO_GROWTH_WORK_ORDERS).select("*").in("campaign_id", ids),
    database.from(DB_TABLES.VIDEO_GROWTH_READINESS_CHECKS).select("*").in("campaign_id", ids).order("created_at", { ascending: true }),
    database.from(DB_TABLES.VIDEO_GROWTH_APPROVALS).select("*").in("campaign_id", ids).order("requested_at", { ascending: false }).limit(1600),
    database.from(DB_TABLES.VIDEO_GROWTH_REVISION_REQUESTS).select("*").in("campaign_id", ids).order("created_at", { ascending: false }).limit(1600),
    database.from(DB_TABLES.VIDEO_GROWTH_DAILY_METRICS).select("*").in("campaign_id", ids).gte("metric_date", monthStart).order("metric_date", { ascending: false }).limit(5000),
  ])
  const relatedError = variantResult.error ?? eventResult.error ?? workOrderResult.error ?? readinessResult.error
    ?? approvalResult.error ?? revisionResult.error ?? metricResult.error
  if (relatedError) throw new Error(`Video Growth運用データの取得に失敗しました: ${relatedError.message}`)

  const projects = ((projectResult.data ?? []) as DbRow[]).map(studioProjectFromRow)
  const projectMap = new Map(projects.map((item) => [item.projectId, item]))
  const workOrders = ((workOrderResult.data ?? []) as DbRow[]).map(workOrderFromRow)
  const workOrderMap = new Map(workOrders.map((item) => [item.campaignId, item]))
  const checks = ((readinessResult.data ?? []) as DbRow[]).map(readinessFromRow)
  const checksByCampaign = groupBy(checks, (item) => item.campaignId)
  const approvals = ((approvalResult.data ?? []) as DbRow[]).map(approvalFromRow)
  const revisions = ((revisionResult.data ?? []) as DbRow[]).map(revisionFromRow)
  const metrics = ((metricResult.data ?? []) as DbRow[]).map(metricFromRow)
  const approvalsByVariant = groupBy(approvals, (item) => item.variantId)
  const revisionsByVariant = groupBy(revisions, (item) => item.variantId)
  const metricsByVariant = groupBy(metrics, (item) => item.variantId)
  const variants = ((variantResult.data ?? []) as DbRow[]).map((row) => {
    const id = stringFrom(row.id)
    return variantFromRow(row, approvalsByVariant.get(id) ?? [], revisionsByVariant.get(id) ?? [], metricsByVariant.get(id) ?? [])
  })
  const variantsByCampaign = groupBy(variants, (item) => item.campaignId)
  const campaigns = campaignRows.map((row) => {
    const id = stringFrom(row.id)
    return campaignFromRow(row, projectMap.get(stringFrom(row.studio_project_id)), variantsByCampaign.get(id) ?? [], workOrderMap.get(id), checksByCampaign.get(id) ?? [])
  })
  const totals = variants.reduce((sum, item) => ({
    impressions: sum.impressions + item.impressions, views: sum.views + item.views,
    clicks: sum.clicks + item.clicks, replies: sum.replies + item.replies, meetings: sum.meetings + item.meetings,
  }), { impressions: 0, views: 0, clicks: 0, replies: 0, meetings: 0 })
  const now = Date.now()
  const openOrders = workOrders.filter((item) => !["delivered", "closed"].includes(item.workStatus))

  return {
    generatedAt: new Date().toISOString(), campaigns, studioProjects: projects,
    recentEvents: ((eventResult.data ?? []) as DbRow[]).map(eventFromRow),
    kpis: {
      campaigns: campaigns.length, openWorkOrders: openOrders.length,
      overdueDeliveries: openOrders.filter((item) => new Date(item.deliveryDueAt).getTime() < now).length,
      blockedIntakes: campaigns.filter((item) => item.readinessChecks.some((check) => ["pending", "failed"].includes(check.status))).length,
      pendingApprovals: approvals.filter((item) => item.decision === "pending").length,
      openRevisions: revisions.filter((item) => ["open", "in_progress"].includes(item.status)).length,
      approvedCampaigns: campaigns.filter((item) => ["human_approved", "scheduled", "active", "paused", "completed"].includes(item.status)).length,
      publishedVariants: variants.filter((item) => item.status === "published").length,
      monthlyQuotaUsed: variants.filter((item) => item.publishedAt && item.publishedAt.slice(0, 7) === monthStart.slice(0, 7)).length,
      monthlyQuotaLimit: openOrders.reduce((sum, item) => sum + item.monthlyVideoQuota, 0),
      ...totals, clickThroughRate: totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10_000) / 100 : 0,
    },
  }
}

function rpcRow(value: unknown): DbRow {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") throw new Error("Video Growth操作から結果が返りませんでした")
  return row as DbRow
}

export async function createVideoGrowthCampaign(input: CreateVideoGrowthCampaignInput, principal: SalesApiPrincipal): Promise<string> {
  const { data, error } = await requireDatabase().rpc("video_growth_create_commercial_campaign", {
    p_name: input.name, p_studio_project_id: input.studioProjectId, p_objective: input.objective,
    p_audience: input.audience, p_offer: input.offer, p_landing_url: input.landingUrl,
    p_owner: input.deliveryOwner, p_client_name: input.clientName,
    p_client_contact_name: input.clientContactName || null, p_client_contact_email: input.clientContactEmail || null,
    p_plan: input.plan, p_monthly_video_quota: input.monthlyVideoQuota, p_billing_status: input.billingStatus,
    p_priority: input.priority, p_timezone: input.timezone, p_languages: input.languages,
    p_contract_reference: input.contractReference || null, p_purchase_order_reference: input.purchaseOrderReference || null,
    p_client_approver: input.clientApprover || null, p_kickoff_at: input.kickoffAt || null,
    p_delivery_due_at: input.deliveryDueAt, ...principalParams(principal),
  })
  if (error) throw new Error(error.message)
  return stringFrom(rpcRow(data).id)
}

export async function transitionVideoGrowthCampaign(input: TransitionVideoGrowthCampaignInput, principal: SalesApiPrincipal): Promise<string> {
  const { data, error } = await requireDatabase().rpc("video_growth_transition_commercial_campaign", {
    p_campaign_id: input.campaignId, p_expected_revision: input.expectedRevision,
    p_action: input.action, p_note: input.note,
    p_scheduled_for: input.action === "schedule" ? input.scheduledFor : null,
    ...principalParams(principal),
  })
  if (error) throw new Error(error.message)
  return stringFrom(rpcRow(data).status)
}

export async function updateVideoGrowthVariant(input: UpdateVideoGrowthVariantInput, principal: SalesApiPrincipal): Promise<string> {
  const params: Record<string, unknown> = {
    p_variant_id: input.variantId, p_expected_revision: input.expectedRevision,
    p_action: input.action, p_note: input.note, p_hook: null, p_caption: null,
    p_cta: null, p_deliverable_name: null, p_publish_url: null, p_error_message: null,
    ...principalParams(principal),
  }
  if (input.action === "update_copy") Object.assign(params, { p_hook: input.hook, p_caption: input.caption, p_cta: input.cta, p_deliverable_name: input.deliverableName })
  if (input.action === "publish") params.p_publish_url = input.publishUrl
  if (input.action === "fail") params.p_error_message = input.errorMessage
  const { data, error } = await requireDatabase().rpc("video_growth_update_commercial_variant", params)
  if (error) throw new Error(error.message)
  return stringFrom(rpcRow(data).status)
}

export async function updateVideoGrowthWorkOrder(input: UpdateVideoGrowthWorkOrderInput, principal: SalesApiPrincipal): Promise<string> {
  const { data, error } = await requireDatabase().rpc("video_growth_update_work_order", {
    p_campaign_id: input.campaignId, p_expected_revision: input.expectedRevision,
    p_client_name: input.clientName, p_client_contact_name: input.clientContactName || null,
    p_client_contact_email: input.clientContactEmail || null, p_plan: input.plan,
    p_monthly_video_quota: input.monthlyVideoQuota, p_billing_status: input.billingStatus,
    p_work_status: input.workStatus, p_priority: input.priority, p_timezone: input.timezone,
    p_languages: input.languages, p_contract_reference: input.contractReference || null,
    p_purchase_order_reference: input.purchaseOrderReference || null, p_delivery_owner: input.deliveryOwner,
    p_client_approver: input.clientApprover || null, p_kickoff_at: input.kickoffAt || null,
    p_delivery_due_at: input.deliveryDueAt, p_note: input.note, ...principalParams(principal),
  })
  if (error) throw new Error(error.message)
  return stringFrom(rpcRow(data).work_status)
}

export async function updateVideoGrowthReadiness(input: UpdateVideoGrowthReadinessInput, principal: SalesApiPrincipal): Promise<string> {
  const { data, error } = await requireDatabase().rpc("video_growth_update_readiness_check", {
    p_check_id: input.checkId, p_expected_revision: input.expectedRevision, p_status: input.status,
    p_note: input.note, p_evidence_url: input.evidenceUrl || null, ...principalParams(principal),
  })
  if (error) throw new Error(error.message)
  return stringFrom(rpcRow(data).status)
}

export async function updateVideoGrowthBilling(input: UpdateVideoGrowthBillingInput, principal: SalesApiPrincipal): Promise<string> {
  const { data, error } = await requireDatabase().rpc("video_growth_update_billing_status", {
    p_campaign_id: input.campaignId, p_expected_revision: input.expectedRevision,
    p_billing_status: input.billingStatus, p_note: input.note, ...principalParams(principal),
  })
  if (error) throw new Error(error.message)
  return stringFrom(rpcRow(data).billing_status)
}

export async function manageVideoGrowthApproval(input: ManageVideoGrowthApprovalInput, principal: SalesApiPrincipal): Promise<string> {
  const { data, error } = await requireDatabase().rpc("video_growth_manage_approval", {
    p_variant_id: input.variantId, p_expected_content_revision: input.expectedContentRevision,
    p_stage: input.stage, p_action: input.action, p_note: input.note,
    p_evidence_url: input.evidenceUrl || null, ...principalParams(principal),
  })
  if (error) throw new Error(error.message)
  return stringFrom(rpcRow(data).decision)
}

export async function manageVideoGrowthRevision(input: ManageVideoGrowthRevisionInput, principal: SalesApiPrincipal): Promise<string> {
  const params: Record<string, unknown> = {
    p_revision_request_id: input.action === "open" ? null : input.revisionRequestId,
    p_variant_id: input.action === "open" ? input.variantId : null,
    p_expected_revision: input.expectedRevision, p_action: input.action,
    p_category: input.action === "open" ? input.category : null,
    p_severity: input.action === "open" ? input.severity : null,
    p_description: input.action === "open" ? input.description : null,
    p_assigned_to: input.assignedTo || null,
    p_due_at: input.action === "open" ? input.dueAt || null : null,
    p_resolution_note: input.action === "open" ? null : input.resolutionNote,
    ...principalParams(principal),
  }
  const { data, error } = await requireDatabase().rpc("video_growth_manage_revision", params)
  if (error) throw new Error(error.message)
  return stringFrom(rpcRow(data).status)
}

export async function recordVideoGrowthDailyMetrics(input: RecordVideoGrowthDailyMetricsInput, principal: SalesApiPrincipal): Promise<string> {
  const { data, error } = await requireDatabase().rpc("video_growth_record_daily_metrics", {
    p_variant_id: input.variantId, p_metric_date: input.metricDate, p_expected_revision: input.expectedRevision,
    p_impressions: input.impressions, p_views: input.views, p_clicks: input.clicks,
    p_replies: input.replies, p_meetings: input.meetings, p_source: input.source,
    ...principalParams(principal),
  })
  if (error) throw new Error(error.message)
  return stringFrom(rpcRow(data).metric_date)
}
