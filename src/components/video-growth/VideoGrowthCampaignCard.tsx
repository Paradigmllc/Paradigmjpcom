"use client"

import { useState } from "react"
import { CalendarClock, CheckCircle2, ExternalLink, Pause, Play, ShieldCheck, StopCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CAMPAIGN_STATUS_LABELS, campaignReviewReadiness, nextCampaignActions } from "@/lib/video-growth/workflow"
import type { StudioProjectSummary, VideoGrowthCampaign } from "@/lib/video-growth/types"
import { VideoGrowthVariantCard } from "./VideoGrowthVariantCard"

type Props = {
  actor: string
  busy: boolean
  campaign: VideoGrowthCampaign
  project: StudioProjectSummary | undefined
  onAction: (payload: Record<string, unknown>) => Promise<void>
}

export function VideoGrowthCampaignCard({ actor, busy, campaign, project, onAction }: Props) {
  const [note, setNote] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")
  const readiness = campaignReviewReadiness(campaign)
  const actions = nextCampaignActions(campaign.status)
  const base = { target: "campaign", campaignId: campaign.id, expectedRevision: campaign.revision, actor }

  const runAction = (action: string) => onAction({
    ...base,
    action,
    note: note.trim() || `${action} by ${actor}`,
    ...(action === "schedule" ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}),
  })

  return (
    <Card className="overflow-hidden border-zinc-200 shadow-sm">
      <CardHeader className="border-b border-zinc-100 bg-zinc-50/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><CardTitle className="text-lg">{campaign.name}</CardTitle><Badge>{CAMPAIGN_STATUS_LABELS[campaign.status]}</Badge></div>
            <p className="mt-2 text-sm text-zinc-500">{campaign.studioProjectName} · {campaign.studioProjectStatus} · Rev. {campaign.revision}</p>
          </div>
          <a href={campaign.landingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">LPを確認<ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 p-4"><p className="text-xs font-semibold text-zinc-500">獲得目標</p><p className="mt-2 text-sm leading-6 text-zinc-900">{campaign.objective}</p></div>
          <div className="rounded-xl border border-zinc-200 p-4"><p className="text-xs font-semibold text-zinc-500">対象顧客</p><p className="mt-2 text-sm leading-6 text-zinc-900">{campaign.audience}</p></div>
          <div className="rounded-xl border border-zinc-200 p-4"><p className="text-xs font-semibold text-zinc-500">オファー</p><p className="mt-2 text-sm leading-6 text-zinc-900">{campaign.offer}</p></div>
        </div>

        {campaign.status === "draft" && (
          <div className={`rounded-xl border p-4 ${readiness.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <p className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4" />レビュー入場条件</p>
            {readiness.ready ? <p className="mt-2 text-xs text-emerald-800">Studio承認と4媒体の制作準備が完了しています。</p> : <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900">{readiness.missing.map((item) => <li key={item}>{item}</li>)}</ul>}
          </div>
        )}

        {actions.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="space-y-2"><Label htmlFor={`${campaign.id}-note`}>承認・運用メモ</Label><Textarea id={`${campaign.id}-note`} rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="確認した証拠、判断、次の責任者を記録" /></div>
              {campaign.status === "human_approved" && <div className="space-y-2"><Label htmlFor={`${campaign.id}-schedule`}>配信予定</Label><Input id={`${campaign.id}-schedule`} type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} /></div>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.includes("request_review") && <Button disabled={busy || !readiness.ready} onClick={() => runAction("request_review")}><CheckCircle2 className="mr-2 h-4 w-4" />レビュー依頼</Button>}
              {actions.includes("approve") && <Button disabled={busy || note.trim().length < 8} onClick={() => runAction("approve")}><ShieldCheck className="mr-2 h-4 w-4" />人間承認</Button>}
              {actions.includes("schedule") && <Button disabled={busy || !scheduledFor || note.trim().length < 2} onClick={() => runAction("schedule")}><CalendarClock className="mr-2 h-4 w-4" />配信予定へ</Button>}
              {actions.includes("pause") && <Button variant="outline" disabled={busy} onClick={() => runAction("pause")}><Pause className="mr-2 h-4 w-4" />停止</Button>}
              {actions.includes("resume") && <Button disabled={busy} onClick={() => runAction("resume")}><Play className="mr-2 h-4 w-4" />再開</Button>}
              {actions.includes("complete") && <Button variant="outline" disabled={busy || note.trim().length < 2} onClick={() => runAction("complete")}><CheckCircle2 className="mr-2 h-4 w-4" />完了</Button>}
              {actions.includes("cancel") && <Button variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800" disabled={busy || note.trim().length < 2} onClick={() => runAction("cancel")}><StopCircle className="mr-2 h-4 w-4" />中止</Button>}
            </div>
          </div>
        )}

        {campaign.approvedBy && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-xs text-emerald-900">承認者: {campaign.approvedBy} · {campaign.approvalNote}</p>}
        <div><h3 className="text-sm font-bold text-zinc-950">媒体別クリエイティブ</h3><div className="mt-3 grid gap-4 xl:grid-cols-2">{campaign.variants.map((variant) => <VideoGrowthVariantCard key={variant.id} actor={actor} busy={busy} campaignStatus={campaign.status} project={project} variant={variant} onAction={onAction} />)}</div></div>
      </CardContent>
    </Card>
  )
}
