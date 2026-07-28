"use client"

import { motion } from "framer-motion"
import { CheckCircle2, CircleDot, Database, LockKeyhole, ShieldCheck } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Toaster, toast } from "sonner"
import type { ManualExperimentMetric } from "@/lib/sales/manual-japan-entry-experiment"
import type { ManualAngleMetric } from "@/lib/sales/manual-japan-entry-angle"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import type { ManualLeadSourceCatalogRow } from "@/lib/sales/manual-japan-entry-source-ledger"
import { ManualWorkHistory } from "./ManualWorkHistory"
import { ManualWorkIntake, type ManualWorkQueueState } from "./ManualWorkIntake"
import { ManualWorkOverview } from "./ManualWorkOverview"
import { useManualWorkBatch } from "./useManualWorkBatch"
import { MANUAL_WORK_BATCH_MAX_URLS } from "@/lib/sales/manual-japan-entry-batch-types"
import type { ManualWorkDashboardSummary, ManualWorkHistoryFilter } from "@/lib/sales/manual-work-dashboard"
import { Button } from "@/components/ui/button"

export function parseManualWorkUrls(value: string): string[] {
  return [...new Set(value.split(/[\s,]+/).map((url) => url.trim()).filter(Boolean))]
}

function mergeItems(current: ManualJapanEntryWorkRow[], incoming: ManualJapanEntryWorkRow[]): ManualJapanEntryWorkRow[] {
  const byId = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) byId.set(item.id, item)
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function ManualJapanEntryWorkConsole({
  initialItems,
  initialHistoryTotal,
  initialSummary,
  initialSources,
  initialHistoryError,
}: {
  initialItems: ManualJapanEntryWorkRow[]
  initialHistoryTotal: number
  initialSummary: ManualWorkDashboardSummary
  initialMetrics: ManualExperimentMetric[]
  initialAngleMetrics: ManualAngleMetric[]
  initialSources: ManualLeadSourceCatalogRow[]
  initialHistoryError: string | null
}) {
  const [input, setInput] = useState("")
  const [items, setItems] = useState(initialItems)
  const [sources, setSources] = useState(initialSources)
  const [sourceSlug, setSourceSlug] = useState("manual_input")
  const [sourcePageUrl, setSourcePageUrl] = useState("")
  const [updatingOutcome, setUpdatingOutcome] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(initialHistoryError)
  const [historyTotal, setHistoryTotal] = useState(initialHistoryTotal)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyHasMore, setHistoryHasMore] = useState(initialItems.length < initialHistoryTotal)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [reconcilingArtifacts, setReconcilingArtifacts] = useState(false)
  const [summary, setSummary] = useState(initialSummary)
  const historyCriteria = useRef<{ filter: ManualWorkHistoryFilter; query: string }>({ filter: "all", query: "" })
  const urls = useMemo(() => parseManualWorkUrls(input), [input])
  const sourceBySlug = useMemo(() => new Map(sources.map((source) => [source.slug, source])), [sources])
  const selectedSource = sourceBySlug.get(sourceSlug)

  const refreshHistory = useCallback(async (quiet = false, options?: {
    page?: number
    filter?: ManualWorkHistoryFilter
    query?: string
    append?: boolean
  }) => {
    const page = options?.page ?? 1
    const filter = options?.filter ?? historyCriteria.current.filter
    const query = options?.query ?? historyCriteria.current.query
    setHistoryLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "100", filter, q: query })
      const response = await fetch(`/api/work?${params.toString()}`, { cache: "no-store" })
      const body = await response.json() as {
        ok?: boolean
        items?: ManualJapanEntryWorkRow[]
        page?: number
        total?: number
        hasMore?: boolean
        summary?: ManualWorkDashboardSummary
        sources?: ManualLeadSourceCatalogRow[]
        error?: string
      }
      if (!response.ok || !body.ok || !body.items) throw new Error(body.error ?? "履歴を取得できませんでした")
      setItems((current) => options?.append ? mergeItems(current, body.items ?? []) : body.items ?? [])
      setHistoryPage(body.page ?? page)
      setHistoryTotal(body.total ?? body.items.length)
      setHistoryHasMore(Boolean(body.hasMore))
      if (body.summary) setSummary(body.summary)
      if (body.sources) setSources(body.sources)
      setHistoryError(null)
    } catch (error) {
      console.error("[manual-work-ui] history refresh failed:", error)
      const message = error instanceof Error ? error.message : "履歴を取得できませんでした"
      setHistoryError(message)
      if (!quiet) toast.error(message)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const changeHistoryCriteria = useCallback((filter: ManualWorkHistoryFilter, query: string) => {
    historyCriteria.current = { filter, query }
    void refreshHistory(true, { page: 1, filter, query })
  }, [refreshHistory])

  const loadMoreHistory = useCallback(() => {
    if (historyLoading || !historyHasMore) return
    void refreshHistory(true, { page: historyPage + 1, append: true })
  }, [historyHasMore, historyLoading, historyPage, refreshHistory])

  const batch = useManualWorkBatch(useCallback(() => refreshHistory(true), [refreshHistory]))
  const workflowRunning = batch.running
  const inputBusy = batch.submitting
  const queue = useMemo<ManualWorkQueueState>(() => {
    if (!batch.snapshot) return {}
    return Object.fromEntries(batch.snapshot.items.map((item) => [item.canonical_url,
      item.status === "queued" ? "waiting"
        : item.status === "processing" ? "processing"
          : item.status === "failed" ? "error"
            : "done",
    ]))
  }, [batch.snapshot])
  const finished = batch.snapshot?.finished
    ?? Object.values(queue).filter((value) => value === "done" || value === "error").length

  useEffect(() => {
    void refreshHistory(true)
  }, [refreshHistory])

  const start = async () => {
    if (urls.length === 0) return toast.error("海外企業のURLを1件以上入力してください")
    if (urls.length > MANUAL_WORK_BATCH_MAX_URLS) return toast.error(`1回の上限は${MANUAL_WORK_BATCH_MAX_URLS}件です`)
    const accepted = await batch.start({ urls, variant: "auto", angle: "auto", sourceSlug, sourcePageUrl })
    if (accepted) setInput("")
  }

  const retry = async (item: ManualJapanEntryWorkRow) => {
    const attribution = item.source_attributions[0]
    await batch.start({
      urls: [item.canonical_url],
      variant: item.message_variant_requested,
      angle: item.message_angle_requested,
      sourceSlug: attribution?.source_slug ?? "manual_input",
      sourcePageUrl: attribution?.source_page_url ?? "",
      retryWorkId: item.id,
    })
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

  const reconcileArtifacts = async () => {
    if (reconcilingArtifacts) return
    setReconcilingArtifacts(true)
    try {
      const response = await fetch("/api/work/artifacts/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      })
      const body = await response.json() as {
        ok?: boolean
        result?: {
          checked: number
          repaired: number
          failed: number
          currentReports: number
          legacyReports: number
          sent: number
        }
        error?: string
      }
      if (!response.ok || !body.ok || !body.result) throw new Error(body.error ?? "Twenty整合性監査に失敗しました")
      toast.success(`${body.result.checked}件を監査し、V4 ${body.result.currentReports}/${body.result.checked}件をDB読戻ししました（旧版${body.result.legacyReports}件・外部送信${body.result.sent}件）`)
      await refreshHistory(true)
    } catch (error) {
      console.error("[manual-work-ui] artifact reconciliation failed:", error)
      toast.error(error instanceof Error ? error.message : "Twenty整合性監査に失敗しました")
    } finally {
      setReconcilingArtifacts(false)
    }
  }

  return (
    <main className="min-h-dvh w-full min-w-0 overflow-x-clip bg-[#f6f7f9] text-slate-950">
      <Toaster richColors position="top-center" toastOptions={{ classNames: { success: "!text-emerald-900" } }} />
      <div className="border-b border-white/10 bg-slate-950 text-white">
        <div className="mx-auto max-w-[1480px] px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-emerald-400 text-slate-950">P</span><span>Paradigm Revenue Operations</span></div>
            <div className="flex flex-wrap items-center gap-3 text-slate-400"><span className="inline-flex items-center gap-1.5"><LockKeyhole className="size-3.5" />Admin only</span><span className={`inline-flex items-center gap-1.5 ${workflowRunning ? "text-blue-300" : "text-emerald-300"}`}><CircleDot className="size-3.5" />{workflowRunning ? "Qualification / editorial running" : "System ready"}</span></div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Evidence-first Outreach Workbench</span><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500">No template fallback</span></div>
            <h1 className="mt-4 max-w-4xl font-display text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">大量URLは速く選別し、残す企業だけ高品質に書く</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">一次判定はホームページの公開事実だけで高速処理します。送信文は選択した企業について複数ページを読み、GPT-5.6 Terraで複数案を作り、GPT-5.6 Solで編集・採否判定します。DeepSeekと固定テンプレートは送信文に使用しません。</p>
          </div>
          <nav aria-label="ワークベンチ内ナビゲーション" className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <a href="#intake" className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">高速判定</a>
            <a href="#history" className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">候補履歴</a>
            <Button type="button" variant="ghost" size="sm" aria-label="Twenty成果物の整合性を監査" disabled={reconcilingArtifacts} onClick={() => void reconcileArtifacts()} className="h-auto rounded-lg px-3 py-2 text-xs font-semibold text-slate-600">{reconcilingArtifacts ? "監査中…" : "Twenty整合性"}</Button>
          </nav>
        </motion.header>

        <div className="mt-7"><ManualWorkOverview summary={summary} /></div>

        <div className="mt-7">
          <ManualWorkIntake
            input={input}
            sourceSlug={sourceSlug}
            sourcePageUrl={sourcePageUrl}
            sources={sources}
            selectedSource={selectedSource}
            queue={queue}
            submitting={inputBusy}
            queueActive={batch.running}
            batchStatus={batch.snapshot?.batch.status ?? null}
            queuePosition={batch.queuePosition}
            queueSummary={batch.queueSummary}
            urlCount={urls.length}
            maxUrls={MANUAL_WORK_BATCH_MAX_URLS}
            finished={finished}
            batchError={batch.errorMessage}
            canResume={Boolean(batch.snapshot?.remaining)}
            onInputChange={setInput}
            onSourceChange={setSourceSlug}
            onSourcePageUrlChange={setSourcePageUrl}
            onStart={() => void start()}
            onResume={() => batch.snapshot && void batch.resume(batch.snapshot)}
          />
        </div>

        <section aria-label="生成ガードレール" className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 sm:p-5">
          <div className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" /><div><p className="text-xs font-semibold text-slate-800">一次判定は非生成</p><p className="mt-1 text-xs leading-5 text-slate-600">ホームページの公開事実だけで選別し、薄い送信文を量産しません。</p></div></div>
          <div className="flex gap-3"><Database className="mt-0.5 size-4 shrink-0 text-blue-600" /><div><p className="text-xs font-semibold text-slate-800">残す企業は複数ページ調査</p><p className="mt-1 text-xs leading-5 text-slate-600">商品、料金、会社、ニュース、連絡先から会社固有の論点を組み立てます。</p></div></div>
          <div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-violet-600" /><div><p className="text-xs font-semibold text-slate-800">GPT-5.6二段編集</p><p className="mt-1 text-xs leading-5 text-slate-600">Terraの複数案をSolが再編集し、88点未満・テンプレ類似・根拠不足は不採用にします。</p></div></div>
        </section>

        <div className="mt-12 border-t border-slate-200 pt-10"><ManualWorkHistory items={items} total={historyTotal} hasMore={historyHasMore} loading={historyLoading} sources={sources} historyError={historyError} running={workflowRunning} updatingOutcome={updatingOutcome} onCriteriaChange={changeHistoryCriteria} onLoadMore={loadMoreHistory} onRefresh={() => void refreshHistory()} onRetry={(item) => void retry(item)} onCopy={(value, label) => void copy(value, label)} onUpdateOutcome={(item, outcome, value) => void updateOutcome(item, outcome, value)} /></div>
      </div>
    </main>
  )
}
