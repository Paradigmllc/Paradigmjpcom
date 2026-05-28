import { getServiceSupabase } from "@/lib/supabase"
import { calculateMrr } from "@/lib/sales/customers"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSupabase>>

export type SalesDashboardStatus = "ready" | "degraded"

export interface DashboardKpis {
  totalLeads: number
  hotLeads: number
  scanning: number
  reportReady: number
  sent: number
  manualQueue: number
  followUpDue: number
  outreach7d: number
  meetings7d: number
  revenue30d: number
  mrr: number
  activeCustomers: number
}

export interface DashboardCompany {
  id: string
  region: string
  slug: string | null
  companyName: string
  domain: string
  industry: string | null
  prefecture: string | null
  pipelineStatus: string
  dealStage: string
  reportViews: number
  isHotLead: boolean
  pagespeedMobile: number | null
  pagespeedDesktop: number | null
  reportUrl: string | null
  followUpDate: string | null
  assignedTo: string | null
  source: string | null
  targetCountry: string | null
  reportLocale: string | null
  templateVariant: string | null
  updatedAt: string
  createdAt: string
  contactFormUrl: string | null
  personalizedCopy: string | null
}

export interface DashboardActivity {
  id: string
  companyId: string | null
  activityType: string
  subject: string | null
  result: string | null
  assignedTo: string | null
  occurredAt: string
}

export interface DashboardSyncLog {
  id: string
  direction: string
  entityType: string
  action: string
  status: string
  errorMessage: string | null
  createdAt: string
}

export interface DashboardToolConnection {
  slug: "supabase" | "twenty" | "nocodb" | "appsmith" | "metabase" | "notion" | "n8n"
  displayName: string
  role: string
  interfaceType: string
  deploymentType: string
  status: string
  baseUrl: string | null
  healthUrl: string | null
  owner: string | null
  lastCheckedAt: string | null
}

export interface DashboardQueueItem {
  id: string
  companyId: string | null
  companyName: string | null
  queueType: string
  priority: number
  status: string
  assignedTo: string | null
  sourceTool: string | null
  targetTool: string | null
  dueAt: string | null
  createdAt: string
}

export interface SalesDashboardData {
  status: SalesDashboardStatus
  generatedAt: string
  warnings: string[]
  kpis: DashboardKpis
  stageCounts: Record<string, number>
  pipelineCounts: Record<string, number>
  industryCounts: Record<string, number>
  issueCounts: Record<string, number>
  sourceCounts: Record<string, number>
  companies: DashboardCompany[]
  activities: DashboardActivity[]
  syncLogs: DashboardSyncLog[]
  toolConnections: DashboardToolConnection[]
  operatorQueue: DashboardQueueItem[]
}

interface SalesCompanyRow {
  id: string
  region: string | null
  slug: string | null
  company_name: string
  domain: string
  industry: string | null
  prefecture: string | null
  pipeline_status: string
  deal_stage: string
  report_views: number | null
  is_hot_lead: boolean | null
  pagespeed_mobile: number | null
  pagespeed_desktop: number | null
  report_url: string | null
  follow_up_date: string | null
  assigned_to: string | null
  source: string | null
  target_country?: string | null
  report_locale?: string | null
  template_variant?: string | null
  detected_issues: string[] | null
  meta: JsonRecord | null
  updated_at: string
  created_at: string
}

const COMPANY_SELECT_FULL =
  "id, region, slug, company_name, domain, industry, prefecture, pipeline_status, deal_stage, report_views, is_hot_lead, pagespeed_mobile, pagespeed_desktop, report_url, follow_up_date, assigned_to, source, target_country, report_locale, template_variant, detected_issues, meta, updated_at, created_at"

const COMPANY_SELECT_LEGACY =
  "id, region, slug, company_name, domain, industry, prefecture, pipeline_status, deal_stage, report_views, is_hot_lead, pagespeed_mobile, pagespeed_desktop, report_url, follow_up_date, assigned_to, source, detected_issues, meta, updated_at, created_at"

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

interface ToolConnectionRow {
  slug: DashboardToolConnection["slug"]
  display_name: string
  role: string
  interface_type: string
  deployment_type: string
  status: string
  base_url: string | null
  health_url: string | null
  owner: string | null
  last_checked_at: string | null
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

const TOOL_ORDER: DashboardToolConnection["slug"][] = [
  "supabase",
  "nocodb",
  "appsmith",
  "twenty",
  "metabase",
  "n8n",
  "notion",
]

const TOOL_ENV: Record<DashboardToolConnection["slug"], string | null> = {
  supabase: "NEXT_PUBLIC_SUPABASE_URL",
  nocodb: "NOCODB_BASE_URL",
  appsmith: "APPSMITH_BASE_URL",
  twenty: "TWENTY_BASE_URL",
  metabase: "METABASE_BASE_URL",
  n8n: "N8N_BASE_URL",
  notion: null,
}

const FALLBACK_TOOLS: DashboardToolConnection[] = [
  {
    slug: "supabase",
    displayName: "Supabase Cloud",
    role: "全営業データの正本。PostgreSQL、RLS、API、自動化の中心。",
    interfaceType: "database",
    deploymentType: "supabase_cloud",
    status: "active",
    baseUrl: readToolUrl("supabase"),
    healthUrl: null,
    owner: "Paradigm",
    lastCheckedAt: null,
  },
  {
    slug: "nocodb",
    displayName: "NocoDB OSS",
    role: "大量リードのクレンジング、一括編集、CSV作業場。",
    interfaceType: "spreadsheet",
    deploymentType: "oss_self_hosted",
    status: readToolUrl("nocodb") ? "active" : "planned",
    baseUrl: readToolUrl("nocodb"),
    healthUrl: null,
    owner: null,
    lastCheckedAt: null,
  },
  {
    slug: "appsmith",
    displayName: "Appsmith OSS",
    role: "外部オペレーターが1件ずつ処理する安全な作業画面。",
    interfaceType: "operator_console",
    deploymentType: "oss_self_hosted",
    status: readToolUrl("appsmith") ? "active" : "planned",
    baseUrl: readToolUrl("appsmith"),
    healthUrl: null,
    owner: null,
    lastCheckedAt: null,
  },
  {
    slug: "twenty",
    displayName: "Twenty OSS",
    role: "商談、関係性、担当者、時系列履歴のCRM。",
    interfaceType: "crm",
    deploymentType: "oss_self_hosted",
    status: readToolUrl("twenty") ? "active" : "planned",
    baseUrl: readToolUrl("twenty"),
    healthUrl: null,
    owner: null,
    lastCheckedAt: null,
  },
  {
    slug: "metabase",
    displayName: "Metabase OSS",
    role: "経営向けの返信率、送信数、成約率、リスト別成果分析。",
    interfaceType: "bi",
    deploymentType: "oss_self_hosted",
    status: readToolUrl("metabase") ? "active" : "planned",
    baseUrl: readToolUrl("metabase"),
    healthUrl: null,
    owner: null,
    lastCheckedAt: null,
  },
  {
    slug: "n8n",
    displayName: "n8n OSS",
    role: "通知、同期、定期実行、ツール間ワークフロー。",
    interfaceType: "automation",
    deploymentType: "oss_self_hosted",
    status: readToolUrl("n8n") ? "active" : "planned",
    baseUrl: readToolUrl("n8n"),
    healthUrl: null,
    owner: null,
    lastCheckedAt: null,
  },
  {
    slug: "notion",
    displayName: "Notion Legacy",
    role: "旧営業ダッシュボード。新規運用の中心からは外す。",
    interfaceType: "legacy_workspace",
    deploymentType: "legacy_external",
    status: "legacy",
    baseUrl: "https://www.notion.so/35fa2b78f3fc81299d91e457889ee393",
    healthUrl: null,
    owner: null,
    lastCheckedAt: null,
  },
]

function readToolUrl(slug: DashboardToolConnection["slug"]): string | null {
  const envName = TOOL_ENV[slug]
  if (!envName) return null
  const value = process.env[envName]
  if (value && value.trim().length > 0) return value
  if (slug !== "n8n") return null

  const webhookUrl = process.env.N8N_PLAYWRIGHT_FORM_WEBHOOK
  if (!webhookUrl || webhookUrl.trim().length === 0) return null
  try {
    return new URL(webhookUrl).origin
  } catch (e) {
    console.error("[sales-dashboard] invalid N8N_PLAYWRIGHT_FORM_WEBHOOK:", e)
    return null
  }
}

function emptyKpis(): DashboardKpis {
  return {
    totalLeads: 0,
    hotLeads: 0,
    scanning: 0,
    reportReady: 0,
    sent: 0,
    manualQueue: 0,
    followUpDue: 0,
    outreach7d: 0,
    meetings7d: 0,
    revenue30d: 0,
    mrr: 0,
    activeCustomers: 0,
  }
}

function increment(map: Record<string, number>, key: string | null | undefined): void {
  const normalized = key && key.trim() ? key : "未設定"
  map[normalized] = (map[normalized] ?? 0) + 1
}

function extractString(meta: JsonRecord | null, path: string[]): string | null {
  let cursor: unknown = meta
  for (const key of path) {
    if (!cursor || typeof cursor !== "object") return null
    cursor = (cursor as JsonRecord)[key]
  }
  return typeof cursor === "string" && cursor.trim() ? cursor : null
}

function mapCompany(row: SalesCompanyRow): DashboardCompany {
  return {
    id: row.id,
    region: row.region ?? "jp",
    slug: row.slug,
    companyName: row.company_name,
    domain: row.domain,
    industry: row.industry,
    prefecture: row.prefecture,
    pipelineStatus: row.pipeline_status,
    dealStage: row.deal_stage,
    reportViews: row.report_views ?? 0,
    isHotLead: row.is_hot_lead ?? false,
    pagespeedMobile: row.pagespeed_mobile,
    pagespeedDesktop: row.pagespeed_desktop,
    reportUrl: row.report_url,
    followUpDate: row.follow_up_date,
    assignedTo: row.assigned_to,
    source: row.source,
    targetCountry: row.target_country ?? extractString(row.meta, ["routing", "target_country"]),
    reportLocale: row.report_locale ?? extractString(row.meta, ["routing", "report_locale"]),
    templateVariant: row.template_variant ?? extractString(row.meta, ["routing", "template_variant"]),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    contactFormUrl: extractString(row.meta, ["contact_form_url"]) ?? extractString(row.meta, ["discovery", "contact_form_url"]),
    personalizedCopy: extractString(row.meta, ["personalized_copy", "opening"]),
  }
}

function mapTool(row: ToolConnectionRow): DashboardToolConnection {
  return {
    slug: row.slug,
    displayName: row.display_name,
    role: row.role,
    interfaceType: row.interface_type,
    deploymentType: row.deployment_type,
    status: row.status,
    baseUrl: row.base_url ?? readToolUrl(row.slug),
    healthUrl: row.health_url,
    owner: row.owner,
    lastCheckedAt: row.last_checked_at,
  }
}

function mergeFallbackTools(rows: DashboardToolConnection[]): DashboardToolConnection[] {
  const bySlug = new Map(rows.map((tool) => [tool.slug, tool]))
  for (const fallback of FALLBACK_TOOLS) {
    if (!bySlug.has(fallback.slug)) bySlug.set(fallback.slug, fallback)
  }
  return TOOL_ORDER.map((slug) => bySlug.get(slug)).filter(Boolean) as DashboardToolConnection[]
}

async function fetchDashboardCompanies(sb: ServiceSupabase) {
  const full = await sb
    .from("sales_companies")
    .select(COMPANY_SELECT_FULL)
    .order("updated_at", { ascending: false })
    .limit(200)

  const missingRoutingColumns =
    full.error &&
    /target_country|report_locale|template_variant|schema cache|column/i.test(full.error.message)

  if (!missingRoutingColumns) return full

  const legacy = await sb
    .from("sales_companies")
    .select(COMPANY_SELECT_LEGACY)
    .order("updated_at", { ascending: false })
    .limit(200)

  return legacy.error ? full : legacy
}

export async function getSalesDashboardData(): Promise<SalesDashboardData> {
  const warnings: string[] = []
  const sb = getServiceSupabase()
  const generatedAt = new Date().toISOString()

  if (!sb) {
    warnings.push("Supabase service_role is not configured. Showing empty dashboard shell.")
    return {
      status: "degraded",
      generatedAt,
      warnings,
      kpis: emptyKpis(),
      stageCounts: {},
      pipelineCounts: {},
      industryCounts: {},
      issueCounts: {},
      sourceCounts: {},
      companies: [],
      activities: [],
      syncLogs: [],
      toolConnections: mergeFallbackTools([]),
      operatorQueue: [],
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
    meetingsRes,
    contractsRes,
    mrr,
  ] = await Promise.all([
    fetchDashboardCompanies(sb),
    sb
      .from("sales_activity_log")
      .select("id, company_id, activity_type, subject, result, assigned_to, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(30),
    sb
      .from("sales_sync_logs")
      .select("id, direction, entity_type, action, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    sb
      .from("sales_tool_connections")
      .select("slug, display_name, role, interface_type, deployment_type, status, base_url, health_url, owner, last_checked_at"),
    sb
      .from("sales_operator_queue_items")
      .select("id, company_id, queue_type, priority, status, assigned_to, source_tool, target_tool, due_at, created_at, sales_companies(company_name)")
      .in("status", ["open", "in_progress", "blocked"])
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
    sb
      .from("sales_calendar_events")
      .select("id", { count: "exact", head: true })
      .gte("start_at", sevenDaysAgo),
    sb
      .from("sales_contracts")
      .select("amount_yen")
      .gte("signed_at", thirtyDaysAgo),
    calculateMrr(),
  ])

  if (companyRes.error) warnings.push(`sales_companies: ${companyRes.error.message}`)
  if (activityRes.error) warnings.push(`sales_activity_log: ${activityRes.error.message}`)
  if (syncRes.error) warnings.push(`sales_sync_logs: ${syncRes.error.message}`)
  if (toolsRes.error) warnings.push(`sales_tool_connections: ${toolsRes.error.message}`)
  if (queueRes.error) warnings.push(`sales_operator_queue_items: ${queueRes.error.message}`)
  if (meetingsRes.error) warnings.push(`sales_calendar_events: ${meetingsRes.error.message}`)
  if (contractsRes.error) warnings.push(`sales_contracts: ${contractsRes.error.message}`)

  for (const warning of warnings) console.error(`[sales-dashboard] ${warning}`)

  const rawCompanies = (companyRes.data ?? []) as SalesCompanyRow[]
  const companies = rawCompanies.map(mapCompany)
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

  const activities = ((activityRes.data ?? []) as ActivityRow[]).map((row) => ({
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

  const operatorQueue = ((queueRes.data ?? []) as QueueRow[]).map((row) => ({
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
    status: warnings.length > 0 ? "degraded" : "ready",
    generatedAt,
    warnings,
    kpis,
    stageCounts,
    pipelineCounts,
    industryCounts,
    issueCounts,
    sourceCounts,
    companies,
    activities,
    syncLogs,
    toolConnections,
    operatorQueue,
  }
}
