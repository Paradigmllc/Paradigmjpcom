"use client"

import { useEffect, useState } from "react"
import { History, LoaderCircle } from "lucide-react"
import type { QuoteRecoveryDashboardData } from "@/lib/quote-recovery/dashboard"

type DashboardQuote = QuoteRecoveryDashboardData["quotes"][number]
type DashboardMember = QuoteRecoveryDashboardData["members"][number]
type Activity = { id: string; type: string; note: string; occurredAt: string; createdBy: string }

type Props = {
  quote: DashboardQuote
  members: DashboardMember[]
  busy: boolean
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

function activityLabel(type: string): string {
  return ({ call: "電話", email: "メール", meeting: "商談", note: "メモ", next_action: "次回アクション", status_change: "ステータス変更" } as Record<string, string>)[type] ?? type
}

export function QuoteRecoveryActivityDialog({ quote, members, busy, onClose, onSubmit }: Props) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const response = await fetch(`/api/quote-recovery/app/activity?quoteId=${encodeURIComponent(quote.id)}`, { cache: "no-store" })
        const body: unknown = await response.json()
        if (!response.ok || !body || typeof body !== "object" || !("activities" in body) || !Array.isArray(body.activities)) throw new Error("活動履歴を読み込めませんでした")
        if (active) setActivities(body.activities as Activity[])
      } catch (error) {
        console.error("[quote-recovery/activity-dialog] load failed:", error)
        if (active) setActivities([])
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [quote.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="activity-title">
      <form onSubmit={onSubmit} className="my-auto grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[1fr_0.8fr]">
        <div className="p-5 sm:p-6"><h2 id="activity-title" className="text-xl font-bold">案件を更新</h2><p className="mt-1 text-sm text-slate-500">{quote.customerName} / {quote.externalQuoteId}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">ステータス<select name="status" defaultValue={quote.status} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"><option value="open">進行中</option><option value="won">受注</option><option value="lost">失注</option></select></label><label className="block text-sm font-semibold">次回アクション日<input name="nextActionDate" type="date" defaultValue={quote.nextActionDate ?? ""} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label></div><label className="mt-4 block text-sm font-semibold">担当者<select name="ownerName" defaultValue={quote.ownerName ?? ""} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"><option value="">未設定</option>{quote.ownerName && !members.some((member) => member.displayName === quote.ownerName) && <option value={quote.ownerName}>{quote.ownerName}</option>}{members.map((member) => <option key={member.id} value={member.displayName}>{member.displayName}</option>)}</select></label><div className="mt-5 border-t border-slate-100 pt-5"><p className="text-sm font-bold">活動メモ（任意）</p><label className="mt-3 block text-sm font-semibold">種類<select name="activityType" className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"><option value="call">電話</option><option value="email">メール</option><option value="meeting">商談</option><option value="note">メモ</option><option value="next_action">次回アクション</option><option value="status_change">ステータス変更</option></select></label><label className="mt-4 block text-sm font-semibold">内容<textarea name="note" maxLength={4000} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="会話内容や次の対応を記録" /></label></div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold">キャンセル</button><button type="submit" disabled={busy} className="min-h-10 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white disabled:opacity-60">更新する</button></div></div>
        <aside className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6 lg:border-l lg:border-t-0"><div className="flex items-center gap-2"><History className="size-4 text-violet-600" /><h3 className="font-bold">活動タイムライン</h3></div>{loading ? <div className="flex items-center justify-center py-16 text-slate-400"><LoaderCircle className="size-6 animate-spin" aria-label="活動履歴を読み込み中" /></div> : activities.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">活動履歴はまだありません。</p> : <div className="mt-5 space-y-4">{activities.map((activity) => <article key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-violet-700">{activityLabel(activity.type)}</span><time className="text-[11px] text-slate-400">{new Date(activity.occurredAt).toLocaleString("ja-JP")}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{activity.note}</p><p className="mt-2 text-[11px] text-slate-400">{activity.createdBy}</p></article>)}</div>}</aside>
      </form>
    </div>
  )
}
