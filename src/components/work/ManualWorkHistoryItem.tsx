"use client"

import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, CircleAlert, ExternalLink, LoaderCircle, Mail, RefreshCw, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MANUAL_OUTREACH_PLAYBOOK_LABELS } from "@/lib/sales/manual-japan-entry-playbook"
import type { ManualLeadSourceCatalogRow } from "@/lib/sales/manual-japan-entry-source-ledger"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import { manualWorkOperatorNotice } from "@/lib/sales/manual-work-operator-notice"
import { isManualWorkRecoveryAvailable } from "@/lib/sales/manual-work-recovery-policy"
import { ManualMessageIntelligence } from "./ManualMessageIntelligence"

export type ManualWorkOutcome = "manually_sent" | "reply_received" | "founder_forwarded" | "meeting_converted"

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function firstString(value: unknown): string | null {
  return Array.isArray(value) ? value.find((item): item is string => typeof item === "string" && Boolean(item.trim())) ?? null : null
}

function hasOutcome(item: ManualJapanEntryWorkRow): boolean {
  return Boolean(item.manually_sent_at || item.reply_received_at || item.founder_forwarded_at || item.meeting_converted_at)
}

function analysisMode(item: ManualJapanEntryWorkRow): string {
  return typeof item.evidence.analysis_mode === "string" ? item.evidence.analysis_mode : ""
}

function isFast(item: ManualJapanEntryWorkRow): boolean {
  return analysisMode(item) === "fast_qualification"
}

function isBriefReady(item: ManualJapanEntryWorkRow): boolean {
  return analysisMode(item) === "chatgpt_brief_ready"
}

function isImported(item: ManualJapanEntryWorkRow): boolean {
  return analysisMode(item) === "chatgpt_manual_import"
    || item.message_review.generation_status === "imported_chatgpt_pro"
}

function isLegacyUnsent(item: ManualJapanEntryWorkRow): boolean {
  return !isFast(item) && !isBriefReady(item) && !isImported(item) && !hasOutcome(item)
}

function fastPriority(item: ManualJapanEntryWorkRow): "promote" | "review" | "low" | null {
  const qualification = record(item.evidence.fastQualification)
  if (qualification.priority === "promote" || qualification.priority === "review" || qualification.priority === "low") return qualification.priority
  return null
}

function generationActionLabel(item: ManualJapanEntryWorkRow): string {
  if (isFast(item)) return fastPriority(item) === "low" ? "ブリーフを再評価" : "ChatGPTブリーフを準備"
  if (isBriefReady(item)) return "ブリーフを更新"
  if (isImported(item)) return "ブリーフを再準備"
  return "APIなしで作り直す"
}

function statusLabel(item: ManualJapanEntryWorkRow): string {
  if (item.status === "processing") return item.stage === "fetching" ? "ブリーフ準備中" : "解析中"
  if (isFast(item)) {
    if (item.is_japanese_company || fastPriority(item) === "low") return "低優先"
    return fastPriority(item) === "promote" ? "ブリーフ候補" : "一次判定完了"
  }
  if (isBriefReady(item)) {
    return item.message_review.generation_status === "chatgpt_insufficient" ? "ChatGPT根拠不足" : "ChatGPTブリーフ準備完了"
  }
  if (isImported(item)) return "ChatGPT文面取込済み"
  if (isLegacyUnsent(item)) return "旧文面・要更新"
  if (item.status === "completed") return "送信準備完了"
  if (item.status === "needs_review") return "要確認"
  if (item.status === "failed") return "失敗"
  if (item.status === "duplicate") return "統合済み"
  return "対象外"
}

function statusClasses(item: ManualJapanEntryWorkRow): string {
  if (isImported(item)) return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (isBriefReady(item)) return "border-violet-200 bg-violet-50 text-violet-800"
  if (isLegacyUnsent(item)) return "border-amber-200 bg-amber-50 text-amber-800"
  if (isFast(item) && (item.is_japanese_company || fastPriority(item) === "low")) return "border-slate-200 bg-slate-50 text-slate-700"
  if (item.status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (item.status === "failed") return "border-red-200 bg-red-50 text-red-700"
  if (item.status === "rejected") return "border-slate-200 bg-slate-50 text-slate-700"
  if (item.status === "needs_review") return "border-amber-200 bg-amber-50 text-amber-800"
  if (item.status === "processing") return "border-blue-200 bg-blue-50 text-blue-700"
  return "border-slate-200 bg-slate-50 text-slate-600"
}

function contactDetails(item: ManualJapanEntryWorkRow): { contactUrl: string | null; publicEmail: string | null } {
  const editorial = record(item.evidence.editorialBrief)
  const discovery = record(item.form_discovery)
  const contactUrl = text(item.message_review.contact_url)
    ?? text(editorial.contactUrl)
    ?? firstString(discovery.candidates)
  const publicEmail = text(item.message_review.public_email)
    ?? text(editorial.publicEmail)
    ?? text(discovery.publicEmail)
  return {
    contactUrl: contactUrl && /^https:\/\//i.test(contactUrl) ? contactUrl : null,
    publicEmail: publicEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail) ? publicEmail : null,
  }
}

export function formatManualWorkCreatedAt(value: string): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return "日時不明"
  const japanTime = new Date(timestamp + (9 * 60 * 60 * 1_000))
  const date = [japanTime.getUTCFullYear(), japanTime.getUTCMonth() + 1, japanTime.getUTCDate()].join("/")
  const time = [japanTime.getUTCHours(), japanTime.getUTCMinutes(), japanTime.getUTCSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":")
  return `${date} ${time}`
}

export function ManualWorkHistoryItem({ item, sourceBySlug, updatingOutcome, retrying, onRetry, onCopy, onUpdateOutcome }: {
  item: ManualJapanEntryWorkRow
  sourceBySlug: Map<string, ManualLeadSourceCatalogRow>
  updatingOutcome: string | null
  retrying: boolean
  onRetry: (item: ManualJapanEntryWorkRow) => void
  onCopy: (value: string, label: string) => void
  onUpdateOutcome: (item: ManualJapanEntryWorkRow, outcome: ManualWorkOutcome, value: boolean) => void
}) {
  const retryable = isManualWorkRecoveryAvailable(item)
  const operatorNotice = manualWorkOperatorNotice(item)
  const fast = isFast(item)
  const briefReady = isBriefReady(item)
  const imported = isImported(item)
  const legacyUnsent = isLegacyUnsent(item)
  const { contactUrl, publicEmail } = contactDetails(item)
  const outcomes = [
    ["manually_sent", "手動送信済み", Boolean(item.manually_sent_at)],
    ["reply_received", "返信あり", Boolean(item.reply_received_at)],
    ["founder_forwarded", "Founder転送あり", Boolean(item.founder_forwarded_at)],
    ["meeting_converted", "商談化", Boolean(item.meeting_converted_at)],
  ] as const

  return (
    <motion.article layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_-38px_rgba(15,23,42,0.55)] transition-shadow hover:shadow-[0_22px_70px_-40px_rgba(15,23,42,0.5)]">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClasses(item)}`}>{statusLabel(item)}</span>
                {(briefReady || imported) && <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">ChatGPT Pro · APIなし</Badge>}
                {legacyUnsent && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">旧AI文面は使用しない</Badge>}
                <span className="text-xs text-slate-600">{formatManualWorkCreatedAt(item.created_at)}</span>
              </div>
              <h3 className="mt-3 truncate font-display text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{item.company_name ?? item.domain}</h3>
              <a href={item.canonical_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-blue-700 hover:underline">{item.domain}<ExternalLink className="size-3.5 shrink-0" /></a>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {retryable && <Button type="button" variant={(fast && fastPriority(item) !== "low") || legacyUnsent ? "default" : "outline"} size="sm" className="rounded-lg" disabled={retrying} onClick={() => onRetry(item)} aria-label={`${item.domain}のChatGPT用ブリーフを準備`}>{retrying ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}{generationActionLabel(item)}</Button>}
              {contactUrl && <Button asChild variant="outline" size="sm" className="rounded-lg"><a href={contactUrl} target="_blank" rel="noopener noreferrer">連絡先<ExternalLink /></a></Button>}
              {publicEmail && <Button asChild variant="outline" size="sm" className="rounded-lg"><a href={`mailto:${publicEmail}`}><Mail />メール</a></Button>}
              {item.report_url && hasOutcome(item) && <Button asChild variant="outline" size="sm" className="rounded-lg"><a href={item.report_url} target="_blank" rel="noopener noreferrer">旧レポート<ExternalLink /></a></Button>}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">{MANUAL_OUTREACH_PLAYBOOK_LABELS[item.outreach_playbook]}</Badge>
            {item.source_attributions.map((source) => <Badge key={source.id} variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{sourceBySlug.get(source.source_slug)?.name ?? source.source_slug}</Badge>)}
          </div>

          {operatorNotice && <div className={`mt-5 rounded-xl border px-4 py-3 text-xs leading-5 ${operatorNotice.tone === "red" ? "border-red-200 bg-red-50 text-red-950" : operatorNotice.tone === "slate" ? "border-slate-200 bg-slate-50 text-slate-800" : "border-amber-200 bg-amber-50 text-amber-950"}`} role="status" aria-label={`${operatorNotice.title}の理由`}>
            <p className="font-semibold">{operatorNotice.title}</p>
            <p className="mt-1">{operatorNotice.detail}</p>
            {operatorNotice.reasons.length > 0 && <div className="mt-3 rounded-lg border border-current/15 bg-white/70 p-3"><p className="flex items-center gap-1.5 font-semibold"><CircleAlert className="size-3.5" />根拠</p><ul className="mt-1.5 list-disc space-y-1 pl-5">{operatorNotice.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>}
            <p className="mt-3 flex items-start gap-1.5"><ArrowRight className="mt-0.5 size-3.5 shrink-0" /><span>{operatorNotice.nextAction}</span></p>
          </div>}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Market</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.country_code ?? "未確定"}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Japan fit</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.japan_entry_fit_confidence ?? "—"} / 100</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Contact</p><p className="mt-1 text-sm font-semibold text-slate-800">{contactUrl ? "ページ候補あり" : publicEmail ? "公開メールあり" : "未確認"}</p></div>
          </div>

          <div className="mt-5"><ManualMessageIntelligence item={item} onCopy={onCopy} /></div>
        </div>

        <aside className="border-t border-slate-200 bg-slate-50/80 p-5 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Outcome tracking</p>
          <div className="mt-4 space-y-2">
            {outcomes.map(([outcome, label, active], index) => <button key={outcome} type="button" disabled={updatingOutcome !== null || !item.initial_message || (!imported && !hasOutcome(item)) || (outcome !== "manually_sent" && !item.manually_sent_at)} onClick={() => onUpdateOutcome(item, outcome, !active)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
              <span className={`grid size-6 shrink-0 place-items-center rounded-full ${active ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>{updatingOutcome === `${item.id}:${outcome}` ? <LoaderCircle className="size-3.5 animate-spin" /> : active ? <CheckCircle2 className="size-3.5" /> : <span className="font-mono text-[9px]">{index + 1}</span>}</span>{label}
            </button>)}
          </div>
          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-slate-700"><Send className="size-3.5" />自動送信: なし</p>
            <p className="mt-1">外部AI API: なし</p>
            <p className="mt-1">Twenty: {item.twenty_sync_status}</p>
          </div>
        </aside>
      </div>
    </motion.article>
  )
}
