"use client"

import { useTransition } from "react"
import { motion } from "framer-motion"
import { Activity, ArrowUpRight, CheckCircle2, Clock3, Globe2, Pause, Play, Rocket, Send, ShieldCheck, Sparkles } from "lucide-react"
import { toast, Toaster } from "sonner"
import { runPetMarketingSlotAction, updatePetMarketingCampaignAction, type PetGrowthActionResult } from "@/app/[locale]/admin/pet-life-movie-growth/actions"
import type { PetMarketingDashboard, PetMarketingRun, PetMarketingSlot } from "@/lib/pet-life-movie/marketing/types"
import type { PetMovieQaDashboard } from "@/lib/pet-life-movie/qa-render"
import PetMovieQualityConsole from "./PetMovieQualityConsole"

const slotLabels: Record<PetMarketingSlot, string> = {
  apac: "APAC · 09:15 JST",
  europe: "Europe · 18:15 JST",
  americas: "Americas · 02:15 JST",
}

const statusTone: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  succeeded: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  degraded: "bg-amber-50 text-amber-700 ring-amber-200",
  blocked: "bg-amber-50 text-amber-700 ring-amber-200",
  paused: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  draft: "bg-violet-50 text-violet-700 ring-violet-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  scheduled: "bg-blue-50 text-blue-700 ring-blue-200",
  approved: "bg-blue-50 text-blue-700 ring-blue-200",
}

function Status({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${statusTone[value] ?? "bg-zinc-100 text-zinc-600 ring-zinc-200"}`}>{value}</span>
}

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value)) : "—"
}

function RunRow({ run }: { run: PetMarketingRun }) {
  return (
    <div className="grid gap-2 border-b border-zinc-100 py-4 text-sm last:border-0 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div><p className="font-semibold text-zinc-900">{slotLabels[run.slot]}</p><p className="mt-1 text-xs text-zinc-500">{formatDate(run.startedAt)} · {run.runDate}</p></div>
      <p className="text-xs text-zinc-500">生成 {run.generatedPostCount} · 公開 {run.publishedPostCount} · 保留 {run.blockedPostCount}</p>
      <Status value={run.status} />
    </div>
  )
}

export default function PetMovieGrowthConsole({ dashboard, qaDashboard, initialError }: { dashboard: PetMarketingDashboard | null; qaDashboard: PetMovieQaDashboard | null; initialError?: string }) {
  const [pending, startTransition] = useTransition()
  const act = (action: (data: FormData) => Promise<PetGrowthActionResult>, data: FormData) => {
    startTransition(async () => {
      try {
        const result = await action(data)
        if (result.ok) toast.success(result.message)
        else toast.error(result.error)
      } catch (error) {
        console.error("[pet-growth-console] action failed", error)
        toast.error(error instanceof Error ? error.message : "処理に失敗しました")
      }
    })
  }

  if (!dashboard) return (
    <main className="grid min-h-dvh place-items-center bg-zinc-50 p-6"><Toaster richColors /><section className="max-w-lg rounded-3xl border border-red-200 bg-white p-10 text-center shadow-sm"><Activity className="mx-auto h-10 w-10 text-red-500" /><h1 className="mt-5 text-2xl font-bold">Growth OSを読み込めません</h1><p className="mt-3 text-sm leading-6 text-zinc-500">{initialError}</p></section></main>
  )

  const funnel = [
    ["LP閲覧", dashboard.funnel.pageViews], ["Hero CTA", dashboard.funnel.heroCtaClicks],
    ["作成開始", dashboard.funnel.wizardStarts], ["案件作成", dashboard.funnel.projectsCreated],
    ["プレビュー", dashboard.funnel.previewsCreated], ["購入開始", dashboard.funnel.checkoutStarts],
  ] as const

  return (
    <main className="min-h-dvh bg-[#f6f7f9] px-4 py-8 text-zinc-950 sm:px-8 lg:px-12"><Toaster richColors position="top-right" />
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2rem] bg-zinc-950 p-7 text-white shadow-2xl sm:p-10">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-violet-300"><Rocket className="h-4 w-4" />Global Growth OS</div><h1 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-6xl">世界ローンチ管制塔</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">4言語・8市場・3時間帯を一画面で運用。公開可能なチャネルだけを自動配信し、未承認チャネルは安全に下書きへ留めます。</p></div><div className="flex items-center gap-3"><Status value={dashboard.campaign?.status ?? "missing"} /><span className="text-xs text-white/50">更新 {formatDate(dashboard.generatedAt)}</span></div></div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Markets</p><p className="mt-3 text-4xl font-black">{dashboard.markets.length}</p><p className="mt-2 text-xs text-zinc-500">JP · AU · GB · ES · PT · US · MX · BR</p></div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">30-day views</p><p className="mt-3 text-4xl font-black">{dashboard.funnel.pageViews.toLocaleString()}</p><p className="mt-2 text-xs text-zinc-500">個人情報を保存しない匿名計測</p></div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Project CVR</p><p className="mt-3 text-4xl font-black">{dashboard.funnel.projectConversionRate}%</p><p className="mt-2 text-xs text-zinc-500">LP閲覧から案件作成</p></div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Content queue</p><p className="mt-3 text-4xl font-black">{dashboard.posts.length}</p><p className="mt-2 text-xs text-zinc-500">最新120件</p></div>
        </section>

        <PetMovieQualityConsole dashboard={qaDashboard} />

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Launch windows</p><h2 className="mt-2 text-2xl font-bold">世界を追いかける自動運転</h2></div><Globe2 className="h-8 w-8 text-violet-500" /></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{Object.entries(slotLabels).map(([slot, label]) => <form key={slot} action={(data) => act(runPetMarketingSlotAction, data)} className="rounded-2xl bg-zinc-50 p-4"><input type="hidden" name="slot" value={slot} /><p className="text-sm font-bold">{label}</p><p className="mt-2 text-xs leading-5 text-zinc-500">投稿生成・予約・公開・再試行</p><button disabled={pending} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Play className="h-3.5 w-3.5" />今すぐ実行</button></form>)}</div></div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Campaign control</p><h2 className="mt-2 text-xl font-bold">{dashboard.campaign?.name ?? "未設定"}</h2><p className="mt-3 text-xs leading-5 text-zinc-500">誤配信時は全地域を一括停止。再開後も同一投稿キーで重複公開を防ぎます。</p>{dashboard.campaign && <div className="mt-5 flex gap-2">{dashboard.campaign.status === "active" ? <form action={(data) => act(updatePetMarketingCampaignAction, data)}><input type="hidden" name="campaignId" value={dashboard.campaign.id} /><input type="hidden" name="status" value="paused" /><button disabled={pending} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold"><Pause className="h-3.5 w-3.5" />全停止</button></form> : <form action={(data) => act(updatePetMarketingCampaignAction, data)}><input type="hidden" name="campaignId" value={dashboard.campaign.id} /><input type="hidden" name="status" value="active" /><button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"><Play className="h-3.5 w-3.5" />再開</button></form>}</div>}</div>
        </section>

        <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-violet-500" /><h2 className="text-xl font-bold">30日ファネル</h2></div><div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{funnel.map(([label, value], index) => <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-2xl font-black">{value.toLocaleString()}</p></motion.div>)}</div></section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2"><div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"><h2 className="text-xl font-bold">Connector health</h2><div className="mt-5 space-y-3">{dashboard.connectors.map((connector) => <div key={connector.platform} className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-4">{connector.configured && connector.directPublishingSupported ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : connector.directPublishingSupported ? <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /> : <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />}<div><div className="flex items-center gap-2"><p className="text-sm font-bold capitalize">{connector.platform}</p><Status value={connector.configured && connector.directPublishingSupported ? "active" : "draft"} /></div><p className="mt-2 text-xs leading-5 text-zinc-500">{connector.reason}</p></div></div>)}</div></div><div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"><h2 className="text-xl font-bold">Recent runs</h2><div className="mt-3">{dashboard.recentRuns.length ? dashboard.recentRuns.slice(0, 8).map((run) => <RunRow key={run.id} run={run} />) : <p className="py-10 text-center text-sm text-zinc-400">初回ランを待っています</p>}</div></div></section>

        <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Content flight board</h2><span className="text-xs text-zinc-400">最新24件</span></div><div className="mt-5 divide-y divide-zinc-100">{dashboard.posts.length ? dashboard.posts.slice(0, 24).map((post) => <article key={post.id} className="grid gap-3 py-5 lg:grid-cols-[110px_1fr_auto] lg:items-center"><div><p className="text-xs font-bold uppercase text-zinc-500">{post.platform}</p><p className="mt-1 text-xs text-zinc-400">{post.market} · {post.locale}</p></div><div><p className="font-semibold text-zinc-900">{post.hook}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{post.caption}</p></div><div className="flex items-center gap-2"><Status value={post.status} />{post.postUrl && <a href={post.postUrl} target="_blank" rel="noopener noreferrer" aria-label="公開投稿を開く" className="rounded-lg p-2 hover:bg-zinc-100"><ArrowUpRight className="h-4 w-4" /></a>}</div></article>) : <div className="py-14 text-center"><Send className="mx-auto h-8 w-8 text-zinc-300" /><p className="mt-3 text-sm text-zinc-400">実行すると市場別の投稿原稿が並びます</p></div>}</div></section>
      </div>
    </main>
  )
}
