"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Copy, ExternalLink, LoaderCircle, Play, RefreshCw, XCircle } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Toaster, toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  MANUAL_MESSAGE_VARIANT_LABELS,
  MANUAL_MESSAGE_VARIANTS,
  summarizeManualWorkExperiment,
  type ManualExperimentMetric,
  type ManualMessageVariantSelection,
} from "@/lib/sales/manual-japan-entry-experiment"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"

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

const statusCopy: Record<ManualJapanEntryWorkRow["status"], string> = {
  processing: "解析中",
  needs_review: "要確認",
  completed: "Twenty追加済み",
  failed: "失敗",
  duplicate: "重複",
  rejected: "対象外",
}

const stageCopy: Record<ManualJapanEntryWorkRow["stage"], string> = {
  fetching: "公開ページ取得",
  classifying: "海外SMB判定",
  form_discovery: "フォーム探索",
  copy_generation: "初回文面生成",
  report_generation: "診断レポート生成",
  twenty_sync: "Twenty同期",
  complete: "完了",
  failed: "失敗",
}

function badgeVariant(status: ManualJapanEntryWorkRow["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default"
  if (status === "failed" || status === "rejected") return "destructive"
  if (status === "needs_review") return "secondary"
  return "outline"
}

function mergeItems(current: ManualJapanEntryWorkRow[], incoming: ManualJapanEntryWorkRow[]): ManualJapanEntryWorkRow[] {
  const byId = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) byId.set(item.id, item)
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function ManualJapanEntryWorkConsole({
  initialItems,
  initialMetrics,
  initialHistoryError,
}: {
  initialItems: ManualJapanEntryWorkRow[]
  initialMetrics: ManualExperimentMetric[]
  initialHistoryError: string | null
}) {
  const [input, setInput] = useState("")
  const [items, setItems] = useState(initialItems)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [variant, setVariant] = useState<ManualMessageVariantSelection>("auto")
  const [queue, setQueue] = useState<QueueState>({})
  const [running, setRunning] = useState(false)
  const [updatingOutcome, setUpdatingOutcome] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(initialHistoryError)
  const urls = useMemo(() => parseManualWorkUrls(input), [input])
  const queueValues = Object.values(queue)
  const finished = queueValues.filter((value) => value === "done" || value === "error").length

  const refreshHistory = useCallback(async (quiet = false) => {
    try {
      const response = await fetch("/api/work", { cache: "no-store" })
      const body = await response.json() as { ok?: boolean; items?: ManualJapanEntryWorkRow[]; metrics?: ManualExperimentMetric[]; error?: string }
      if (!response.ok || !body.ok || !body.items) throw new Error(body.error ?? "履歴を取得できませんでした")
      setItems((current) => mergeItems(current, body.items ?? []))
      setMetrics(body.metrics ?? summarizeManualWorkExperiment(body.items ?? []))
      setHistoryError(null)
    } catch (error) {
      console.error("[manual-work-ui] history refresh failed:", error)
      const message = error instanceof Error ? error.message : "履歴を取得できませんでした"
      setHistoryError(message)
      if (!quiet) toast.error(message)
    }
  }, [])

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
          body: JSON.stringify({ url, variant }),
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

  const rate = (count: number, denominator: number) => denominator > 0 ? `${Math.round((count / denominator) * 100)}%` : "—"

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
            初回文面は4セル実験として、推定金額あり／なし × 価格あり／なしを記録します。全セルで企業固有の公開事実を必須とし、推定は公開rank根拠がある場合だけ非断定で使用します。URL・添付・通話提案・自動送信はありません。
          </p>
        </motion.header>

        <Card className="rounded-2xl border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">初回文面のテストセル</CardTitle>
            <CardDescription>自動均等割付はdomainから安定して割り当てます。推定根拠が不足する場合は同じ価格条件の「推定なし」へ自動で落とします。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" variant={variant === "auto" ? "default" : "outline"} size="sm" onClick={() => setVariant("auto")} disabled={running}>自動均等割付</Button>
            {MANUAL_MESSAGE_VARIANTS.map((value) => (
              <Button key={value} type="button" variant={variant === value ? "default" : "outline"} size="sm" onClick={() => setVariant(value)} disabled={running}>
                {MANUAL_MESSAGE_VARIANT_LABELS[value]}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">テスト評価</CardTitle>
            <CardDescription>返信率・Founder転送率・商談化率の分母は「手動フォーム送信済み」です。</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs text-zinc-500"><tr><th scope="col" className="py-2 pr-4">セル</th><th scope="col" className="px-3 py-2">割付</th><th scope="col" className="px-3 py-2">送信</th><th scope="col" className="px-3 py-2">返信率</th><th scope="col" className="px-3 py-2">Founder転送率</th><th scope="col" className="px-3 py-2">商談化率</th></tr></thead>
              <tbody>{metrics.map((metric) => <tr key={metric.variant} className="border-b border-zinc-100"><td className="py-3 pr-4 font-medium">{MANUAL_MESSAGE_VARIANT_LABELS[metric.variant]}</td><td className="px-3 py-3">{metric.assigned}</td><td className="px-3 py-3">{metric.manuallySent}</td><td className="px-3 py-3">{metric.replies} / {rate(metric.replies, metric.manuallySent)}</td><td className="px-3 py-3">{metric.founderForwards} / {rate(metric.founderForwards, metric.manuallySent)}</td><td className="px-3 py-3">{metric.meetings} / {rate(metric.meetings, metric.manuallySent)}</td></tr>)}</tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">企業URLを入力</CardTitle>
            <CardDescription>改行・スペース・カンマ区切り。最大20件、3件ずつ並列処理します。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-xl font-semibold">解析履歴</h2><p className="text-sm text-zinc-500">履歴は専用DBに残り、リロードしても消えません。</p></div>
            <Button variant="outline" size="sm" onClick={() => void refreshHistory()} disabled={running} aria-label="履歴を更新"><RefreshCw />更新</Button>
          </div>
          {historyError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{historyError}</div>}
          {items.length === 0 ? (
            <Card className="rounded-2xl border-dashed"><CardContent className="py-14 text-center text-sm text-zinc-500">まだ履歴はありません。上の入力欄から最初の海外企業を解析してください。</CardContent></Card>
          ) : (
            <div className="grid gap-4">
              {items.map((item) => (
                <motion.article key={item.id} layout className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold">{item.company_name ?? item.domain}</h3>
                        <Badge variant={badgeVariant(item.status)}>{statusCopy[item.status]}</Badge>
                        {item.status === "processing" && <Badge variant="outline">{stageCopy[item.stage]}</Badge>}
                        <Badge variant="outline">{MANUAL_MESSAGE_VARIANT_LABELS[item.message_variant]}</Badge>
                      </div>
                      <a href={item.canonical_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-sm text-blue-700 hover:underline">{item.domain}<ExternalLink className="h-3.5 w-3.5" /></a>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
                        <span>国: {item.country_code ?? "未確定"}</span><span>SMB: {item.smb_status ?? "解析中"}{item.smb_confidence !== null ? ` ${item.smb_confidence}/100` : ""}</span><span>Japan Entry: {item.japan_entry_fit_status ?? "解析中"}</span><span>Crawl4AI: {item.form_discovery.crawl4ai ? "候補あり" : item.stage === "complete" ? "候補なし / 未設定" : "解析中"}</span><span>{new Date(item.created_at).toLocaleString("ja-JP")}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {item.form_url && <a href={item.form_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium hover:bg-zinc-50">フォーム<ExternalLink /></a>}
                      {item.report_url && <a href={item.report_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium hover:bg-zinc-50">レポート<ExternalLink /></a>}
                    </div>
                  </div>
                  {item.error_message && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{item.error_message}</p>}
                  {item.message_variant_fallback_reason && <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{item.message_variant_fallback_reason}</p>}
                  {item.initial_message && (
                    <details className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <summary className="cursor-pointer text-sm font-semibold">問い合わせフォーム初回文面（未送信・{MANUAL_MESSAGE_VARIANT_LABELS[item.message_variant]}）</summary>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{item.initial_message}</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => void copy(item.initial_message ?? "", "初回文面")}><Copy />コピー</Button>
                    </details>
                  )}
                  {item.initial_message && (
                    <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-zinc-200 p-3">
                      {([
                        ["manually_sent", "手動フォーム送信済み", Boolean(item.manually_sent_at)],
                        ["reply_received", "返信あり", Boolean(item.reply_received_at)],
                        ["founder_forwarded", "Founder転送あり", Boolean(item.founder_forwarded_at)],
                        ["meeting_converted", "商談化", Boolean(item.meeting_converted_at)],
                      ] as const).map(([outcome, label, active]) => (
                        <Button
                          key={outcome}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          disabled={updatingOutcome !== null || (outcome !== "manually_sent" && !item.manually_sent_at)}
                          onClick={() => void updateOutcome(item, outcome, !active)}
                        >
                          {updatingOutcome === `${item.id}:${outcome}` ? <LoaderCircle className="animate-spin" /> : active ? <CheckCircle2 /> : null}{label}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>Twenty: {item.twenty_sync_status}</span><span>・</span><span>自動送信: なし</span>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
