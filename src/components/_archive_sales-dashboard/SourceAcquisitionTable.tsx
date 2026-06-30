"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import type { SourceAcquisitionSourceMetric } from "@/lib/sales/source-acquisition"
import { SOURCE_CATEGORY_MAP, SOURCE_ROLE_MAP, number, date, type SourceSortBy } from "./source-acquisition-utils"

export function SourceAcquisitionTable({
  sourceMetrics,
  latestMeasuredAt,
}: {
  sourceMetrics: SourceAcquisitionSourceMetric[]
  latestMeasuredAt: string | null
}) {
  const [sourceSearchTerm, setSourceSearchTerm] = useState("")
  const [sourceCategoryFilter, setSourceCategoryFilter] = useState("all")
  const [sourceStatusFilter, setSourceStatusFilter] = useState("all")
  const [sourceSortBy, setSourceSortBy] = useState<SourceSortBy>("total_runs")

  const filteredSources = useMemo(() => {
    let items = [...sourceMetrics]

    if (sourceCategoryFilter !== "all") {
      items = items.filter((item) => {
        if (sourceCategoryFilter === "diagnostic") {
          return item.category === "analysis" || item.category === "list" || item.category === "list_source"
        }
        return item.category === sourceCategoryFilter
      })
    }

    if (sourceStatusFilter !== "all") {
      items = items.filter((item) => {
        const hasCollected = item.collected > 0
        const successRate = item.successRate
        if (sourceStatusFilter === "ready") {
          return successRate === 100
        }
        if (sourceStatusFilter === "partial") {
          return hasCollected && successRate < 100
        }
        if (sourceStatusFilter === "missing") {
          return !hasCollected
        }
        return true
      })
    }

    if (sourceSearchTerm.trim() !== "") {
      const q = sourceSearchTerm.toLowerCase()
      items = items.filter((item) => {
        const role = SOURCE_ROLE_MAP[item.sourceSlug] || item.meaning || item.detail || ""
        const catLabel = SOURCE_CATEGORY_MAP[item.category] || item.category
        return (
          item.label.toLowerCase().includes(q) ||
          item.sourceSlug.toLowerCase().includes(q) ||
          role.toLowerCase().includes(q) ||
          catLabel.toLowerCase().includes(q)
        )
      })
    }

    items.sort((a, b) => {
      if (sourceSortBy === "total_runs") {
        return b.total - a.total || a.label.localeCompare(b.label)
      }
      if (sourceSortBy === "success_rate") {
        return b.successRate - a.successRate || b.total - a.total || a.label.localeCompare(b.label)
      }
      if (sourceSortBy === "collected") {
        return b.collected - a.collected || a.label.localeCompare(b.label)
      }
      if (sourceSortBy === "missing") {
        const aMissing = a.missing + a.error
        const bMissing = b.missing + b.error
        return bMissing - aMissing || a.label.localeCompare(b.label)
      }
      if (sourceSortBy === "name_asc") {
        return a.label.localeCompare(b.label)
      }
      return 0
    })

    return items
  }, [sourceMetrics, sourceSearchTerm, sourceCategoryFilter, sourceStatusFilter, sourceSortBy])

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">無料API / OSS 取得元別の成績</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            PageSpeed、Wappalyzer、gBizInfo、フォーム探索などの取得成否を、企業カルテ単位で集計しています。
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700 whitespace-nowrap self-start">
          最新 {date(latestMeasuredAt)}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-b border-zinc-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={sourceSearchTerm}
              onChange={(e) => setSourceSearchTerm(e.target.value)}
              placeholder="取得元名や用途で検索..."
              className="w-full rounded border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-zinc-500 placeholder-zinc-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 shrink-0">分類:</span>
            <select
              value={sourceCategoryFilter}
              onChange={(e) => setSourceCategoryFilter(e.target.value)}
              className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-zinc-500"
            >
              <option value="all">すべて</option>
              <option value="diagnostic">診断ソースのみ</option>
              <option value="analysis">診断ソース (分析)</option>
              <option value="list">診断ソース (リスト収集)</option>
              <option value="outreach">アプローチ自動化</option>
              <option value="orchestration">オーケストレーション</option>
              <option value="video">アセット生成 (動画)</option>
              <option value="demo">アセット生成 (デモサイト)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 shrink-0">ステータス:</span>
            <select
              value={sourceStatusFilter}
              onChange={(e) => setSourceStatusFilter(e.target.value)}
              className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-zinc-500"
            >
              <option value="all">すべて</option>
              <option value="ready">良好 (100%)</option>
              <option value="partial">一部取得</option>
              <option value="missing">未取得・エラー</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 shrink-0">ソート:</span>
          <select
            value={sourceSortBy}
            onChange={(e) => setSourceSortBy(e.target.value as SourceSortBy)}
            className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-zinc-500"
          >
            <option value="total_runs">ログ数順 (多)</option>
            <option value="success_rate">成功率順</option>
            <option value="collected">成功数順</option>
            <option value="missing">未取得数順</option>
            <option value="name_asc">名称順</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
        <table className="min-w-[960px] w-full text-left table-fixed">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[28%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
          </colgroup>
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">取得元</th>
              <th className="px-3 py-2 font-medium">ステータス</th>
              <th className="px-3 py-2 font-medium">分類</th>
              <th className="px-3 py-2 font-medium">用途 / 役割</th>
              <th className="px-3 py-2 text-right font-medium">ログ</th>
              <th className="px-3 py-2 text-right font-medium">成功</th>
              <th className="px-3 py-2 text-right font-medium">未取得</th>
              <th className="px-3 py-2 text-right font-medium">成功率</th>
              <th className="px-3 py-2 font-medium">最終取得</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredSources.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-sm text-zinc-500">
                  条件に一致する取得実績データはありません。
                </td>
              </tr>
            ) : (
              filteredSources.map((source) => {
                const displayCategory = SOURCE_CATEGORY_MAP[source.category] || source.category
                const role = SOURCE_ROLE_MAP[source.sourceSlug] || source.meaning || source.detail || "営業診断のためのデータを取得"

                let statusLabel = "未接続"
                let statusTone = "bg-zinc-100 text-zinc-700"
                if (source.total > 0) {
                  if (source.successRate === 100) {
                    statusLabel = "良好"
                    statusTone = "bg-emerald-100 text-emerald-700"
                  } else if (source.collected > 0) {
                    statusLabel = "一部取得"
                    statusTone = "bg-amber-100 text-amber-800"
                  } else {
                    statusLabel = "未取得"
                    statusTone = "bg-rose-100 text-rose-700"
                  }
                }

                return (
                  <tr key={source.sourceSlug} className="hover:bg-zinc-50">
                    <td className="px-3 py-3">
                      <div className="font-medium text-zinc-950 truncate" title={source.label}>{source.label}</div>
                      <div className="mt-1 text-[11px] text-zinc-500 truncate" title={source.sourceSlug}>{source.sourceSlug}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ${statusTone}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-600 truncate" title={displayCategory}>
                      {displayCategory}
                    </td>
                    <td className="px-3 py-3 max-w-xs">
                      <div className="text-xs text-zinc-500 line-clamp-2 leading-relaxed" title={role}>
                        {role}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-xs tabular-nums text-zinc-700">{number(source.total)}</td>
                    <td className="px-3 py-3 text-right text-xs tabular-nums text-emerald-700">{number(source.collected)}</td>
                    <td className="px-3 py-3 text-right text-xs tabular-nums text-rose-700">{number(source.missing + source.error)}</td>
                    <td className="px-3 py-3 text-right text-xs font-semibold tabular-nums text-zinc-950">{source.successRate}%</td>
                    <td className="px-3 py-3 text-[11px] text-zinc-500 whitespace-nowrap">{date(source.lastMeasuredAt)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
