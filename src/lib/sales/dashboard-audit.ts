import type { DashboardEnrichmentJob } from "@/lib/sales/enrichment-jobs"
import type {
  DashboardAuditCheck,
  DashboardAuditSection,
  DashboardCompany,
  DashboardKpis,
  DashboardOperationalAudit,
  DashboardToolConnection,
} from "@/lib/sales/dashboard-types"

export interface SourceRunRow {
  company_id: string
  status: string
  score: number | null
  measured_at: string | null
}

export function envConfigured(...names: string[]): boolean {
  return names.some((name) => {
    const value = process.env[name]
    return typeof value === "string" && value.trim().length > 0
  })
}

export function emptyKpis(): DashboardKpis {
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
            label: "Supabase event store",
            status: "blocked",
            detail: "SALES_SUPABASE_URL または service role が未設定です。",
            action: "Coolify の環境変数を確認し、営業OSのログ・Realtime接続を復旧してください。",
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

export { emptyOperationalAudit, increment }

export function buildOperationalAudit(input: {
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
  const dryRunReady = reportReady > 0 && missingFormUrl === 0 && envConfigured("TRIGGER_SECRET_KEY", "TRIGGER_ACCESS_TOKEN")
  const submitWorkerReady = envConfigured("STEEL_BASE_URL", "OUTREACH_WORKER_URL", "CAMOUFOX_WS_URL")
  const sections: DashboardAuditSection[] = [
    {
      id: "ssot",
      title: "SSOT / OSS接続",
      summary: "Supabaseを正本にし、Twenty・NocoDB・Trigger.dev・Metabaseを役割別UIとして使える状態かを確認します。",
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
          "enqueue元のwebhook/管理操作から /api/sales/enrichment/run を one-shot 実行し、滞留を解消してください。",
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
          envConfigured(
            "DIFY_DIAGNOSIS_API_KEY",
            "DIFY_KARTE_TO_REPORT_API_KEY",
            "DIFY_KARTE_TO_REPORT_KEY",
            "DIFY_KARTE_TO_SALES_MATERIAL_API_KEY",
            "DIFY_KARTE_TO_SALES_MATERIAL_KEY",
            "DIFY_API_KEY",
          )
            ? "ready"
            : "warning",
          envConfigured(
            "DIFY_DIAGNOSIS_API_KEY",
            "DIFY_KARTE_TO_REPORT_API_KEY",
            "DIFY_KARTE_TO_REPORT_KEY",
            "DIFY_KARTE_TO_SALES_MATERIAL_API_KEY",
            "DIFY_KARTE_TO_SALES_MATERIAL_KEY",
            "DIFY_API_KEY",
          )
            ? "Dify Cloud/DeepSeek推論の接続情報があります。"
            : "Dify APIキーが未設定のためローカルfallback中心です。",
          "DIFY_DIAGNOSIS_API_KEY、または既存のKARTE_TO_REPORT/KARTE_TO_SALES_MATERIAL系Dify Cloudキーを設定してください。",
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
          "Crawlee/Crawl4AI/Steelでフォーム探索を再実行し、CAPTCHAはAppsmith手動キューへ送ってください。",
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
          "Playwright Stealth / Steel-Browser",
          submitWorkerReady ? "ready" : "warning",
          submitWorkerReady ? "実ブラウザ送信ワーカーの接続情報があります。" : "実送信ワーカーが未設定のため簡易providerまたはdry-run中心です。",
          "STEEL_BASE_URL、OUTREACH_WORKER_URL、CAMOUFOX_WS_URLのいずれかを設定し、証跡保存を有効化してください。",
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
