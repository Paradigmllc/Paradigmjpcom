import { getServiceSalesSupabase } from "@/lib/supabase"
import { calculateMrr } from "@/lib/sales/customers"
import { getInfrastructureMigrationData } from "@/lib/sales/infrastructure"
import { getContentTemplateCoverage } from "@/lib/sales/content-templates"
import { fetchRecentEnrichmentJobs, type DashboardEnrichmentJob } from "@/lib/sales/enrichment-jobs"
import { getDashboardAgentTeam } from "@/lib/sales/agent-team"
import { getSalesIntegrationStatus } from "@/lib/sales/integration-registry"
import type {
  DashboardAuditCheck,
  DashboardAuditSection,
  DashboardCompany,
  DashboardKpis,
  DashboardOperationalAudit,
  DashboardToolConnection,
  SalesDashboardData,
} from "@/lib/sales/dashboard-types"
export type {
  DashboardActivity,
  DashboardAuditCheck,
  DashboardAuditSection,
  DashboardAuditStatus,
  DashboardCompany,
  DashboardKpis,
  DashboardOperationalAudit,
  DashboardQueueItem,
  DashboardSyncLog,
  DashboardToolConnection,
  SalesDashboardData,
  SalesDashboardStatus,
} from "@/lib/sales/dashboard-types"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

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

interface SourceRunRow {
  company_id: string
  status: string
  score: number | null
  measured_at: string | null
}

const TOOL_ORDER: DashboardToolConnection["slug"][] = ["supabase", "nocodb", "appsmith", "twenty", "metabase", "n8n", "calcom", "docuseal"]

const TOOL_ENV: Record<DashboardToolConnection["slug"], string | null> = {
  supabase: "SALES_SUPABASE_URL",
  nocodb: "NOCODB_BASE_URL",
  appsmith: "APPSMITH_BASE_URL",
  twenty: "TWENTY_BASE_URL",
  metabase: "METABASE_BASE_URL",
  n8n: "N8N_BASE_URL",
  calcom: "CALCOM_BASE_URL",
  docuseal: "DOCUSEAL_BASE_URL",
}

const FALLBACK_TOOLS: DashboardToolConnection[] = [
  {
    slug: "supabase",
    displayName: "Supabase OSS",
    role: "営業データのSSOT。PostgreSQL、RLS、REST API、自動化の中心。",
    interfaceType: "database",
    deploymentType: "oss_or_cloud",
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
    role: "外部オペレーターが1件ずつ安全に処理する専用画面。",
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
    role: "商談、関係性、担当者、時系列履歴を扱うCRM。",
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
  { slug: "calcom", displayName: "Cal.com OSS", role: "Meeting booking, post-diagnosis consultation slots, and owner calendar routing.", interfaceType: "scheduling", deploymentType: "oss_self_hosted", status: readToolUrl("calcom") ? "active" : "planned", baseUrl: readToolUrl("calcom"), healthUrl: null, owner: null, lastCheckedAt: null },
  { slug: "docuseal", displayName: "Docuseal OSS", role: "Contract, order form, NDA, and e-signature status management.", interfaceType: "contract", deploymentType: "oss_self_hosted", status: readToolUrl("docuseal") ? "active" : "planned", baseUrl: readToolUrl("docuseal"), healthUrl: null, owner: null, lastCheckedAt: null },
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

function emptyOperationalAudit(): DashboardOperationalAudit {
  return {
    score: 0,
    status: "blocked",
    blockers: 1,
    warnings: 0,
    ready: 0,
    sections: [
      {
        id: "ssot",
        title: "SSOT / 接続",
        summary: "Supabase service role が未設定のため監査できません。",
        checks: [
          {
            id: "supabase-configured",
            label: "Supabase SSOT",
            status: "blocked",
            detail: "SALES_SUPABASE_URL または service role が未設定です。",
            action: "Coolify の環境変数を確認し、営業OSのSSOT接続を復旧してください。",
          },
        ],
      },
    ],
  }
}

function increment(map: Record<string, number>, key: string | null | undefined): void {
  const normalized = key && key.trim() ? key : "未設定"
  map[normalized] = (map[normalized] ?? 0) + 1
}

function check(
  id: string,
  label: string,
  status: DashboardAuditCheck["status"],
  detail: string,
  action: string,
  count?: number,
): DashboardAuditCheck {
  return { id, label, status, detail, action, count }
}

function statusFromCount(count: number, warningOnly = false): DashboardAuditCheck["status"] {
  if (count <= 0) return "ready"
  return warningOnly ? "warning" : "blocked"
}

function envConfigured(...names: string[]): boolean {
  return names.some((name) => {
    const value = process.env[name]
    return typeof value === "string" && value.trim().length > 0
  })
}

function buildOperationalAudit(input: {
  companies: DashboardCompany[]
  toolConnections: DashboardToolConnection[]
  enrichmentJobs: DashboardEnrichmentJob[]
  syncLogs: Array<{ action: string; status: string; errorMessage: string | null }>
  sourceRuns: SourceRunRow[]
  warnings: string[]
}): DashboardOperationalAudit {
  const { companies, enrichmentJobs, syncLogs, sourceRuns, toolConnections, warnings } = input
  const toolBySlug = new Map(toolConnections.map((tool) => [tool.slug, tool]))
  const activeTool = (slug: DashboardToolConnection["slug"]) => toolBySlug.get(slug)?.status === "active"
  const reportMissing = companies.filter((company) => !company.reportUrl && !company.slug).length
  const reportReady = companies.filter((company) => company.pipelineStatus === "report_ready").length
  const missingFormUrl = companies.filter((company) => company.pipelineStatus === "report_ready" && !company.contactFormUrl).length
  const missingPersonalizedCopy = companies.filter(
    (company) => company.pipelineStatus === "report_ready" && !company.personalizedCopy,
  ).length
  const failedJobs = enrichmentJobs.filter((job) => job.status === "failed").length
  const stuckJobs = enrichmentJobs.filter((job) => job.status === "queued" || job.status === "running").length
  const syncErrors = syncLogs.filter((log) => log.status !== "success").length
  const opportunityErrors = syncLogs.filter((log) => log.action === "opportunity_sync" && log.status !== "success").length
  const sourceRunCount = sourceRuns.length
  const collectedSources = sourceRuns.filter((run) => run.status === "collected").length
  const missingSources = sourceRuns.filter((run) => run.status === "missing" || run.status === "error").length
  const sourceCoverage = sourceRunCount > 0 ? Math.round((collectedSources / sourceRunCount) * 100) : 0
  const lowSourceCoverage = sourceRunCount === 0 || sourceCoverage < 50
  const dryRunReady = reportReady > 0 && missingFormUrl === 0 && envConfigured("N8N_WEBHOOK_SECRET")
  const submitWorkerReady = envConfigured("BROWSERLESS_URL", "OUTREACH_WORKER_URL", "CAMOUFOX_WS_URL")
  const sections: DashboardAuditSection[] = [
    {
      id: "ssot",
      title: "SSOT / OSS接続",
      summary: "Supabaseを正本にし、Twenty・NocoDB・n8n・Metabaseを役割別UIとして使える状態かを確認します。",
      checks: [
        check(
          "supabase-active",
          "Supabase OSS",
          activeTool("supabase") ? "ready" : "blocked",
          activeTool("supabase") ? "営業データの正本として接続済みです。" : "営業データの正本DBが未接続です。",
          "Supabase DB/API/RLSの接続を最優先で復旧してください。",
        ),
        check(
          "twenty-active",
          "Twenty CRM同期",
          activeTool("twenty") && envConfigured("TWENTY_API_KEY") ? "ready" : "blocked",
          activeTool("twenty") && envConfigured("TWENTY_API_KEY")
            ? "企業HOME項目と商談作成APIが利用できます。"
            : "Twenty URLまたはAPIキーが不足しています。",
          "TWENTY_BASE_URL と TWENTY_API_KEY を確認し、企業HOME同期を再実行してください。",
        ),
        check(
          "nocodb-active",
          "NocoDB リスト作業場",
          activeTool("nocodb") ? "ready" : "warning",
          activeTool("nocodb") ? "大量リストの一括編集導線があります。" : "一括編集UIが未接続です。",
          "NocoDBをSupabaseに接続し、CSV後のクレンジングビューを用意してください。",
        ),
        check(
          "calendar-contracts",
          "Cal.com / Docuseal",
          activeTool("calcom") && activeTool("docuseal") ? "ready" : "warning",
          activeTool("calcom") && activeTool("docuseal")
            ? "商談予約と契約書のOSS導線が登録済みです。"
            : "商談予約または契約書のOSS導線が未完成です。",
          "CoolifyでCal.com/Docusealコンテナを正式作成し、DNSとヘルスチェックを接続してください。",
        ),
      ],
    },
    {
      id: "karte-report",
      title: "企業カルテ / レポート生成",
      summary: "CSV投入後に無料API/OSSデータが集約され、診断レポートとTwenty HOMEに反映されるかを確認します。",
      checks: [
        check(
          "jobs-failed",
          "Enrichment失敗",
          statusFromCount(failedJobs),
          failedJobs === 0 ? "失敗中のカルテ生成ジョブはありません。" : `${failedJobs}件の失敗ジョブがあります。`,
          "失敗ジョブの error_message を確認し、APIキー・対象URL・Dify応答を修正して再実行してください。",
          failedJobs,
        ),
        check(
          "jobs-stuck",
          "Enrichment滞留",
          statusFromCount(stuckJobs, true),
          stuckJobs === 0 ? "現在の待機/実行中ジョブはありません。" : `${stuckJobs}件が待機または実行中です。`,
          "n8n/Trigger.devまたは /api/sales/enrichment/run を定期実行し、滞留を解消してください。",
          stuckJobs,
        ),
        check(
          "report-url",
          "診断レポートURL",
          statusFromCount(reportMissing),
          reportMissing === 0 ? "表示対象リードにはレポートURLまたはslugがあります。" : `${reportMissing}件でslug/report_urlが不足しています。`,
          "repair-routing を実行し、言語別 /{locale}/report/{slug} を生成してください。",
          reportMissing,
        ),
        check(
          "source-coverage",
          "無料API/OSSデータ取得率",
          lowSourceCoverage ? "warning" : "ready",
          sourceRunCount === 0
            ? "source run がまだ保存されていません。"
            : `取得率 ${sourceCoverage}%（collected ${collectedSources} / total ${sourceRunCount}, missing/error ${missingSources}）。`,
          "PageSpeed、Wappalyzer、gBizInfo、フォーム探索、Difyの取得結果をsales_source_runsに保存してください。",
          missingSources,
        ),
        check(
          "dify-copy",
          "Dify文面/痛み生成",
          envConfigured("DIFY_DIAGNOSIS_API_KEY", "DIFY_API_KEY") ? "ready" : "warning",
          envConfigured("DIFY_DIAGNOSIS_API_KEY", "DIFY_API_KEY")
            ? "Dify/DeepSeek推論の接続情報があります。"
            : "Dify APIキーが未設定のためローカルfallback中心です。",
          "DIFY_DIAGNOSIS_API_KEYまたはDIFY_API_KEYを設定し、DeepSeek V4ワークフローを接続してください。",
        ),
      ],
    },
    {
      id: "outreach",
      title: "フォーム営業パイプライン",
      summary: "report_ready の企業に対して、フォームURL探索、文面生成、preflight、dry-run、本送信が安全に流れるかを確認します。",
      checks: [
        check(
          "form-url",
          "フォームURL",
          statusFromCount(missingFormUrl, true),
          missingFormUrl === 0 ? "送信候補のフォームURLは揃っています。" : `${missingFormUrl}件でフォームURLが未検出です。`,
          "Crawlee/Crawl4AI/Browserlessでフォーム探索を再実行し、CAPTCHAはAppsmith手動キューへ送ってください。",
          missingFormUrl,
        ),
        check(
          "personalized-copy",
          "送信用パーソナライズ文面",
          statusFromCount(missingPersonalizedCopy, true),
          missingPersonalizedCopy === 0 ? "送信候補には文面または痛み要約があります。" : `${missingPersonalizedCopy}件で文面生成が不足しています。`,
          "Dify文面生成を実行し、テンプレ適用ロジックの判定結果をmeta.personalized_copyへ保存してください。",
          missingPersonalizedCopy,
        ),
        check(
          "dry-run",
          "dry-run実行可否",
          dryRunReady ? "ready" : "blocked",
          dryRunReady ? "管理画面からフォーム営業dry-runを実行できます。" : "dry-run実行に必要な候補またはWebhook secretが不足しています。",
          "まずdry-runでclassification/preflight/robots判定を確認し、人間確認後に本送信へ進めてください。",
        ),
        check(
          "browser-worker",
          "Playwright Stealth / Browserless",
          submitWorkerReady ? "ready" : "warning",
          submitWorkerReady ? "実ブラウザ送信ワーカーの接続情報があります。" : "実送信ワーカーが未設定のため簡易providerまたはdry-run中心です。",
          "BROWSERLESS_URL、OUTREACH_WORKER_URL、CAMOUFOX_WS_URLのいずれかを設定し、証跡保存を有効化してください。",
        ),
      ],
    },
    {
      id: "sync-observability",
      title: "同期 / 監視",
      summary: "Twenty商談、企業HOME、Slack/DBログ、管理キューで詰まりが追える状態かを確認します。",
      checks: [
        check(
          "sync-errors",
          "同期エラー",
          statusFromCount(syncErrors, true),
          syncErrors === 0 ? "直近同期ログにエラーはありません。" : `直近同期ログに${syncErrors}件のエラーがあります。`,
          "sales_sync_logsを確認し、Twenty/NocoDB/Metabase側のAPIまたはschema差分を修正してください。",
          syncErrors,
        ),
        check(
          "opportunity-sync",
          "Twenty商談作成",
          statusFromCount(opportunityErrors, true),
          opportunityErrors === 0 ? "Twenty商談同期の直近エラーはありません。" : `Twenty商談同期エラーが${opportunityErrors}件残っています。`,
          "対象companyのTwenty company idと商品推薦を確認し、twenty-syncを再実行してください。",
          opportunityErrors,
        ),
        check(
          "warnings",
          "API警告",
          statusFromCount(warnings.length, true),
          warnings.length === 0 ? "営業ダッシュボードAPI警告はありません。" : `${warnings.length}件の警告があります。`,
          "画面上部の警告とサーバーログを確認し、欠落テーブル/接続/権限を修正してください。",
          warnings.length,
        ),
      ],
    },
  ]

  const allChecks = sections.flatMap((section) => section.checks)
  const blockers = allChecks.filter((item) => item.status === "blocked").length
  const warningCount = allChecks.filter((item) => item.status === "warning").length
  const ready = allChecks.filter((item) => item.status === "ready").length
  const score = Math.round((ready / Math.max(allChecks.length, 1)) * 100)
  return {
    score,
    status: blockers > 0 ? "blocked" : warningCount > 0 ? "warning" : "ready",
    blockers,
    warnings: warningCount,
    ready,
    sections,
  }
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
    personalizedCopy:
      extractString(row.meta, ["personalized_copy", "personalized_hook"]) ??
      extractString(row.meta, ["pain_diagnosis", "primaryPain"]) ??
      extractString(row.meta, ["personalized_copy", "opening"]),
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
  const sb = getServiceSalesSupabase()
  const generatedAt = new Date().toISOString()

  if (!sb) {
    warnings.push("Supabase service_role is not configured. Showing empty dashboard shell.")
    const infrastructure = await getInfrastructureMigrationData(null)
    const contentTemplates = await getContentTemplateCoverage()
    const agentTeam = await getDashboardAgentTeam()
    const integrationStatus = await getSalesIntegrationStatus()
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
      enrichmentJobs: [],
      infrastructure,
      operationalAudit: emptyOperationalAudit(),
      contentTemplates,
      agentTeam,
      integrationStatus,
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
    agentTeam,
    integrationStatus,
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
      .from("sales_source_runs")
      .select("company_id, status, score, measured_at")
      .order("measured_at", { ascending: false })
      .limit(2000),
    sb
      .from("sales_calendar_events")
      .select("id", { count: "exact", head: true })
      .gte("start_at", sevenDaysAgo),
    sb
      .from("sales_contracts")
      .select("amount_yen")
      .gte("signed_at", thirtyDaysAgo),
    calculateMrr(),
    fetchRecentEnrichmentJobs(40),
    getInfrastructureMigrationData(sb),
    getContentTemplateCoverage(),
    getDashboardAgentTeam(),
    getSalesIntegrationStatus(),
  ])

  if (companyRes.error) warnings.push(`sales_companies: ${companyRes.error.message}`)
  if (activityRes.error) warnings.push(`sales_activity_log: ${activityRes.error.message}`)
  if (syncRes.error) warnings.push(`sales_sync_logs: ${syncRes.error.message}`)
  if (toolsRes.error) warnings.push(`sales_tool_connections: ${toolsRes.error.message}`)
  if (queueRes.error) warnings.push(`sales_operator_queue_items: ${queueRes.error.message}`)
  if (sourceRunsRes.error) warnings.push(`sales_source_runs: ${sourceRunsRes.error.message}`)
  if (meetingsRes.error) warnings.push(`sales_calendar_events: ${meetingsRes.error.message}`)
  if (contractsRes.error) warnings.push(`sales_contracts: ${contractsRes.error.message}`)
  warnings.push(...infrastructure.warnings)

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

  const sourceRuns = (sourceRunsRes.data ?? []) as SourceRunRow[]

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
    agentTeam,
    integrationStatus,
  }
}
