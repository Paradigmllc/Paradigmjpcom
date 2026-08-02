import { BarChart3, CheckCircle2, Eye, MousePointerClick, Send, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { VideoGrowthKpis as Kpis } from "@/lib/video-growth/types"

export function VideoGrowthKpis({ kpis }: { kpis: Kpis }) {
  const items = [
    { label: "キャンペーン", value: kpis.campaigns.toLocaleString(), note: `承認済み ${kpis.approvedCampaigns}`, icon: BarChart3 },
    { label: "公開クリエイティブ", value: kpis.publishedVariants.toLocaleString(), note: "4媒体合計", icon: CheckCircle2 },
    { label: "表示 / 再生", value: kpis.impressions.toLocaleString(), note: `再生 ${kpis.views.toLocaleString()}`, icon: Eye },
    { label: "クリック", value: kpis.clicks.toLocaleString(), note: `CTR ${kpis.clickThroughRate}%`, icon: MousePointerClick },
    { label: "返信", value: kpis.replies.toLocaleString(), note: "SNS・メール合計", icon: Send },
    { label: "商談", value: kpis.meetings.toLocaleString(), note: "手動確認済み", icon: Users },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {items.map((item) => (
        <Card key={item.label} className="border-zinc-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-semibold">{item.label}</span>
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-zinc-950">{item.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{item.note}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
