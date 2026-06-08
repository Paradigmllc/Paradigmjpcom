"use client"

import { ExternalLink, Users } from "lucide-react"
import type { DashboardCompany, DashboardToolConnection } from "@/lib/sales/dashboard"
import { scopedReportHref } from "@/lib/sales/locale-scope"

export function statusTone(status: string): string {
  if (status === "active" || status === "ready" || status === "completed") return "bg-emerald-100 text-emerald-700"
  if (status === "recommended" || status === "planned" || status === "in_progress" || status === "queued" || status === "partial" || status === "manual" || status === "checkable") return "bg-amber-100 text-amber-800"
  if (status === "legacy" || status === "optional" || status === "not_applicable") return "bg-slate-100 text-slate-600"
  if (status === "degraded" || status === "blocked" || status === "tier_blocked" || status === "failed" || status === "missing" || status === "error" || status === "not_configured") return "bg-rose-100 text-rose-700"
  return "bg-zinc-100 text-zinc-700"
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "未診断",
  scanning: "診断中",
  report_ready: "送信待ち",
  sent: "送信済み",
  manual_queue: "手動確認",
}

export const TOOL_STATUS_LABELS: Record<string, string> = {
  active: "接続済み",
  planned: "準備中",
  legacy: "移行元",
  degraded: "要確認",
  disabled: "無効",
}

export function externalUrlForCompany(company: DashboardCompany): string {
  const reportHref = scopedReportHref(company)
  if (reportHref) return reportHref
  return `https://${company.domain}`
}

export function sortedEntries(source: Record<string, number>, limit = 8): [string, number][] {
  return Object.entries(source).sort(([, a], [, b]) => b - a).slice(0, limit)
}

export function KpiCard({
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

export function ToolBadge({ tool }: { tool: DashboardToolConnection }) {
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

export function BarList({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) {
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

export function CompanyRow({ company, updating, onChangeStatus }: { company: DashboardCompany; updating: boolean; onChangeStatus: (id: string, s: string) => void }) {
  const scoreTier = company.leadScoreTier
  const tierClass = scoreTier === "hot" ? "bg-rose-100 text-rose-700" : scoreTier === "warm" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"
  const tierLabel = scoreTier === "hot" ? "HOT" : scoreTier === "warm" ? "WARM" : "-"
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
        <select 
          value={company.pipelineStatus} 
          onChange={(e) => onChangeStatus(company.id, e.target.value)}
          disabled={updating}
          className={`text-xs font-medium rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-zinc-950 ${statusTone(company.pipelineStatus)}`}
        >
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-xs text-zinc-600">{company.dealStage}</td>
      <td className="px-4 py-3 text-right text-xs tabular-nums text-zinc-700">{company.pagespeedMobile ?? "-"}</td>
      <td className="px-4 py-3 text-right text-xs tabular-nums text-zinc-700">{company.reportViews}</td>
      <td className="px-4 py-3 text-xs text-zinc-600">{company.assignedTo ?? "-"}</td>
      <td className="px-4 py-3 text-right text-xs text-zinc-400" title={company.lastEnrichedAt ?? company.updatedAt}>
        {company.lastEnrichedAt ? freshnessLabel(company.lastEnrichedAt) : (company.updatedAt ? freshnessLabel(company.updatedAt) : "-")}
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${tierClass}`}>
          {tierLabel}
        </span>
        {company.leadScore != null && <span className="ml-1 text-[10px] text-zinc-400">{company.leadScore}</span>}
      </td>
    </tr>
  )
}

function freshnessLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}日前`
  if (days < 30) return `${Math.floor(days / 7)}週間前`
  return `${Math.floor(days / 30)}ヶ月前`
}

export const CATEGORY_MAP: Record<string, { label: string; isDiagnostic: boolean }> = {
  analysis: { label: "診断ソース (分析)", isDiagnostic: true },
  list_source: { label: "診断ソース (リスト収集)", isDiagnostic: true },
  outreach: { label: "アプローチ自動化", isDiagnostic: false },
  orchestration: { label: "オーケストレーション", isDiagnostic: false },
  crm_ops: { label: "CRM・運用管理", isDiagnostic: false },
  asset_generation: { label: "アセット生成 (提案資料)", isDiagnostic: false },
  video: { label: "アセット生成 (動画)", isDiagnostic: false },
  demo_site: { label: "アセット生成 (デモサイト)", isDiagnostic: false },
  proxy: { label: "プロキシ・通信制御", isDiagnostic: false },
}
