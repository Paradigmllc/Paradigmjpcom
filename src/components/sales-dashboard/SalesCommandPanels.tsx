"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Filter,
  Gauge,
  HardDrive,
  ListChecks,
  PhoneCall,
  RefreshCw,
  Search,
  ServerCog,
  Send,
  Target,
  Users,
  WalletCards,
} from "lucide-react"
import { toast } from "sonner"
import type { DashboardCompany, DashboardToolConnection, SalesDashboardData } from "@/lib/sales/dashboard"
import { scopedReportHref } from "@/lib/sales/locale-scope"

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value)
}

export function formatYen(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(value: string | null): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function statusTone(status: string): string {
  if (status === "active" || status === "ready" || status === "completed") return "bg-emerald-100 text-emerald-700"
  if (status === "recommended" || status === "planned" || status === "in_progress" || status === "queued" || status === "partial" || status === "manual" || status === "checkable") return "bg-amber-100 text-amber-800"
  if (status === "legacy" || status === "optional" || status === "not_applicable") return "bg-slate-100 text-slate-600"
  if (status === "degraded" || status === "blocked" || status === "tier_blocked" || status === "failed" || status === "missing" || status === "error" || status === "not_configured") return "bg-rose-100 text-rose-700"
  return "bg-zinc-100 text-zinc-700"
}

const STATUS_LABELS: Record<string, string> = {
  pending: "未診断",
  scanning: "診断中",
  report_ready: "送信待ち",
  sent: "送信済み",
  manual_queue: "手動確認",
}

const TOOL_STATUS_LABELS: Record<string, string> = {
  active: "接続済み",
  planned: "準備中",
  legacy: "移行元",
  degraded: "要確認",
  disabled: "無効",
}

function externalUrlForCompany(company: DashboardCompany): string {
  const reportHref = scopedReportHref(company)
  if (reportHref) return reportHref
  return `https://${company.domain}`
}

function sortedEntries(source: Record<string, number>, limit = 8): [string, number][] {
  return Object.entries(source).sort(([, a], [, b]) => b - a).slice(0, limit)
}

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  helper: string
  icon: typeof Users
  tone: string
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-zinc-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">{value}</div>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${tone}`}>
          <Icon size={18} aria-hidden />
        </div>
      </div>
      <div className="mt-3 text-xs leading-relaxed text-zinc-500">{helper}</div>
    </div>
  )
}

function ToolBadge({ tool }: { tool: DashboardToolConnection }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold text-zinc-950">{tool.displayName}</div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusTone(tool.status)}`}>
          {TOOL_STATUS_LABELS[tool.status] ?? tool.status}
        </span>
      </div>
      <div className="mt-2 text-xs leading-relaxed text-zinc-500">{tool.role}</div>
      {tool.baseUrl ? (
        <a
          href={tool.baseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-zinc-950 underline-offset-2 hover:underline"
        >
          開く <ExternalLink size={12} aria-hidden />
        </a>
      ) : (
        <div className="mt-3 text-xs text-zinc-400">URL未設定</div>
      )}
    </div>
  )
}

function BarList({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) {
  const max = Math.max(...rows.map(([, value]) => value), 1)
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">{empty}</p>
        ) : (
          rows.map(([label, value]) => (
            <div key={label}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-zinc-600">{label}</span>
                <span className="font-semibold tabular-nums text-zinc-950">{value}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-zinc-100">
                <div className="h-2 rounded-full bg-zinc-900" style={{ width: `${Math.max(8, (value / max) * 100)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function SyncButton() {
  const [running, setRunning] = useState(false)

  async function runSync() {
    setRunning(true)
    try {
      const res = await fetch("/api/sales/twenty/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 200 }),
      })
      const data = (await res.json()) as { ok?: boolean; updated?: number; skipped?: number; error?: string }
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Twenty同期に失敗しました")
        return
      }
      toast.success(`TwentyからSupabaseへ同期しました: 更新 ${data.updated ?? 0} / skip ${data.skipped ?? 0}`)
    } catch (error) {
      console.error("[sales-dashboard] Twenty pull failed:", error)
      toast.error(error instanceof Error ? error.message : "Twenty同期に失敗しました")
    } finally {
      setRunning(false)
    }
  }

  return (
    <button
      type="button"
      onClick={runSync}
      disabled={running}
      aria-label="TwentyからSupabaseへ企業カルテを同期"
      className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw size={15} className={running ? "animate-spin" : ""} aria-hidden />
      Twenty {"->"} Supabase 同期
    </button>
  )
}

function CompanyRow({ company }: { company: DashboardCompany }) {
  return (
    <tr className="border-t border-zinc-100 hover:bg-zinc-50">
      <td className="min-w-[240px] px-4 py-3">
        <a href={externalUrlForCompany(company)} target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-950 underline-offset-2 hover:underline">
          {company.companyName}
        </a>
        <div className="mt-1 text-xs text-zinc-500">{company.domain}</div>
      </td>
      <td className="px-4 py-3 text-xs text-zinc-600">{company.industry ?? "-"}</td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
          {STATUS_LABELS[company.pipelineStatus] ?? company.pipelineStatus}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-zinc-600">{company.dealStage}</td>
      <td className="px-4 py-3 text-right text-xs tabular-nums text-zinc-700">{company.pagespeedMobile ?? "-"}</td>
      <td className="px-4 py-3 text-right text-xs tabular-nums text-zinc-700">{company.reportViews}</td>
      <td className="px-4 py-3 text-xs text-zinc-600">{company.assignedTo ?? "-"}</td>
    </tr>
  )
}

export function OverviewPanel({ data }: { data: SalesDashboardData }) {
  const hotCompanies = data.companies.filter((company) => company.isHotLead).slice(0, 6)
  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="総リード" value={formatNumber(data.kpis.totalLeads)} helper="Supabase sales_companies" icon={Users} tone="bg-sky-100 text-sky-700" />
        <KpiCard label="HOT" value={formatNumber(data.kpis.hotLeads)} helper="閲覧や反応が強い営業先" icon={Target} tone="bg-rose-100 text-rose-700" />
        <KpiCard label="送信待ち" value={formatNumber(data.kpis.reportReady)} helper="フォーム営業キュー候補" icon={Send} tone="bg-amber-100 text-amber-800" />
        <KpiCard label="手動確認" value={formatNumber(data.kpis.manualQueue)} helper="Appsmith向け作業" icon={ListChecks} tone="bg-violet-100 text-violet-700" />
        <KpiCard label="7日商談" value={formatNumber(data.kpis.meetings7d)} helper="Cal.com登録数" icon={PhoneCall} tone="bg-emerald-100 text-emerald-700" />
        <KpiCard label="MRR" value={formatYen(data.kpis.mrr)} helper={`${data.kpis.activeCustomers} active customers`} icon={Gauge} tone="bg-zinc-100 text-zinc-800" />
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-950">HOTリード</h2>
          <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">{hotCompanies.length}件表示</span>
        </div>
        <div className="mt-4 divide-y divide-zinc-100">
          {hotCompanies.length === 0 ? (
            <p className="py-6 text-sm text-zinc-500">HOTリードはまだありません。</p>
          ) : hotCompanies.map((company) => (
            <a key={company.id} href={externalUrlForCompany(company)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 py-3">
              <span>
                <span className="block text-sm font-medium text-zinc-950">{company.companyName}</span>
                <span className="text-xs text-zinc-500">{company.domain}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-zinc-950">{company.reportViews}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export function WorkspacePanel({ data }: { data: SalesDashboardData }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.companies.filter((company) => {
      const matchesQuery = !q || company.companyName.toLowerCase().includes(q) || company.domain.toLowerCase().includes(q) || (company.industry ?? "").toLowerCase().includes(q)
      return matchesQuery && (status === "all" || company.pipelineStatus === status)
    })
  }, [data.companies, query, status])

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">リスト作業場</h2>
          <p className="mt-1 text-xs text-zinc-500">NocoDBで一括編集する前後の営業ビューです。正本は常にSupabaseです。</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-500 sm:w-72" placeholder="企業名・ドメイン検索" aria-label="企業名・ドメイン検索" />
          </label>
          <label className="relative block">
            <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} aria-hidden />
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border border-zinc-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-zinc-500" aria-label="パイプライン状態">
              <option value="all">すべて</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">企業</th>
              <th className="px-4 py-3 font-medium">業種</th>
              <th className="px-4 py-3 font-medium">状態</th>
              <th className="px-4 py-3 font-medium">商談</th>
              <th className="px-4 py-3 text-right font-medium">速度</th>
              <th className="px-4 py-3 text-right font-medium">閲覧</th>
              <th className="px-4 py-3 font-medium">担当</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">条件に一致するリードはありません。</td></tr>
            ) : filtered.map((company) => <CompanyRow key={company.id} company={company} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function OperatorPanel({ data }: { data: SalesDashboardData }) {
  const followUps = data.companies.filter((company) => company.pipelineStatus === "manual_queue" || company.followUpDate).slice(0, 8)
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-950">Appsmith作業キュー</h2>
        <div className="mt-4 divide-y divide-zinc-100">
          {data.operatorQueue.length === 0 ? <p className="py-8 text-sm text-zinc-500">現在の手動作業キューは空です。</p> : data.operatorQueue.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-medium text-zinc-950">{item.companyName ?? "未紐付け"}</div>
                <div className="mt-1 text-xs text-zinc-500">{item.queueType} / {item.sourceTool ?? "system"} {"->"} {item.targetTool ?? "operator"}</div>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">P{item.priority}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-950">即時対応候補</h2>
        <div className="mt-4 space-y-3">
          {followUps.length === 0 ? <p className="py-8 text-sm text-zinc-500">次回対応候補はありません。</p> : followUps.map((company) => (
            <a key={company.id} href={externalUrlForCompany(company)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-md border border-zinc-100 p-3 hover:bg-zinc-50">
              <span>
                <span className="block text-sm font-medium text-zinc-950">{company.companyName}</span>
                <span className="text-xs text-zinc-500">次回: {company.followUpDate ?? "-"}</span>
              </span>
              <ExternalLink size={14} aria-hidden />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CrmPanel({ data }: { data: SalesDashboardData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BarList title="商談ステージ" rows={sortedEntries(data.stageCounts)} empty="商談データがありません。" />
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-950">最新アクティビティ</h2>
        <div className="mt-4 divide-y divide-zinc-100">
          {data.activities.length === 0 ? <p className="py-8 text-sm text-zinc-500">活動履歴はまだありません。</p> : data.activities.slice(0, 12).map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 py-3">
              <Activity className="mt-0.5 text-zinc-400" size={15} aria-hidden />
              <div>
                <div className="text-sm font-medium text-zinc-950">{activity.subject ?? activity.activityType}</div>
                <div className="mt-1 text-xs text-zinc-500">{activity.result ?? "記録"} / {formatDate(activity.occurredAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AnalyticsPanel({ data }: { data: SalesDashboardData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BarList title="パイプライン" rows={sortedEntries(data.pipelineCounts)} empty="パイプラインデータがありません。" />
      <BarList title="業種" rows={sortedEntries(data.industryCounts)} empty="業種データがありません。" />
      <BarList title="検出課題" rows={sortedEntries(data.issueCounts)} empty="課題データがありません。" />
      <BarList title="リードソース" rows={sortedEntries(data.sourceCounts)} empty="ソースデータがありません。" />
    </div>
  )
}

export function IntegrationsPanel({ data }: { data: SalesDashboardData }) {
  const readyIntegrations = data.integrationStatus.filter((item) => item.status === "ready").length
  const missingRecommended = data.integrationStatus.filter((item) => item.recommended && item.status === "missing").length
  const categories = sortedEntries(
    data.integrationStatus.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1
      return acc
    }, {}),
    12,
  )

  return (
    <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="grid gap-3 sm:grid-cols-2">
        {data.toolConnections.map((tool) => <ToolBadge key={tool.slug} tool={tool} />)}
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">同期ログ</h2>
            <p className="mt-1 text-xs text-zinc-500">SupabaseをSSOTにし、Twenty側の営業編集だけを限定的に取り込みます。</p>
          </div>
          <SyncButton />
        </div>
        <div className="mt-4 divide-y divide-zinc-100">
          {data.syncLogs.length === 0 ? <p className="py-8 text-sm text-zinc-500">同期ログはまだありません。</p> : data.syncLogs.slice(0, 14).map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-3">
              {log.status === "success" ? <CheckCircle2 className="mt-0.5 text-emerald-500" size={15} aria-hidden /> : <CircleAlert className="mt-0.5 text-rose-500" size={15} aria-hidden />}
              <div>
                <div className="text-sm font-medium text-zinc-950">{log.entityType} / {log.action} / {log.direction}</div>
                <div className="mt-1 text-xs text-zinc-500">{log.errorMessage ?? formatDate(log.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <IntegrationInventoryPanel
      data={data}
      readyIntegrations={readyIntegrations}
      missingRecommended={missingRecommended}
      categories={categories}
    />
    </div>
  )
}

function IntegrationInventoryPanel({
  data,
  readyIntegrations,
  missingRecommended,
  categories,
}: {
  data: SalesDashboardData
  readyIntegrations: number
  missingRecommended: number
  categories: [string, number][]
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">API / OSS 接続台帳</h2>
          <p className="mt-1 max-w-3xl text-xs leading-6 text-zinc-500">
            Dify Cloud、外部API、OSS worker、プロキシの設定有無を環境変数名だけで監査します。キー値は表示せず、未設定は missing として企業カルテの取得状況に反映します。
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-emerald-50 p-3 text-emerald-800">
            <div className="font-medium">利用可能</div>
            <div className="mt-1 text-xl font-semibold">{readyIntegrations}</div>
          </div>
          <div className="rounded-md bg-rose-50 p-3 text-rose-800">
            <div className="font-medium">推奨missing</div>
            <div className="mt-1 text-xl font-semibold">{missingRecommended}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.55fr_1.45fr]">
        <BarList title="カテゴリ別" rows={categories} empty="接続台帳がまだありません。" />
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_1fr] gap-3 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
            <div>ツール</div>
            <div>状態</div>
            <div>残量</div>
            <div>不足ENV</div>
          </div>
          <div className="max-h-[520px] divide-y divide-zinc-100 overflow-y-auto">
            {data.integrationStatus.map((item) => (
              <div key={item.slug} className="grid grid-cols-[1.2fr_0.8fr_0.7fr_1fr] gap-3 px-3 py-3 text-xs">
                <div>
                  <div className="font-semibold text-zinc-950">{item.displayName}</div>
                  <div className="mt-1 line-clamp-2 text-zinc-500">{item.role}</div>
                  {item.docsUrl && (
                    <a href={item.docsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-zinc-800 underline-offset-2 hover:underline">
                      docs <ExternalLink size={11} aria-hidden />
                    </a>
                  )}
                </div>
                <div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 ${statusTone(item.status)}`}>{item.status}</span>
                  <div className="mt-2 text-zinc-500">{item.category} / {item.deployment}</div>
                </div>
                <div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 ${statusTone(item.balanceStatus)}`}>{item.balanceStatus}</span>
                  <div className="mt-2 text-zinc-500">{item.balanceLabel}</div>
                </div>
                <div className="text-zinc-500">
                  {item.missingEnv.length > 0 ? item.missingEnv.join(", ") : "必須ENV OK"}
                  {item.optionalMissingEnv.length > 0 && (
                    <div className="mt-1 text-zinc-400">optional: {item.optionalMissingEnv.slice(0, 3).join(", ")}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function MigrationPanel({ data }: { data: SalesDashboardData }) {
  const current = data.infrastructure.items.find((item) => item.role === "current")
  const target = data.infrastructure.items.find((item) => item.role === "target")
  const otherItems = data.infrastructure.items.filter((item) => item.role !== "current" && item.role !== "target")

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">サーバー全面移行</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              現在はDigitalOceanクレジットを使い、最終的にHetzner VPSへ集約する前提の移行計画です。
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <WalletCards size={13} aria-hidden />
            予算 {formatYen(data.infrastructure.budgetLimitYen)}/月
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          {[current, target].map((item) => item && (
            <div key={item.slug} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-zinc-500">{item.provider}</div>
                  <div className="mt-1 text-base font-semibold text-zinc-950">{item.title}</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] ${statusTone(item.status)}`}>{item.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-white p-2"><div className="text-zinc-500">CPU</div><div className="mt-1 font-semibold text-zinc-950">{item.cpuLabel ?? "-"}</div></div>
                <div className="rounded-md bg-white p-2"><div className="text-zinc-500">RAM</div><div className="mt-1 font-semibold text-zinc-950">{item.memoryLabel ?? "-"}</div></div>
                <div className="rounded-md bg-white p-2"><div className="text-zinc-500">Disk</div><div className="mt-1 font-semibold text-zinc-950">{item.diskLabel ?? "-"}</div></div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-600">{item.notes}</p>
              {item.publicUrl && (
                <a href={item.publicUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-zinc-950 underline-offset-2 hover:underline">
                  管理画面 <ExternalLink size={12} aria-hidden />
                </a>
              )}
            </div>
          ))}
          <div className="hidden items-center justify-center text-zinc-400 lg:flex">
            <ArrowRight size={22} aria-hidden />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {otherItems.map((item) => (
            <div key={item.slug} className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <HardDrive size={15} aria-hidden />
                {item.title}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">{item.notes}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <ServerCog size={16} aria-hidden />
          <h2 className="text-sm font-semibold text-zinc-950">次にやること</h2>
        </div>
        <div className="mt-4 space-y-3">
          {data.infrastructure.nextSteps.map((step, index) => (
            <div key={step} className="flex gap-3 rounded-md border border-zinc-100 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">{index + 1}</span>
              <p className="text-sm leading-relaxed text-zinc-700">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
