"use client"

import { Bot, CheckCircle2, ClipboardCopy, FileInput, LoaderCircle, RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import {
  buildManualChatGptHandoffPrompt,
  isManualChatGptBriefReady,
  MANUAL_CHATGPT_BATCH_MAX,
} from "@/lib/sales/manual-work-chatgpt-handoff"

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function hasOutcome(item: ManualJapanEntryWorkRow): boolean {
  return Boolean(item.manually_sent_at || item.reply_received_at || item.founder_forwarded_at || item.meeting_converted_at)
}

function fastPriority(item: ManualJapanEntryWorkRow): string | null {
  const qualification = record(item.evidence.fastQualification)
  return typeof qualification.priority === "string" ? qualification.priority : null
}

function fitScore(item: ManualJapanEntryWorkRow): number {
  const qualification = record(item.evidence.fastQualification)
  if (typeof qualification.score === "number" && Number.isFinite(qualification.score)) return qualification.score
  return typeof item.japan_entry_fit_confidence === "number" ? item.japan_entry_fit_confidence : 0
}

function byPriority(left: ManualJapanEntryWorkRow, right: ManualJapanEntryWorkRow): number {
  return fitScore(right) - fitScore(left) || right.updated_at.localeCompare(left.updated_at)
}

function hasExistingJapanPresence(item: ManualJapanEntryWorkRow): boolean {
  if (item.evidence.analysis_mode === "existing_japan_presence") return true
  const summary = record(item.evidence.structuredSummary)
  const presence = record(summary.japanPresence)
  return presence.existing === true || item.message_review.generation_status === "existing_japan_presence"
}

function canPrepareBrief(item: ManualJapanEntryWorkRow): boolean {
  if (item.is_japanese_company || item.country_code === "JP" || hasOutcome(item) || item.status === "processing") return false
  if (hasExistingJapanPresence(item)) return false
  if (isManualChatGptBriefReady(item)) return false
  if (item.evidence.analysis_mode === "chatgpt_manual_import" && item.initial_message) return false
  if (item.evidence.analysis_mode === "fast_qualification" && fastPriority(item) === "low") return false
  if (item.status === "rejected" && item.evidence.analysis_mode !== "fast_qualification") return false
  return true
}

type ImportResult = {
  workId: string
  ok: boolean
  item?: ManualJapanEntryWorkRow
  error?: string
}

export function ManualChatGptHandoff({ items, onMergeItems, onRefresh }: {
  items: ManualJapanEntryWorkRow[]
  onMergeItems: (items: ManualJapanEntryWorkRow[]) => void
  onRefresh: () => void
}) {
  const [preparing, setPreparing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [raw, setRaw] = useState("")
  const [lastErrors, setLastErrors] = useState<string[]>([])

  const preparationCandidates = useMemo(
    () => items.filter(canPrepareBrief).sort(byPriority).slice(0, MANUAL_CHATGPT_BATCH_MAX),
    [items],
  )
  const readyItems = useMemo(
    () => items.filter(isManualChatGptBriefReady).sort(byPriority).slice(0, MANUAL_CHATGPT_BATCH_MAX),
    [items],
  )

  const prepareBriefs = async () => {
    if (preparationCandidates.length === 0) return toast.error("ブリーフ準備対象の企業がありません")
    setPreparing(true)
    setLastErrors([])
    try {
      const response = await fetch("/api/work/chatgpt/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workIds: preparationCandidates.map((item) => item.id) }),
      })
      const body = await response.json() as {
        prepared?: number
        failed?: number
        results?: ImportResult[]
        error?: string
      }
      if (!response.ok && response.status !== 207) throw new Error(body.error ?? "ブリーフを準備できませんでした")
      const updated = (body.results ?? []).flatMap((result) => result.item ? [result.item] : [])
      if (updated.length > 0) onMergeItems(updated)
      const errors = (body.results ?? []).flatMap((result) => !result.ok && result.error ? [`${result.workId}: ${result.error}`] : [])
      setLastErrors(errors)
      toast.success(`${body.prepared ?? updated.length}件のChatGPT用ブリーフを準備しました`)
      if ((body.failed ?? 0) > 0) toast.warning(`${body.failed}件は準備できませんでした`)
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ブリーフを準備できませんでした")
    } finally {
      setPreparing(false)
    }
  }

  const copyPrompt = async () => {
    try {
      const prompt = buildManualChatGptHandoffPrompt(readyItems)
      await navigator.clipboard.writeText(prompt)
      toast.success(`${readyItems.length}社分のChatGPTプロンプトをコピーしました`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "プロンプトをコピーできませんでした")
    }
  }

  const importOutput = async () => {
    if (!raw.trim()) return toast.error("ChatGPTが返したJSONを貼り付けてください")
    setImporting(true)
    setLastErrors([])
    try {
      const response = await fetch("/api/work/chatgpt/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      })
      const body = await response.json() as {
        imported?: number
        insufficient?: number
        failed?: number
        results?: ImportResult[]
        error?: string
      }
      if (!response.ok && response.status !== 207) throw new Error(body.error ?? "ChatGPT出力を取り込めませんでした")
      const updated = (body.results ?? []).flatMap((result) => result.item ? [result.item] : [])
      if (updated.length > 0) onMergeItems(updated)
      const errors = (body.results ?? []).flatMap((result) => !result.ok && result.error ? [`${result.workId}: ${result.error}`] : [])
      setLastErrors(errors)
      toast.success(`${body.imported ?? 0}件の文面を保存しました${body.insufficient ? `（根拠不足${body.insufficient}件）` : ""}`)
      if ((body.failed ?? 0) === 0) setRaw("")
      if ((body.failed ?? 0) > 0) toast.warning(`${body.failed}件は品質ゲートを通過しませんでした`)
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ChatGPT出力を取り込めませんでした")
    } finally {
      setImporting(false)
    }
  }

  return (
    <section aria-labelledby="chatgpt-handoff-heading" className="overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-[0_24px_80px_-46px_rgba(76,29,149,0.45)]">
      <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white"><Bot className="size-5" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">ChatGPT Pro handoff · API課金なし</p>
              <h2 id="chatgpt-handoff-heading" className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-950">ブリーフをまとめてChatGPTへ渡し、完成JSONを戻す</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">/workは公式ページの調査・根拠整理・品質検査・保存を担当します。文章作成はこのChatGPT Proで行い、OpenAI API・OpenRouter・DeepSeekは呼びません。</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3"><p className="font-semibold text-slate-950">{preparationCandidates.length}</p><p className="mt-1 text-slate-500">上位の準備候補</p></div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3"><p className="font-semibold text-violet-950">{readyItems.length}</p><p className="mt-1 text-violet-700">コピー可能</p></div>
          </div>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-3">
        <div className="border-b border-slate-200 p-5 sm:p-6 xl:border-b-0 xl:border-r">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><RefreshCw className="size-4 text-blue-600" />1. 企業ブリーフを準備</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">Japan fitの高い順に最大{MANUAL_CHATGPT_BATCH_MAX}社について、商品・料金・会社・ニュース・連絡先ページを短時間で取得します。既に日本販売・サポート導線がある企業は自動除外します。</p>
          <Button type="button" className="mt-4 w-full rounded-xl" onClick={() => void prepareBriefs()} disabled={preparing || preparationCandidates.length === 0}>
            {preparing ? <LoaderCircle className="animate-spin" /> : <FileInput />}
            {preparing ? "ブリーフ準備中…" : `${preparationCandidates.length}社のブリーフを準備`}
          </Button>
        </div>

        <div className="border-b border-slate-200 p-5 sm:p-6 xl:border-b-0 xl:border-r">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ClipboardCopy className="size-4 text-violet-600" />2. ChatGPTへまとめてコピー</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">厳格なJSON形式、根拠ID、禁止事項を含むプロンプトを生成します。このチャットへそのまま貼り付けてください。</p>
          <Button type="button" variant="outline" className="mt-4 w-full rounded-xl border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100" onClick={() => void copyPrompt()} disabled={readyItems.length === 0}>
            <ClipboardCopy />{readyItems.length}社分をコピー
          </Button>
        </div>

        <div className="p-5 sm:p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CheckCircle2 className="size-4 text-emerald-600" />3. 返却JSONを一括取込</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">ChatGPTの返答をそのまま貼ります。企業ID、根拠ID、語数、定型句、断定、過去文面との類似を保存前に検査します。</p>
          <Textarea value={raw} onChange={(event) => setRaw(event.target.value)} placeholder={'{"items":[{"workId":"...","status":"ready",...}]}'} className="mt-4 min-h-32 rounded-xl border-slate-200 bg-slate-50 font-mono text-xs leading-5" />
          <Button type="button" className="mt-3 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800" onClick={() => void importOutput()} disabled={importing || !raw.trim()}>
            {importing ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}{importing ? "検証・保存中…" : "JSONを検証して保存"}
          </Button>
        </div>
      </div>

      {lastErrors.length > 0 && <div className="border-t border-amber-200 bg-amber-50 px-5 py-4 text-xs leading-5 text-amber-950"><p className="font-semibold">再処理が必要な項目</p><ul className="mt-2 list-disc space-y-1 pl-5">{lastErrors.slice(0, 15).map((error) => <li key={error}>{error}</li>)}</ul></div>}
    </section>
  )
}
