"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, FileUp, Gauge, Play, RefreshCw, UploadCloud } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import type { SalesLeadBatchSummary } from "@/lib/sales/monthly-batch"
import { formatDate, formatNumber, statusTone } from "./SalesCommandPanels"
import { SalesJapanReadinessPanel } from "./SalesJapanReadinessPanel"
import { SalesSearxngSourcePanel } from "./SalesSearxngSourcePanel"

type ParsedRow = Record<string, string>
type MappedRow = Record<string, string> & {
  company_name?: string
  domain?: string
}

const FIELD_ALIASES: Record<string, string[]> = {
  company_name: ["company", "company name", "name", "account name", "organization", "会社名", "企業名"],
  domain: ["domain", "website", "url", "homepage", "company url", "会社url", "企業url"],
  industry: ["industry", "業種"],
  prefecture: ["prefecture", "state", "所在地", "都道府県"],
  target_country: ["target country", "country", "market", "country code"],
  report_locale: ["locale", "language", "report locale"],
  email: ["email", "mail"],
  phone: ["phone", "tel"],
  contact_name: ["contact", "contact name", "name", "担当者"],
  contact_title: ["title", "position", "役職"],
  source: ["source", "list source", "リスト元"],
}

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  importing: "投入中",
  enriching: "調査中",
  qualifying: "判定中",
  outreach_ready: "送信候補あり",
  completed: "完了",
  failed: "失敗",
  imported: "投入済み",
  duplicate: "重複",
  enrichment_queued: "調査待ち",
  qualified: "判定済み",
  rejected: "除外",
  manual_review: "手動確認",
  sent: "送信済み",
  responded: "反応あり",
  error: "エラー",
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function parseCsv(text: string): ParsedRow[] {
  const rows: string[][] = []
  let current = ""
  let row: string[] = []
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      i++
    } else if (char === '"') quoted = !quoted
    else if (char === "," && !quoted) {
      row.push(current.trim())
      current = ""
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++
      row.push(current.trim())
      if (row.some((cell) => cell)) rows.push(row)
      row = []
      current = ""
    } else current += char
  }
  row.push(current.trim())
  if (row.some((cell) => cell)) rows.push(row)
  if (rows.length < 2) return []
  const headers = rows[0].map(normalizeHeader)
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])))
}

function mapRows(rows: ParsedRow[], data: SalesDashboardData): MappedRow[] {
  return rows.map((row) => {
    const out: Record<string, string> = {}
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      const hit = aliases.map(normalizeHeader).find((alias) => row[alias])
      if (hit) out[field] = row[hit]
    }
    return {
      ...out,
      source: out.source || "monthly_batch_csv",
      report_locale: out.report_locale || data.scope.reportLocale,
      target_country: out.target_country || data.scope.targetCountry,
    }
  })
}

function BatchMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-950">{formatNumber(value)}</p>
    </div>
  )
}

function BatchCard({
  batch,
  onRun,
  running,
}: {
  batch: SalesLeadBatchSummary
  onRun: (batchId: string) => void
  running: boolean
}) {
  const progress = batch.totalRows > 0
    ? Math.round(((batch.outreachReadyCount + batch.manualReviewCount + batch.rejectedCount) / batch.totalRows) * 100)
    : 0

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-zinc-950">{batch.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(batch.status)}`}>
              {STATUS_LABELS[batch.status] ?? batch.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {batch.source} / {batch.targetCountry} / score {batch.minOutreachScore}+ / cap {formatNumber(batch.maxOutreachReady)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRun(batch.id)}
          disabled={running}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`${batch.name} の送信候補判定を実行`}
        >
          {running ? <RefreshCw size={15} className="animate-spin" aria-hidden /> : <Play size={15} aria-hidden />}
          判定
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        <BatchMetric label="投入" value={batch.totalRows} />
        <BatchMetric label="保存" value={batch.importedCount} />
        <BatchMetric label="重複" value={batch.duplicateCount} />
        <BatchMetric label="除外" value={batch.rejectedCount} />
        <BatchMetric label="調査待ち" value={batch.enrichmentQueuedCount} />
        <BatchMetric label="送信候補" value={batch.outreachReadyCount} />
        <BatchMetric label="手動確認" value={batch.manualReviewCount} />
        <BatchMetric label="反応" value={batch.respondedCount} />
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>判定進捗</span>
          <span>{progress}% / {formatDate(batch.updatedAt)}</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-zinc-100">
          <div className="h-2 rounded-full bg-zinc-950" style={{ width: `${Math.max(4, progress)}%` }} />
        </div>
      </div>
      {batch.topRejectionReasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {batch.topRejectionReasons.map((item) => (
            <span key={item.reason} className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600">
              {item.reason}: {formatNumber(item.count)}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

export function SalesBatchOpsPanel({ data }: { data: SalesDashboardData }) {
  const [csvText, setCsvText] = useState("")
  const [batchName, setBatchName] = useState("")
  const [source, setSource] = useState("apollo_wappalyzer_monthly")
  const [score, setScore] = useState(70)
  const [cap, setCap] = useState(500)
  const [busy, setBusy] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [batches, setBatches] = useState<SalesLeadBatchSummary[]>(data.leadBatches)

  const parsedRows = useMemo(() => mapRows(parseCsv(csvText), data), [csvText, data])
  const validRows = parsedRows.filter((row) => row.company_name && row.domain)

  async function refresh() {
    const res = await fetch(`/api/sales/batches?locale=${data.scope.reportLocale}&limit=8`, { credentials: "include" })
    const json = (await res.json()) as { ok?: boolean; batches?: SalesLeadBatchSummary[]; error?: string }
    if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
    setBatches(json.batches ?? [])
  }

  async function createBatch() {
    if (validRows.length === 0) {
      toast.error("会社名とドメインを含むCSVを貼り付けてください。")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/sales/batches", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: batchName || undefined,
          rows: validRows,
          report_locale: data.scope.reportLocale,
          target_country: data.scope.targetCountry,
          source,
          enrich: true,
          min_outreach_score: score,
          max_outreach_ready: cap,
          dry_run_only: true,
        }),
      })
      const json = (await res.json()) as { ok?: boolean; batch?: SalesLeadBatchSummary; error?: string }
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success("月次バッチを作成し、調査キューへ接続しました。")
      setCsvText("")
      setBatchName("")
      await refresh()
    } catch (error) {
      console.error("[sales-batch-ui] create failed:", error)
      toast.error(error instanceof Error ? error.message : "月次バッチの作成に失敗しました。")
    } finally {
      setBusy(false)
    }
  }

  async function runBatch(batchId: string) {
    setRunningId(batchId)
    try {
      const res = await fetch(`/api/sales/batches/${batchId}/run`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 1000 }),
      })
      const json = (await res.json()) as { ok?: boolean; processed?: number; outreachReady?: number; manualReview?: number; rejected?: number; error?: string }
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success(`判定完了: 処理 ${json.processed ?? 0} / 送信候補 ${json.outreachReady ?? 0} / 手動確認 ${json.manualReview ?? 0}`)
      await refresh()
    } catch (error) {
      console.error("[sales-batch-ui] run failed:", error)
      toast.error(error instanceof Error ? error.message : "バッチ判定に失敗しました。")
    } finally {
      setRunningId(null)
    }
  }

  return (
    <div className="space-y-4">
      <SalesSearxngSourcePanel data={data} onImported={refresh} />
      <SalesJapanReadinessPanel data={data} />

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Monthly Lead Batch</p>
            <h2 className="mt-1 text-base font-semibold text-zinc-950">月次リスト処理ライン</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-500">
              数万件のリストを、重複・低品質・証拠不足・手動確認・送信候補へ分けます。決済、契約、納品は手動に残し、商談化前の圧縮を自動化します。
            </p>
          </div>
          <button
            type="button"
            onClick={createBatch}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="月次リードバッチを作成"
          >
            {busy ? <RefreshCw size={16} className="animate-spin" aria-hidden /> : <UploadCloud size={16} aria-hidden />}
            バッチ作成
          </button>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_140px_140px]">
          <input value={batchName} onChange={(event) => setBatchName(event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500" placeholder="例: 2026-06 Shopify JP" aria-label="バッチ名" />
          <input value={source} onChange={(event) => setSource(event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500" aria-label="リスト元" />
          <input type="number" min={0} max={100} value={score} onChange={(event) => setScore(Number(event.target.value))} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500" aria-label="送信候補スコア閾値" />
          <input type="number" min={1} max={5000} value={cap} onChange={(event) => setCap(Number(event.target.value))} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500" aria-label="送信候補上限" />
        </div>
        <textarea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          className="mt-3 min-h-[220px] w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800 outline-none focus:border-zinc-500"
          placeholder="Company,Website,Industry,Email&#10;Example Inc,https://example.com,retail,info@example.com"
          aria-label="月次営業リストCSV"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1"><FileUp size={12} aria-hidden />読込 {formatNumber(parsedRows.length)}</span>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">有効 {formatNumber(validRows.length)}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-sky-700"><Gauge size={12} aria-hidden />score {score}+</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-800"><CheckCircle2 size={12} aria-hidden />送信上限 {formatNumber(cap)}</span>
        </div>
      </section>

      {batches.length === 0 ? (
        <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          月次バッチはまだありません。CSVを貼り付けて、今月の処理ラインを作成してください。
        </section>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} onRun={runBatch} running={runningId === batch.id} />
          ))}
        </div>
      )}
    </div>
  )
}
