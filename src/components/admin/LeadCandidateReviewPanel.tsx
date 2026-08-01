"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, ExternalLink, Loader2, RotateCcw, ShieldCheck, Sparkles, StopCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface ReviewRun {
  id: string
  status: string
  execution_mode: "pilot" | "batch"
  operator_status: "pending_review" | "approved_for_scale" | "closed"
  cancel_requested: boolean
  verified_count: number
  forms_qualified_count: number
  failure_count: number
}

interface ReviewItem {
  id: string
  company_name: string | null
  domain: string
  source_page_url: string | null
  status: string
  quality_status: string
  quality_reasons: string[]
  quality_gate: Record<string, unknown> | null
  opportunity_score: number | null
  form_url: string | null
  form_method: string | null
  form_confidence: number | null
  form_verified: boolean
  form_checked_at: string | null
  form_qualification_reason: string | null
  review_status: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  promotion_attempts: number
  promotion_error: string | null
  twenty_synced: boolean
  updated_at: string
}

interface OperatorEvent {
  id: string
  entity_type: "run" | "item"
  action: string
  operator_name: string
  detail: Record<string, unknown>
  created_at: string
}

interface LeadCandidateReviewPanelProps {
  runId: string
  operatorName: string
  onChanged: () => Promise<void>
}

const REVIEW_FILTERS = [
  ["pending", "承認待ち"],
  ["promoting", "同期処理中"],
  ["promotion_failed", "同期失敗"],
  ["approved", "承認済み"],
  ["rejected", "人手除外"],
  ["not_required", "自動除外"],
] as const

const MAX_REVIEW_ITEMS = 20

function aiReviewConfidence(value: Record<string, unknown> | null): number | null {
  const review = value?.aiReview
  if (!review || typeof review !== "object" || Array.isArray(review)) return null
  const confidence = (review as Record<string, unknown>).confidence
  return typeof confidence === "number" ? confidence : null
}

export function LeadCandidateReviewPanel({ runId, operatorName, onChanged }: LeadCandidateReviewPanelProps) {
  const [run, setRun] = useState<ReviewRun | null>(null)
  const [items, setItems] = useState<ReviewItem[]>([])
  const [reviewStatus, setReviewStatus] = useState("pending")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [operatorEvents, setOperatorEvents] = useState<OperatorEvent[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/sales/lead-candidates/runs/${runId}?limit=100&page=${page}&reviewStatus=${reviewStatus}`, { cache: "no-store" })
      const payload = await response.json() as {
        ok?: boolean
        run?: ReviewRun
        recentItems?: ReviewItem[]
        itemTotal?: number
        operatorEvents?: OperatorEvent[]
        error?: string
      }
      if (!response.ok || !payload.ok || !payload.run) throw new Error(payload.error ?? "候補レビューを取得できませんでした")
      setRun(payload.run)
      setItems(payload.recentItems ?? [])
      setTotal(payload.itemTotal ?? 0)
      setOperatorEvents(payload.operatorEvents ?? [])
      setSelected(new Set())
    } catch (loadError) {
      console.error("[lead-candidate-review-panel] load failed:", loadError)
      setError(loadError instanceof Error ? loadError.message : "候補レビューを取得できませんでした")
    } finally {
      setLoading(false)
    }
  }, [page, reviewStatus, runId])

  useEffect(() => { void load() }, [load])

  const selectableIds = useMemo(() => items
    .filter((item) => ["pending", "promotion_failed"].includes(item.review_status) && item.status === "awaiting_review")
    .map((item) => item.id), [items])
  const selectablePageIds = useMemo(() => selectableIds.slice(0, MAX_REVIEW_ITEMS), [selectableIds])

  function toggleItem(itemId: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(itemId)) {
        next.delete(itemId)
        return next
      }
      if (next.size >= MAX_REVIEW_ITEMS) {
        toast.error(`1回の承認は最大${MAX_REVIEW_ITEMS}件です`)
        return current
      }
      next.add(itemId)
      return next
    })
  }

  async function review(action: "approve" | "reject") {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    if (selected.size === 0) return toast.error("候補を選択してください")
    if (note.trim().length < 3) return toast.error("判断理由を3文字以上入力してください")
    setBusy(true)
    try {
      const response = await fetch(`/api/sales/lead-candidates/runs/${runId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, itemIds: [...selected], operatorName: operatorName.trim(), note: note.trim() }),
      })
      const payload = await response.json() as { ok?: boolean; approved?: number; rejected?: number; failed?: number; invalid?: unknown[]; error?: string }
      if (!response.ok && response.status !== 207) throw new Error(payload.error ?? "候補レビューを保存できませんでした")
      if (action === "approve") toast.success(`Twenty同期${payload.approved ?? 0}件。失敗${payload.failed ?? 0}件。外部送信0件`)
      else toast.success(`${payload.rejected ?? 0}件を人手除外しました`)
      setNote("")
      await Promise.all([load(), onChanged()])
    } catch (reviewError) {
      console.error("[lead-candidate-review-panel] review failed:", reviewError)
      toast.error(reviewError instanceof Error ? reviewError.message : "候補レビューを保存できませんでした")
    } finally {
      setBusy(false)
    }
  }

  async function approvePilot() {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    if (note.trim().length < 5) return toast.error("パイロット評価を5文字以上入力してください")
    setBusy(true)
    try {
      const response = await fetch(`/api/sales/lead-candidates/runs/${runId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_pilot", operatorName: operatorName.trim(), note: note.trim() }),
      })
      const payload = await response.json() as { ok?: boolean; approvedSources?: number; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "パイロットを量産承認できませんでした")
      toast.success(`${payload.approvedSources ?? 0}収集元を量産可能にしました`)
      setNote("")
      await Promise.all([load(), onChanged()])
    } catch (pilotError) {
      console.error("[lead-candidate-review-panel] pilot approval failed:", pilotError)
      toast.error(pilotError instanceof Error ? pilotError.message : "パイロットを量産承認できませんでした")
    } finally {
      setBusy(false)
    }
  }

  async function syncHighConfidence() {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    if (note.trim().length < 5) return toast.error("同期理由を5文字以上入力してください")
    setBusy(true)
    try {
      const response = await fetch(`/api/sales/lead-candidates/runs/${runId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_high_confidence",
          operatorName: operatorName.trim(),
          note: note.trim(),
          confirm: "SYNC VERIFIED LIST ONLY",
        }),
      })
      const payload = await response.json() as { ok?: boolean; started?: boolean; alreadyRunning?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "高確度候補の同期を開始できませんでした")
      toast.success(payload.alreadyRunning ? "高確度候補の同期は実行中です" : "高確度候補のTwenty同期を開始しました。外部送信0件")
      setNote("")
      await Promise.all([load(), onChanged()])
    } catch (syncError) {
      console.error("[lead-candidate-review-panel] high-confidence sync failed:", syncError)
      toast.error(syncError instanceof Error ? syncError.message : "高確度候補の同期を開始できませんでした")
    } finally {
      setBusy(false)
    }
  }

  async function recoverStalePromotions() {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    if (note.trim().length < 3) return toast.error("復旧理由を3文字以上入力してください")
    setBusy(true)
    try {
      const response = await fetch(`/api/sales/lead-candidates/runs/${runId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recover_stale_promotions", operatorName: operatorName.trim(), note: note.trim() }),
      })
      const payload = await response.json() as { ok?: boolean; recovered?: number; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "停止したTwenty同期を復旧できませんでした")
      toast.success(`${payload.recovered ?? 0}件を再確認可能にしました。自動再同期はしていません`)
      setNote("")
      await Promise.all([load(), onChanged()])
    } catch (recoverError) {
      console.error("[lead-candidate-review-panel] stale promotion recovery failed:", recoverError)
      toast.error(recoverError instanceof Error ? recoverError.message : "停止したTwenty同期を復旧できませんでした")
    } finally {
      setBusy(false)
    }
  }

  async function cancelRun() {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    if (note.trim().length < 3) return toast.error("停止理由を3文字以上入力してください")
    setBusy(true)
    try {
      const response = await fetch(`/api/sales/lead-candidates/runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", operatorName: operatorName.trim(), note: note.trim() }),
      })
      const payload = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "ランを停止できませんでした")
      toast.success("ランを停止しました。外部送信は実行されていません")
      setNote("")
      await Promise.all([load(), onChanged()])
    } catch (cancelError) {
      console.error("[lead-candidate-review-panel] cancel failed:", cancelError)
      toast.error(cancelError instanceof Error ? cancelError.message : "ランを停止できませんでした")
    } finally {
      setBusy(false)
    }
  }

  const allSelected = selectablePageIds.length > 0 && selectablePageIds.every((id) => selected.has(id))
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />人手レビュー・Twenty昇格</CardTitle>
      <CardDescription>無操作では昇格しません。個別承認に加え、公式SMB根拠またはDeepSeek V4 Pro 96%以上・根拠引用一致の候補だけを、明示操作でTwentyへ連続同期できます。</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="flex flex-wrap gap-2">{REVIEW_FILTERS.map(([value, label]) => <Button key={value} size="sm" variant={reviewStatus === value ? "default" : "outline"} onClick={() => { setReviewStatus(value); setPage(1) }}>{label}</Button>)}</div>
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]"><div><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="承認・除外・停止の判断理由（監査ログに保存）" maxLength={500} /><p className="mt-1 text-xs text-slate-500">選択中 {selected.size}/{MAX_REVIEW_ITEMS}件</p></div><div className="flex flex-wrap gap-2"><Button disabled={busy || selected.size === 0} onClick={() => void review("approve")}><CheckCircle2 className="h-4 w-4" />選択をTwenty同期</Button><Button disabled={busy || selected.size === 0} variant="outline" onClick={() => void review("reject")}><XCircle className="h-4 w-4" />選択を除外</Button></div></div>
      {reviewStatus === "pending" && total > 0 && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm text-emerald-950">高確度条件を再検証し、合格候補だけを20件ずつ継続同期します。文面・レポート・フォーム送信は起動しません。</p><Button className="mt-3" disabled={busy} onClick={() => void syncHighConfidence()}><Sparkles className="h-4 w-4" />高確度合格のみ連続Twenty同期</Button></div>}
      {run?.execution_mode === "pilot" && run.operator_status !== "approved_for_scale" && ["completed", "partial"].includes(run.status) && <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><p className="text-sm text-indigo-950">候補品質・フォーム合格率・エラーを確認後、同じ収集元を量産モードで使用可能にします。</p><Button className="mt-3" variant="outline" disabled={busy} onClick={() => void approvePilot()}><ShieldCheck className="h-4 w-4" />パイロットを量産承認</Button></div>}
      {reviewStatus === "promoting" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm text-amber-950">15分以上停止した同期だけを「同期失敗」へ戻します。Twenty上の実在を確認してから再承認してください。</p><Button className="mt-3" variant="outline" disabled={busy} onClick={() => void recoverStalePromotions()}><RotateCcw className="h-4 w-4" />停止した同期を復旧</Button></div>}
      {run && ["queued", "running", "partial", "failed"].includes(run.status) && <Button variant="outline" disabled={busy} onClick={() => void cancelRun()} className="border-red-300 text-red-800"><StopCircle className="h-4 w-4" />このランを停止</Button>}
      {loading ? <p className="py-10 text-center text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />候補を読み込み中...</p> : error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : items.length === 0 ? <p className="rounded-xl bg-slate-100 p-5 text-sm text-slate-600">この状態の候補はありません。</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="p-3"><input type="checkbox" aria-label="表示中の承認待ち候補から最大20件を選択" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(selectablePageIds))} /></th><th className="p-3">Company</th><th className="p-3">Evidence</th><th className="p-3">Score</th><th className="p-3">Verified form</th><th className="p-3">Review</th><th className="p-3">Twenty</th></tr></thead><tbody>{items.map((item) => {
        const selectable = ["pending", "promotion_failed"].includes(item.review_status) && item.status === "awaiting_review"
        const aiConfidence = aiReviewConfidence(item.quality_gate)
        return <tr key={item.id} className="border-b last:border-0"><td className="p-3"><input type="checkbox" aria-label={`${item.company_name ?? item.domain}を選択`} disabled={!selectable} checked={selected.has(item.id)} onChange={() => toggleItem(item.id)} /></td><td className="p-3"><p className="font-medium">{item.company_name ?? "企業名未確認"}</p><a href={`https://${item.domain}`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-700 underline">{item.domain}<ExternalLink className="ml-1 inline h-3 w-3" /></a></td><td className="p-3">{item.source_page_url ? <a href={item.source_page_url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline">収集元を確認</a> : "-"}{aiConfidence !== null && <Badge className="ml-2" variant="outline">V4 {Math.round(aiConfidence * 100)}%</Badge>}<p className="mt-1 max-w-64 text-xs text-slate-500">{item.quality_reasons.join(", ")}</p></td><td className="p-3">{item.opportunity_score ?? "-"}</td><td className="p-3">{item.form_url ? <a href={item.form_url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline">フォームを確認</a> : item.form_qualification_reason ?? "-"}<p className="mt-1 text-xs text-slate-500">{item.form_confidence ?? "-"} / {item.form_method ?? "-"}</p></td><td className="p-3"><Badge variant={item.review_status === "approved" ? "default" : item.review_status === "promotion_failed" ? "destructive" : "outline"}>{item.review_status}</Badge>{item.promotion_error && <p className="mt-1 max-w-64 text-xs text-red-700">{item.promotion_error}</p>}</td><td className="p-3">{item.twenty_synced ? "同期済み" : "未同期"}</td></tr>
      })}</tbody></table></div>}
      <div className="flex items-center justify-between text-sm text-slate-600"><span>{total}件中 {(page - 1) * 100 + (items.length > 0 ? 1 : 0)}–{Math.min(page * 100, total)}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>前へ</Button><Button size="sm" variant="outline" disabled={page * 100 >= total || loading} onClick={() => setPage((value) => value + 1)}>次へ</Button></div></div>
      <div className="rounded-xl border bg-slate-50 p-4"><p className="mb-3 text-sm font-medium text-slate-900">直近の操作監査ログ</p>{operatorEvents.length === 0 ? <p className="text-sm text-slate-500">このランの操作履歴はまだありません。</p> : <ul className="space-y-2">{operatorEvents.slice(0, 10).map((event) => <li key={event.id} className="flex flex-wrap justify-between gap-2 text-xs text-slate-600"><span><span className="font-medium text-slate-900">{event.action}</span> · {event.operator_name}</span><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString("ja-JP")}</time></li>)}</ul>}</div>
    </CardContent>
  </Card>
}
