"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { VideoGrowthVariant } from "@/lib/video-growth/types"

type Props = {
  busy: boolean
  variant: VideoGrowthVariant
  onAction: (payload: Record<string, unknown>) => Promise<void>
}

const emptyMetrics = { impressions: 0, views: 0, clicks: 0, replies: 0, meetings: 0 }

export function VideoGrowthDailyMetricsPanel({ busy, variant, onAction }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [metricDate, setMetricDate] = useState(today)
  const existing = useMemo(() => variant.dailyMetrics.find((item) => item.metricDate === metricDate), [metricDate, variant.dailyMetrics])
  const [metrics, setMetrics] = useState(emptyMetrics)
  useEffect(() => {
    setMetrics(existing ? {
      impressions: existing.impressions, views: existing.views, clicks: existing.clicks,
      replies: existing.replies, meetings: existing.meetings,
    } : emptyMetrics)
  }, [existing])
  return (
    <details className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
      <summary className="cursor-pointer text-xs font-black text-violet-950"><BarChart3 className="mr-2 inline h-4 w-4" />日次成果（累計は自動再計算）</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <div className="space-y-1"><Label className="text-xs" htmlFor={`${variant.id}-metric-date`}>日付</Label><Input id={`${variant.id}-metric-date`} type="date" max={today} value={metricDate} onChange={(event) => setMetricDate(event.target.value)} /></div>
        {(Object.keys(metrics) as Array<keyof typeof metrics>).map((key) => <div key={key} className="space-y-1"><Label className="text-xs" htmlFor={`${variant.id}-metric-${key}`}>{key}</Label><Input id={`${variant.id}-metric-${key}`} type="number" min={0} value={metrics[key]} onChange={(event) => setMetrics((current) => ({ ...current, [key]: Number(event.target.value) }))} /></div>)}
        <Button disabled={busy || !metricDate} onClick={() => onAction({
          target: "metrics", action: "record_daily", variantId: variant.id, metricDate,
          expectedRevision: existing?.revision ?? 0, ...metrics, source: "manual",
        })}><Save className="mr-2 h-4 w-4" />保存</Button>
      </div>
      {variant.dailyMetrics.length > 0 && <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[11px]"><thead><tr className="border-b border-violet-200">{["日付", "表示", "再生", "クリック", "返信", "商談", "記録者"].map((item) => <th key={item} className="px-2 py-1 font-semibold">{item}</th>)}</tr></thead><tbody>{variant.dailyMetrics.slice(0, 7).map((item) => <tr key={item.id} className="border-b border-violet-100"><td className="px-2 py-1">{item.metricDate}</td><td className="px-2 py-1">{item.impressions}</td><td className="px-2 py-1">{item.views}</td><td className="px-2 py-1">{item.clicks}</td><td className="px-2 py-1">{item.replies}</td><td className="px-2 py-1">{item.meetings}</td><td className="px-2 py-1">{item.recordedBy}</td></tr>)}</tbody></table></div>}
    </details>
  )
}
