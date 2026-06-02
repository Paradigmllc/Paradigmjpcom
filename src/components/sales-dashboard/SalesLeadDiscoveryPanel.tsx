"use client"

import { useState } from "react"
import { DatabaseZap, Search, UploadCloud } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import type { LeadDiscoveryCandidate, LeadDiscoverySource } from "@/lib/sales/sources/lead-discovery"

interface ApiResult {
  ok?: boolean
  source?: LeadDiscoverySource
  candidates?: LeadDiscoveryCandidate[]
  inserted?: number
  skipped?: number
  jobs_enqueued?: number
  error?: string
}

const SOURCES: Array<{ value: LeadDiscoverySource; label: string; description: string }> = [
  { value: "searxng", label: "SearxNG", description: "検索結果から海外SMB候補を抽出" },
  { value: "whoogle", label: "Whoogle", description: "Google系SERPの軽量代替" },
  { value: "overpass", label: "Overpass", description: "地図・ローカル店舗候補を抽出" },
  { value: "publicwww", label: "PublicWWW", description: "HTML/JSタグ起点で抽出" },
]

export function SalesLeadDiscoveryPanel({ data }: { data: SalesDashboardData }) {
  const [query, setQuery] = useState('"powered by shopify" "contact"')
  const [source, setSource] = useState<LeadDiscoverySource>("searxng")
  const [limit, setLimit] = useState(20)
  const [busy, setBusy] = useState(false)
  const [candidates, setCandidates] = useState<LeadDiscoveryCandidate[]>([])
  const [lastImport, setLastImport] = useState<string | null>(null)

  async function run(importNow: boolean) {
    const cleanQuery = query.trim()
    if (!cleanQuery) {
      toast.error("検索クエリを入力してください")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/sales/lead-discovery", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: cleanQuery,
          source,
          limit,
          import: importNow,
          report_locale: data.scope.reportLocale,
          target_country: data.scope.targetCountry,
        }),
      })
      const json = (await res.json()) as ApiResult
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setCandidates(json.candidates ?? [])
      if (importNow) {
        const message = `登録 ${json.inserted ?? 0}件 / 既存 ${json.skipped ?? 0}件 / ジョブ ${json.jobs_enqueued ?? 0}件`
        setLastImport(message)
        toast.success(message)
      } else {
        toast.success(`候補 ${json.candidates?.length ?? 0}件を取得しました`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("[sales-lead-discovery] failed:", error)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const selectedSource = SOURCES.find((item) => item.value === source)

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Lead Source</p>
          <h2 className="mt-1 text-base font-semibold text-zinc-950">無料API/OSS リード水源</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">
            SearxNG / Whoogle / Overpass / PublicWWW から候補ドメインを取得し、Supabase SSOTへ登録して企業カルテ生成ジョブにつなぎます。
          </p>
        </div>
        {lastImport && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{lastImport}</span>
        )}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_170px_120px_auto_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500"
          placeholder='"powered by shopify" "contact"'
          aria-label="リード検索クエリ"
        />
        <select
          value={source}
          onChange={(event) => setSource(event.target.value as LeadDiscoverySource)}
          className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500"
          aria-label="リード検索ソース"
        >
          {SOURCES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={100}
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value))}
          className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500"
          aria-label="取得件数"
        />
        <button
          type="button"
          onClick={() => run(false)}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="候補だけを取得"
        >
          <Search size={16} aria-hidden />
          取得
        </button>
        <button
          type="button"
          onClick={() => run(true)}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="候補をSupabaseへ登録"
        >
          <UploadCloud size={16} aria-hidden />
          登録
        </button>
      </div>
      {selectedSource && <p className="mt-2 text-xs text-zinc-500">{selectedSource.description}</p>}
      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
        <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
          <DatabaseZap size={14} aria-hidden />
          候補プレビュー
        </div>
        {candidates.length === 0 ? (
          <p className="px-3 py-8 text-sm text-zinc-500">まだ候補はありません。検索してから登録してください。</p>
        ) : (
          <div className="max-h-[320px] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">企業候補</th>
                  <th className="px-3 py-2 font-medium">ドメイン</th>
                  <th className="px-3 py-2 font-medium">根拠</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={`${candidate.source}:${candidate.domain}`} className="border-t border-zinc-100">
                    <td className="px-3 py-3">
                      <div className="font-medium text-zinc-950">{candidate.companyName}</div>
                      <div className="mt-1 text-xs text-zinc-500">{candidate.source}</div>
                    </td>
                    <td className="px-3 py-3 text-zinc-700">{candidate.domain}</td>
                    <td className="max-w-xl px-3 py-3 text-xs leading-5 text-zinc-500">{candidate.snippet || candidate.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
