"use client"

import { useState, useTransition } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Clapperboard, ExternalLink, Film, Loader2, Play, ShieldCheck, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { startPetMovieQaRenderAction } from "@/app/[locale]/admin/pet-life-movie-growth/actions"
import type { PetMovieQaDashboard, PetMovieQaRenderView } from "@/lib/pet-life-movie/qa-render"
import { PET_MOVIE_TEMPLATES, type PetMovieTemplateId } from "@/lib/pet-life-movie/templates"

const statusLabel: Record<PetMovieQaRenderView["status"], string> = {
  queued: "待機中",
  rendering: "レンダー中",
  review_required: "2段階レビュー待ち",
  delivered: "QA納品済み",
  failed: "失敗",
  cancelled: "中止",
}

const statusTone: Record<PetMovieQaRenderView["status"], string> = {
  queued: "bg-blue-50 text-blue-700 ring-blue-200",
  rendering: "bg-violet-50 text-violet-700 ring-violet-200",
  review_required: "bg-amber-50 text-amber-800 ring-amber-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  cancelled: "bg-zinc-100 text-zinc-600 ring-zinc-200",
}

function formatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value))
    : "—"
}

export default function PetMovieQualityConsole({ dashboard }: { dashboard: PetMovieQaDashboard | null }) {
  const [pending, startTransition] = useTransition()
  const firstProject = dashboard?.projects[0]
  const [projectId, setProjectId] = useState(firstProject?.id ?? "")
  const [templateId, setTemplateId] = useState<PetMovieTemplateId>(firstProject?.templateId ?? "warm-keepsake")

  const submit = (data: FormData) => {
    startTransition(async () => {
      try {
        const result = await startPetMovieQaRenderAction(data)
        if (result.ok) toast.success(result.message)
        else toast.error(result.error)
      } catch (error) {
        console.error("[pet-movie-quality-console] QA render action failed", error)
        toast.error(error instanceof Error ? error.message : "QAレンダーを開始できませんでした")
      }
    })
  }

  return (
    <section id="qa-renders" className="mt-6 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[.86fr_1.14fr]">
        <div className="bg-[#17131A] p-6 text-white sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#E6B7A9]">
            <Clapperboard className="h-4 w-4" aria-hidden="true" /> Production QA
          </div>
          <h2 className="mt-4 max-w-md text-3xl font-black tracking-[-.04em] sm:text-4xl">課金・顧客通知と分離した実MP4品質確認</h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-white/65">実写真と本番Video Factoryを使い、課金状態を変更せずにレンダーします。成果物はQA専用領域へ保存され、顧客メールや納品ステータスには触れません。</p>

          <form action={submit} className="mt-7 space-y-4 rounded-3xl border border-white/10 bg-white/[.06] p-5">
            <label className="block text-xs font-bold text-white/70">
              確認するプロジェクト
              <select name="projectId" value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={pending || !dashboard?.projects.length} className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white outline-none ring-[#D97A62] focus:ring-2 disabled:opacity-50">
                {!dashboard?.projects.length && <option value="">対象プロジェクトなし</option>}
                {dashboard?.projects.map((project) => <option key={project.id} value={project.id} className="text-zinc-950">{project.petName} · {project.status} · {project.paymentStatus}</option>)}
              </select>
            </label>
            <div>
              <p className="text-xs font-bold text-white/70">映像テンプレート</p>
              <div className="mt-2 grid gap-2">
                {Object.values(PET_MOVIE_TEMPLATES).map((template) => (
                  <label key={template.id} className={`cursor-pointer rounded-2xl border p-3 transition ${templateId === template.id ? "border-white/40 bg-white/15" : "border-white/10 bg-black/10 hover:bg-white/10"}`}>
                    <input type="radio" name="templateId" value={template.id} checked={templateId === template.id} onChange={() => setTemplateId(template.id)} className="sr-only" />
                    <span className="flex items-center justify-between gap-3"><span className="text-sm font-bold">{template.name}</span><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: template.accent }} /></span>
                    <span className="mt-1 block text-[11px] leading-5 text-white/55">{template.description}</span>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" disabled={pending || !projectId} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F7F1E8] px-4 py-3 text-sm font-black text-[#2B202A] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              {pending ? "Video Factoryへ送信中" : "QA実MP4を生成"}
            </button>
          </form>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-xs leading-5 text-emerald-100">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>自動承認なし。ドラフト確認と最終確認の両方を通過するまでQA成果物は確定しません。</span>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-violet-600">Render flight board</p><h3 className="mt-2 text-2xl font-black">最新QAレンダー</h3></div>
            <Sparkles className="h-7 w-7 text-violet-500" aria-hidden="true" />
          </div>
          <div className="mt-6 space-y-4">
            <AnimatePresence initial={false}>
              {dashboard?.renders.length ? dashboard.renders.map((render, index) => (
                <motion.article key={render.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-black text-zinc-950">{render.petName}</p><p className="mt-1 text-xs text-zinc-500">{PET_MOVIE_TEMPLATES[render.templateId].name} · {formatDate(render.createdAt)}</p></div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${statusTone[render.status]}`}>{statusLabel[render.status]}</span>
                  </div>
                  {render.downloadUrl && (
                    <video src={render.downloadUrl} controls preload="metadata" playsInline className="mt-4 aspect-[9/16] max-h-[460px] w-full rounded-2xl bg-black object-contain" aria-label={`${render.petName}のQA動画`} />
                  )}
                  {render.errorMessage && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700">{render.errorMessage}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    <span className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-zinc-200">QA {render.id.slice(0, 8)}</span>
                    {render.reviewer && <span>確認者: {render.reviewer}</span>}
                    {render.rendererProjectId && <a href={`/video-factory-console#project-${encodeURIComponent(render.rendererProjectId)}`} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-bold text-violet-700 hover:text-violet-900">レビュー画面 <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>}
                  </div>
                </motion.article>
              )) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
                  <div><Film className="mx-auto h-9 w-9 text-zinc-300" aria-hidden="true" /><p className="mt-3 text-sm font-bold text-zinc-600">まだQAレンダーはありません</p><p className="mt-2 text-xs leading-5 text-zinc-400">左のプロジェクトとテンプレートを選び、最初の実MP4を生成できます。</p></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
