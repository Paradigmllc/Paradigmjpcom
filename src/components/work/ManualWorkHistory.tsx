"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Copy, ExternalLink, LoaderCircle, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MANUAL_MESSAGE_ANGLE_LABELS } from "@/lib/sales/manual-japan-entry-angle"
import { MANUAL_MESSAGE_VARIANT_LABELS } from "@/lib/sales/manual-japan-entry-experiment"
import { MANUAL_OUTREACH_PLAYBOOK_LABELS, type ManualPositioningConcept } from "@/lib/sales/manual-japan-entry-playbook"
import { MANUAL_SOURCE_ROLE_LABELS, type ManualLeadSourceCatalogRow, type ManualQualificationLedger } from "@/lib/sales/manual-japan-entry-source-ledger"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"

const statusCopy: Record<ManualJapanEntryWorkRow["status"], string> = {
  processing: "解析中", needs_review: "要確認", completed: "Twenty追加済み", failed: "失敗", duplicate: "重複", rejected: "対象外",
}

const stageCopy: Record<ManualJapanEntryWorkRow["stage"], string> = {
  fetching: "公開ページ取得", classifying: "海外SMB判定", form_discovery: "フォーム探索", copy_generation: "初回文面生成",
  report_generation: "診断レポート生成", twenty_sync: "Twenty同期", complete: "完了", failed: "失敗",
}

type Outcome = "manually_sent" | "reply_received" | "founder_forwarded" | "meeting_converted"

function badgeVariant(status: ManualJapanEntryWorkRow["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default"
  if (status === "failed" || status === "rejected") return "destructive"
  if (status === "needs_review") return "secondary"
  return "outline"
}

function positioningConcept(profile: Record<string, unknown>): ManualPositioningConcept | null {
  const value = profile.positioningConcept
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (typeof record.sourcePhrase !== "string" || typeof record.japaneseHeadline !== "string" || typeof record.japaneseSupportLine !== "string") return null
  return { sourcePhrase: record.sourcePhrase, japaneseHeadline: record.japaneseHeadline, japaneseSupportLine: record.japaneseSupportLine }
}

function qualificationStages(value: ManualJapanEntryWorkRow["qualification_ledger"]) {
  return Object.entries(value as Partial<ManualQualificationLedger>).filter(
    (entry): entry is [keyof ManualQualificationLedger, ManualQualificationLedger[keyof ManualQualificationLedger]] => Boolean(entry[1]),
  )
}

export function ManualWorkHistory({ items, sources, historyError, running, updatingOutcome, onRefresh, onCopy, onUpdateOutcome }: {
  items: ManualJapanEntryWorkRow[]
  sources: ManualLeadSourceCatalogRow[]
  historyError: string | null
  running: boolean
  updatingOutcome: string | null
  onRefresh: () => void
  onCopy: (value: string, label: string) => void
  onUpdateOutcome: (item: ManualJapanEntryWorkRow, outcome: Outcome, value: boolean) => void
}) {
  const sourceBySlug = new Map(sources.map((source) => [source.slug, source]))
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold">解析履歴</h2><p className="text-sm text-zinc-500">履歴は専用DBに残り、リロードしても消えません。</p></div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={running} aria-label="履歴を更新"><RefreshCw />更新</Button>
      </div>
      {historyError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{historyError}</div>}
      {items.length === 0 ? (
        <Card className="rounded-2xl border-dashed"><CardContent className="py-14 text-center text-sm text-zinc-500">まだ履歴はありません。上の入力欄から最初の海外企業を解析してください。</CardContent></Card>
      ) : <div className="grid gap-4">{items.map((item) => {
        const concept = positioningConcept(item.profile)
        const stages = qualificationStages(item.qualification_ledger)
        const verifiedStages = stages.filter(([, stage]) => stage.status === "verified").length
        return (
          <motion.article key={item.id} layout className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-lg font-semibold">{item.company_name ?? item.domain}</h3>
                  <Badge variant={badgeVariant(item.status)}>{statusCopy[item.status]}</Badge>
                  {item.status === "processing" && <Badge variant="outline">{stageCopy[item.stage]}</Badge>}
                  <Badge variant="outline">{MANUAL_MESSAGE_VARIANT_LABELS[item.message_variant]}</Badge>
                  <Badge variant="outline">{MANUAL_MESSAGE_ANGLE_LABELS[item.message_angle]}</Badge>
                  <Badge variant="secondary">{MANUAL_OUTREACH_PLAYBOOK_LABELS[item.outreach_playbook]}</Badge>
                </div>
                <a href={item.canonical_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-sm text-blue-700 hover:underline">{item.domain}<ExternalLink className="h-3.5 w-3.5" /></a>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
                  <span>国: {item.country_code ?? "未確定"}</span><span>SMB: {item.smb_status ?? "解析中"}{item.smb_confidence !== null ? ` ${item.smb_confidence}/100` : ""}</span><span>Japan Entry: {item.japan_entry_fit_status ?? "解析中"}</span><span>Crawl4AI: {item.form_discovery.crawl4ai ? "候補あり" : item.stage === "complete" ? "候補なし / 未設定" : "解析中"}</span><span>6段階: {verifiedStages}/6確認</span><span>出典: {item.source_attributions.length}件</span><span>{new Date(item.created_at).toLocaleString("ja-JP")}</span>
                </div>
                {item.source_attributions.length > 0 && <div className="flex flex-wrap gap-1.5">{item.source_attributions.map((source) => <Badge key={source.id} variant="outline">{sourceBySlug.get(source.source_slug)?.name ?? source.source_slug}</Badge>)}</div>}
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {item.form_url && <a href={item.form_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium hover:bg-zinc-50">フォーム<ExternalLink /></a>}
                {item.report_url && <a href={item.report_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium hover:bg-zinc-50">レポート<ExternalLink /></a>}
              </div>
            </div>
            {item.error_message && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{item.error_message}</p>}
            {item.message_variant_fallback_reason && <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{item.message_variant_fallback_reason}</p>}
            {item.message_angle_fallback_reason && <p className="mt-4 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">{item.message_angle_fallback_reason}</p>}
            {stages.length > 0 && <details className="mt-4 rounded-xl border border-zinc-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold">営業リード6段階の確認状況</summary>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{stages.map(([role, stage]) => <div key={role} className="rounded-lg bg-zinc-50 p-3 text-xs leading-5 text-zinc-700">
                <div className="flex items-center justify-between gap-2"><span className="font-semibold">{MANUAL_SOURCE_ROLE_LABELS[role]}</span><Badge variant={stage.status === "verified" ? "default" : "outline"}>{stage.status === "verified" ? "確認済み" : "未確認"}</Badge></div><p className="mt-1">{stage.evidence[0]}</p>
              </div>)}</div>
            </details>}
            {concept && <details className="mt-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
              <summary className="cursor-pointer text-sm font-semibold">保存済み日本語ポジショニング案（未公開ドラフト）</summary><p className="mt-3 text-base font-semibold text-zinc-900">{concept.japaneseHeadline}</p><p className="mt-1 text-sm leading-6 text-zinc-700">{concept.japaneseSupportLine}</p><p className="mt-2 text-xs text-zinc-500">公開原文: {concept.sourcePhrase}</p>
            </details>}
            {item.initial_message && <details className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold">問い合わせフォーム初回文面（未送信・{MANUAL_MESSAGE_VARIANT_LABELS[item.message_variant]}・{MANUAL_MESSAGE_ANGLE_LABELS[item.message_angle]}）</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{item.initial_message}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => onCopy(item.initial_message ?? "", "初回文面")}><Copy />コピー</Button>
            </details>}
            {item.initial_message && <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-zinc-200 p-3">{([
              ["manually_sent", "手動フォーム送信済み", Boolean(item.manually_sent_at)], ["reply_received", "返信あり", Boolean(item.reply_received_at)], ["founder_forwarded", "Founder転送あり", Boolean(item.founder_forwarded_at)], ["meeting_converted", "商談化", Boolean(item.meeting_converted_at)],
            ] as const).map(([outcome, label, active]) => <Button key={outcome} type="button" size="sm" variant={active ? "default" : "outline"} disabled={updatingOutcome !== null || (outcome !== "manually_sent" && !item.manually_sent_at)} onClick={() => onUpdateOutcome(item, outcome, !active)}>
              {updatingOutcome === `${item.id}:${outcome}` ? <LoaderCircle className="animate-spin" /> : active ? <CheckCircle2 /> : null}{label}
            </Button>)}</div>}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500"><span>Twenty: {item.twenty_sync_status}</span><span>・</span><span>自動送信: なし</span></div>
          </motion.article>
        )
      })}</div>}
    </section>
  )
}
