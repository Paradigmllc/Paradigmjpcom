"use client"

import { Activity } from "lucide-react"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { formatDate } from "./format-utils"
import { sortedEntries, BarList } from "./sales-panels-shared"
import { SalesCrmFieldSettingsPanel } from "./SalesCrmFieldSettingsPanel"

export function CrmPanel({ data }: { data: SalesDashboardData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SalesCrmFieldSettingsPanel
        fields={data.crmFieldConfig.fields}
        options={data.crmFieldConfig.options}
        fallbackUsed={data.crmFieldConfig.fallbackUsed}
        error={data.crmFieldConfig.error}
      />
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
