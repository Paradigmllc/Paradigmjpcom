"use client"

import { useEffect, useState } from "react"
import { Check, ExternalLink, Save, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CHANNEL_DEFINITIONS, variantHasReleaseApproval, variantIsComplete } from "@/lib/video-growth/workflow"
import type { StudioProjectSummary, VideoGrowthCampaignStatus, VideoGrowthPrincipal, VideoGrowthVariant } from "@/lib/video-growth/types"
import { VideoGrowthApprovalPanel } from "./VideoGrowthApprovalPanel"
import { VideoGrowthDailyMetricsPanel } from "./VideoGrowthDailyMetricsPanel"
import { VideoGrowthRevisionPanel } from "./VideoGrowthRevisionPanel"

type Props = {
  principal: VideoGrowthPrincipal
  busy: boolean
  campaignStatus: VideoGrowthCampaignStatus
  project: StudioProjectSummary | undefined
  variant: VideoGrowthVariant
  onAction: (payload: Record<string, unknown>) => Promise<void>
}

export function VideoGrowthVariantCard({ principal, busy, campaignStatus, project, variant, onAction }: Props) {
  const [hook, setHook] = useState(variant.hook)
  const [caption, setCaption] = useState(variant.caption)
  const [cta, setCta] = useState(variant.cta)
  const [deliverableName, setDeliverableName] = useState(variant.deliverableName ?? "")
  const [publishUrl, setPublishUrl] = useState(variant.publishUrl ?? "")
  const definition = CHANNEL_DEFINITIONS[variant.channel]
  const hasUnsavedCopy = hook !== variant.hook || caption !== variant.caption
    || cta !== variant.cta || deliverableName !== (variant.deliverableName ?? "")

  useEffect(() => {
    setHook(variant.hook)
    setCaption(variant.caption)
    setCta(variant.cta)
    setDeliverableName(variant.deliverableName ?? "")
    setPublishUrl(variant.publishUrl ?? "")
  }, [variant])

  const base = { target: "variant", variantId: variant.id, expectedRevision: variant.revision, note: `${definition.label}の制作操作` }
  const draft = variant.status === "draft"
  const approved = variantHasReleaseApproval(variant)
  const publishable = approved && ["approved", "scheduled"].includes(variant.status) && ["scheduled", "active"].includes(campaignStatus)
  const approvalPhase = ["human_approved", "scheduled", "active", "paused"].includes(campaignStatus)

  return (
    <Card className="border-zinc-200 bg-white shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><CardTitle className="text-base">{definition.label}</CardTitle><p className="mt-1 text-xs text-zinc-500">{definition.format}</p></div>
          <div className="flex gap-2"><Badge variant="outline">{variant.status}</Badge><Badge variant="outline">Content Rev.{variant.contentRevision}</Badge></div>
        </div>
        <p className="text-xs leading-5 text-zinc-500">{definition.purpose}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {draft && (
          <>
            <div className="space-y-2"><Label htmlFor={`${variant.id}-hook`}>フック</Label><Input id={`${variant.id}-hook`} value={hook} onChange={(event) => setHook(event.target.value)} maxLength={500} /></div>
            <div className="space-y-2">
              <div className="flex justify-between gap-2"><Label htmlFor={`${variant.id}-caption`}>投稿文 / メール本文</Label><span className="text-xs text-zinc-400">{caption.length}/{definition.maxCaptionLength}</span></div>
              <Textarea id={`${variant.id}-caption`} rows={5} value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={definition.maxCaptionLength} />
            </div>
            <div className="space-y-2"><Label htmlFor={`${variant.id}-cta`}>CTA</Label><Input id={`${variant.id}-cta`} value={cta} onChange={(event) => setCta(event.target.value)} maxLength={300} /></div>
            <div className="space-y-2">
              <Label htmlFor={`${variant.id}-deliverable`}>Studio納品物</Label>
              <select id={`${variant.id}-deliverable`} className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" value={deliverableName} onChange={(event) => setDeliverableName(event.target.value)}>
                <option value="">選択してください</option>
                {(project?.deliverables ?? []).map((deliverable) => <option key={deliverable.name} value={deliverable.name}>{deliverable.name} · {deliverable.aspectRatio} · {deliverable.language}</option>)}
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" disabled={busy} onClick={() => onAction({ ...base, action: "update_copy", hook, caption, cta, deliverableName })}><Save className="mr-2 h-4 w-4" />保存</Button>
              <Button disabled={busy || hasUnsavedCopy || !variantIsComplete({ ...variant, hook, caption, cta, deliverableName })} onClick={() => onAction({ ...base, action: "mark_ready", note: `${definition.label}の制作レビュー準備が完了` })}><Check className="mr-2 h-4 w-4" />レビュー準備完了</Button>
            </div>
          </>
        )}

        {approvalPhase && <VideoGrowthApprovalPanel busy={busy} principal={principal} variant={variant} onAction={onAction} />}

        {publishable && (
          <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-emerald-950"><ShieldCheck className="h-4 w-4" />内部QA・顧客公開承認済み</p>
            <Label htmlFor={`${variant.id}-publish`}>手動公開後のURL</Label>
            <Input id={`${variant.id}-publish`} type="url" placeholder="https://..." value={publishUrl} onChange={(event) => setPublishUrl(event.target.value)} />
            <Button className="w-full" disabled={busy || !publishUrl.startsWith("https://")} onClick={() => onAction({ ...base, action: "publish", publishUrl, note: `${definition.label}の手動公開をURLで検証` })}><ExternalLink className="mr-2 h-4 w-4" />公開を記録</Button>
          </div>
        )}

        {approvalPhase && <VideoGrowthRevisionPanel busy={busy} variant={variant} onAction={onAction} />}
        {variant.status === "published" && <VideoGrowthDailyMetricsPanel busy={busy} variant={variant} onAction={onAction} />}
        {variant.publishUrl && <a href={variant.publishUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">公開ページを確認<ExternalLink className="h-3 w-3" /></a>}
        {variant.errorMessage && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{variant.errorMessage}</p>}
      </CardContent>
    </Card>
  )
}
