"use client"

import { useMemo, useState } from "react"
import { FileUp, Play, RotateCw, Send, UploadCloud } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { formatDate, statusTone } from "./SalesCommandPanels"

type ParsedRow = Record<string, string>

const FIELD_ALIASES: Record<string, string[]> = {
  company_name: ["company", "company name", "会社名", "企業名", "organization", "account name"],
  domain: ["website", "domain", "url", "会社url", "企業url", "homepage", "ホームページ", "webサイト"],
  industry: ["industry", "業種"],
  prefecture: ["state", "prefecture", "都道府県", "所在地", "country"],
  email: ["email", "mail", "メール"],
  phone: ["phone", "tel", "電話"],
  contact_name: ["name", "contact", "担当者", "氏名", "first name + last name"],
  contact_title: ["title", "役職", "position"],
  source: ["source", "リスト元"],
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
      continue
    }
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === "," && !quoted) {
      row.push(current.trim())
      current = ""
      continue
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++
      row.push(current.trim())
      if (row.some((cell) => cell.length > 0)) rows.push(row)
      row = []
      current = ""
      continue
    }
    current += char
  }

  row.push(current.trim())
  if (row.some((cell) => cell.length > 0)) rows.push(row)
  if (rows.length < 2) return []

  const headers = rows[0].map(normalizeHeader)
  return rows.slice(1).map((cells) => {
    const out: ParsedRow = {}
    headers.forEach((header, index) => {
      out[header] = cells[index] ?? ""
    })
    return out
  })
}

function mapCsvRows(rows: ParsedRow[]) {
  return rows.map((row) => {
    const mapped: Record<string, string> = {}
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      const hit = aliases.map(normalizeHeader).find((alias) => row[alias])
      if (hit) mapped[field] = row[hit]
    }
    if (!mapped.source) mapped.source = "dashboard_csv"
    return mapped
  })
}

function countByStatus(data: SalesDashboardData) {
  const counts: Record<string, number> = {}
  for (const job of data.enrichmentJobs) counts[job.status] = (counts[job.status] ?? 0) + 1
  return counts
}

export function SalesAutomationPanel({ data }: { data: SalesDashboardData }) {
  const [csvText, setCsvText] = useState("")
  const [busy, setBusy] = useState(false)
  const [outreachBusy, setOutreachBusy] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [lastOutreachResult, setLastOutreachResult] = useState<string | null>(null)
  const parsedRows = useMemo(() => mapCsvRows(parseCsv(csvText)), [csvText])
  const validRows = parsedRows.filter((row) => row.company_name && row.domain)
  const statusCounts = countByStatus(data)

  async function importCsv() {
    if (validRows.length === 0) {
      toast.error("会社名とドメインを含むCSVを貼り付けてください")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/sales/import-csv", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows, enrich: true }),
      })
      const json = (await res.json()) as {
        ok?: boolean
        inserted?: number
        skipped?: number
        jobs_enqueued?: number
        error?: string
      }
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      const message = `保存 ${json.inserted ?? 0}件 / 既存 ${json.skipped ?? 0}件 / ジョブ ${json.jobs_enqueued ?? 0}件`
      setLastResult(message)
      toast.success(message)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error("[sales-csv-import] failed:", e)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function runJobs() {
    setBusy(true)
    try {
      const res = await fetch("/api/sales/enrichment/run", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 5 }),
      })
      const json = (await res.json()) as { processed?: number; completed?: number; failed?: number; errors?: string[] }
      if (!res.ok && res.status !== 207) throw new Error(json.errors?.[0] ?? `HTTP ${res.status}`)
      const message = `処理 ${json.processed ?? 0}件 / 完了 ${json.completed ?? 0}件 / 失敗 ${json.failed ?? 0}件`
      setLastResult(message)
      toast.success(message)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error("[sales-enrichment-run] failed:", e)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function runOutreachDryRun() {
    setOutreachBusy(true)
    try {
      const res = await fetch("/api/sales/outreach/run", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: "jp",
          limit: 3,
          dryRun: true,
          first5Approval: true,
          enableLlm: false,
          checkRobots: true,
          dedupDays: 30,
        }),
      })
      const json = (await res.json()) as {
        ok?: boolean
        processed?: number
        manualQueue?: number
        failed?: number
        error?: string
      }
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      const message = `dry-run ${json.processed ?? 0}件 / 手動確認 ${json.manualQueue ?? 0}件 / 失敗 ${json.failed ?? 0}件`
      setLastOutreachResult(message)
      toast.success(message)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error("[sales-outreach-dry-run] failed:", e)
      toast.error(message)
    } finally {
      setOutreachBusy(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">CSV投入</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              Apollo、Fumadata、BIZMapなどのCSVを貼り付けると、Supabase SSOTへ保存し、企業カルテ生成ジョブを即時キューに入れます。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={importCsv}
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="CSVを投入してカルテ生成を開始"
            >
              <UploadCloud size={16} aria-hidden />
              投入
            </button>
            <button
              type="button"
              onClick={runJobs}
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="待機中の企業カルテ生成ジョブを実行"
            >
              {busy ? <RotateCw size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden />}
              実行
            </button>
          </div>
        </div>
        <textarea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          className="mt-4 min-h-[260px] w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800 outline-none focus:border-zinc-500"
          placeholder="Company,Website,Industry,Email&#10;Example Inc,https://example.com,consulting,info@example.com"
          aria-label="営業リストCSV"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1">
            <FileUp size={12} aria-hidden />
            読込 {parsedRows.length}件
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">有効 {validRows.length}件</span>
          {lastResult && <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">{lastResult}</span>}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-950">カルテ生成ジョブ</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["queued", "running", "completed"].map((status) => (
            <div key={status} className="rounded-lg border border-zinc-200 p-3">
              <div className="text-xs text-zinc-500">{status}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{statusCounts[status] ?? 0}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 divide-y divide-zinc-100">
          {data.enrichmentJobs.length === 0 ? (
            <p className="py-8 text-sm text-zinc-500">まだジョブがありません。</p>
          ) : (
            data.enrichmentJobs.slice(0, 12).map((job) => (
              <div key={job.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-950">
                      {job.companyName ?? job.domain ?? job.companyId}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {job.source ?? "-"} / {formatDate(job.updatedAt)}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${statusTone(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                {job.errorMessage && (
                  <div className="mt-2 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700">
                    {job.errorMessage}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">フォーム営業 dry-run</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                実送信せずにフォームURL探索、分類、robots/preflight、文面差し込みまで確認します。本送信は初回承認キューを通します。
              </p>
            </div>
            <button
              type="button"
              onClick={runOutreachDryRun}
              disabled={outreachBusy}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="フォーム営業dry-runを実行"
            >
              {outreachBusy ? <RotateCw size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
              dry-run
            </button>
          </div>
          {lastOutreachResult && (
            <div className="mt-3 rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
              {lastOutreachResult}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
