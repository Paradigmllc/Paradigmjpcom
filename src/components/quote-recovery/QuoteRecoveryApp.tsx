"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Building2, FileClock, FileSpreadsheet, LayoutDashboard, LogOut, MessageSquarePlus, RefreshCw, Settings, Trash2, Upload, Users } from "lucide-react"
import { toast, Toaster } from "sonner"
import { parseQuoteCsv } from "@/lib/quote-recovery/diagnosis"
import type { QuoteRecoveryDashboardData } from "@/lib/quote-recovery/dashboard"
import type { QuoteRecoveryIdentity } from "@/lib/quote-recovery/auth"
import { QuoteRecoveryBillingPanel } from "./QuoteRecoveryBilling"

type Tab = "overview" | "quotes" | "imports" | "team" | "billing"
type DashboardQuote = QuoteRecoveryDashboardData["quotes"][number]
type DashboardMember = QuoteRecoveryDashboardData["members"][number]

const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "概要", icon: LayoutDashboard },
  { id: "quotes", label: "見積案件", icon: FileSpreadsheet },
  { id: "imports", label: "取込履歴", icon: FileClock },
  { id: "team", label: "チーム", icon: Users },
  { id: "billing", label: "請求・設定", icon: Settings },
]

function yen(value: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value)
}

function errorMessage(value: unknown): string {
  return value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error : "処理に失敗しました"
}

async function decodeCsv(file: File): Promise<string> {
  const bytes = await file.arrayBuffer()
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch (error) {
    console.warn("[quote-recovery/app] UTF-8 decode failed; retrying Shift_JIS:", error)
    return new TextDecoder("shift_jis").decode(bytes)
  }
}

function PriorityBadge({ value }: { value: string }) {
  const style = value === "urgent" ? "bg-rose-50 text-rose-700" : value === "high" ? "bg-amber-50 text-amber-700" : value === "closed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
  const label = value === "urgent" ? "緊急" : value === "high" ? "優先" : value === "closed" ? "完了" : "確認"
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{label}</span>
}

export function QuoteRecoveryApp({ identity, data, initialTab }: { identity: QuoteRecoveryIdentity; data: QuoteRecoveryDashboardData; initialTab: Tab }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<Tab>(initialTab)
  const [busy, setBusy] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<DashboardQuote | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<DashboardMember | null>(null)

  function changeTab(next: Tab) {
    setTab(next)
    window.history.replaceState(null, "", `/ja/quote-recovery/app?tab=${next}`)
  }

  async function logout() {
    await fetch("/api/quote-recovery/auth/logout", { method: "POST" })
    window.location.assign("/ja/quote-recovery/login")
  }

  async function importFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv") || file.size > 1_000_000) {
      toast.error("1MB以下のCSVファイルを選択してください")
      return
    }
    setBusy(true)
    try {
      const parsed = parseQuoteCsv(await decodeCsv(file))
      if (parsed.rows.length === 0) throw new Error(parsed.failures[0]?.message ?? "有効な見積データがありません")
      const response = await fetch("/api/quote-recovery/app/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, rows: parsed.rows }),
      })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(errorMessage(body))
      toast.success(`${parsed.rows.length}件の見積を保存しました`)
      changeTab("quotes")
      router.refresh()
    } catch (error) {
      console.error("[quote-recovery/app] import failed:", error)
      toast.error(error instanceof Error ? error.message : "CSV取込に失敗しました")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function updateQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedQuote) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    try {
      const response = await fetch(`/api/quote-recovery/app/quotes/${selectedQuote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: String(form.get("ownerName") ?? "").trim() || null,
          nextActionDate: String(form.get("nextActionDate") ?? "") || null,
          status: form.get("status"),
          activityType: form.get("activityType"),
          note: String(form.get("note") ?? "").trim() || undefined,
        }),
      })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(errorMessage(body))
      toast.success("案件を更新しました")
      setSelectedQuote(null)
      router.refresh()
    } catch (error) {
      console.error("[quote-recovery/app] quote update failed:", error)
      toast.error(error instanceof Error ? error.message : "保存に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  async function updateMemberRole(member: DashboardMember, role: "admin" | "member") {
    setBusy(true)
    try {
      const response = await fetch(`/api/quote-recovery/app/members/${member.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(errorMessage(body))
      toast.success("メンバー権限を更新しました")
      router.refresh()
    } catch (error) {
      console.error("[quote-recovery/app] member role update failed:", error)
      toast.error(error instanceof Error ? error.message : "権限を変更できませんでした")
    } finally {
      setBusy(false)
    }
  }

  async function removeMember() {
    if (!pendingRemoval) return
    setBusy(true)
    try {
      const response = await fetch(`/api/quote-recovery/app/members/${pendingRemoval.id}`, { method: "DELETE" })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(errorMessage(body))
      toast.success("メンバーを削除しました")
      setPendingRemoval(null)
      router.refresh()
    } catch (error) {
      console.error("[quote-recovery/app] member delete failed:", error)
      toast.error(error instanceof Error ? error.message : "メンバーを削除できませんでした")
    } finally {
      setBusy(false)
    }
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    try {
      const response = await fetch("/api/quote-recovery/app/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), role: form.get("role") }),
      })
      const body: unknown = await response.json()
      if (!response.ok || !body || typeof body !== "object" || !("invitationUrl" in body) || typeof body.invitationUrl !== "string") throw new Error(errorMessage(body))
      await navigator.clipboard.writeText(body.invitationUrl)
      toast.success("招待URLをコピーしました")
      event.currentTarget.reset()
    } catch (error) {
      console.error("[quote-recovery/app] invite failed:", error)
      toast.error(error instanceof Error ? error.message : "招待を作成できませんでした")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 pb-20 pt-24 text-slate-950">
      <Toaster richColors position="top-center" />
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Building2 /></span><div><p className="text-xs font-semibold text-slate-500">Quote Recovery</p><h1 className="text-lg font-bold">{identity.organization.name}</h1></div></div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{identity.organization.plan === "team" ? "Team" : "Starter"}・契約中</span>
            <button type="button" onClick={() => void logout()} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"><LogOut className="size-4" />ログアウト</button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 lg:sticky lg:top-24">
          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-5 lg:grid-cols-1" aria-label="Quote Recoveryメニュー">
            {tabs.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => changeTab(item.id)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${tab === item.id ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}><Icon className="size-4" />{item.label}</button> })}
          </nav>
          <div className="mt-3 border-t border-slate-100 p-3 text-xs leading-5 text-slate-500"><p className="font-bold text-slate-700">今月の利用量</p><p className="mt-1">{data.usage.quoteRows.toLocaleString("ja-JP")} / {identity.organization.monthlyQuoteLimit.toLocaleString("ja-JP")}件</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(100, data.usage.quoteRows / identity.organization.monthlyQuoteLimit * 100)}%` }} /></div></div>
        </aside>
        <main>
          {tab === "overview" && <Overview data={data} onImport={() => inputRef.current?.click()} busy={busy} />}
          {tab === "quotes" && <Quotes data={data} onActivity={setSelectedQuote} />}
          {tab === "imports" && <Imports data={data} onImport={() => inputRef.current?.click()} busy={busy} />}
          {tab === "team" && <Team identity={identity} data={data} onInvite={invite} onRoleChange={(member, role) => void updateMemberRole(member, role)} onRemove={setPendingRemoval} busy={busy} />}
          {tab === "billing" && <QuoteRecoveryBillingPanel plan={identity.organization.plan} status={identity.organization.subscriptionStatus} currentPeriodEnd={identity.organization.currentPeriodEnd} cancelAtPeriodEnd={identity.organization.cancelAtPeriodEnd} />}
        </main>
      </div>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="見積CSVを選択" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file) }} />
      {selectedQuote && <ActivityModal quote={selectedQuote} busy={busy} onClose={() => setSelectedQuote(null)} onSubmit={updateQuote} />}
      {pendingRemoval && <RemoveMemberDialog member={pendingRemoval} busy={busy} onClose={() => setPendingRemoval(null)} onConfirm={() => void removeMember()} />}
    </div>
  )
}

function Overview({ data, onImport, busy }: { data: QuoteRecoveryDashboardData; onImport: () => void; busy: boolean }) {
  const cards = [["進行中の見積", `${data.metrics.totalQuotes}件`, yen(data.metrics.openAmount)], ["回収優先金額", yen(data.metrics.staleAmount), `${data.metrics.urgentCount}件が緊急`], ["次回予定なし", `${data.metrics.missingNextAction}件`, "フォロー漏れ候補"], ["今月の取込", `${data.usage.quoteRows}件`, `${data.usage.importCount}回`]]
  return <div><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">DASHBOARD</p><h2 className="mt-2 text-3xl font-bold tracking-tight">回収状況</h2></div><button type="button" onClick={onImport} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"><Upload className="size-4" />{busy ? "取込中…" : "見積CSVを取り込む"}</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, note]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-2 text-xs text-slate-500">{note}</p></article>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]"><Quotes data={{ ...data, quotes: data.quotes.slice(0, 8) }} onActivity={() => undefined} compact /><Notifications data={data} /></div></div>
}

function Quotes({ data, onActivity, compact = false }: { data: QuoteRecoveryDashboardData; onActivity: (quote: DashboardQuote) => void; compact?: boolean }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold">優先見積案件</h2><p className="mt-1 text-xs text-slate-500">金額・経過日数・未設定項目から判定</p></div><RefreshCw className="size-4 text-slate-400" /></div>{data.quotes.length === 0 ? <div className="px-6 py-16 text-center text-sm text-slate-500">見積CSVを取り込むと案件が表示されます。</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">優先度</th><th className="px-5 py-3">顧客 / 見積番号</th><th className="px-5 py-3">金額</th><th className="px-5 py-3">次回予定</th><th className="px-5 py-3">理由</th>{!compact && <th className="px-5 py-3">操作</th>}</tr></thead><tbody className="divide-y divide-slate-100">{data.quotes.map((quote) => <tr key={quote.id} className="hover:bg-slate-50"><td className="px-5 py-4"><PriorityBadge value={quote.recoveryPriority} /></td><td className="px-5 py-4"><p className="font-bold">{quote.customerName}</p><p className="mt-1 text-xs text-slate-500">{quote.externalQuoteId}</p></td><td className="px-5 py-4 font-semibold">{yen(quote.amount)}</td><td className="px-5 py-4 text-slate-600">{quote.nextActionDate ?? "未設定"}</td><td className="max-w-xs px-5 py-4 text-xs leading-5 text-slate-600">{quote.recoveryReasons.join(" / ") || "確認済み"}</td>{!compact && <td className="px-5 py-4"><button type="button" onClick={() => onActivity(quote)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold hover:border-violet-300 hover:text-violet-700"><MessageSquarePlus className="size-4" />更新・活動</button></td>}</tr>)}</tbody></table></div>}</section>
}

function Imports({ data, onImport, busy }: { data: QuoteRecoveryDashboardData; onImport: () => void; busy: boolean }) { return <section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">CSV取込履歴</h2><p className="mt-1 text-sm text-slate-500">同じ見積番号は最新内容で更新されます。</p></div><button type="button" onClick={onImport} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white"><Upload className="size-4" />追加取込</button></div><div className="mt-6 divide-y divide-slate-100">{data.imports.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">取込履歴はありません。</p> : data.imports.map((item) => <div key={item.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-semibold">{item.fileName}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("ja-JP")}</p></div><p className="text-sm text-slate-600">{item.importedRows}件</p><p className="text-sm font-bold text-rose-700">放置 {yen(item.staleAmount)}</p></div>)}</div></section> }

function Team({ identity, data, onInvite, onRoleChange, onRemove, busy }: { identity: QuoteRecoveryIdentity; data: QuoteRecoveryDashboardData; onInvite: (event: React.FormEvent<HTMLFormElement>) => void; onRoleChange: (member: DashboardMember, role: "admin" | "member") => void; onRemove: (member: DashboardMember) => void; busy: boolean }) { const canManage = identity.role === "owner" || identity.role === "admin"; return <div className="grid gap-6 xl:grid-cols-[1fr_360px]"><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">チームメンバー</h2><p className="mt-1 text-sm text-slate-500">{data.members.length} / {identity.organization.seatLimit}名</p><div className="mt-6 divide-y divide-slate-100">{data.members.map((member) => { const manageable = canManage && member.role !== "owner" && member.userId !== identity.user.id && (identity.role === "owner" || member.role !== "admin"); return <div key={member.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{member.displayName}</p><p className="text-xs text-slate-500">{member.email}</p></div><div className="flex items-center gap-2">{manageable ? <select aria-label={`${member.displayName}の権限`} value={member.role} disabled={busy} onChange={(event) => onRoleChange(member, event.target.value as "admin" | "member")} className="h-9 rounded-lg border border-slate-300 px-2 text-xs font-bold"><option value="member">メンバー</option>{identity.role === "owner" && <option value="admin">管理者</option>}</select> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{member.role}</span>}{manageable && <button type="button" aria-label={`${member.displayName}を削除`} onClick={() => onRemove(member)} className="inline-flex size-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"><Trash2 className="size-4" /></button>}</div></div> })}</div></section>{canManage && <form onSubmit={onInvite} className="h-fit rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">メンバーを招待</h2><p className="mt-1 text-xs leading-5 text-slate-500">7日間有効な招待URLを発行してコピーします。</p><label className="mt-5 block text-xs font-bold text-slate-600">メール<input className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" name="email" type="email" required /></label><label className="mt-4 block text-xs font-bold text-slate-600">権限<select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" name="role"><option value="member">メンバー</option>{identity.role === "owner" && <option value="admin">管理者</option>}</select></label><button type="submit" disabled={busy} className="mt-5 min-h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-60">招待URLを発行</button></form>}</div> }

function Notifications({ data }: { data: QuoteRecoveryDashboardData }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Bell className="size-4 text-violet-600" /><h2 className="font-bold">通知</h2></div><div className="mt-4 space-y-4">{data.notifications.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">通知はありません。</p> : data.notifications.slice(0, 6).map((item) => <div key={item.id}><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.message}</p></div>)}</div></section> }

function ActivityModal({ quote, busy, onClose, onSubmit }: { quote: DashboardQuote; busy: boolean; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-5" role="dialog" aria-modal="true" aria-labelledby="activity-title"><form onSubmit={onSubmit} className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><h2 id="activity-title" className="text-xl font-bold">案件を更新</h2><p className="mt-1 text-sm text-slate-500">{quote.customerName} / {quote.externalQuoteId}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">ステータス<select name="status" defaultValue={quote.status} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"><option value="open">進行中</option><option value="won">受注</option><option value="lost">失注</option></select></label><label className="block text-sm font-semibold">次回アクション日<input name="nextActionDate" type="date" defaultValue={quote.nextActionDate ?? ""} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label></div><label className="mt-4 block text-sm font-semibold">担当者<input name="ownerName" defaultValue={quote.ownerName ?? ""} maxLength={100} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label><div className="mt-5 border-t border-slate-100 pt-5"><p className="text-sm font-bold">活動メモ（任意）</p><label className="mt-3 block text-sm font-semibold">種類<select name="activityType" className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3"><option value="call">電話</option><option value="email">メール</option><option value="meeting">商談</option><option value="note">メモ</option><option value="next_action">次回アクション</option><option value="status_change">ステータス変更</option></select></label><label className="mt-4 block text-sm font-semibold">内容<textarea name="note" maxLength={4000} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="会話内容や次の対応を記録" /></label></div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold">キャンセル</button><button type="submit" disabled={busy} className="min-h-10 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white disabled:opacity-60">更新する</button></div></form></div> }

function RemoveMemberDialog({ member, busy, onClose, onConfirm }: { member: DashboardMember; busy: boolean; onClose: () => void; onConfirm: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5" role="dialog" aria-modal="true" aria-labelledby="remove-member-title"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="remove-member-title" className="text-xl font-bold">メンバーを削除しますか？</h2><p className="mt-3 text-sm leading-6 text-slate-600">{member.displayName}（{member.email}）は直ちにログアウトされ、この組織へアクセスできなくなります。</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold">キャンセル</button><button type="button" onClick={onConfirm} disabled={busy} className="min-h-10 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white disabled:opacity-60">削除する</button></div></div></div> }

export function quoteRecoveryTab(value: string | undefined): Tab { return tabs.some((tab) => tab.id === value) ? value as Tab : "overview" }
