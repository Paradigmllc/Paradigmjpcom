"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowUpRight, Download, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { VideoGrowthDashboard as Dashboard, VideoGrowthPrincipal } from "@/lib/video-growth/types"
import { VideoGrowthCampaignCard } from "./VideoGrowthCampaignCard"
import { VideoGrowthCreateForm } from "./VideoGrowthCreateForm"
import { VideoGrowthKpis } from "./VideoGrowthKpis"

type ApiPayload = { ok?: boolean; error?: string; dashboard?: Dashboard; principal?: VideoGrowthPrincipal }

async function apiRequest(method: "GET" | "POST" | "PATCH", body?: Record<string, unknown>): Promise<ApiPayload> {
  const response = await fetch("/api/sales/video-growth", {
    method, headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined, cache: "no-store",
  })
  const payload = await response.json() as ApiPayload
  if (!response.ok || !payload.ok) throw new Error(payload.error || "Video Growth API operation failed")
  return payload
}

function LoadingView() {
  return <div className="space-y-5" aria-label="Video Growthを読み込み中"><div className="h-24 animate-pulse rounded-2xl bg-zinc-200" /><div className="grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-zinc-200" />)}</div><div className="h-96 animate-pulse rounded-2xl bg-zinc-200" /></div>
}

export function VideoGrowthDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [principal, setPrincipal] = useState<VideoGrowthPrincipal | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [workStatus, setWorkStatus] = useState("all")

  const refresh = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(null)
      const payload = await apiRequest("GET")
      setDashboard(payload.dashboard ?? null)
      setPrincipal(payload.principal ?? null)
    } catch (loadError) {
      console.error("[video-growth-dashboard] load failed:", loadError)
      if (!silent) setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました")
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(true), 30_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const projectMap = useMemo(() => new Map((dashboard?.studioProjects ?? []).map((project) => [project.projectId, project])), [dashboard?.studioProjects])
  const filteredCampaigns = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return (dashboard?.campaigns ?? []).filter((campaign) => {
      const matchesQuery = !normalized || [campaign.name, campaign.workOrder?.clientName ?? "", campaign.owner, campaign.studioProjectName].some((value) => value.toLowerCase().includes(normalized))
      const matchesStatus = workStatus === "all" || campaign.workOrder?.workStatus === workStatus
      return matchesQuery && matchesStatus
    })
  }, [dashboard?.campaigns, query, workStatus])

  const mutate = async (method: "POST" | "PATCH", payload: Record<string, unknown>, success: string) => {
    setBusy(true)
    try {
      await apiRequest(method, payload)
      toast.success(success)
      await refresh()
    } catch (mutationError) {
      console.error("[video-growth-dashboard] mutation failed:", mutationError)
      toast.error(mutationError instanceof Error ? mutationError.message : "操作に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Video Subscription Commercial Operations</p><h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">動画サブスク商用運用OS</h1><p className="mt-3 text-sm leading-6 text-zinc-600">契約・請求・入稿・利用権・制作・内部QA・顧客承認・修正・公開・日次成果までを一つの監査台帳で運用します。外部投稿やメール送信は自動実行しません。</p></div>
            <div className="flex flex-wrap gap-2"><Link href="/video-factory-console" prefetch={false} className="inline-flex min-h-10 items-center rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Video Factory<ArrowUpRight className="ml-2 h-4 w-4" /></Link><a href="/api/sales/video-growth/export" download className="inline-flex min-h-10 items-center rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"><Download className="mr-2 h-4 w-4" />運用CSV</a><Button variant="outline" onClick={() => void refresh()} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />更新</Button></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            <div><p className="text-xs font-bold text-zinc-900">認証済み実行者</p><p className="text-xs text-zinc-600">{principal?.displayName ?? "確認中"}</p></div>
            {principal && <><Badge variant="outline">{principal.role}</Badge><Badge variant="outline">{principal.authSource}</Badge></>}
            <p className="ml-auto max-w-xl text-xs leading-5 text-zinc-500">操作人物はログイン情報からサーバー側で固定されます。依頼者と承認者の分離、Admin自己承認の詳細メモ、Content Revision単位の承認をDBで強制します。</p>
          </div>
        </header>

        {error && <Card className="border-rose-200"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><p role="alert" className="flex items-center gap-2 text-sm text-rose-700"><AlertTriangle className="h-4 w-4" />{error}</p><Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />再試行</Button></CardContent></Card>}
        {!dashboard && !error && <LoadingView />}
        {dashboard && principal && (
          <>
            <VideoGrowthKpis kpis={dashboard.kpis} />
            {["admin", "commercial_lead", "delivery"].includes(principal.role) && <VideoGrowthCreateForm principal={principal} busy={busy} studioProjects={dashboard.studioProjects} onCreate={(payload) => mutate("POST", payload, "商用ワークオーダーと4媒体キューを作成しました")} />}
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><h2 className="text-lg font-black text-zinc-950">制作・公開ワークオーダー</h2><p className="text-xs text-zinc-500">30秒ごとに自動更新 · {new Date(dashboard.generatedAt).toLocaleString("ja-JP")}</p></div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" /><Input aria-label="案件検索" className="w-64 pl-9" placeholder="案件・顧客・責任者を検索" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
                  <select aria-label="制作工程フィルター" className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={workStatus} onChange={(event) => setWorkStatus(event.target.value)}><option value="all">全工程</option>{["intake", "production", "internal_review", "client_review", "revision", "ready", "delivered", "on_hold", "closed"].map((item) => <option key={item}>{item}</option>)}</select>
                  {busy && <Loader2 className="mt-2 h-5 w-5 animate-spin text-zinc-500" />}
                </div>
              </div>
              {filteredCampaigns.length === 0 ? <Card className="border-dashed border-zinc-300"><CardContent className="py-12 text-center"><CardTitle className="text-base">該当する商用案件はありません</CardTitle><p className="mt-2 text-sm text-zinc-500">上のフォームから、承認済みStudio案件を商用運用へ接続してください。</p></CardContent></Card> : filteredCampaigns.map((campaign) => <VideoGrowthCampaignCard key={campaign.id} principal={principal} busy={busy} campaign={campaign} project={projectMap.get(campaign.studioProjectId)} onAction={(payload) => mutate("PATCH", payload, "商用運用台帳を更新しました")} />)}
            </section>
            <Card className="border-zinc-200"><CardHeader><CardTitle className="text-base">直近の監査イベント</CardTitle></CardHeader><CardContent>{dashboard.recentEvents.length === 0 ? <p className="text-sm text-zinc-500">監査イベントはまだありません。</p> : <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{dashboard.recentEvents.slice(0, 18).map((event) => <div key={event.id} className="rounded-lg border border-zinc-200 p-3 text-xs"><p className="font-semibold text-zinc-900">{event.eventType} · {event.actor}{event.actorRole ? ` (${event.actorRole})` : ""}</p><p className="mt-1 leading-5 text-zinc-600">{event.note}</p><p className="mt-1 text-zinc-400">{new Date(event.createdAt).toLocaleString("ja-JP")}</p></div>)}</div>}</CardContent></Card>
          </>
        )}
      </div>
    </main>
  )
}
