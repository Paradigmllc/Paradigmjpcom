"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe2,
  Link2,
  Loader2,
  Search,
  ShieldAlert,
  UploadCloud,
} from "lucide-react"
import { toast } from "sonner"
import type { DashboardCompany, SalesDashboardData } from "@/lib/sales/dashboard"
import type { CompanyKarteSnapshot } from "@/lib/sales/company-karte"
import { statusTone } from "./SalesCommandPanels"

interface Props {
  data: SalesDashboardData
}

type KarteState =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: CompanyKarteSnapshot; error: null }
  | { status: "error"; data: null; error: string }

function sourceTone(status: string): string {
  if (status === "collected") return "bg-emerald-50 text-emerald-700"
  if (status === "configured" || status === "queued") return "bg-amber-50 text-amber-800"
  if (status === "missing" || status === "error") return "bg-rose-50 text-rose-700"
  return "bg-zinc-100 text-zinc-700"
}

function evidenceTone(tone: string): string {
  if (tone === "good") return "border-emerald-200 bg-emerald-50"
  if (tone === "warning") return "border-amber-200 bg-amber-50"
  return "border-zinc-200 bg-white"
}

function urlText(value: string | null): string {
  return value && value.trim().length > 0 ? value : "未設定"
}

function CompanyList({
  companies,
  selectedId,
  onSelect,
}: {
  companies: DashboardCompany[]
  selectedId: string | null
  onSelect: (companyId: string) => void
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 p-3">
        <div className="text-xs font-medium text-zinc-500">企業リスト</div>
      </div>
      <div className="max-h-[680px] overflow-y-auto">
        {companies.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">企業データがまだありません。</p>
        ) : (
          companies.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => onSelect(company.id)}
              className={`block w-full border-b border-zinc-100 px-4 py-3 text-left transition hover:bg-zinc-50 ${
                selectedId === company.id ? "bg-zinc-950 text-white hover:bg-zinc-900" : "text-zinc-950"
              }`}
              aria-label={`${company.companyName} の企業カルテを表示`}
            >
              <span className="block truncate text-sm font-semibold">{company.companyName}</span>
              <span className={`mt-1 block truncate text-xs ${selectedId === company.id ? "text-zinc-300" : "text-zinc-500"}`}>
                {company.domain} / {company.targetCountry ?? "-"} / {company.reportLocale ?? "-"}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function LinkCard({ label, url }: { label: string; url: string | null }) {
  const enabled = Boolean(url)
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        <Link2 size={14} aria-hidden />
        {label}
      </div>
      {enabled ? (
        <a
          href={url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block break-all text-sm font-semibold text-zinc-950 underline-offset-2 hover:underline"
        >
          {url}
        </a>
      ) : (
        <div className="mt-2 text-sm font-semibold text-zinc-400">未設定</div>
      )}
    </div>
  )
}

function KarteDetail({ karte, onSyncTwenty, syncingTwenty }: {
  karte: CompanyKarteSnapshot
  onSyncTwenty: () => void
  syncingTwenty: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span>{karte.domain}</span>
              <span className="rounded-full bg-zinc-100 px-2 py-1">{karte.targetCountry}</span>
              <span className="rounded-full bg-zinc-100 px-2 py-1">{karte.reportLocale}</span>
              <span className="rounded-full bg-zinc-100 px-2 py-1">{karte.templateVariant}</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-zinc-950">{karte.companyName}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600">
              {karte.diagnosisSummary ?? "Dify診断待ちです。CSV投入後の収集ジョブが完了すると、痛み・提案・文面生成の根拠がここに集まります。"}
            </p>
          </div>
          <div className="grid min-w-[260px] grid-cols-3 gap-2">
            <div className="rounded-md bg-zinc-950 p-3 text-white">
              <div className="text-xs text-zinc-300">取得率</div>
              <div className="mt-1 text-xl font-semibold">{karte.sourceScore}%</div>
            </div>
            <div className="rounded-md bg-emerald-50 p-3 text-emerald-800">
              <div className="text-xs">取得済み</div>
              <div className="mt-1 text-xl font-semibold">{karte.collectedCount}</div>
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-amber-800">
              <div className="text-xs">設定済み</div>
              <div className="mt-1 text-xl font-semibold">{karte.configuredCount}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSyncTwenty}
            disabled={syncingTwenty}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-950 bg-zinc-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Twenty企業個別ページへ企業カルテを同期"
          >
            {syncingTwenty ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <UploadCloud size={15} aria-hidden />}
            Twentyへ同期
          </button>
          <span className="inline-flex items-center rounded-md border border-zinc-200 px-3 text-xs text-zinc-500">
            Twentyでは企業個別ページのNotes/TimelineにフォームURL・診断レポートURL・取得根拠を表示します。
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <LinkCard label="フォームURL" url={karte.formUrl} />
        <LinkCard label="診断レポートURL" url={karte.reportUrl} />
        <LinkCard label="AstroデモURL" url={karte.demoUrl} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" aria-hidden />
            <h3 className="text-sm font-semibold text-zinc-950">無料API/OSS取得データ</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {karte.evidence.length === 0 ? (
              <p className="text-sm text-zinc-500">まだ取得済みの根拠データがありません。</p>
            ) : (
              karte.evidence.map((item) => (
                <div key={`${item.label}-${item.source}`} className={`rounded-lg border p-3 ${evidenceTone(item.tone)}`}>
                  <div className="text-xs font-medium text-zinc-500">{item.source}</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-950">{item.label}</div>
                  <div className="mt-1 break-words text-sm text-zinc-700">{item.value}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Globe2 size={16} className="text-sky-600" aria-hidden />
            <h3 className="text-sm font-semibold text-zinc-950">i18n別レポートURL</h3>
          </div>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {karte.localizedReportUrls.length === 0 ? (
              <p className="text-sm text-zinc-500">slugが未設定のためURLを生成できません。</p>
            ) : (
              karte.localizedReportUrls.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 p-2 text-sm hover:bg-zinc-50"
                >
                  <span className="font-medium text-zinc-700">{link.label}</span>
                  <ExternalLink size={14} className="shrink-0 text-zinc-400" aria-hidden />
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-amber-600" aria-hidden />
          <h3 className="text-sm font-semibold text-zinc-950">ソース別取得状況</h3>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {karte.sourceItems.map((item) => (
            <div key={item.slug} className="rounded-lg border border-zinc-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-zinc-950">{item.label}</div>
                  <div className="mt-1 text-xs text-zinc-500">{item.category}</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${sourceTone(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <div className="mt-2 text-xs leading-relaxed text-zinc-600">{item.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CompanyKartePanel({ data }: Props) {
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(data.companies[0]?.id ?? null)
  const [state, setState] = useState<KarteState>({ status: "idle", data: null, error: null })
  const [syncingTwenty, setSyncingTwenty] = useState(false)

  const companies = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data.companies
    return data.companies.filter((company) =>
      [company.companyName, company.domain, company.targetCountry ?? "", company.reportLocale ?? ""]
        .some((value) => value.toLowerCase().includes(q)),
    )
  }, [data.companies, query])

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    setState({ status: "loading", data: null, error: null })

    fetch(`/api/sales/companies/${selectedId}/karte`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = (await res.json()) as { ok?: boolean; karte?: CompanyKarteSnapshot; error?: string }
        if (!res.ok || !body.ok || !body.karte) throw new Error(body.error ?? "企業カルテを取得できませんでした")
        setState({ status: "ready", data: body.karte, error: null })
      })
      .catch((e) => {
        if (controller.signal.aborted) return
        const message = e instanceof Error ? e.message : "企業カルテを取得できませんでした"
        console.error("[company-karte-panel] fetch failed:", e)
        toast.error(message)
        setState({ status: "error", data: null, error: message })
      })

    return () => controller.abort()
  }, [selectedId])

  async function syncTwenty() {
    if (!selectedId) return
    setSyncingTwenty(true)
    try {
      const res = await fetch(`/api/sales/companies/${selectedId}/twenty-sync`, {
        method: "POST",
        credentials: "include",
      })
      const body = (await res.json()) as { ok?: boolean; error?: string; noteId?: string }
      if (!res.ok || !body.ok) throw new Error(body.error ?? "Twenty同期に失敗しました")
      toast.success("Twentyの企業個別ページへ企業カルテを同期しました")
    } catch (e) {
      const message = e instanceof Error ? e.message : "Twenty同期に失敗しました"
      console.error("[company-karte-panel] Twenty sync failed:", e)
      toast.error(message)
    } finally {
      setSyncingTwenty(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-500"
              placeholder="企業・国・言語で検索"
              aria-label="企業カルテ検索"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2 py-1 ${statusTone(data.status)}`}>{data.status}</span>
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700">{companies.length}件</span>
          </div>
        </div>
        <CompanyList companies={companies} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {state.status === "loading" && (
        <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Loader2 size={18} className="animate-spin" aria-hidden />
            企業カルテを読み込んでいます
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {state.error}
        </div>
      )}

      {state.status === "idle" && (
        <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm text-zinc-500">
          <FileText size={18} className="mr-2" aria-hidden />
          左の企業を選択してください。
        </div>
      )}

      {state.status === "ready" && (
        <KarteDetail karte={state.data} onSyncTwenty={syncTwenty} syncingTwenty={syncingTwenty} />
      )}
    </div>
  )
}
