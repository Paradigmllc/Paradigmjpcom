import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, Gauge, MousePointerClick, RotateCcw, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { VideoGrowthKpis as Kpis } from "@/lib/video-growth/types"

export function VideoGrowthKpis({ kpis }: { kpis: Kpis }) {
  const quotaRate = kpis.monthlyQuotaLimit > 0 ? Math.round((kpis.monthlyQuotaUsed / kpis.monthlyQuotaLimit) * 100) : 0
  const items = [
    { label: "稼働ワークオーダー", value: kpis.openWorkOrders, note: `全案件 ${kpis.campaigns}`, icon: FileCheck2 },
    { label: "納期超過", value: kpis.overdueDeliveries, note: "SLA要対応", icon: AlertTriangle },
    { label: "入稿ブロック", value: kpis.blockedIntakes, note: "未確認・NGあり", icon: Clock3 },
    { label: "承認待ち", value: kpis.pendingApprovals, note: "内部QA / 顧客承認", icon: CheckCircle2 },
    { label: "未完了の修正", value: kpis.openRevisions, note: "制作差し戻し", icon: RotateCcw },
    { label: "月次制作枠", value: `${kpis.monthlyQuotaUsed}/${kpis.monthlyQuotaLimit}`, note: `消化率 ${quotaRate}%`, icon: Gauge },
    { label: "クリック", value: kpis.clicks, note: `CTR ${kpis.clickThroughRate}%`, icon: MousePointerClick },
    { label: "商談", value: kpis.meetings, note: `返信 ${kpis.replies}`, icon: Users },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      {items.map((item) => (
        <Card key={item.label} className="border-zinc-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 text-zinc-500">
              <span className="text-xs font-semibold">{item.label}</span>
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-zinc-950">{typeof item.value === "number" ? item.value.toLocaleString() : item.value}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{item.note}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
