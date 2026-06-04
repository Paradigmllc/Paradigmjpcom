"use client"

import { useMemo, useState } from "react"
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clapperboard,
  Database,
  ExternalLink,
  Inbox,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import type { SalesDashboardData } from "@/lib/sales/dashboard"

type LaneStatus = "ready" | "warning" | "blocked"

type Lane = {
  id: string
  title: string
  subtitle: string
  metric: string
  detail: string
  status: LaneStatus
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const statusClassName: Record<LaneStatus, string> = {
  ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  blocked: "bg-rose-50 text-rose-700 ring-rose-200",
}

const statusLabel: Record<LaneStatus, string> = {
  ready: "運用可",
  warning: "要確認",
  blocked: "停止中",
}

function activeTools(data: SalesDashboardData): number {
  return data.toolConnections.filter((tool) => ["active", "connected", "ready", "online"].includes(tool.status)).length
}

function hasTool(data: SalesDashboardData, slug: string): boolean {
  return data.toolConnections.some((tool) => tool.slug === slug && ["active", "connected", "ready", "online"].includes(tool.status))
}

function integrationReady(data: SalesDashboardData, slug: string): boolean {
  return data.integrationStatus.some((item) => item.slug === slug && item.status === "ready")
}

function countByStatus(data: SalesDashboardData, statuses: string[]): number {
  return data.companies.filter((company) => statuses.includes(company.pipelineStatus)).length
}

function buildLanes(data: SalesDashboardData): Lane[] {
  const intakeCount = data.kpis.totalLeads + data.leadBatches.reduce((sum, batch) => sum + batch.totalRows, 0)
  const diagnosisCount = data.kpis.reportReady + data.enrichmentJobs.filter((job) => job.status === "completed").length
  const outreachCount = countByStatus(data, ["sent", "manual_queue"]) + data.operatorQueue.length
  const meetingCount = data.kpis.meetings7d
  const productionCount = data.videoPipeline.jobs.length
  const productionReady =
    data.videoPipeline.config.r2.ready &&
    (data.videoPipeline.config.renderers.hyperframes || (data.videoPipeline.config.vast.ready && data.videoPipeline.config.comfyui.ready))
  const postOutreachReady = hasTool(data, "calcom") && hasTool(data, "chatwoot")

  return [
    {
      id: "intake",
      title: "リード取得",
      subtitle: "SearxNG / Crawlee / CSV",
      metric: intakeCount.toLocaleString("ja-JP"),
      detail: "候補URLとCSVは重複排除後に sales_companies / lead_batches へ集約",
      status: data.kpis.totalLeads > 0 || data.leadBatches.length > 0 ? "ready" : "warning",
      href: "?tab=automation",
      icon: Database,
    },
    {
      id: "diagnosis",
      title: "診断・提案",
      subtitle: "Dify Cloud / レポートSSOT",
      metric: diagnosisCount.toLocaleString("ja-JP"),
      detail: "技術診断、痛み、テンプレート判定、資料構成をSupabaseに保存",
      status: data.kpis.reportReady > 0 || data.contentTemplates.total > 0 ? "ready" : "warning",
      href: "?tab=supabaseStudio",
      icon: Sparkles,
    },
    {
      id: "outreach",
      title: "送信・回収",
      subtitle: "Stagehand / Browserless / n8n",
      metric: outreachCount.toLocaleString("ja-JP"),
      detail: "フォーム送信、証跡、手動確認キュー、同期ログを同じ営業レコードへ返却",
      status: integrationReady(data, "stagehand") || integrationReady(data, "browserless") ? "ready" : "warning",
      href: "?tab=operator",
      icon: Send,
    },
    {
      id: "closing",
      title: "商談化",
      subtitle: "Chatwoot / Cal.com / LiveKit",
      metric: meetingCount.toLocaleString("ja-JP"),
      detail: "返信、予約、AI面談、契約前アクションを sales_activity_log とCRMへ反映",
      status: postOutreachReady ? "ready" : "warning",
      href: "?tab=crm",
      icon: CalendarCheck2,
    },
    {
      id: "production",
      title: "制作・納品",
      subtitle: "Report Studio / Pro Studio / R2",
      metric: productionCount.toLocaleString("ja-JP"),
      detail: "GPUなしレポート動画とVast.ai固定のプロ級動画を sales_video_jobs で分離管理",
      status: productionReady ? "ready" : data.videoPipeline.error ? "blocked" : "warning",
      href: "?tab=reportVideoStudio",
      icon: Clapperboard,
    },
  ]
}

function ssotRows(data: SalesDashboardData) {
  return [
    { table: "sales_companies", label: "企業・診断・営業状態", value: data.kpis.totalLeads },
    { table: "sales_sync_logs", label: "OSS/API同期ログ", value: data.syncLogs.length },
    { table: "sales_integration_status", label: "本番接続監査", value: data.integrationStatus.length },
    { table: "sales_video_jobs", label: "制作ジョブ", value: data.videoPipeline.jobs.length },
    { table: "sales_content_templates", label: "資料・レポート構成", value: data.contentTemplates.total },
  ]
}

function toolUrl(data: SalesDashboardData, slug: string): string | null {
  return data.toolConnections.find((tool) => tool.slug === slug)?.baseUrl ?? null
}

export function SalesUnifiedOpsPanel({ data }: { data: SalesDashboardData }) {
  const [refreshing, setRefreshing] = useState(false)
  const lanes = useMemo(() => buildLanes(data), [data])
  const rows = useMemo(() => ssotRows(data), [data])
  const connectedTools = activeTools(data)
  const totalTools = data.toolConnections.length
  const syncErrors = data.syncLogs.filter((log) => log.status !== "success").length
  const openMontageUrl =
    data.integrationStatus.find((item) => item.slug === "openmontage")?.docsUrl ??
    toolUrl(data, "n8n") ??
    "https://github.com/calesthio/OpenMontage"

  async function refreshIntegrationStatus() {
    setRefreshing(true)
    try {
      const res = await fetch("/api/sales/integration-status?live=1", { cache: "no-store" })
      const json = (await res.json()) as { ok?: boolean; error?: string; count?: number }
      if (!res.ok || json.ok === false) throw new Error(json.error ?? "統合ステータスを更新できませんでした。")
      toast.success(`統合監査を更新しました。${json.count ?? 0}件をSupabaseに保存済みです。`)
      window.location.reload()
    } catch (error) {
      console.error("[sales-unified-ops] integration refresh failed:", error)
      toast.error(error instanceof Error ? error.message : "統合ステータス更新に失敗しました。")
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <Database className="h-4 w-4" aria-hidden />
              Supabase SSOT
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">営業から制作・回収までを1つの業務面に統合</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-600">
              外部OSSは正規GUIとして使い、判断・状態・成果物URL・エラーはSupabaseへ戻します。Revenue OS上ではリード、診断、送信、商談、動画制作、納品を同じ企業レコードで追跡します。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refreshIntegrationStatus()}
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
              接続監査を更新
            </button>
            <a
              href={openMontageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              外部制作GUI
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-semibold text-zinc-500">接続済みOSS/API</div>
            <div className="mt-1 text-2xl font-semibold text-zinc-950">{connectedTools}/{totalTools}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-semibold text-zinc-500">同期エラー</div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-zinc-950">
              {syncErrors === 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> : <ShieldAlert className="h-5 w-5 text-amber-600" aria-hidden />}
              {syncErrors}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-semibold text-zinc-500">人間確認キュー</div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-zinc-950">
              <Inbox className="h-5 w-5 text-zinc-500" aria-hidden />
              {data.operatorQueue.length}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-5">
          {lanes.map((lane, index) => {
            const Icon = lane.icon
            return (
              <a
                key={lane.id}
                href={lane.href}
                className="group min-w-0 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
                    <Icon className="h-4 w-4 text-zinc-900" aria-hidden />
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusClassName[lane.status]}`}>
                    {statusLabel[lane.status]}
                  </span>
                </div>
                <div className="mt-3 min-w-0">
                  <div className="text-sm font-semibold text-zinc-950">{lane.title}</div>
                  <div className="mt-1 text-xs font-medium text-zinc-500">{lane.subtitle}</div>
                  <div className="mt-3 text-2xl font-semibold tabular-nums text-zinc-950">{lane.metric}</div>
                  <p className="mt-2 min-h-[60px] text-xs leading-5 text-zinc-600">{lane.detail}</p>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-zinc-950">
                  開く
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                </div>
                {index < lanes.length - 1 ? <span className="sr-only">次の工程へ進みます</span> : null}
              </a>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
          <Database className="h-4 w-4" aria-hidden />
          SSOT書き戻し先
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {rows.map((row) => (
            <div key={row.table} className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="truncate font-mono text-[11px] font-semibold text-zinc-500">{row.table}</div>
              <div className="mt-2 text-xl font-semibold tabular-nums text-zinc-950">{row.value.toLocaleString("ja-JP")}</div>
              <div className="mt-1 text-xs leading-5 text-zinc-600">{row.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
