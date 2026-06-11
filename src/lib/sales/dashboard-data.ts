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
  sales_companies?: { company_name?: string | null } | null
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
      searxngRuns: [],
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
    searxngRunsRes,
    japanReadinessRes,
    salesPipeline,
    videoJobsRes,
  ] = await Promise.all([
    fetchDashboardCompanies(sb, scope),
    sb
      .from(DB_TABLES.SALES_ACTIVITY_LOG)
      .select("id, company_id, activity_type, subject, result, assigned_to, occurred_at")
      .eq("region", scope.region)
      .order("occurred_at", { ascending: false })
      .limit(30),
    sb
      .from(DB_TABLES.SALES_SYNC_LOGS)
      .select("id, direction, entity_type, action, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    sb
      .from(DB_TABLES.SALES_TOOL_CONNECTIONS)
      .select("slug, display_name, role, interface_type, deployment_type, status, base_url, health_url, owner, last_checked_at"),
    sb
      .from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS)
      .select("id, company_id, queue_type, priority, status, assigned_to, source_tool, target_tool, due_at, created_at, sales_companies(company_name)")
      .eq("region", scope.region)
      .in("status", ["open", "in_progress", "blocked"])
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
    sb
      .from(DB_TABLES.SALES_SOURCE_RUNS)
      .select("company_id, status, score, measured_at")
      .order("measured_at", { ascending: false })
      .limit(2000),
    sb
      .from(DB_TABLES.SALES_CALENDAR_EVENTS)
      .select("id", { count: "exact", head: true })
      .eq("region", scope.region)
      .gte("start_at", sevenDaysAgo),
    sb
      .from(DB_TABLES.SALES_CONTRACTS)
      .select("amount_yen")
      .eq("region", scope.region)
      .gte("signed_at", thirtyDaysAgo),
    calculateMrr(),
    fetchRecentEnrichmentJobs(40),
    getInfrastructureMigrationData(sb),
    getContentTemplateCoverage(),
    getSalesCrmFieldConfig(sb),
    getDashboardAgentTeam(),
    getSalesIntegrationStatus(),
    listLeadBatches(scope, 8),
    listSearxngRuns(scope, 8).catch(() => ({ ok: false as const, runs: [] as SearxngRunSummary[], error: "table missing" })),
    listJapanReadinessInsights(scope, 8),
    listSalesPipelineRuns(20),
    listVideoJobs(25, { locale: scope.reportLocale }),
  ])

  if (companyRes.error) warnings.push(`sales_companies: ${companyRes.error.message}`)
  if (activityRes.error) warnings.push(`sales_activity_log: ${activityRes.error.message}`)
  if (syncRes.error) warnings.push(`sales_sync_logs: ${syncRes.error.message}`)
  if (toolsRes.error) warnings.push(`sales_tool_connections: ${toolsRes.error.message}`)
  if (queueRes.error) warnings.push(`sales_operator_queue_items: ${queueRes.error.message}`)
  if (sourceRunsRes.error) warnings.push(`sales_source_runs: ${sourceRunsRes.error.message}`)
  if (meetingsRes.error) warnings.push(`sales_calendar_events: ${meetingsRes.error.message}`)
  if (contractsRes.error) warnings.push(`sales_contracts: ${contractsRes.error.message}`)
  if (!videoJobsRes.ok) warnings.push(`sales_video_jobs: ${videoJobsRes.error}`)
  if (crmFieldConfig.error) warnings.push(`sales_crm_field_config: ${crmFieldConfig.error}`)
  if (!leadBatchesRes.ok && leadBatchesRes.error) warnings.push(`sales_lead_batches: ${leadBatchesRes.error}`)
  if (!searxngRunsRes.ok && searxngRunsRes.error) warnings.push(`sales_searxng_search_runs: ${searxngRunsRes.error}`)
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
      companyName: row.sales_companies?.company_name ?? null,
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
  const sourceAcquisition = await getSourceAcquisitionSummary(sb, scopedCompanyIds)
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
    searxngRuns: searxngRunsRes.runs,
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
