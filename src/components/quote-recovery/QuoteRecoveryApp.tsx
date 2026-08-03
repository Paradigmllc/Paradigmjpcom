"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Building2, FileClock, FileSpreadsheet, LayoutDashboard, LogOut, Settings, Trash2, Upload, Users } from "lucide-react"
import { toast, Toaster } from "sonner"
import { parseQuoteCsv } from "@/lib/quote-recovery/diagnosis"
import type { QuoteRecoveryDashboardData } from "@/lib/quote-recovery/dashboard"
import type { QuoteRecoveryIdentity } from "@/lib/quote-recovery/auth"
import { QuoteRecoveryBillingPanel } from "./QuoteRecoveryBilling"
import { QuoteRecoveryQuotesPanel, type DashboardQuote } from "./QuoteRecoveryQuotesPanel"
import { QuoteRecoveryImportDialog, type PendingQuoteImport } from "./QuoteRecoveryImportDialog"
import { QuoteRecoveryActivityDialog } from "./QuoteRecoveryActivityDialog"

type Tab = "overview" | "quotes" | "imports" | "team" | "billing"
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

export function QuoteRecoveryApp({ identity, data, initialTab }: { identity: QuoteRecoveryIdentity; data: QuoteRecoveryDashboardData; initialTab: Tab }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<Tab>(initialTab)
  const [busy, setBusy] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<DashboardQuote | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<DashboardMember | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingQuoteImport | null>(null)

  function changeTab(next: Tab) {
    setTab(next)
    window.history.replaceState(null, "", `/ja/quote-recovery/app?tab=${next}`)
  }

  async function logout() {
    await fetch("/api/quote-recovery/auth/logout", { method: "POST" })
    window.location.assign("/ja/quote-recovery/login")
  }

  async function prepareImport(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv") || file.size > 1_000_000) {
      toast.error("1MB以下のCSVファイルを選択してください")
      return
    }
    try {
      const parsed = parseQuoteCsv(await decodeCsv(file))
      if (parsed.rows.length === 0) throw new Error(parsed.failures[0]?.message ?? "有効な見積データがありません")
      setPendingImport({ fileName: file.name, rows: parsed.rows, failures: parsed.failures, detectedHeaders: parsed.detectedHeaders })
    } catch (error) {
      console.error("[quote-recovery/app] import preparation failed:", error)
      toast.error(error instanceof Error ? error.message : "CSVを読み込めませんでした")
    } finally {
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function confirmImport() {
    if (!pendingImport) return
    setBusy(true)
    try {
      const response = await fetch("/api/quote-recovery/app/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: pendingImport.fileName, rows: pendingImport.rows }),
      })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(errorMessage(body))
      toast.success(`${pendingImport.rows.length}件の見積を保存しました`)
      setPendingImport(null)
      changeTab("quotes")
      router.refresh()
    } catch (error) {
      console.error("[quote-recovery/app] import failed:", error)
      toast.error(error instanceof Error ? error.message : "CSV取込に失敗しました")
    } finally {
      setBusy(false)
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
      if ("emailSent" in body && body.emailSent === true) toast.success("招待メールを送信しました")
      else {
        await navigator.clipboard.writeText(body.invitationUrl)
        toast.warning("メール送信に失敗したため、招待URLをコピーしました")
      }
      event.currentTarget.reset()
    } catch (error) {
      console.error("[quote-recovery/app] invite failed:", error)
      toast.error(error instanceof Error ? error.message : "招待を作成できませんでした")
    } finally {
      setBusy(false)
    }
  }

  async function markNotificationRead(notificationId: string) {
    try {
      const response = await fetch(`/api/quote-recovery/app/notifications/${notificationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(errorMessage(body))
      router.refresh()
    } catch (error) {
      console.error("[quote-recovery/app] notification update failed:", error)
      toast.error(error instanceof Error ? error.message : "通知を更新できませんでした")
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 pb-20 text-slate-950">
      <Toaster richColors position="top-center" />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
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
          {tab === "overview" && <Overview data={data} onImport={() => inputRef.current?.click()} onNotificationRead={(id) => void markNotificationRead(id)} onQuoteActivity={setSelectedQuote} busy={busy} />}
          {tab === "quotes" && <QuoteRecoveryQuotesPanel quotes={data.quotes} onActivity={setSelectedQuote} />}
          {tab === "imports" && <Imports data={data} onImport={() => inputRef.current?.click()} busy={busy} />}
          {tab === "team" && <Team identity={identity} data={data} onInvite={invite} onRoleChange={(member, role) => void updateMemberRole(member, role)} onRemove={setPendingRemoval} busy={busy} />}
          {tab === "billing" && <QuoteRecoveryBillingPanel plan={identity.organization.plan} status={identity.organization.subscriptionStatus} currentPeriodEnd={identity.organization.currentPeriodEnd} cancelAtPeriodEnd={identity.organization.cancelAtPeriodEnd} />}
        </main>
      </div>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="見積CSVを選択" onChange={(event) => { const file = event.target.files?.[0]; if (file) void prepareImport(file) }} />
      {pendingImport && <QuoteRecoveryImportDialog pending={pendingImport} busy={busy} onCancel={() => setPendingImport(null)} onConfirm={() => void confirmImport()} />}
      {selectedQuote && <QuoteRecoveryActivityDialog quote={selectedQuote} members={data.members} busy={busy} onClose={() => setSelectedQuote(null)} onSubmit={updateQuote} />}
      {pendingRemoval && <RemoveMemberDialog member={pendingRemoval} busy={busy} onClose={() => setPendingRemoval(null)} onConfirm={() => void removeMember()} />}
    </div>
  )
}

function Overview({ data, onImport, onNotificationRead, onQuoteActivity, busy }: { data: QuoteRecoveryDashboardData; onImport: () => void; onNotificationRead: (id: string) => void; onQuoteActivity: (quote: DashboardQuote) => void; busy: boolean }) {
  const cards = [["進行中の見積", `${data.metrics.totalQuotes}件`, yen(data.metrics.openAmount)], ["回収優先金額", yen(data.metrics.staleAmount), `${data.metrics.urgentCount}件が緊急`], ["次回予定なし", `${data.metrics.missingNextAction}件`, "フォロー漏れ候補"], ["今月の取込", `${data.usage.quoteRows}件`, `${data.usage.importCount}回`]]
  return <div><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">DASHBOARD</p><h2 className="mt-2 text-3xl font-bold tracking-tight">回収状況</h2></div><button type="button" onClick={onImport} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"><Upload className="size-4" />{busy ? "取込中…" : "見積CSVを取り込む"}</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, note]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-2 text-xs text-slate-500">{note}</p></article>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]"><QuoteRecoveryQuotesPanel quotes={data.quotes.slice(0, 8)} onActivity={onQuoteActivity} compact /><Notifications data={data} onRead={onNotificationRead} /></div></div>
}

function Imports({ data, onImport, busy }: { data: QuoteRecoveryDashboardData; onImport: () => void; busy: boolean }) { return <section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">CSV取込履歴</h2><p className="mt-1 text-sm text-slate-500">同じ見積番号は最新内容で更新されます。</p></div><button type="button" onClick={onImport} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white"><Upload className="size-4" />追加取込</button></div><div className="mt-6 divide-y divide-slate-100">{data.imports.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">取込履歴はありません。</p> : data.imports.map((item) => <div key={item.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-semibold">{item.fileName}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("ja-JP")}</p></div><p className="text-sm text-slate-600">{item.importedRows}件</p><p className="text-sm font-bold text-rose-700">放置 {yen(item.staleAmount)}</p></div>)}</div></section> }

function Team({ identity, data, onInvite, onRoleChange, onRemove, busy }: { identity: QuoteRecoveryIdentity; data: QuoteRecoveryDashboardData; onInvite: (event: React.FormEvent<HTMLFormElement>) => void; onRoleChange: (member: DashboardMember, role: "admin" | "member") => void; onRemove: (member: DashboardMember) => void; busy: boolean }) { const canManage = identity.role === "owner" || identity.role === "admin"; return <div className="grid gap-6 xl:grid-cols-[1fr_360px]"><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">チームメンバー</h2><p className="mt-1 text-sm text-slate-500">{data.members.length} / {identity.organization.seatLimit}名</p><div className="mt-6 divide-y divide-slate-100">{data.members.map((member) => { const manageable = canManage && member.role !== "owner" && member.userId !== identity.user.id && (identity.role === "owner" || member.role !== "admin"); return <div key={member.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{member.displayName}</p><p className="text-xs text-slate-500">{member.email}</p></div><div className="flex items-center gap-2">{manageable ? <select aria-label={`${member.displayName}の権限`} value={member.role} disabled={busy} onChange={(event) => onRoleChange(member, event.target.value as "admin" | "member")} className="h-9 rounded-lg border border-slate-300 px-2 text-xs font-bold"><option value="member">メンバー</option>{identity.role === "owner" && <option value="admin">管理者</option>}</select> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{member.role}</span>}{manageable && <button type="button" aria-label={`${member.displayName}を削除`} onClick={() => onRemove(member)} className="inline-flex size-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"><Trash2 className="size-4" /></button>}</div></div> })}</div></section>{canManage && <form onSubmit={onInvite} className="h-fit rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">メンバーを招待</h2><p className="mt-1 text-xs leading-5 text-slate-500">7日間有効な登録リンクをメールで送信します。送信できない場合のみURLをコピーします。</p><label className="mt-5 block text-xs font-bold text-slate-600">メール<input className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" name="email" type="email" required /></label><label className="mt-4 block text-xs font-bold text-slate-600">権限<select className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" name="role"><option value="member">メンバー</option>{identity.role === "owner" && <option value="admin">管理者</option>}</select></label><button type="submit" disabled={busy} className="mt-5 min-h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-60">招待メールを送信</button></form>}</div> }

function Notifications({ data, onRead }: { data: QuoteRecoveryDashboardData; onRead: (id: string) => void }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Bell className="size-4 text-violet-600" /><h2 className="font-bold">通知</h2>{data.notifications.some((item) => !item.readAt) && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">未読あり</span>}</div><div className="mt-4 space-y-3">{data.notifications.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">通知はありません。</p> : data.notifications.slice(0, 6).map((item) => <button type="button" key={item.id} onClick={() => { if (!item.readAt) onRead(item.id) }} className={`block w-full rounded-xl p-3 text-left ${item.readAt ? "bg-white" : "bg-violet-50"}`}><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.message}</p>{!item.readAt && <span className="mt-2 inline-block text-[11px] font-bold text-violet-700">クリックして既読</span>}</button>)}</div></section> }

function RemoveMemberDialog({ member, busy, onClose, onConfirm }: { member: DashboardMember; busy: boolean; onClose: () => void; onConfirm: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5" role="dialog" aria-modal="true" aria-labelledby="remove-member-title"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="remove-member-title" className="text-xl font-bold">メンバーを削除しますか？</h2><p className="mt-3 text-sm leading-6 text-slate-600">{member.displayName}（{member.email}）は直ちにログアウトされ、この組織へアクセスできなくなります。</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold">キャンセル</button><button type="button" onClick={onConfirm} disabled={busy} className="min-h-10 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white disabled:opacity-60">削除する</button></div></div></div> }

export function quoteRecoveryTab(value: string | undefined): Tab { return tabs.some((tab) => tab.id === value) ? value as Tab : "overview" }
