"use client"

import { motion } from "framer-motion"
import { CheckCircle2, LoaderCircle, Play, XCircle } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Toaster, toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
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
import {
  MANUAL_SOURCE_ROLE_LABELS,
  type ManualLeadSourceCatalogRow,
} from "@/lib/sales/manual-japan-entry-source-ledger"
import { ManualWorkExperimentControls } from "./ManualWorkExperimentControls"
import { ManualWorkHistory } from "./ManualWorkHistory"

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

type QueueState = Record<string, "waiting" | "processing" | "done" | "error">

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
  const [queue, setQueue] = useState<QueueState>({})
  const [running, setRunning] = useState(false)
  const [updatingOutcome, setUpdatingOutcome] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(initialHistoryError)
  const urls = useMemo(() => parseManualWorkUrls(input), [input])
  const queueValues = Object.values(queue)
  const finished = queueValues.filter((value) => value === "done" || value === "error").length
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
    const initialQueue = Object.fromEntries(urls.map((url) => [url, "waiting" as const]))
    setQueue(initialQueue)
    setRunning(true)
    await runWithConcurrency(urls, CONCURRENCY, async (url) => {
      setQueue((current) => ({ ...current, [url]: "processing" }))
      try {
        const response = await fetch("/api/work", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, variant, angle, sourceSlug, sourcePageUrl }),
        })
        const body = await response.json() as { ok?: boolean; item?: ManualJapanEntryWorkRow; duplicate?: boolean; error?: string }
        if (!response.ok || !body.ok || !body.item) throw new Error(body.error ?? `${url} の解析に失敗しました`)
        setItems((current) => mergeItems(current, [body.item as ManualJapanEntryWorkRow]))
        setQueue((current) => ({ ...current, [url]: "done" }))
        toast.success(body.duplicate ? `${url} は既存履歴またはTwentyにあります` : `${url} の解析が完了しました`)
      } catch (error) {
        console.error("[manual-work-ui] URL processing failed:", { url, error })
        setQueue((current) => ({ ...current, [url]: "error" }))
        toast.error(error instanceof Error ? error.message : `${url} の解析に失敗しました`)
      }
      await refreshHistory(true)
    })
    setRunning(false)
    await refreshHistory(true)
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
    <main className="min-h-dvh bg-[#f7f8fa] px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Manual Japan Entry Workbench</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">海外SMBの初回営業準備</h1>
          <p className="max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">
            完全新規の企業URLを解析し、フォーム・初回文面・診断レポートを履歴保存します。日本企業は除外し、条件を満たす企業だけTwentyへ未送信リストとして追加します。
          </p>
          <p className="max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-950 sm:text-sm">
            初回文面は「推定あり／なし × 価格あり／なし」の4セルと、問題提起・競合比較・推定機会・モックアップの訴求角度を別々に記録します。競合・推定・モックアップは実証拠がある場合だけ使い、URL・添付・通話提案・自動送信はありません。
          </p>
        </motion.header>

        <ManualWorkExperimentControls
          variant={variant}
          angle={angle}
          running={running}
          metrics={metrics}
          angleMetrics={angleMetrics}
          onVariantChange={setVariant}
          onAngleChange={setAngle}
        />

        <Card className="rounded-2xl border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">企業URLを入力</CardTitle>
            <CardDescription>改行・スペース・カンマ区切り。最大20件、3件ずつ並列処理します。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>企業を見つけたソース</span>
                <select
                  value={sourceSlug}
                  onChange={(event) => setSourceSlug(event.target.value)}
                  disabled={running}
                  aria-label="企業を見つけた営業ソース"
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sources.map((source) => <option key={source.slug} value={source.slug}>{source.name} / {source.tier.toUpperCase()}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>掲載・発見ページURL（任意）</span>
                <Input value={sourcePageUrl} onChange={(event) => setSourcePageUrl(event.target.value)} placeholder="https://source.example/company" disabled={running} aria-label="営業ソースの掲載ページURL" />
              </label>
            </div>
            {selectedSource && (
              <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-600">
                役割: {selectedSource.roles.map((role) => MANUAL_SOURCE_ROLE_LABELS[role]).join("・")}。{selectedSource.notes}
              </p>
            )}
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={"https://example.com\nhttps://another-company.com"}
              className="min-h-36 resize-y bg-white font-mono text-sm"
              aria-label="解析する海外企業URL"
              disabled={running}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className={urls.length > MAX_URLS ? "text-sm font-medium text-red-600" : "text-sm text-zinc-500"}>
                {urls.length} / {MAX_URLS}件
              </p>
              <Button onClick={() => void start()} disabled={running || urls.length === 0 || urls.length > MAX_URLS} size="lg" className="w-full sm:w-auto">
                {running ? <LoaderCircle className="animate-spin" /> : <Play />}
                {running ? "解析中" : "解析を開始"}
              </Button>
            </div>
            {queueValues.length > 0 && (
              <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center justify-between text-sm"><span>今回の進捗</span><span>{finished} / {queueValues.length}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                  <div className="h-full bg-emerald-600 transition-all" style={{ width: `${queueValues.length ? (finished / queueValues.length) * 100 : 0}%` }} />
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(queue).map(([url, state]) => (
                    <div key={url} className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs">
                      {state === "processing" ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-blue-600" /> : state === "done" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : state === "error" ? <XCircle className="h-4 w-4 shrink-0 text-red-600" /> : <span className="h-2 w-2 shrink-0 rounded-full bg-zinc-300" />}
                      <span className="truncate">{url}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <ManualWorkHistory
          items={items}
          sources={sources}
          historyError={historyError}
          running={running}
          updatingOutcome={updatingOutcome}
          onRefresh={() => void refreshHistory()}
          onCopy={(value, label) => void copy(value, label)}
          onUpdateOutcome={(item, outcome, value) => void updateOutcome(item, outcome, value)}
        />
      </div>
    </main>
  )
}
