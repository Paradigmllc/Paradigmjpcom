"use client"

import { useState } from "react"
import { CheckCircle2, RotateCcw, Send, ShieldCheck, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { approvalForRevision } from "@/lib/video-growth/workflow"
import type { VideoGrowthApprovalStage, VideoGrowthPrincipal, VideoGrowthVariant } from "@/lib/video-growth/types"

type Props = {
  busy: boolean
  principal: VideoGrowthPrincipal
  variant: VideoGrowthVariant
  onAction: (payload: Record<string, unknown>) => Promise<void>
}

const STAGES: Array<{ stage: VideoGrowthApprovalStage; label: string; description: string }> = [
  { stage: "internal_quality", label: "内部品質QA", description: "映像・音声・字幕・ブランド・主張を確認" },
  { stage: "client_release", label: "顧客公開承認", description: "顧客の公開許可と証跡を記録" },
]

function StageCard({ busy, principal, variant, stage, label, description, onAction }: Props & (typeof STAGES)[number]) {
  const current = approvalForRevision(variant, stage)
  const [note, setNote] = useState("")
  const [evidenceUrl, setEvidenceUrl] = useState(current?.evidenceUrl ?? "")
  const canDecide = stage === "client_release"
    ? ["admin", "commercial_lead"].includes(principal.role)
    : ["admin", "commercial_lead", "delivery"].includes(principal.role)
  const canRequest = ["admin", "commercial_lead", "delivery"].includes(principal.role)
  const pending = current?.decision === "pending"
  const run = (action: "request" | "approve" | "changes_requested" | "reject") => onAction({
    target: "approval", variantId: variant.id, expectedContentRevision: variant.contentRevision,
    stage, action, note, evidenceUrl,
  })
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="text-sm font-bold text-zinc-900">{label}</p><p className="mt-1 text-[11px] text-zinc-500">{description}</p></div>
        <Badge variant="outline">{current?.decision ?? "未依頼"}</Badge>
      </div>
      {current && <p className="mt-2 text-[11px] leading-5 text-zinc-500">依頼: {current.requestedBy} · Rev.{current.contentRevision}{current.decidedBy ? ` / 判定: ${current.decidedBy}` : ""}</p>}
      <div className="mt-3 space-y-2">
        <div className="space-y-1"><Label htmlFor={`${variant.id}-${stage}-note`} className="text-xs">承認メモ</Label><Textarea id={`${variant.id}-${stage}-note`} rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder={principal.role === "admin" ? "自己承認時は根拠を20文字以上で記録" : "依頼または判定の根拠"} /></div>
        <div className="space-y-1"><Label htmlFor={`${variant.id}-${stage}-evidence`} className="text-xs">証跡URL</Label><Input id={`${variant.id}-${stage}-evidence`} type="url" placeholder="https://..." value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} /></div>
        {!pending ? (
          <Button variant="outline" className="w-full" disabled={busy || !canRequest || note.trim().length < 4} onClick={() => run("request")}><Send className="mr-2 h-4 w-4" />承認を依頼</Button>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <Button disabled={busy || !canDecide || note.trim().length < 8} onClick={() => run("approve")}><CheckCircle2 className="mr-2 h-4 w-4" />承認</Button>
            <Button variant="outline" disabled={busy || !canDecide || note.trim().length < 8} onClick={() => run("changes_requested")}><RotateCcw className="mr-2 h-4 w-4" />差戻し</Button>
            <Button variant="ghost" className="text-rose-700" disabled={busy || !canDecide || note.trim().length < 8} onClick={() => run("reject")}><XCircle className="mr-2 h-4 w-4" />却下</Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function VideoGrowthApprovalPanel(props: Props) {
  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
      <h4 className="flex items-center gap-2 text-xs font-black text-blue-950"><ShieldCheck className="h-4 w-4" />公開ゲート · Content Rev.{props.variant.contentRevision}</h4>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">{STAGES.map((item) => <StageCard key={item.stage} {...props} {...item} />)}</div>
    </section>
  )
}
