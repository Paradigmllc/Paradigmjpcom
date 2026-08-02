"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, ExternalLink, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { READINESS_CHECK_LABELS } from "@/lib/video-growth/workflow"
import type { VideoGrowthPrincipal, VideoGrowthReadinessCheck } from "@/lib/video-growth/types"

type Props = {
  busy: boolean
  checks: VideoGrowthReadinessCheck[]
  principal: VideoGrowthPrincipal
  onAction: (payload: Record<string, unknown>) => Promise<void>
}

function canEdit(check: VideoGrowthReadinessCheck, principal: VideoGrowthPrincipal): boolean {
  if (["admin", "commercial_lead", "delivery"].includes(principal.role)) return true
  if (principal.role === "finance") return check.checkKey === "payment"
  if (principal.role === "legal") return ["contract", "usage_rights"].includes(check.checkKey)
  return false
}

function CheckRow({ busy, check, principal, onAction }: Props & { check: VideoGrowthReadinessCheck }) {
  const [status, setStatus] = useState(check.status)
  const [note, setNote] = useState(check.note)
  const [evidenceUrl, setEvidenceUrl] = useState(check.evidenceUrl ?? "")
  useEffect(() => {
    setStatus(check.status)
    setNote(check.note)
    setEvidenceUrl(check.evidenceUrl ?? "")
  }, [check])
  const editable = canEdit(check, principal)
  const waiverInvalid = ["waived", "failed"].includes(status) && note.trim().length < 8
  return (
    <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 lg:grid-cols-[150px_130px_1fr_1fr_auto] lg:items-end">
      <div><p className="text-sm font-bold text-zinc-900">{READINESS_CHECK_LABELS[check.checkKey]}</p><p className="mt-1 text-[11px] text-zinc-500">Rev. {check.revision}{check.checkedBy ? ` · ${check.checkedBy}` : ""}</p></div>
      <div className="space-y-1"><Label htmlFor={`${check.id}-status`} className="text-xs">判定</Label><select id={`${check.id}-status`} className="min-h-10 w-full rounded-md border border-zinc-300 px-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} disabled={!editable}>{["pending", "passed", "waived", "failed"].map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="space-y-1"><Label htmlFor={`${check.id}-note`} className="text-xs">確認メモ</Label><Input id={`${check.id}-note`} value={note} onChange={(event) => setNote(event.target.value)} disabled={!editable} maxLength={2000} /></div>
      <div className="space-y-1"><Label htmlFor={`${check.id}-evidence`} className="text-xs">証跡URL</Label><Input id={`${check.id}-evidence`} type="url" placeholder="https://..." value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} disabled={!editable} /></div>
      <Button variant="outline" disabled={busy || !editable || waiverInvalid} onClick={() => onAction({
        target: "readiness", action: "update", checkId: check.id, checkKey: check.checkKey,
        expectedRevision: check.revision, status, note, evidenceUrl,
      })}><Save className="mr-2 h-4 w-4" />保存</Button>
    </div>
  )
}

export function VideoGrowthReadinessChecklist(props: Props) {
  const complete = props.checks.filter((item) => ["passed", "waived"].includes(item.status)).length
  return (
    <section className="rounded-xl border border-zinc-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="flex items-center gap-2 text-sm font-black text-zinc-950"><CheckCircle2 className="h-4 w-4" />商用入稿・権利チェック</h3><p className="mt-1 text-xs text-zinc-500">契約・請求・素材・権利・LP・計測を全て確認するまで案件レビューへ進めません。</p></div>
        <Badge className={complete === 7 ? "bg-emerald-700" : "bg-amber-600"}>{complete}/7 完了</Badge>
      </div>
      {props.checks.length === 0 ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">チェック項目がありません。商用ワークオーダーを作り直してください。</p> : <div className="mt-4 space-y-2">{props.checks.map((check) => <CheckRow key={check.id} {...props} check={check} />)}</div>}
      <p className="mt-3 flex items-center gap-1 text-[11px] text-zinc-500"><ExternalLink className="h-3 w-3" />証跡は社内で閲覧可能なHTTPS URLのみを登録してください。</p>
    </section>
  )
}
