"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, CircleAlert, ExternalLink, Search } from "lucide-react"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { formatDate } from "./format-utils"
import { statusTone, sortedEntries, ToolBadge, BarList, CATEGORY_MAP } from "./sales-panels-shared"
import { SalesSourceAcquisitionPanel } from "./SalesSourceAcquisitionPanel"

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
            <h2 className="text-sm font-semibold text-zinc-950">自動同期ログ</h2>
            <p className="mt-1 text-xs text-zinc-500">SupabaseとTwenty CRMは自動でリアルタイムに双方向同期されています。</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            リアルタイム自動相互同期中
          </span>
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
    <SalesSourceAcquisitionPanel summary={data.sourceAcquisition} />
    </div>
  )
}

type FilterType = "all" | "diagnostic" | "outreach" | "orchestration" | "crm" | "asset" | "proxy"
type SortBy = "diagnostic_first" | "name_asc" | "status_ready"
type StatusFilter = "all" | "ready" | "partial" | "missing"

function IntegrationInventoryPanel({
  data,
  readyIntegrations,
  missingRecommended,
}: {
  data: SalesDashboardData
  readyIntegrations: number
  missingRecommended: number
  categories: [string, number][]
}) {
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [sortBy, setSortBy] = useState<SortBy>("diagnostic_first")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const mappedCategories = useMemo(() => {
    const counts: Record<string, number> = {}
    data.integrationStatus.forEach((item) => {
      const mapping = CATEGORY_MAP[item.category]
      const label = mapping ? mapping.label : item.category
      counts[label] = (counts[label] ?? 0) + 1
    })
    return Object.entries(counts).sort(([, a], [, b]) => b - a)
  }, [data.integrationStatus])

  const processedItems = useMemo(() => {
    let items = [...data.integrationStatus]

    if (filterType !== "all") {
      items = items.filter((item) => {
        const mapping = CATEGORY_MAP[item.category]
        if (filterType === "diagnostic") return mapping?.isDiagnostic
        if (filterType === "outreach") return item.category === "outreach"
        if (filterType === "orchestration") return item.category === "orchestration"
        if (filterType === "crm") return item.category === "crm_ops"
        if (filterType === "asset") return ["asset_generation", "video", "demo_site"].includes(item.category)
        if (filterType === "proxy") return item.category === "proxy"
        return true
      })
    }

    if (statusFilter !== "all") {
      items = items.filter((item) => item.status === statusFilter)
    }

    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase()
      items = items.filter(
        (item) =>
          item.displayName.toLowerCase().includes(q) ||
          item.role.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      )
    }

    items.sort((a, b) => {
      if (sortBy === "diagnostic_first") {
        const aDiag = CATEGORY_MAP[a.category]?.isDiagnostic ? 1 : 0
        const bDiag = CATEGORY_MAP[b.category]?.isDiagnostic ? 1 : 0
        if (aDiag !== bDiag) return bDiag - aDiag
        return a.displayName.localeCompare(b.displayName)
      }
      if (sortBy === "name_asc") {
        return a.displayName.localeCompare(b.displayName)
      }
      if (sortBy === "status_ready") {
        const statusWeight = (s: string) => (s === "ready" ? 3 : s === "partial" ? 2 : 1)
        const aW = statusWeight(a.status)
        const bW = statusWeight(b.status)
        if (aW !== bW) return bW - aW
        return a.displayName.localeCompare(b.displayName)
      }
      return 0
    })

    return items
  }, [data.integrationStatus, filterType, sortBy, searchTerm, statusFilter])

  const filterButtons: { id: FilterType; label: string }[] = [
    { id: "all", label: "すべて" },
    { id: "diagnostic", label: "診断ソースのみ" },
    { id: "outreach", label: "アプローチ" },
    { id: "orchestration", label: "オーケストレーション" },
    { id: "crm", label: "CRM・運用" },
    { id: "asset", label: "アセット生成" },
    { id: "proxy", label: "プロキシ・通信" },
  ]

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

      <div className="mt-4 flex flex-col gap-3 border-b border-zinc-100 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500">カテゴリー:</span>
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                filterType === btn.id
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ツール名や用途・目的で検索..."
                className="w-full rounded border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-zinc-500 placeholder-zinc-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 shrink-0">接続状態:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500"
              >
                <option value="all">すべて</option>
                <option value="ready">接続済み (ready)</option>
                <option value="partial">一部接続 (partial)</option>
                <option value="missing">未接続 (missing)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 shrink-0">ソート:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500"
            >
              <option value="diagnostic_first">診断ソース優先</option>
              <option value="name_asc">ツール名順</option>
              <option value="status_ready">接続状態順</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.55fr_1.45fr]">
        <BarList title="カテゴリ別 (日本語)" rows={mappedCategories} empty="接続台帳がまだありません。" />
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <div className="hidden min-w-[720px] grid-cols-[1.2fr_0.8fr_0.7fr_1fr] gap-3 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600 md:grid">
            <div>ツール</div>
            <div>状態</div>
            <div>残量</div>
            <div>不足ENV</div>
          </div>
          <div className="max-h-[520px] min-w-0 divide-y divide-zinc-100 overflow-y-auto md:min-w-[720px]">
            {processedItems.map((item) => {
              const categoryInfo = CATEGORY_MAP[item.category]
              const displayCategoryName = categoryInfo ? categoryInfo.label : item.category
              return (
                <div key={item.slug} className="grid gap-3 px-3 py-3 text-xs md:grid-cols-[1.2fr_0.8fr_0.7fr_1fr]">
                  <div className="min-w-0">
                    <div className="mb-1 text-[11px] font-semibold text-zinc-400 md:hidden">ツール</div>
                    <div className="font-semibold text-zinc-950">{item.displayName}</div>
                    <div className="mt-1 line-clamp-2 text-zinc-500 leading-relaxed">{item.role}</div>
                    {item.docsUrl && (
                      <a href={item.docsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-zinc-800 underline-offset-2 hover:underline">
                        docs <ExternalLink size={11} aria-hidden />
                      </a>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 text-[11px] font-semibold text-zinc-400 md:hidden">状態</div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 ${statusTone(item.status)}`}>{item.status}</span>
                    <div className="mt-2 text-zinc-500">{displayCategoryName} / {item.deployment}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 text-[11px] font-semibold text-zinc-400 md:hidden">残量</div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 ${statusTone(item.balanceStatus)}`}>{item.balanceStatus}</span>
                    <div className="mt-2 text-zinc-500">{item.balanceLabel}</div>
                  </div>
                  <div className="min-w-0 break-words text-zinc-500">
                    <div className="mb-1 text-[11px] font-semibold text-zinc-400 md:hidden">不足ENV</div>
                    {item.missingEnv.length > 0 ? item.missingEnv.join(", ") : "必須ENV OK"}
                    {item.optionalMissingEnv.length > 0 && (
                      <div className="mt-1 text-zinc-400">optional: {item.optionalMissingEnv.slice(0, 3).join(", ")}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
