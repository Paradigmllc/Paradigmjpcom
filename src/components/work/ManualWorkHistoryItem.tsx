"use client"

import { motion } from "framer-motion"
import { Check, CheckCircle2, ExternalLink, FileText, Globe2, LoaderCircle, RefreshCw, Send, Waypoints } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MANUAL_MESSAGE_ANGLE_LABELS } from "@/lib/sales/manual-japan-entry-angle"
import { MANUAL_MESSAGE_VARIANT_LABELS } from "@/lib/sales/manual-japan-entry-experiment"
import { MANUAL_OUTREACH_PLAYBOOK_LABELS, type ManualPositioningConcept } from "@/lib/sales/manual-japan-entry-playbook"
import { MANUAL_SOURCE_ROLE_LABELS, type ManualLeadSourceCatalogRow, type ManualQualificationLedger } from "@/lib/sales/manual-japan-entry-source-ledger"
import { buildManualMarketLens, MANUAL_COMMERCIAL_SIGNAL_LABELS } from "@/lib/sales/manual-japan-entry-market-lens"
import type { ManualCommercialSignal, ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import { ManualMessageIntelligence } from "./ManualMessageIntelligence"
import { ManualFormDiscoveryStatus } from "./ManualFormDiscoveryStatus"
import { manualFormDiscoveryPresentation } from "@/lib/sales/manual-form-discovery-status"
import { manualWorkOperatorNotice } from "@/lib/sales/manual-work-operator-notice"

const statusCopy: Record<ManualJapanEntryWorkRow["status"], string> = {
  processing: "解析中", needs_review: "要確認", completed: "送信準備完了", failed: "失敗", duplicate: "統合済み", rejected: "対象外",
}

const stageCopy: Record<ManualJapanEntryWorkRow["stage"], string> = {
  fetching: "公開ページ取得", classifying: "海外SMB判定", form_discovery: "フォーム探索", copy_generation: "初回文面生成",
  report_generation: "戦略レポート生成", twenty_sync: "Twenty同期", complete: "完了", failed: "失敗",
}

export type ManualWorkOutcome = "manually_sent" | "reply_received" | "founder_forwarded" | "meeting_converted"

function positioningConcept(profile: Record<string, unknown>): ManualPositioningConcept | null {
  const value = profile.positioningConcept
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (typeof record.sourcePhrase !== "string" || typeof record.japaneseHeadline !== "string" || typeof record.japaneseSupportLine !== "string") return null
  return { sourcePhrase: record.sourcePhrase, japaneseHeadline: record.japaneseHeadline, japaneseSupportLine: record.japaneseSupportLine }
}

function commercialSignals(profile: Record<string, unknown>): ManualCommercialSignal[] {
  if (!Array.isArray(profile.commercialSignals)) return []
  return profile.commercialSignals.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return []
    const record = value as Record<string, unknown>
    if (
      typeof record.kind !== "string"
      || !Object.prototype.hasOwnProperty.call(MANUAL_COMMERCIAL_SIGNAL_LABELS, record.kind)
      || typeof record.sourcePhrase !== "string"
      || typeof record.detail !== "string"
    ) return []
    return [{
      kind: record.kind as ManualCommercialSignal["kind"],
      sourcePhrase: record.sourcePhrase,
      detail: record.detail,
    }]
  })
}

function qualificationStages(value: ManualJapanEntryWorkRow["qualification_ledger"]) {
  return Object.entries(value as Partial<ManualQualificationLedger>).filter(
    (entry): entry is [keyof ManualQualificationLedger, ManualQualificationLedger[keyof ManualQualificationLedger]] => Boolean(entry[1]),
  )
}

function statusClasses(status: ManualJapanEntryWorkRow["status"]): string {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "failed" || status === "rejected") return "border-red-200 bg-red-50 text-red-700"
  if (status === "needs_review") return "border-amber-200 bg-amber-50 text-amber-800"
  if (status === "processing") return "border-blue-200 bg-blue-50 text-blue-700"
  return "border-slate-200 bg-slate-50 text-slate-600"
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
  const concept = positioningConcept(item.profile)
  const signals = commercialSignals(item.profile)
  const marketLens = buildManualMarketLens({ countryCode: item.country_code, commercialSignals: signals })
  const stages = qualificationStages(item.qualification_ledger)
  const verifiedStages = stages.filter(([, stage]) => stage.status === "verified").length
  const qualificationProgress = stages.length ? Math.round((verifiedStages / 6) * 100) : 0
  const formPresentation = manualFormDiscoveryPresentation({ formUrl: item.form_url, formDiscovery: item.form_discovery })
  const hasVerifiedForm = formPresentation.state === "verified_form"
  const hasRecordedOutcome = Boolean(item.manually_sent_at || item.reply_received_at || item.founder_forwarded_at || item.meeting_converted_at)
  const retryable = !hasRecordedOutcome && (item.status === "failed" || item.status === "needs_review")
  const operatorNotice = manualWorkOperatorNotice(item)
  const outcomes = [
    ["manually_sent", "手動フォーム送信済み", Boolean(item.manually_sent_at)],
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
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClasses(item.status)}`}>{statusCopy[item.status]}</span>
                {item.status === "processing" && <Badge variant="outline" className="border-blue-200 text-blue-700">{stageCopy[item.stage]}</Badge>}
                <span className="text-xs text-slate-600">{formatManualWorkCreatedAt(item.created_at)}</span>
              </div>
              <h3 className="mt-3 truncate font-display text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{item.company_name ?? item.domain}</h3>
              <a href={item.canonical_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-blue-700 hover:underline">{item.domain}<ExternalLink className="size-3.5 shrink-0" /></a>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {retryable && <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={retrying} onClick={() => onRetry(item)} aria-label={`${item.domain}を再解析・再生成`}>{retrying ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}{hasVerifiedForm ? "再解析・再生成" : "再探索・再生成"}</Button>}
              {hasVerifiedForm && item.form_url && <Button asChild variant="outline" size="sm" className="rounded-lg"><a href={item.form_url} target="_blank" rel="noopener noreferrer">フォーム<ExternalLink /></a></Button>}
              {!hasVerifiedForm && item.stage === "complete" && <Badge variant="outline" className="h-8 border-slate-200 bg-slate-50 px-3 text-slate-700">{formPresentation.label}</Badge>}
              {item.report_url && <Button asChild variant="outline" size="sm" className="rounded-lg"><a href={item.report_url} target="_blank" rel="noopener noreferrer">レポート<ExternalLink /></a></Button>}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{MANUAL_MESSAGE_VARIANT_LABELS[item.message_variant]}</Badge>
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{MANUAL_MESSAGE_ANGLE_LABELS[item.message_angle]}</Badge>
            <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">{MANUAL_OUTREACH_PLAYBOOK_LABELS[item.outreach_playbook]}</Badge>
            {item.source_attributions.map((source) => <Badge key={source.id} variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{sourceBySlug.get(source.source_slug)?.name ?? source.source_slug}</Badge>)}
          </div>

          {(operatorNotice || item.message_variant_fallback_reason || item.message_angle_fallback_reason) && (
            <div className="mt-5 space-y-2">
              {operatorNotice && <div className={`rounded-xl border px-3 py-2 text-xs leading-5 ${operatorNotice.tone === "red" ? "border-red-200 bg-red-50 text-red-900" : operatorNotice.tone === "slate" ? "border-slate-200 bg-slate-50 text-slate-700" : "border-amber-200 bg-amber-50 text-amber-900"}`}><p className="font-semibold">{operatorNotice.title}</p><p>{operatorNotice.detail}</p></div>}
              {item.message_variant_fallback_reason && <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">{item.message_variant_fallback_reason}</p>}
              {item.message_angle_fallback_reason && <p className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs leading-5 text-violet-900">{item.message_angle_fallback_reason}</p>}
            </div>
          )}

          {item.stage === "complete" && <ManualFormDiscoveryStatus item={item} />}

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Market</p><p className="mt-1 text-sm font-semibold text-slate-700">{item.country_code ?? "未確定"} · {marketLens.label}</p><p className="mt-1 text-xs text-slate-600">SMB {item.smb_confidence ?? "—"} / 企業別判断</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Japan entry</p><p className="mt-1 text-sm font-semibold text-slate-700">{item.japan_entry_fit_status ?? "解析中"} · {item.japan_entry_fit_confidence ?? "—"}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Evidence</p><p className="mt-1 text-sm font-semibold text-slate-700">商業根拠 {signals.length}件 · 出典 {item.source_attributions.length}</p><p className="mt-1 text-xs text-slate-600">6段階 {verifiedStages}/6</p></div>
          </div>

          <div className="mt-5 space-y-2">
            {stages.length > 0 && <details className="group rounded-xl border border-slate-200"><summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 marker:hidden"><Waypoints className="size-4 text-slate-500" />営業リード6段階の確認状況<span className="ml-auto text-xs font-normal text-slate-600">{qualificationProgress}%</span></summary><div className="grid gap-2 border-t border-slate-100 p-3 md:grid-cols-2 xl:grid-cols-3">{stages.map(([role, stage]) => <div key={role} className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-700">{MANUAL_SOURCE_ROLE_LABELS[role]}</span>{stage.status === "verified" && <Check className="size-3.5 text-emerald-600" />}</div><p className="mt-1">{stage.evidence[0]}</p></div>)}</div></details>}
            <details className="rounded-xl border border-blue-200 bg-blue-50/40">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-blue-950 marker:hidden"><Globe2 className="size-4" />市場・企業別の優先判断<span className="ml-auto text-xs font-normal text-blue-800">{signals.length > 0 ? `公開根拠 ${signals.length}件` : "要追加確認"}</span></summary>
              <div className="border-t border-blue-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">{marketLens.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{marketLens.rationale}</p>
                {marketLens.focusIndustries.length > 0 && <p className="mt-2 text-xs text-slate-600">重点カテゴリ: {marketLens.focusIndustries.join(" / ")}</p>}
                {signals.length > 0 ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{signals.map((signal) => <div key={`${signal.kind}:${signal.sourcePhrase}`} className="rounded-lg border border-blue-100 bg-white p-3"><p className="text-xs font-semibold text-blue-900">{MANUAL_COMMERCIAL_SIGNAL_LABELS[signal.kind]}</p><p className="mt-1 text-xs leading-5 text-slate-600">公開原文: {signal.sourcePhrase}</p></div>)}</div> : <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">外貨売上・海外顧客・資金調達・Founder-led・従業員規模・海外展開は、取得した公開原文では確認できていません。</p>}
                <p className="mt-3 text-xs font-medium text-slate-600">市場レンズは既存の価格条件を自動変更しません。契約主体・支払能力・意思決定者は人が確認します。</p>
              </div>
            </details>
            {concept && <details className="rounded-xl border border-violet-200 bg-violet-50/50"><summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-violet-900 marker:hidden"><FileText className="size-4" />保存済み日本語ポジショニング案（未公開ドラフト）</summary><div className="border-t border-violet-100 px-4 py-3"><p className="font-semibold text-slate-900">{concept.japaneseHeadline}</p><p className="mt-1 text-sm leading-6 text-slate-600">{concept.japaneseSupportLine}</p><p className="mt-2 text-xs text-slate-600">公開原文: {concept.sourcePhrase}</p></div></details>}
            <ManualMessageIntelligence item={item} onCopy={onCopy} />
          </div>
        </div>

        <aside className="border-t border-slate-200 bg-slate-50/80 p-5 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Outcome tracking</p>
          <div className="mt-4 space-y-2">
            {outcomes.map(([outcome, label, active], index) => <button key={outcome} type="button" disabled={updatingOutcome !== null || (outcome !== "manually_sent" && !item.manually_sent_at)} onClick={() => onUpdateOutcome(item, outcome, !active)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
              <span className={`grid size-6 shrink-0 place-items-center rounded-full ${active ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>{updatingOutcome === `${item.id}:${outcome}` ? <LoaderCircle className="size-3.5 animate-spin" /> : active ? <CheckCircle2 className="size-3.5" /> : <span className="font-mono text-[9px]">{index + 1}</span>}</span>{label}
            </button>)}
          </div>
          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-slate-700"><Send className="size-3.5" />自動送信: なし</p>
            <p className="mt-1">Twenty: {item.twenty_sync_status}</p>
          </div>
        </aside>
      </div>
    </motion.article>
  )
}
