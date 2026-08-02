"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react"

const copy = {
  ja: {
    failed: "制作状況を確認しています。サポートへ自動通知済みです。",
    review: "レンダリング完了。人による最終品質確認中です。",
    active: "動画を制作しています。このページは自動更新されます。",
  },
  en: {
    failed: "Production needs attention. Support has been notified.",
    review: "Rendering is complete. Human final quality review is in progress.",
    active: "Your film is in production. This page refreshes automatically.",
  },
  es: {
    failed: "La producción requiere atención. El equipo de soporte ya ha sido avisado.",
    review: "El renderizado ha terminado. Está en curso la revisión humana final.",
    active: "Tu vídeo está en producción. Esta página se actualiza automáticamente.",
  },
  pt: {
    failed: "A produção requer atenção. A equipe de suporte já foi notificada.",
    review: "A renderização terminou. A revisão humana final está em andamento.",
    active: "Seu filme está em produção. Esta página é atualizada automaticamente.",
  },
} as const

export default function PetMovieProductionStatus({ locale, projectStatus, jobStatus, progress }: { locale: string; projectStatus: string; jobStatus: string | null; progress: number }) {
  const router = useRouter()
  const active = ["full_rendering", "quality_check"].includes(projectStatus) && jobStatus !== "failed"
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => router.refresh(), 10_000)
    return () => window.clearInterval(timer)
  }, [active, router])
  const failed = jobStatus === "failed"
  const t = copy[locale as keyof typeof copy] ?? copy.en
  const label = failed ? t.failed : projectStatus === "quality_check" ? t.review : t.active
  return <div className={`mt-9 rounded-2xl border p-4 ${failed ? "border-amber-400/30 bg-amber-400/10" : "border-white/10 bg-white/5"}`} aria-live="polite"><div className="flex items-center gap-3 text-sm text-white/75">{failed ? <TriangleAlert className="h-5 w-5 text-amber-300" aria-hidden="true" /> : active ? <Loader2 className="h-5 w-5 animate-spin text-violet-300" aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />}<span>{label}</span><strong className="ml-auto text-white">{Math.max(0, Math.min(progress, 100))}%</strong></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-violet-400 transition-all" style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} /></div></div>
}
