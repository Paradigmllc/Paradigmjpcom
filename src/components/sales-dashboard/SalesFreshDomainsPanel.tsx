"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, Globe2, Loader2, RefreshCw, Rocket, Search, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { formatDate, formatNumber } from "./format-utils"
import { statusTone } from "./sales-panels-shared"

type WebsiteState = "unknown" | "dead" | "parked" | "under_construction" | "default_server" | "legacy" | "modern"

interface CandidateScore {
  opportunityScore: number
  falsePositiveRisk: number
  geoConfidence: number
  contactabilityScore: number
  websiteAbsenceScore: number
  freshnessScore: number
}

interface FreshCandidate {
  id: string
  domain: string
  rootUrl: string | null
  lane: string
  sourceSlug: string
  status: string
  companyId: string | null
  lastSeenAt: string
  meta: Record<string, unknown>
  score: CandidateScore | null
  countries: Array<{ countryCode: string; signalType: string; confidence: number; evidence: string }>
}

interface DiscoveryResult {
  ok: boolean
  countryCode: string
  discovered: number
  rdapChecked: number
  sourceStats: Array<{ source: string; pattern: string; fetched: number; total: number; ok: boolean; error?: string }>
  failures: Array<{ key: string; reason: string }>
  ingestion: {
    upserted: number
    scored: number
    promoted: number
    jobsEnqueued: number
    failures: Array<{ key: string; reason: string }>
  }
}

interface CandidateResponse {
  ok: boolean
  candidates: FreshCandidate[]
  count: number
  error?: string
}

const countryOptions = [
  { value: "US", label: "US" },
  { value: "GB", label: "GB" },
  { value: "AU", label: "AU" },
  { value: "CA", label: "CA" },
  { value: "DE", label: "DE" },
  { value: "JP", label: "JP" },
]

const websiteStates: Array<{ value: WebsiteState; label: string }> = [
  { value: "unknown", label: "未判定" },
  { value: "parked", label: "駐車中" },
  { value: "under_construction", label: "準備中" },
  { value: "default_server", label: "初期画面" },
  { value: "legacy", label: "古いHP" },
  { value: "dead", label: "停止中" },
]

function metaText(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key]
  return typeof value === "string" && value.trim() ? value : null
}

function metaBool(meta: Record<string, unknown>, key: string): boolean {
  return meta[key] === true
}

function scoreTone(score: number | null | undefined): string {
  if (typeof score !== "number") return "bg-zinc-100 text-zinc-700"
  if (score >= 70) return "bg-emerald-100 text-emerald-700"
  if (score >= 55) return "bg-amber-100 text-amber-800"
  return "bg-zinc-100 text-zinc-700"
}

export function SalesFreshDomainsPanel() {
  const [countryCode, setCountryCode] = useState("US")
  const [limit, setLimit] = useState(120)
  const [lookupLimit, setLookupLimit] = useState(60)
  const [websiteState, setWebsiteState] = useState<WebsiteState>("unknown")
  const [promote, setPromote] = useState(false)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [candidates, setCandidates] = useState<FreshCandidate[]>([])
  const [result, setResult] = useState<DiscoveryResult | null>(null)

  async function loadCandidates(nextCountry = countryCode) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        lane: "dns_freshness",
        country_code: nextCountry,
        limit: "120",
      })
      const res = await fetch(`/api/sales/lead-candidates?${params.toString()}`, { cache: "no-store", credentials: "include" })
      const body = await res.json() as CandidateResponse
      if (!res.ok || !body.ok) throw new Error(body.error ?? "候補一覧の取得に失敗しました")
      setCandidates(body.candidates ?? [])
    } catch (caught) {
      console.error("[fresh-domains] candidate load failed:", caught)
      const message = caught instanceof Error ? caught.message : "候補一覧の取得に失敗しました"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCandidates(countryCode)
  }, [countryCode])

  async function runDiscovery() {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/sales/lead-candidates/fresh-domains/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ countryCode, limit, lookupLimit, websiteState, promote }),
      })
      const body = await res.json() as DiscoveryResult & { error?: string }
      if (!res.ok || !body.ok) throw new Error(body.error ?? "Fresh domain取得に失敗しました")
      setResult(body)
      toast.success(`${body.countryCode}: ${formatNumber(body.ingestion.upserted)}件を候補化しました`)
      await loadCandidates(body.countryCode)
    } catch (caught) {
      console.error("[fresh-domains] discovery failed:", caught)
      const message = caught instanceof Error ? caught.message : "Fresh domain取得に失敗しました"
      setError(message)
      toast.error(message)
    } finally {
      setRunning(false)
    }
  }

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return candidates
    return candidates.filter((candidate) => {
      const company = metaText(candidate.meta, "company_name")
      const industry = metaText(candidate.meta, "industry_hint")
      return [candidate.domain, candidate.status, company, industry].filter(Boolean).some((value) => value?.toLowerCase().includes(query))
    })
  }, [candidates, search])

  const highScoreCount = candidates.filter((candidate) => (candidate.score?.opportunityScore ?? 0) >= 64).length
  const promotedCount = candidates.filter((candidate) => candidate.status === "promoted").length

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">Fresh Domain 収集</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              CZDS/zone・crt.sh・RDAPを one-shot で確認し、SMB候補だけをSales OSへ投入します。
            </p>
          </div>
          <button
            type="button"
            onClick={runDiscovery}
            disabled={running}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
            aria-label="Fresh Domain 取得を実行"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
            {running ? "取得中..." : "取得実行"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <label className="text-xs font-semibold text-zinc-600">
            国
            <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-2 text-xs outline-none focus:border-zinc-500">
              {countryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-zinc-600">
            取得上限
            <input type="number" min={1} max={500} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-2 text-xs outline-none focus:border-zinc-500" />
          </label>
          <label className="text-xs font-semibold text-zinc-600">
            RDAP確認
            <input type="number" min={1} max={120} value={lookupLimit} onChange={(e) => setLookupLimit(Number(e.target.value))} className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-2 text-xs outline-none focus:border-zinc-500" />
          </label>
          <label className="text-xs font-semibold text-zinc-600">
            HP状態
            <select value={websiteState} onChange={(e) => setWebsiteState(e.target.value as WebsiteState)} className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-2 text-xs outline-none focus:border-zinc-500">
              {websiteStates.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}
            </select>
          </label>
          <label className="flex items-end gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700">
            <input type="checkbox" checked={promote} onChange={(e) => setPromote(e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
            上位候補を企業化
          </label>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <Metric label="候補" value={formatNumber(candidates.length)} icon={Globe2} />
          <Metric label="有望" value={formatNumber(highScoreCount)} icon={ShieldCheck} />
          <Metric label="企業化済み" value={formatNumber(promotedCount)} icon={Rocket} />
          <Metric label="最終取得" value={formatDate(candidates[0]?.lastSeenAt ?? null)} icon={RefreshCw} />
        </div>

        {result && (
          <div className="mt-4 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
            discovered {formatNumber(result.discovered)} / RDAP {formatNumber(result.rdapChecked)} / upserted {formatNumber(result.ingestion.upserted)} / promoted {formatNumber(result.ingestion.promoted)}
          </div>
        )}
        {error && <div className="mt-4 rounded-md border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">Fresh Domain 候補レビュー</h3>
            <p className="mt-1 text-xs text-zinc-500">スコア、国判定、HP状態、連絡先シグナルを確認します。</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ドメイン検索" className="w-full rounded border border-zinc-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-zinc-500" />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-[960px] w-full table-fixed text-left">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className="bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">ドメイン</th>
                <th className="px-3 py-2 font-medium">状態</th>
                <th className="px-3 py-2 text-right font-medium">スコア</th>
                <th className="px-3 py-2 text-right font-medium">地域</th>
                <th className="px-3 py-2 font-medium">HP状態</th>
                <th className="px-3 py-2 font-medium">連絡先</th>
                <th className="px-3 py-2 font-medium">最終確認</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-zinc-500">読み込み中...</td></tr>
              ) : filteredCandidates.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-zinc-500">候補はまだありません。</td></tr>
              ) : filteredCandidates.map((candidate) => {
                const score = candidate.score?.opportunityScore ?? null
                const state = metaText(candidate.meta, "website_state") ?? "unknown"
                const contact = metaBool(candidate.meta, "contact_email_present") || Boolean(metaText(candidate.meta, "public_contact_url"))
                return (
                  <tr key={candidate.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-zinc-950">{candidate.domain}</span>
                        <a href={candidate.rootUrl ?? `https://${candidate.domain}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-zinc-400 hover:text-zinc-700" aria-label={`${candidate.domain} を開く`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <div className="mt-1 truncate text-xs text-zinc-500">{candidate.sourceSlug}</div>
                    </td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] ${statusTone(candidate.status)}`}>{candidate.status}</span></td>
                    <td className="px-3 py-3 text-right"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${scoreTone(score)}`}>{score ?? "-"}</span></td>
                    <td className="px-3 py-3 text-right text-xs text-zinc-700">{candidate.score?.geoConfidence ?? "-"}</td>
                    <td className="px-3 py-3 text-xs text-zinc-700">{state}</td>
                    <td className="px-3 py-3 text-xs text-zinc-700">{contact ? "あり" : "未確認"}</td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{formatDate(candidate.lastSeenAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {result && result.sourceStats.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-950">取得元ログ</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {result.sourceStats.map((stat, index) => (
              <div key={`${stat.source}-${stat.pattern}-${index}`} className="rounded-md border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-600">
                <div className="font-semibold text-zinc-900">{stat.source} / {stat.pattern}</div>
                <div className="mt-1">fetched {formatNumber(stat.fetched)} / total {formatNumber(stat.total)}</div>
                {stat.error && <div className="mt-1 text-rose-600">{stat.error}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Globe2 }) {
  return (
    <div className="rounded-md border border-zinc-100 bg-zinc-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase text-zinc-500">{label}</span>
        <Icon className="h-3.5 w-3.5 text-zinc-400" />
      </div>
      <div className="mt-1 text-lg font-bold text-zinc-950">{value}</div>
    </div>
  )
}
