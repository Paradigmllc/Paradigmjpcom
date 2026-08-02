"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowUpRight, Loader2, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { VideoGrowthDashboard as Dashboard } from "@/lib/video-growth/types"
import { VideoGrowthCampaignCard } from "./VideoGrowthCampaignCard"
import { VideoGrowthCreateForm } from "./VideoGrowthCreateForm"
import { VideoGrowthKpis } from "./VideoGrowthKpis"

async function apiRequest(method: "GET" | "POST" | "PATCH", body?: Record<string, unknown>) {
  const response = await fetch("/api/sales/video-growth", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })
  const payload = await response.json() as { ok?: boolean; error?: string; dashboard?: Dashboard }
  if (!response.ok || !payload.ok) throw new Error(payload.error || "Video Growth API operation failed")
  return payload
}

function LoadingView() {
  return <div className="space-y-5" aria-label="Video Growthを読み込み中"><div className="h-24 animate-pulse rounded-2xl bg-zinc-200" /><div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-zinc-200" />)}</div><div className="h-96 animate-pulse rounded-2xl bg-zinc-200" /></div>
}

export function VideoGrowthDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [actor, setActor] = useState("Paradigm operator")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(null)
      const payload = await apiRequest("GET")
      setDashboard(payload.dashboard ?? null)
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
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Video Subscription Direct Growth</p><h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">動画直販キャンペーンOS</h1><p className="mt-3 text-sm leading-6 text-zinc-600">Studio動画をX・Instagram・LinkedIn・コールド営業へ展開し、制作、承認、配信記録、商談成果を一つの監査台帳で管理します。</p></div>
            <div className="flex flex-wrap gap-2"><Link href="/video-factory-console" prefetch={false} className="inline-flex min-h-10 items-center rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Video Factory<ArrowUpRight className="ml-2 h-4 w-4" /></Link><Button variant="outline" onClick={() => void refresh()} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />更新</Button></div>
          </div>
          <div className="mt-5 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[minmax(220px,360px)_1fr] sm:items-end">
            <div className="space-y-2"><Label htmlFor="growth-actor">操作担当者</Label><Input id="growth-actor" value={actor} onChange={(event) => setActor(event.target.value)} minLength={2} maxLength={120} /></div>
            <p className="flex items-start gap-2 text-xs leading-5 text-zinc-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />外部投稿・メール送信機能は接続していません。人間承認後に手動公開したURLだけを記録し、未承認の自動送信を構造的に防ぎます。</p>
          </div>
        </header>

        {error && <Card className="border-rose-200"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><p role="alert" className="flex items-center gap-2 text-sm text-rose-700"><AlertTriangle className="h-4 w-4" />{error}</p><Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />再試行</Button></CardContent></Card>}
        {!dashboard && !error && <LoadingView />}
        {dashboard && (
          <>
            <VideoGrowthKpis kpis={dashboard.kpis} />
            <VideoGrowthCreateForm actor={actor} busy={busy} studioProjects={dashboard.studioProjects} onCreate={(payload) => mutate("POST", payload, "4媒体の制作キューを作成しました")} />
            <section className="space-y-4">
              <div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-zinc-950">キャンペーン</h2><p className="text-xs text-zinc-500">30秒ごとに自動更新 · {new Date(dashboard.generatedAt).toLocaleString("ja-JP")}</p></div>{busy && <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />}</div>
              {dashboard.campaigns.length === 0 ? <Card className="border-dashed border-zinc-300"><CardContent className="py-12 text-center"><CardTitle className="text-base">キャンペーンはまだありません</CardTitle><p className="mt-2 text-sm text-zinc-500">上のフォームから、最初のStudio案件を4媒体の直販キューへ接続してください。</p></CardContent></Card> : dashboard.campaigns.map((campaign) => <VideoGrowthCampaignCard key={campaign.id} actor={actor} busy={busy} campaign={campaign} project={projectMap.get(campaign.studioProjectId)} onAction={(payload) => mutate("PATCH", payload, "キャンペーン台帳を更新しました")} />)}
            </section>
            <Card className="border-zinc-200"><CardHeader><CardTitle className="text-base">直近の監査イベント</CardTitle></CardHeader><CardContent>{dashboard.recentEvents.length === 0 ? <p className="text-sm text-zinc-500">監査イベントはまだありません。</p> : <div className="grid gap-2 md:grid-cols-2">{dashboard.recentEvents.slice(0, 12).map((event) => <div key={event.id} className="rounded-lg border border-zinc-200 p-3 text-xs"><p className="font-semibold text-zinc-900">{event.eventType} · {event.actor}</p><p className="mt-1 leading-5 text-zinc-600">{event.note}</p><p className="mt-1 text-zinc-400">{new Date(event.createdAt).toLocaleString("ja-JP")}</p></div>)}</div>}</CardContent></Card>
          </>
        )}
      </div>
    </main>
  )
}
