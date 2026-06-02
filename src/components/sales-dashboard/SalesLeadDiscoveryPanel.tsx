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

const SOURCES: Array<{ value: LeadDiscoverySource; label: string; description: string; preset: string }> = [
  {
    value: "searxng",
    label: "SearxNG SERP",
    description: "セルフホスト検索から、業種・導入ツール・地域キーワードで候補ドメインを抽出します。",
    preset: '"powered by shopify" "contact"',
  },
  {
    value: "whoogle",
    label: "Whoogle Search",
    description: "Google系検索の軽量代替です。SearxNGが薄いクエリの補完に使います。",
    preset: '"webflow" "book a demo" "agency"',
  },
  {
    value: "rsshub_jobs",
    label: "求人シグナル",
    description: "Indeed / Glassdoorなどの求人をRSSHubまたはSERPで監視し、予算と人手不足が見える企業を拾います。",
    preset: '"video editor" "shopify developer" startup',
  },
  {
    value: "wellfound",
    label: "Wellfound",
    description: "資金調達直後・採用中の海外スタートアップを抽出します。",
    preset: '"growth marketer" "seed" "remote"',
  },
  {
    value: "whoisds_nrd",
    label: "WhoisDS NRD",
    description: "新規登録ドメインから、生まれた直後の事業・LP・ブランドを先回りで検知します。",
    preset: "studio",
  },
  {
    value: "agency_directory",
    label: "Clutch / Sortlist",
    description: "代理店・制作会社ディレクトリから、ホワイトレーベル動画やWeb制作の協業候補を抽出します。",
    preset: '"marketing agency" "shopify"',
  },
  {
    value: "partner_directory",
    label: "Shopify / Webflow Experts",
    description: "公認パートナー一覧から、技術力はあるが制作量・動画量で詰まりやすい代理店を探します。",
    preset: '"webflow expert" "ecommerce"',
  },
  {
    value: "events_directory",
    label: "展示会出展企業",
    description: "EventsEye / 10timesなどから、今まさにマーケ予算を使っている企業を抽出します。",
    preset: '"exhibitor list" "SaaS" "2026"',
  },
  {
    value: "publicwww",
    label: "PublicWWW",
    description: "HTML/JSタグ起点で、Klaviyo・Meta Pixel・Shopifyなど特定スタック導入企業を抽出します。",
    preset: '"klaviyo" "cdn.shopify.com"',
  },
  {
    value: "overpass",
    label: "Overpass / OSM",
    description: "ローカルSMBを地図データから抽出します。飲食店・店舗・クリニック向けに使います。",
    preset: "restaurant",
  },
  {
    value: "osint_contacts",
    label: "OSINT連絡先",
    description: "theHarvester / Hunter / Snovに渡す前段として、連絡先・経営者シグナルが濃い候補を抽出します。",
    preset: '"founder" "contact" "marketing"',
  },
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

  const selectedSource = SOURCES.find((item) => item.value === source) ?? SOURCES[0]

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Lead Source Arsenal</p>
          <h2 className="mt-1 text-base font-semibold text-zinc-950">無料API / OSS / シグナル型リスト水源</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-500">
            静的な企業DBだけでなく、求人、資金調達、展示会、新規ドメイン、代理店ディレクトリ、OSINTを起点に候補を出し、
            Supabase SSOTへ登録した瞬間に企業カルテ生成ジョブへ渡します。
          </p>
        </div>
        {lastImport && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{lastImport}</span>
        )}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_120px_auto_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 min-w-0 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500"
          placeholder={selectedSource?.preset ?? '"powered by shopify" "contact"'}
          aria-label="リード検索クエリ"
        />
        <select
          value={source}
          onChange={(event) => {
            const next = event.target.value as LeadDiscoverySource
            setSource(next)
            const preset = SOURCES.find((item) => item.value === next)?.preset
            if (preset) setQuery(preset)
          }}
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
      <p className="mt-2 text-xs leading-5 text-zinc-500">{selectedSource?.description}</p>
      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
        <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
          <DatabaseZap size={14} aria-hidden />
          候補プレビュー
        </div>
        {candidates.length === 0 ? (
          <p className="px-3 py-8 text-sm text-zinc-500">まだ候補はありません。検索してから必要なものをSSOTへ登録してください。</p>
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
