"use client"

import { useEffect, useState, type FormEvent } from "react"
import { AlertTriangle, CalendarClock, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { deliverySla } from "@/lib/video-growth/workflow"
import type { VideoGrowthWorkOrder } from "@/lib/video-growth/types"

type Props = {
  busy: boolean
  canEdit: boolean
  canEditBilling: boolean
  campaignId: string
  workOrder: VideoGrowthWorkOrder | null
  onAction: (payload: Record<string, unknown>) => Promise<void>
}

function localValue(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function VideoGrowthWorkOrderPanel({ busy, canEdit, canEditBilling, campaignId, workOrder, onAction }: Props) {
  const [form, setForm] = useState(() => ({
    clientName: workOrder?.clientName ?? "", clientContactName: workOrder?.clientContactName ?? "",
    clientContactEmail: workOrder?.clientContactEmail ?? "", plan: workOrder?.plan ?? "growth",
    monthlyVideoQuota: workOrder?.monthlyVideoQuota ?? 8, billingStatus: workOrder?.billingStatus ?? "contracted",
    workStatus: workOrder?.workStatus ?? "intake", priority: workOrder?.priority ?? "normal",
    timezone: workOrder?.timezone ?? "Asia/Tokyo", languages: workOrder?.languages.join(",") ?? "ja",
    contractReference: workOrder?.contractReference ?? "", purchaseOrderReference: workOrder?.purchaseOrderReference ?? "",
    deliveryOwner: workOrder?.deliveryOwner ?? "", clientApprover: workOrder?.clientApprover ?? "",
    kickoffAt: localValue(workOrder?.kickoffAt ?? null), deliveryDueAt: localValue(workOrder?.deliveryDueAt ?? null),
    note: "",
  }))
  useEffect(() => {
    if (!workOrder) return
    setForm({
      clientName: workOrder.clientName, clientContactName: workOrder.clientContactName ?? "",
      clientContactEmail: workOrder.clientContactEmail ?? "", plan: workOrder.plan,
      monthlyVideoQuota: workOrder.monthlyVideoQuota, billingStatus: workOrder.billingStatus,
      workStatus: workOrder.workStatus, priority: workOrder.priority, timezone: workOrder.timezone,
      languages: workOrder.languages.join(","), contractReference: workOrder.contractReference ?? "",
      purchaseOrderReference: workOrder.purchaseOrderReference ?? "", deliveryOwner: workOrder.deliveryOwner,
      clientApprover: workOrder.clientApprover ?? "", kickoffAt: localValue(workOrder.kickoffAt),
      deliveryDueAt: localValue(workOrder.deliveryDueAt), note: "",
    })
  }, [workOrder])

  if (!workOrder) {
    return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertTriangle className="mr-2 inline h-4 w-4" />商用ワークオーダーがありません。旧形式の案件は新規作成し直してください。</div>
  }
  const sla = deliverySla(workOrder)
  const slaLabel = { missing: "納期未設定", overdue: "納期超過", due_soon: "48時間以内", on_track: "SLA内", done: "納品済み" }[sla]
  const set = (key: keyof typeof form, value: string | number) => setForm((current) => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onAction({
      target: "work_order", action: "update", campaignId, expectedRevision: workOrder.revision,
      ...form, languages: form.languages.split(",").map((item) => item.trim()).filter(Boolean),
      kickoffAt: form.kickoffAt ? new Date(form.kickoffAt).toISOString() : "",
      deliveryDueAt: new Date(form.deliveryDueAt).toISOString(),
      note: form.note.trim() || "商用ワークオーダーを更新",
    })
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-sm font-black text-zinc-950">商用ワークオーダー</h3><p className="mt-1 text-xs text-zinc-500">{workOrder.clientName} · {workOrder.plan} · 月{workOrder.monthlyVideoQuota}本</p></div>
        <div className="flex gap-2"><Badge variant="outline">{workOrder.billingStatus}</Badge><Badge className={sla === "overdue" ? "bg-rose-700" : sla === "due_soon" ? "bg-amber-600" : "bg-emerald-700"}><CalendarClock className="mr-1 h-3 w-3" />{slaLabel}</Badge></div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-white p-3">
        <div className="min-w-48 flex-1 space-y-1"><Label htmlFor={`${campaignId}-billing-quick`} className="text-xs">請求・入金ステータス</Label><select id={`${campaignId}-billing-quick`} className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm" value={form.billingStatus} onChange={(event) => set("billingStatus", event.target.value)} disabled={!canEditBilling}>{["trial", "contracted", "invoiced", "paid", "overdue", "cancelled"].map((item) => <option key={item}>{item}</option>)}</select></div>
        <Button variant="outline" disabled={busy || !canEditBilling || form.billingStatus === workOrder.billingStatus} onClick={() => onAction({ target: "billing", action: "update", campaignId, expectedRevision: workOrder.revision, billingStatus: form.billingStatus, note: form.note.trim() || "請求状態を更新" })}><Save className="mr-2 h-4 w-4" />請求状態を保存</Button>
      </div>
      <details className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-800">契約・請求・納期情報を編集</summary>
        <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-client`}>顧客名</Label><Input id={`${campaignId}-client`} value={form.clientName} onChange={(event) => set("clientName", event.target.value)} required /></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-contact`}>顧客担当者</Label><Input id={`${campaignId}-contact`} value={form.clientContactName} onChange={(event) => set("clientContactName", event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-email`}>連絡先メール</Label><Input id={`${campaignId}-email`} type="email" value={form.clientContactEmail} onChange={(event) => set("clientContactEmail", event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-approver`}>顧客承認者</Label><Input id={`${campaignId}-approver`} value={form.clientApprover} onChange={(event) => set("clientApprover", event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-plan`}>プラン</Label><select id={`${campaignId}-plan`} className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm" value={form.plan} onChange={(event) => set("plan", event.target.value)}>{["essential", "growth", "scale", "custom"].map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-quota`}>月次枠</Label><Input id={`${campaignId}-quota`} type="number" min={1} max={100} value={form.monthlyVideoQuota} onChange={(event) => set("monthlyVideoQuota", Number(event.target.value))} /></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-billing`}>請求状態</Label><select id={`${campaignId}-billing`} className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm" value={form.billingStatus} onChange={(event) => set("billingStatus", event.target.value)}>{["trial", "contracted", "invoiced", "paid", "overdue", "cancelled"].map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-status`}>制作工程</Label><select id={`${campaignId}-status`} className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm" value={form.workStatus} onChange={(event) => set("workStatus", event.target.value)}>{["intake", "production", "internal_review", "client_review", "revision", "ready", "delivered", "on_hold", "closed"].map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-priority`}>優先度</Label><select id={`${campaignId}-priority`} className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm" value={form.priority} onChange={(event) => set("priority", event.target.value)}>{["normal", "high", "urgent"].map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-owner`}>制作責任者</Label><Input id={`${campaignId}-owner`} value={form.deliveryOwner} onChange={(event) => set("deliveryOwner", event.target.value)} required /></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-languages`}>言語</Label><Input id={`${campaignId}-languages`} value={form.languages} onChange={(event) => set("languages", event.target.value)} required /></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-timezone`}>タイムゾーン</Label><Input id={`${campaignId}-timezone`} value={form.timezone} onChange={(event) => set("timezone", event.target.value)} required /></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-contract`}>契約参照</Label><Input id={`${campaignId}-contract`} value={form.contractReference} onChange={(event) => set("contractReference", event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-po`}>発注番号</Label><Input id={`${campaignId}-po`} value={form.purchaseOrderReference} onChange={(event) => set("purchaseOrderReference", event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-kickoff`}>開始</Label><Input id={`${campaignId}-kickoff`} type="datetime-local" value={form.kickoffAt} onChange={(event) => set("kickoffAt", event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor={`${campaignId}-due`}>納期</Label><Input id={`${campaignId}-due`} type="datetime-local" value={form.deliveryDueAt} onChange={(event) => set("deliveryDueAt", event.target.value)} required /></div>
          <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label htmlFor={`${campaignId}-work-note`}>変更理由</Label><Textarea id={`${campaignId}-work-note`} rows={2} value={form.note} onChange={(event) => set("note", event.target.value)} /></div>
          <Button className="md:col-span-2 xl:col-span-4" type="submit" disabled={busy || !canEdit || !form.deliveryDueAt}><Save className="mr-2 h-4 w-4" />{canEdit ? "ワークオーダーを保存" : "閲覧権限のみ"}</Button>
        </form>
      </details>
    </section>
  )
}
