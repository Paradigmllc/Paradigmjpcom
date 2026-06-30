"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, ExternalLink, RefreshCw, Send, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import type { ExternalStudioTarget } from "@/lib/sales/external-studio-sync"

type SyncResult = {
  ok?: boolean
  companyName?: string
  domain?: string
  results?: Array<{
    target: string
    direction: string
    ok: boolean
    configured: boolean
    status: string
    message: string
    externalId?: string | null
    externalUrl?: string | null
  }>
  error?: string
}

type StudioKind = "directus" | "keystatic" | "all"

const STUDIO_META: Record<StudioKind, {
  title: string
  eyebrow: string
  description: string
  targets: ExternalStudioTarget[]
}> = {
  directus: {
    title: "Directus資料スタジオ同期",
    eyebrow: "DIRECTUS ASSETS",
    description: "Supabaseの営業カルテ、診断レポートURL、提案素材URLをDirectusの素材レコードへ同期し、Directus側の編集結果をSupabaseへ戻します。",
    targets: ["directus"],
  },
  keystatic: {
    title: "Keystaticデモサイト同期",
    eyebrow: "KEYSTATIC DEMO",
    description: "Supabaseの診断カルテと提案条件をKeystatic/Astro側の同期Webhookへ送り、デモサイトURLやGit反映結果をSupabaseへ戻します。",
    targets: ["keystatic"],
  },
  all: {
    title: "営業OSワンストップ同期",
    eyebrow: "SSOT SYNC",
    description: "Twenty、Directus、Keystaticをまとめて同期します。SupabaseをSSOTにして、外部GUIの結果は同期ログと会社metaへ戻します。",
    targets: ["twenty", "directus", "keystatic"],
  },
}

function resultTone(status: string, ok: boolean) {
  if (ok && status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "skipped") return "border-amber-200 bg-amber-50 text-amber-800"
  return "border-rose-200 bg-rose-50 text-rose-800"
}

function toolUrl(data: SalesDashboardData, slug: string, fallback: string): string {
  return data.toolConnections.find((tool) => tool.slug === slug)?.baseUrl ?? fallback
}

export function ExternalStudioSyncPanel({
  data,
  studio,
}: {
  data: SalesDashboardData
  studio: StudioKind
}) {
  const meta = STUDIO_META[studio]
  const [companyId, setCompanyId] = useState(data.companies[0]?.id ?? "")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const selectedCompany = useMemo(
    () => data.companies.find((company) => company.id === companyId) ?? null,
    [companyId, data.companies],
  )
  const directusUrl = toolUrl(data, "directus", "https://directus.paradigmjp.com")
  const keystaticUrl = toolUrl(data, "keystatic", "https://keystatic.paradigmjp.com")

  async function runSync() {
    if (!companyId) {
      toast.error("同期する会社を選択してください")
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/sales/companies/${companyId}/external-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: meta.targets }),
      })
      const json = (await res.json()) as SyncResult
      if (!res.ok || json.error) throw new Error(json.error ?? "外部スタジオ同期に失敗しました")
      setResult(json)
      const failed = (json.results ?? []).filter((item) => !item.ok && item.status !== "skipped")
      if (failed.length > 0) toast.error("一部の同期が失敗しました。結果ログを確認してください")
      else toast.success("外部スタジオ同期を実行しました")
    } catch (error) {
      console.error("[external-studio-sync-panel] sync failed:", error)
      const message = error instanceof Error ? error.message : "外部スタジオ同期に失敗しました"
      setResult({ ok: false, error: message })
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="grid min-w-0 gap-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">{meta.eyebrow}</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">{meta.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{meta.description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a
              href={`${directusUrl.replace(/\/+$/, "")}/admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800"
            >
              Directus
              <ExternalLink size={14} aria-hidden />
            </a>
            <a
              href={keystaticUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800"
            >
              Keystatic
              <ExternalLink size={14} aria-hidden />
            </a>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="grid min-w-0 gap-1.5 text-xs font-medium text-zinc-600">
            <span>同期対象企業</span>
            <select
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className="h-11 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
            >
              {data.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName} / {company.domain}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void runSync()}
            disabled={busy || !companyId}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? <RefreshCw size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
            Supabaseから同期
          </button>
        </div>

        {selectedCompany ? (
          <div className="mt-4 grid gap-2 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 sm:grid-cols-3">
            <div><span className="font-semibold text-zinc-800">会社:</span> {selectedCompany.companyName}</div>
            <div><span className="font-semibold text-zinc-800">レポート:</span> {selectedCompany.reportUrl ?? "未生成"}</div>
            <div><span className="font-semibold text-zinc-800">商材:</span> {selectedCompany.templateVariant ?? "未設定"}</div>
          </div>
        ) : null}
      </div>

      {result ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
            {result.ok ? <CheckCircle2 size={16} className="text-emerald-600" aria-hidden /> : <TriangleAlert size={16} className="text-amber-600" aria-hidden />}
            同期結果
          </div>
          {result.error ? <p className="mt-3 text-sm font-medium text-rose-600">{result.error}</p> : null}
          <div className="mt-4 grid gap-2">
            {(result.results ?? []).map((item, index) => (
              <div key={`${item.direction}-${index}`} className={`rounded-lg border p-3 text-xs ${resultTone(item.status, item.ok)}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{item.direction}</div>
                  <div className="rounded-full bg-white/70 px-2 py-0.5">{item.status}</div>
                </div>
                <p className="mt-2 leading-5">{item.message}</p>
                {item.externalUrl ? (
                  <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex break-all font-semibold underline underline-offset-2">
                    {item.externalUrl}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
