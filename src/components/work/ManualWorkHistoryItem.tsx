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

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []
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

function structuredSummary(item: ManualJapanEntryWorkRow): JsonRecord {
  return record(item.evidence.structuredSummary)
}

function japanPresence(item: ManualJapanEntryWorkRow): { existing: boolean; level: string; signals: string[] } {
  const summary = structuredSummary(item)
  const presence = record(summary.japanPresence)
  const fallback = record(item.message_review.existing_japan_presence)
  const source = Object.keys(presence).length > 0 ? presence : fallback
  return {
    existing: source.existing === true,
    level: text(source.level) ?? "none",
    signals: strings(source.signals),
  }
}

function isFast(item: ManualJapanEntryWorkRow): boolean {
  return analysisMode(item) === "fast_qualification"
}

function isExistingJapanPresence(item: ManualJapanEntryWorkRow): boolean {
  return analysisMode(item) === "existing_japan_presence" || japanPresence(item).existing
}

function isChatGptMode(item: ManualJapanEntryWorkRow): boolean {
  return analysisMode(item).startsWith("chatgpt_")
    || item.message_review.purpose === "chatgpt_handoff"
    || item.message_review.generation_status === "imported_chatgpt_pro"
}

function isBriefReady(item: ManualJapanEntryWorkRow): boolean {
  return analysisMode(item) === "chatgpt_brief_ready"
}

function isImported(item: ManualJapanEntryWorkRow): boolean {
  return analysisMode(item) === "chatgpt_manual_import"
    || item.message_review.generation_status === "imported_chatgpt_pro"
}

function isLegacyUnsent(item: ManualJapanEntryWorkRow): boolean {
  return !isFast(item) && !isChatGptMode(item) && !isExistingJapanPresence(item) && !hasOutcome(item)
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
  if (isChatGptMode(item)) return "ブリーフを再準備"
  return "APIなしで作り直す"
}

function statusLabel(item: ManualJapanEntryWorkRow): string {
  if (item.status === "processing") return item.stage === "fetching" ? "ブリーフ準備中" : "解析中"
  if (isExistingJapanPresence(item)) return "既に日本導線あり・対象外"
  if (isFast(item)) {
    if (item.is_japanese_company || fastPriority(item) === "low") return "低優先"
    return fastPriority(item) === "promote" ? "ブリーフ候補" : "一次判定完了"
  }
  if (isImported(item)) return "ChatGPT文面取込済み"
  if (isBriefReady(item)) {
    return item.message_review.generation_status === "chatgpt_insufficient" ? "ChatGPT根拠不足" : "ChatGPTブリーフ準備完了"
  }
  if (analysisMode(item) === "chatgpt_brief_failed") return "ブリーフ準備失敗"
  if (isLegacyUnsent(item)) return "旧文面・要更新"
  if (item.status === "completed") return "送信準備完了"
  if (item.status === "needs_review") return "要確認"
  if (item.status === "failed") return "失敗"
  if (item.status === "duplicate") return "統合済み"
  return "対象外"
}

function statusClasses(item: ManualJapanEntryWorkRow): string {
  if (isExistingJapanPresence(item)) return "border-slate-300 bg-slate-100 text-slate-800"
  if (isImported(item)) return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (isBriefReady(item)) return "border-violet-200 bg-violet-50 text-violet-800"
  if (analysisMode(item) === "chatgpt_brief_failed") return "border-red-200 bg-red-50 text-red-700"
  if (isLegacyUnsent(item)) return "border-amber-200 bg-amber-50 text-amber-800"
  if (isFast(item) && (item.is_japanese_company || fastPriority(item) === "low")) return "border-slate-200 bg-slate-50 text-slate-700"
  if (item.status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (item.status === "failed") return "border-red-200 bg-red-50 text-red-700"
  if (item.status === "rejected") return "border-slate-200 bg-slate-50 text-slate-700"
  if (item.status === "needs_review") return "border-amber-200 bg-amber-50 text-amber-800"
  if (item.status === "processing") return "border-blue-200 bg-blue-50 text-blue-700"
  return "border-slate-200 bg-slate-50 text-slate-600"
}

function contactDetails(item: ManualJapanEntryWorkRow): { contactUrl: string | null; publicEmail: string | null; formDetected: boolean } {
  const editorial = record(item.evidence.editorialBrief)
  const summary = structuredSummary(item)
  const discovery = record(item.form_discovery)
  const contactUrl = text(item.message_review.contact_url)
    ?? text(summary.contactUrl)
    ?? text(editorial.contactUrl)
    ?? firstString(discovery.candidates)
  const publicEmail = text(item.message_review.public_email)
    ?? text(summary.publicEmail)
    ?? text(editorial.publicEmail)
    ?? text(discovery.publicEmail)
  return {
    contactUrl: contactUrl && /^https:\/\//i.test(contactUrl) ? contactUrl : null,
    publicEmail: publicEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail) ? publicEmail : null,
    formDetected: summary.contactFormDetected === true || item.message_review.contact_form_detected === true || item.form_url !== null,
  }
}

function marketLabel(item: ManualJapanEntryWorkRow): string {
  if (item.country_code) return item.country_code
  const summary = structuredSummary(item)
  const confidence = number(summary.countryConfidence)
  const signals = strings(summary.countrySignals)
  if (signals.length > 0) return confidence ? `未確定・候補根拠 ${confidence}` : "未確定・候補根拠あり"
  return "未確定"
}

function japanStatusLabel(item: ManualJapanEntryWorkRow): string {
  const presence = japanPresence(item)
  if (presence.level === "sales") return "販売・小売導線あり"
  if (presence.level === "support") return "サポート・現地体制あり"
  if (presence.level === "language") return "日本語導線あり"
  return `${item.japan_entry_fit_confidence ?? "—"} / 100`
}

function contactLabel(details: ReturnType<typeof contactDetails>): string {
  if (details.formDetected) return "問い合わせフォーム確認"
  if (details.publicEmail) return "公開メール確認"
  if (details.contactUrl) return "連絡ページ確認"
  return "未確認"
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
  const chatGptMode = isChatGptMode(item)
  const imported = isImported(item)
  const legacyUnsent = isLegacyUnsent(item)
  const existingJapan = isExistingJapanPresence(item)
  const contacts = contactDetails(item)
  const summary = structuredSummary(item)
  const products = strings(summary.productNames)
  const presence = japanPresence(item)
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
                {chatGptMode && !existingJapan && <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">ChatGPT Pro · APIなし</Badge>}
                {legacyUnsent && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">旧AI文面は使用しない</Badge>}
                <span className="text-xs text-slate-600">{formatManualWorkCreatedAt(item.created_at)}</span>
              </div>
              <h3 className="mt-3 truncate font-display text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{item.company_name ?? item.domain}</h3>
              <a href={item.canonical_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-blue-700 hover:underline">{item.domain}<ExternalLink className="size-3.5 shrink-0" /></a>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {retryable && <Button type="button" variant={(fast && fastPriority(item) !== "low") || legacyUnsent ? "default" : "outline"} size="sm" className="rounded-lg" disabled={retrying} onClick={() => onRetry(item)} aria-label={`${item.domain}のChatGPT用ブリーフを準備`}>{retrying ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}{generationActionLabel(item)}</Button>}
              {contacts.contactUrl && <Button asChild variant="outline" size="sm" className="rounded-lg"><a href={contacts.contactUrl} target="_blank" rel="noopener noreferrer">連絡先<ExternalLink /></a></Button>}
              {contacts.publicEmail && <Button asChild variant="outline" size="sm" className="rounded-lg"><a href={`mailto:${contacts.publicEmail}`}><Mail />メール</a></Button>}
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

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Market</p><p className="mt-1 text-sm font-semibold text-slate-800">{marketLabel(item)}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Business</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.business_model ?? "未分類"}{products.length > 0 ? ` · ${products.length}商品` : ""}</p></div>
            <div className={`rounded-xl border p-3 ${existingJapan ? "border-slate-300 bg-slate-100" : "border-slate-200 bg-slate-50"}`}><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Japan status</p><p className="mt-1 text-sm font-semibold text-slate-800">{japanStatusLabel(item)}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Contact</p><p className="mt-1 text-sm font-semibold text-slate-800">{contactLabel(contacts)}</p></div>
          </div>

          {(products.length > 0 || presence.signals.length > 0) && <div className="mt-3 grid gap-3 md:grid-cols-2">
            {products.length > 0 && <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">取得した商品・サービス</p><p className="mt-1 text-xs leading-5 text-slate-700">{products.slice(0, 6).join(" / ")}</p></div>}
            {presence.signals.length > 0 && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">日本導線の公開根拠</p><p className="mt-1 text-xs leading-5 text-slate-700">{presence.signals.slice(0, 3).join(" / ")}</p></div>}
          </div>}

          <div className="mt-5"><ManualMessageIntelligence item={item} onCopy={onCopy} /></div>
        </div>

        <aside className="border-t border-slate-200 bg-slate-50/80 p-5 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Outcome tracking</p>
          <div className="mt-4 space-y-2">
            {outcomes.map(([outcome, label, active], index) => <button key={outcome} type="button" disabled={updatingOutcome !== null || !item.initial_message || existingJapan || (!imported && !hasOutcome(item)) || (outcome !== "manually_sent" && !item.manually_sent_at)} onClick={() => onUpdateOutcome(item, outcome, !active)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
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
