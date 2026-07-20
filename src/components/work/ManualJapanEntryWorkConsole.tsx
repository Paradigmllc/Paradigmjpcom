"use client"

import { motion } from "framer-motion"
import { CheckCircle2, CircleDot, Database, LockKeyhole, ShieldCheck } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Toaster, toast } from "sonner"
import {
  summarizeManualWorkExperiment,
  type ManualExperimentMetric,
  type ManualMessageVariantSelection,
} from "@/lib/sales/manual-japan-entry-experiment"
import {
  summarizeManualWorkAngles,
  type ManualAngleMetric,
  type ManualMessageAngleSelection,
} from "@/lib/sales/manual-japan-entry-angle"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import type { ManualLeadSourceCatalogRow } from "@/lib/sales/manual-japan-entry-source-ledger"
import { manualWorkFailureToast } from "@/lib/sales/manual-work-operator-notice"
import { ManualWorkExperimentControls } from "./ManualWorkExperimentControls"
import { ManualWorkHistory } from "./ManualWorkHistory"
import { ManualWorkIntake, type ManualWorkQueueState } from "./ManualWorkIntake"
import { ManualWorkOverview } from "./ManualWorkOverview"

const MAX_URLS = 20
const CONCURRENCY = 3

export function parseManualWorkUrls(value: string): string[] {
  return [...new Set(value.split(/[\s,]+/).map((url) => url.trim()).filter(Boolean))]
}

export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      if (item !== undefined) await task(item)
    }
  })
  await Promise.all(workers)
}

export function buildManualWorkRequest(input: {
  url: string
  variant: ManualMessageVariantSelection
  angle: ManualMessageAngleSelection
  sourceSlug: string
  sourcePageUrl: string
  retryItem?: Pick<ManualJapanEntryWorkRow, "id">
}): Record<string, unknown> {
  return {
    url: input.url,
    variant: input.variant,
    angle: input.angle,
    sourceSlug: input.sourceSlug,
    sourcePageUrl: input.sourcePageUrl,
    retry: Boolean(input.retryItem),
    ...(input.retryItem ? { workId: input.retryItem.id } : {}),
  }
}

function mergeItems(current: ManualJapanEntryWorkRow[], incoming: ManualJapanEntryWorkRow[]): ManualJapanEntryWorkRow[] {
  const byId = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) byId.set(item.id, item)
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function ManualJapanEntryWorkConsole({
  initialItems,
  initialMetrics,
  initialAngleMetrics,
  initialSources,
  initialHistoryError,
}: {
  initialItems: ManualJapanEntryWorkRow[]
  initialMetrics: ManualExperimentMetric[]
  initialAngleMetrics: ManualAngleMetric[]
  initialSources: ManualLeadSourceCatalogRow[]
  initialHistoryError: string | null
}) {
  const [input, setInput] = useState("")
  const [items, setItems] = useState(initialItems)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [angleMetrics, setAngleMetrics] = useState(initialAngleMetrics)
  const [variant, setVariant] = useState<ManualMessageVariantSelection>("auto")
  const [angle, setAngle] = useState<ManualMessageAngleSelection>("auto")
  const [sources, setSources] = useState(initialSources)
  const [sourceSlug, setSourceSlug] = useState("manual_input")
  const [sourcePageUrl, setSourcePageUrl] = useState("")
  const [queue, setQueue] = useState<ManualWorkQueueState>({})
  const [running, setRunning] = useState(false)
  const [updatingOutcome, setUpdatingOutcome] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(initialHistoryError)
  const urls = useMemo(() => parseManualWorkUrls(input), [input])
  const queueValues = Object.values(queue)
  const finished = queueValues.filter((value) => value === "done" || value === "error").length
  const deepSeekBalanceBlocked = items.some((item) => item.status === "failed" && (
    item.error_message?.includes("DeepSeek APIの残高不足")
    || item.error_message?.includes("Insufficient Balance")
  ))
  const sourceBySlug = useMemo(() => new Map(sources.map((source) => [source.slug, source])), [sources])
  const selectedSource = sourceBySlug.get(sourceSlug)

  const refreshHistory = useCallback(async (quiet = false) => {
    try {
      const response = await fetch("/api/work", { cache: "no-store" })
      const body = await response.json() as { ok?: boolean; items?: ManualJapanEntryWorkRow[]; metrics?: ManualExperimentMetric[]; angleMetrics?: ManualAngleMetric[]; sources?: ManualLeadSourceCatalogRow[]; error?: string }
      if (!response.ok || !body.ok || !body.items) throw new Error(body.error ?? "履歴を取得できませんでした")
      setItems((current) => mergeItems(current, body.items ?? []))
      setMetrics(body.metrics ?? summarizeManualWorkExperiment(body.items ?? []))
      setAngleMetrics(body.angleMetrics ?? summarizeManualWorkAngles(body.items ?? []))
      if (body.sources) setSources(body.sources)
      setHistoryError(null)
    } catch (error) {
      console.error("[manual-work-ui] history refresh failed:", error)
      const message = error instanceof Error ? error.message : "履歴を取得できませんでした"
      setHistoryError(message)
      if (!quiet) toast.error(message)
    }
  }, [])

  useEffect(() => {
    void refreshHistory(true)
  }, [refreshHistory])

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => void refreshHistory(true), 3_000)
    return () => window.clearInterval(timer)
  }, [refreshHistory, running])

  const start = async () => {
    if (urls.length === 0) return toast.error("海外企業のURLを1件以上入力してください")
    if (urls.length > MAX_URLS) return toast.error(`1回の上限は${MAX_URLS}件です`)
    setQueue(Object.fromEntries(urls.map((url) => [url, "waiting" as const])))
    setRunning(true)
    await runWithConcurrency(urls, CONCURRENCY, processUrl)
    setRunning(false)
    await refreshHistory(true)
  }

  const processUrl = async (url: string, retryItem?: ManualJapanEntryWorkRow) => {
      setQueue((current) => ({ ...current, [url]: "processing" }))
      try {
        const response = await fetch("/api/work", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildManualWorkRequest({ url, variant, angle, sourceSlug, sourcePageUrl, retryItem })),
        })
        const body = await response.json() as { ok?: boolean; item?: ManualJapanEntryWorkRow; duplicate?: boolean; error?: string }
        if (!response.ok || !body.ok || !body.item) throw new Error(body.error ?? `${url} の解析に失敗しました`)
        setItems((current) => mergeItems(current, [body.item as ManualJapanEntryWorkRow]))
        if (body.item.status === "failed") throw new Error(manualWorkFailureToast(body.item))
        if (body.item.twenty_sync_status === "failed") throw new Error(manualWorkFailureToast(body.item))
        if (body.item.status === "needs_review" && !body.item.initial_message) throw new Error(manualWorkFailureToast(body.item))
        setQueue((current) => ({ ...current, [url]: "done" }))
        if (body.item.status === "needs_review") {
          toast.warning(`${url} の文面生成まで完了しました。対象判定を確認してください`)
        } else if (body.item.status === "rejected") {
          toast.warning(`${url} は対象外として安全に停止しました`)
        } else {
          toast.success(body.duplicate ? `${url} は既存履歴またはTwentyにあります` : `${url} の解析が完了しました`)
        }
      } catch (error) {
        console.error("[manual-work-ui] URL processing failed:", { url, error })
        setQueue((current) => ({ ...current, [url]: "error" }))
        toast.error(error instanceof Error ? error.message : `${url} の解析に失敗しました`)
      }
      await refreshHistory(true)
  }

  const retry = async (item: ManualJapanEntryWorkRow) => {
    setQueue({ [item.canonical_url]: "processing" })
    setRunning(true)
    try {
      await processUrl(item.canonical_url, item)
    } finally {
      setRunning(false)
      await refreshHistory(true)
    }
  }

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label}をコピーしました`)
    } catch (error) {
      console.error("[manual-work-ui] clipboard failed:", error)
      toast.error("コピーに失敗しました")
    }
  }

  const updateOutcome = async (
    item: ManualJapanEntryWorkRow,
    outcome: "manually_sent" | "reply_received" | "founder_forwarded" | "meeting_converted",
    value: boolean,
  ) => {
    const key = `${item.id}:${outcome}`
    setUpdatingOutcome(key)
    try {
      const response = await fetch("/api/work", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, outcome, value }),
      })
      const body = await response.json() as { ok?: boolean; item?: ManualJapanEntryWorkRow; error?: string }
      if (!response.ok || !body.ok || !body.item) throw new Error(body.error ?? "評価イベントを保存できませんでした")
      setItems((current) => mergeItems(current, [body.item as ManualJapanEntryWorkRow]))
      toast.success("評価イベントを保存しました")
      await refreshHistory(true)
    } catch (error) {
      console.error("[manual-work-ui] outcome update failed:", { itemId: item.id, outcome, error })
      toast.error(error instanceof Error ? error.message : "評価イベントを保存できませんでした")
    } finally {
      setUpdatingOutcome(null)
    }
  }

  return (
    <main className="min-h-dvh bg-[#f6f7f9] text-slate-950">
      <Toaster richColors position="top-center" toastOptions={{ classNames: { success: "!text-emerald-900" } }} />
      <div className="border-b border-white/10 bg-slate-950 text-white">
        <div className="mx-auto max-w-[1480px] px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-emerald-400 text-slate-950">P</span><span>Paradigm Revenue Operations</span></div>
            <div className="flex flex-wrap items-center gap-3 text-slate-400"><span className="inline-flex items-center gap-1.5"><LockKeyhole className="size-3.5" />Admin only</span><span className={`inline-flex items-center gap-1.5 ${deepSeekBalanceBlocked ? "text-amber-300" : "text-emerald-300"}`}><CircleDot className="size-3.5" />{running ? "Analysis running" : deepSeekBalanceBlocked ? "DeepSeek balance required" : "System ready"}</span></div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Manual Japan Entry Workbench</span><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500">Zero-send architecture</span></div>
            <h1 className="mt-4 max-w-4xl font-display text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">海外SMBの初回営業準備</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">完全新規の企業URLから、公開根拠・フォーム・初回文面・診断レポートを一つの永続ワークスペースへ。条件を満たす海外企業だけをTwentyの未送信リストへ追加します。</p>
          </div>
          <nav aria-label="ワークベンチ内ナビゲーション" className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <a href="#intake" className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">新規解析</a>
            <a href="#strategy" className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">生成条件</a>
            <a href="#history" className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">履歴</a>
          </nav>
        </motion.header>

        {deepSeekBalanceBlocked && <div role="alert" className="mt-7 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><p className="font-semibold">DeepSeek APIの残高不足で解析を停止しています</p><p>DeepSeek Platformで残高を補充後、失敗した履歴の「再解析」を押してください。履歴を再利用するため、同じ企業は重複登録されません。</p></div>}

        <div className="mt-7"><ManualWorkOverview items={items} /></div>

        <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,0.75fr)] xl:items-start">
          <ManualWorkIntake
            input={input}
            sourceSlug={sourceSlug}
            sourcePageUrl={sourcePageUrl}
            sources={sources}
            selectedSource={selectedSource}
            queue={queue}
            running={running}
            urlCount={urls.length}
            maxUrls={MAX_URLS}
            finished={finished}
            onInputChange={setInput}
            onSourceChange={setSourceSlug}
            onSourcePageUrlChange={setSourcePageUrl}
            onStart={() => void start()}
          />
          <ManualWorkExperimentControls variant={variant} angle={angle} running={running} metrics={metrics} angleMetrics={angleMetrics} onVariantChange={setVariant} onAngleChange={setAngle} />
        </div>

        <section aria-label="生成ガードレール" className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 sm:p-5">
          <div className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" /><div><p className="text-xs font-semibold text-slate-800">海外SMB限定</p><p className="mt-1 text-xs leading-5 text-slate-600">日本企業と不適合企業は同期前に除外。</p></div></div>
          <div className="flex gap-3"><Database className="mt-0.5 size-4 shrink-0 text-blue-600" /><div><p className="text-xs font-semibold text-slate-800">事実と推定を分離</p><p className="mt-1 text-xs leading-5 text-slate-600">Observed / Modeled / Hypothesisを保存。</p></div></div>
          <div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-violet-600" /><div><p className="text-xs font-semibold text-slate-800">根拠不足は自動降格</p><p className="mt-1 text-xs leading-5 text-slate-600">初回文面は「推定あり／なし × 価格あり／なし」の4セル。根拠不足時は安全な条件へ戻します。</p></div></div>
        </section>

        <div className="mt-12 border-t border-slate-200 pt-10"><ManualWorkHistory items={items} sources={sources} historyError={historyError} running={running} updatingOutcome={updatingOutcome} onRefresh={() => void refreshHistory()} onRetry={(item) => void retry(item)} onCopy={(value, label) => void copy(value, label)} onUpdateOutcome={(item, outcome, value) => void updateOutcome(item, outcome, value)} /></div>
      </div>
    </main>
  )
}
