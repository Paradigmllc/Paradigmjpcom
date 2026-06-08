"use client"

import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { sortedEntries, BarList } from "./sales-panels-shared"

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
