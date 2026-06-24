import { getServiceSalesSupabase } from "@/lib/supabase"
import { calculateMrr } from "@/lib/sales/customers"
import { getInfrastructureMigrationData } from "@/lib/sales/infrastructure"
import { getContentTemplateCoverage } from "@/lib/sales/content-templates"
import { fetchRecentEnrichmentJobs } from "@/lib/sales/enrichment-jobs"
import { getDashboardAgentTeam } from "@/lib/sales/agent-team"
import { getSalesIntegrationStatus } from "@/lib/sales/integration-registry"
import { getVideoPipelineConfig, listVideoJobs } from "@/lib/sales/video-pipeline"
import { salesScopeFromLocale } from "@/lib/sales/locale-scope"
import { getSalesCrmFieldConfig } from "@/lib/sales/crm-field-config"
import { emptySourceAcquisitionSummary, getSourceAcquisitionSummary } from "@/lib/sales/source-acquisition"
import { listLeadBatches } from "@/lib/sales/monthly-batch"
import { listSearxngRuns, type SearxngRunSummary } from "@/lib/sales/searxng-source"
import { listJapanReadinessInsights } from "@/lib/sales/japan-readiness"
import { listSalesPipelineRuns } from "@/lib/sales/sales-pipeline"
import { scoreLead } from "@/lib/sales/lead-scoring"
import type { SalesCompany } from "@/lib/sales/types"
import type { SalesDashboardData, SalesDashboardInput, DashboardKpis } from "@/lib/sales/dashboard-types"
import { mapCompany, fetchDashboardCompanies, type SalesCompanyRow } from "@/lib/sales/dashboard-companies"
import { mapTool, mergeFallbackTools, type ToolConnectionRow } from "@/lib/sales/dashboard-tools"
import { buildOperationalAudit, emptyKpis, emptyOperationalAudit, increment, type SourceRunRow } from "@/lib/sales/dashboard-audit"
import { DB_TABLES } from "@/lib/sales/db-tables"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
type QueryFallback<T> = { data: T; error: null; count: number | null; status: number; statusText: string; success: true }

interface ActivityRow {
  id: string
  company_id: string | null
  activity_type: string
  subject: string | null
  result: string | null
  assigned_to: string | null
  occurred_at: string | null
}

interface SyncLogRow {
  id: string
  direction: string
  entity_type: string
  action: string
  status: string
  error_message: string | null
  created_at: string
}

interface QueueRow {
  id: string
  company_id: string | null
  queue_type: string
  priority: number | null
  status: string
  assigned_to: string | null
  source_tool: string | null
  target_tool: string | null
  due_at: string | null
  created_at: string
  sales_companies: Array<{ company_name: string | null }>
}

const DEFAULT_DASHBOARD_QUERY_TIMEOUT_MS = 2_200

function dashboardQueryTimeoutMs(): number {
  const raw = process.env.SALES_DASHBOARD_QUERY_TIMEOUT_MS
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(parsed) && parsed >= 500 ? parsed : DEFAULT_DASHBOARD_QUERY_TIMEOUT_MS
}

function fallbackQuery<T>(data: T, count: number | null = null): QueryFallback<T> {
  return { data, error: null, count, status: 200, statusText: "Twenty Sales OS legacy monitor fallback", success: true }
}

function queryErrorMessage(result: { error?: unknown }): string | null {
  const error = result.error
  if (!error) return null
  if (error instanceof Error) return error.message
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === "string" ? message : String(message)
  }
  return String(error)
}

async function withDashboardFallback<T>(
  label: string,
  warnings: string[],
  task: PromiseLike<T>,
  fallback: T,
  timeoutMs = dashboardQueryTimeoutMs(),
): Promise<T> {
  let settled = false
  const guarded = Promise.resolve(task).then(
    (value) => {
      settled = true
      return value
    },
    (error: unknown) => {
      settled = true
      const message = error instanceof Error ? error.message : String(error)
      warnings.push(`${label}: ${message}`)
      console.error(`[sales-dashboard] ${label} failed:`, error)
      return fallback
    },
  )

  const timer = new Promise<T>((resolve) => {
    setTimeout(() => {
      if (!settled) {
        warnings.push(`${label}: ${timeoutMs}ms soft timeout; fallback data used`)
        console.warn(`[sales-dashboard] ${label} exceeded ${timeoutMs}ms; returning fallback data`)
      }
      resolve(fallback)
    }, timeoutMs)
  })

  return Promise.race([guarded, timer])
}

function emptyContentTemplateCoverage() {
  return {
    total: 0,
    byLocale: {},
    byAssetType: {},
    byIndustry: {},
    fallbackUsed: true,
  }
}

function queueCompanyName(row: QueueRow): string | null {
  return Array.isArray(row.sales_companies) ? row.sales_companies[0]?.company_name ?? null : null
}

export async function getSalesDashboardData(input: SalesDashboardInput = {}): Promise<SalesDashboardData> {
  const warnings: string[] = []
  const sb = getServiceSalesSupabase()
  const generatedAt = new Date().toISOString()
  const scope = salesScopeFromLocale(input.reportLocale)

  if (!sb) {
    warnings.push("Supabase service_role is not configured. Showing empty dashboard shell.")
    const infrastructure = await getInfrastructureMigrationData(null)
    const contentTemplates = await getContentTemplateCoverage()
    const crmFieldConfig = await getSalesCrmFieldConfig(null)
    const agentTeam = await getDashboardAgentTeam()
    const integrationStatus = await getSalesIntegrationStatus()
    const videoConfig = getVideoPipelineConfig()
    return {
      scope,
      status: "degraded",
      generatedAt,
      warnings,
      kpis: emptyKpis(),
      stageCounts: {},
      pipelineCounts: {},
      industryCounts: {},
      issueCounts: {},
      sourceCounts: {},
      sourceAcquisition: emptySourceAcquisitionSummary(),
      leadBatches: [],
      browserSearchRuns: [],
      japanReadinessInsights: [],
      salesPipeline: { runs: [], error: "Supabase service_role is not configured." },
      companies: [],
      activities: [],
      syncLogs: [],
      toolConnections: mergeFallbackTools([]),
      operatorQueue: [],
      enrichmentJobs: [],
      infrastructure,
      operationalAudit: emptyOperationalAudit(),
      contentTemplates,
      crmFieldConfig,
      agentTeam,
      integrationStatus,
      videoPipeline: {
        jobs: [],
        config: videoConfig,
        error: "Supabase service_role is not configured.",
      },
    }
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const nowIso = new Date().toISOString()

  const [
    companyRes,
    activityRes,
    syncRes,
    toolsRes,
    queueRes,
    sourceRunsRes,
    meetingsRes,
    contractsRes,
    mrr,
    enrichmentJobs,
    infrastructure,
    contentTemplates,
    crmFieldConfig,
    agentTeam,
    integrationStatus,
    leadBatchesRes,
    browserSearchRunsRes,
    japanReadinessRes,
    salesPipeline,
    videoJobsRes,
  ] = await Promise.all([
    withDashboardFallback("sales_companies", warnings, fetchDashboardCompanies(sb, scope), fallbackQuery<SalesCompanyRow[]>([])),
    withDashboardFallback("sales_activity_log", warnings, sb
      .from(DB_TABLES.SALES_ACTIVITY_LOG)
      .select("id, company_id, activity_type, subject, result, assigned_to, occurred_at")
      .eq("region", scope.region)
      .order("occurred_at", { ascending: false })
      .limit(30), fallbackQuery<ActivityRow[]>([])),
    withDashboardFallback("sales_sync_logs", warnings, sb
      .from(DB_TABLES.SALES_SYNC_LOGS)
      .select("id, direction, entity_type, action, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(30), fallbackQuery<SyncLogRow[]>([])),
    withDashboardFallback("sales_tool_connections", warnings, sb
      .from(DB_TABLES.SALES_TOOL_CONNECTIONS)
      .select("slug, display_name, role, interface_type, deployment_type, status, base_url, health_url, owner, last_checked_at"), fallbackQuery<ToolConnectionRow[]>([])),
    withDashboardFallback("sales_operator_queue_items", warnings, sb
      .from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS)
      .select("id, company_id, queue_type, priority, status, assigned_to, source_tool, target_tool, due_at, created_at, sales_companies(company_name)")
      .eq("region", scope.region)
      .in("status", ["open", "in_progress", "blocked"])
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30), fallbackQuery<QueueRow[]>([])),
    withDashboardFallback("sales_source_runs", warnings, sb
      .from(DB_TABLES.SALES_SOURCE_RUNS)
      .select("company_id, status, score, measured_at")
      .order("measured_at", { ascending: false })
      .limit(600), fallbackQuery<SourceRunRow[]>([])),
    withDashboardFallback("sales_calendar_events", warnings, sb
      .from(DB_TABLES.SALES_CALENDAR_EVENTS)
      .select("id", { count: "exact", head: true })
      .eq("region", scope.region)
      .gte("start_at", sevenDaysAgo), fallbackQuery<[]>([], 0)),
    withDashboardFallback("sales_contracts", warnings, sb
      .from(DB_TABLES.SALES_CONTRACTS)
      .select("amount_yen")
      .eq("region", scope.region)
      .gte("signed_at", thirtyDaysAgo), fallbackQuery<Array<{ amount_yen: number | null }>>([])),
    withDashboardFallback("mrr", warnings, calculateMrr(), { total: 0, active_count: 0, wl_count: 0, wl_revenue: 0 }),
    withDashboardFallback("sales_enrichment_jobs", warnings, fetchRecentEnrichmentJobs(20), []),
    withDashboardFallback("sales_infrastructure_migration", warnings, getInfrastructureMigrationData(sb), await getInfrastructureMigrationData(null)),
    withDashboardFallback("sales_content_templates", warnings, getContentTemplateCoverage(), emptyContentTemplateCoverage()),
    withDashboardFallback("sales_crm_field_config", warnings, getSalesCrmFieldConfig(sb), await getSalesCrmFieldConfig(null)),
    withDashboardFallback("sales_agent_team", warnings, getDashboardAgentTeam(), {
      status: "degraded",
      endpointPath: "/api/sales/agent/telegram-command",
      telegramBot: "@aiparadigmbot",
      roles: [],
      autonomyLevels: [],
      guardrails: [],
      recentCommands: [],
      storageStatus: "unconfigured",
    }),
    withDashboardFallback("sales_integration_status", warnings, getSalesIntegrationStatus(), []),
    withDashboardFallback("sales_lead_batches", warnings, listLeadBatches(scope, 6), { ok: false, batches: [], error: "Twenty Sales OS legacy monitor fallback" }),
    withDashboardFallback("sales_browser_search_runs", warnings, listSearxngRuns(scope, 6), { ok: false as const, runs: [] as SearxngRunSummary[], error: "Twenty Sales OS legacy monitor fallback" }),
    withDashboardFallback("sales_japan_readiness_insights", warnings, listJapanReadinessInsights(scope, 6), { ok: false, insights: [], error: "Twenty Sales OS legacy monitor fallback" }),
    withDashboardFallback("sales_pipeline_runs", warnings, listSalesPipelineRuns(12), { runs: [], error: "Twenty Sales OS legacy monitor fallback" }),
    withDashboardFallback("sales_video_jobs", warnings, listVideoJobs(12, { locale: scope.reportLocale }), { ok: false as const, jobs: [], config: getVideoPipelineConfig(), error: "Twenty Sales OS legacy monitor fallback" }),
  ])

  const companyError = queryErrorMessage(companyRes)
  const activityError = queryErrorMessage(activityRes)
  const syncError = queryErrorMessage(syncRes)
  const toolsError = queryErrorMessage(toolsRes)
  const queueError = queryErrorMessage(queueRes)
  const sourceRunsError = queryErrorMessage(sourceRunsRes)
  const meetingsError = queryErrorMessage(meetingsRes)
  const contractsError = queryErrorMessage(contractsRes)
  if (companyError) warnings.push(`sales_companies: ${companyError}`)
  if (activityError) warnings.push(`sales_activity_log: ${activityError}`)
  if (syncError) warnings.push(`sales_sync_logs: ${syncError}`)
  if (toolsError) warnings.push(`sales_tool_connections: ${toolsError}`)
  if (queueError) warnings.push(`sales_operator_queue_items: ${queueError}`)
  if (sourceRunsError) warnings.push(`sales_source_runs: ${sourceRunsError}`)
  if (meetingsError) warnings.push(`sales_calendar_events: ${meetingsError}`)
  if (contractsError) warnings.push(`sales_contracts: ${contractsError}`)
  if (!videoJobsRes.ok) warnings.push(`sales_video_jobs: ${videoJobsRes.error}`)
  if (crmFieldConfig.error) warnings.push(`sales_crm_field_config: ${crmFieldConfig.error}`)
  if (!leadBatchesRes.ok && leadBatchesRes.error) warnings.push(`sales_lead_batches: ${leadBatchesRes.error}`)
  if (!browserSearchRunsRes.ok && browserSearchRunsRes.error) warnings.push(`sales_searxng_search_runs: ${browserSearchRunsRes.error}`)
  if (!japanReadinessRes.ok && japanReadinessRes.error) warnings.push(`sales_japan_readiness_insights: ${japanReadinessRes.error}`)
  if (salesPipeline.error) warnings.push(`sales_pipeline_runs: ${salesPipeline.error}`)
  warnings.push(...infrastructure.warnings)

  for (const warning of warnings) console.error(`[sales-dashboard] ${warning}`)

  const rawCompanies = (companyRes.data ?? []) as SalesCompanyRow[]
  const companies = rawCompanies.map(mapCompany)
  for (let i = 0; i < companies.length; i++) {
    const scored = scoreLead(rawCompanies[i] as unknown as SalesCompany)
    companies[i].leadScore = scored.score
    companies[i].leadScoreTier = scored.tier
  }
  const scopedCompanyIds = new Set(companies.map((company) => company.id))
  const stageCounts: Record<string, number> = {}
  const pipelineCounts: Record<string, number> = {}
  const industryCounts: Record<string, number> = {}
  const issueCounts: Record<string, number> = {}
  const sourceCounts: Record<string, number> = {}

  for (const row of rawCompanies) {
    increment(stageCounts, row.deal_stage)
    increment(pipelineCounts, row.pipeline_status)
    increment(industryCounts, row.industry)
    increment(sourceCounts, row.source)
    for (const issue of row.detected_issues ?? []) increment(issueCounts, issue)
  }

  const activities = ((activityRes.data ?? []) as ActivityRow[])
    .filter((row) => !row.company_id || scopedCompanyIds.has(row.company_id))
    .map((row) => ({
      id: row.id,
      companyId: row.company_id,
      activityType: row.activity_type,
      subject: row.subject,
      result: row.result,
      assignedTo: row.assigned_to,
      occurredAt: row.occurred_at ?? generatedAt,
    }))

  const syncLogs = ((syncRes.data ?? []) as SyncLogRow[]).map((row) => ({
    id: row.id,
    direction: row.direction,
    entityType: row.entity_type,
    action: row.action,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }))

  const toolConnections = mergeFallbackTools(
    ((toolsRes.data ?? []) as ToolConnectionRow[]).map(mapTool),
  )

  const operatorQueue = ((queueRes.data ?? []) as QueueRow[])
    .filter((row) => !row.company_id || scopedCompanyIds.has(row.company_id))
    .map((row) => ({
      id: row.id,
      companyId: row.company_id,
      companyName: queueCompanyName(row),
      queueType: row.queue_type,
      priority: row.priority ?? 50,
      status: row.status,
      assignedTo: row.assigned_to,
      sourceTool: row.source_tool,
      targetTool: row.target_tool,
      dueAt: row.due_at,
      createdAt: row.created_at,
    }))

  const sourceRuns = ((sourceRunsRes.data ?? []) as SourceRunRow[]).filter((row) => scopedCompanyIds.has(row.company_id))
  const sourceAcquisition = await withDashboardFallback(
    "sales_source_acquisition",
    warnings,
    getSourceAcquisitionSummary(sb, scopedCompanyIds),
    emptySourceAcquisitionSummary(["Twenty Sales OS legacy monitor fallback"]),
  )
  warnings.push(...sourceAcquisition.errors)

  const kpis: DashboardKpis = {
    totalLeads: rawCompanies.length,
    hotLeads: rawCompanies.filter((row) => row.is_hot_lead).length,
    scanning: rawCompanies.filter((row) => row.pipeline_status === "scanning").length,
    reportReady: rawCompanies.filter((row) => row.pipeline_status === "report_ready").length,
    sent: rawCompanies.filter((row) => row.pipeline_status === "sent").length,
    manualQueue: rawCompanies.filter((row) => row.pipeline_status === "manual_queue").length + operatorQueue.length,
    followUpDue: rawCompanies.filter((row) => row.follow_up_date && row.follow_up_date <= nowIso.slice(0, 10)).length,
    outreach7d: activities.filter(
      (row) => row.activityType === "note" && row.result === "success",
    ).length,
    meetings7d: meetingsRes.count ?? 0,
    revenue30d: ((contractsRes.data ?? []) as Array<{ amount_yen: number | null }>).reduce(
      (sum, row) => sum + Number(row.amount_yen ?? 0),
      0,
    ),
    mrr: mrr.total,
    activeCustomers: mrr.active_count,
  }

  return {
    scope,
    status: warnings.length > 0 ? "degraded" : "ready",
    generatedAt,
    warnings,
    kpis,
    stageCounts,
    pipelineCounts,
    industryCounts,
    issueCounts,
    sourceCounts,
    sourceAcquisition,
    leadBatches: leadBatchesRes.batches,
    browserSearchRuns: browserSearchRunsRes.runs,
    japanReadinessInsights: japanReadinessRes.insights,
    salesPipeline,
    companies,
    activities,
    syncLogs,
    toolConnections,
    operatorQueue,
    enrichmentJobs,
    infrastructure,
    operationalAudit: buildOperationalAudit({
      companies,
      toolConnections,
      enrichmentJobs,
      syncLogs,
      sourceRuns,
      warnings,
    }),
    contentTemplates,
    crmFieldConfig,
    agentTeam,
    integrationStatus,
    videoPipeline: {
      jobs: videoJobsRes.jobs,
      config: videoJobsRes.config,
      error: videoJobsRes.ok ? null : videoJobsRes.error,
    },
  }
}
