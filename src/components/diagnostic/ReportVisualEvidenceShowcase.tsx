"use client"

import { AlertTriangle, CheckCircle2, MousePointerClick, Route } from "lucide-react"
import { useState } from "react"
import type { DiagnosticReportData, VisualEvidenceAnnotation } from "@/lib/sales/diagnostic"
import type { ReportLang } from "./report-copy"
import { Pill } from "./report-utils"

const SEVERITY_CLASS: Record<VisualEvidenceAnnotation["severity"], string> = {
  critical: "border-rose-500 bg-rose-50 text-rose-700",
  warning: "border-amber-500 bg-amber-50 text-amber-800",
  info: "border-sky-500 bg-sky-50 text-sky-800",
}

const STEP_CLASS = {
  blocked: "border-rose-200 bg-rose-50 text-rose-700",
  weak: "border-amber-200 bg-amber-50 text-amber-800",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
} as const

function labelForKind(kind: string | null | undefined, lang: ReportLang): string {
  if (kind === "social") return lang === "ja" ? "SNS証拠画面" : "Social proof screen"
  if (kind === "map") return lang === "ja" ? "Maps比較画面" : "Maps comparison screen"
  if (kind === "form") return lang === "ja" ? "フォーム導線画面" : "Form path screen"
  return lang === "ja" ? "実サイト証拠画面" : "Captured site evidence"
}

export default function ReportVisualEvidenceShowcase({
  data,
  screenshotUrl,
  lang,
  screenshotAlt,
  heroText,
}: {
  data: DiagnosticReportData
  screenshotUrl: string
  lang: ReportLang
  screenshotAlt: string
  heroText: string
}) {
  const annotations = (data.visual_annotations ?? []).slice(0, 4)
  const preview = data.improvement_preview
  const journey = data.visitor_journey ?? []
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <section className="px-5 pb-14">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone="neutral">{labelForKind(data.evidence_screenshot_kind, lang)}</Pill>
            <Pill tone="warning">
              <AlertTriangle size={13} aria-hidden /> {lang === "ja" ? "赤入れ診断" : "Marked audit"}
            </Pill>
          </div>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-zinc-950">
            {lang === "ja" ? "実画面のどこが機会損失になっているか" : "Where the actual screen is leaking opportunity"}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600">{heroText}</p>

          <div className="mt-7 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="flex h-10 items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                {lang === "ja" ? "Visual audit layer" : "Visual audit layer"}
              </span>
            </div>
            <div className="relative max-h-[620px] overflow-hidden bg-zinc-100">
              {imgFailed ? (
                <div className="flex items-center justify-center py-24 text-sm text-zinc-400">
                  {lang === "ja" ? "スクリーンショットを読み込めませんでした" : "Screenshot failed to load"}
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshotUrl}
                    alt={screenshotAlt}
                    loading="lazy"
                    className="w-full object-cover object-top"
                    onError={() => setImgFailed(true)}
                  />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(244,63,94,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,63,94,0.12)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50" />
              {annotations.map((annotation, index) => (
                <div
                  key={annotation.id}
                  className="absolute"
                  style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-sm font-bold text-white shadow-lg shadow-rose-950/30">
                    {index + 1}
                  </div>
                  <div className={`mt-2 hidden w-56 rounded-lg border p-3 text-left text-xs leading-5 shadow-lg sm:block ${SEVERITY_CLASS[annotation.severity]}`}>
                    <div className="font-semibold">{annotation.label}</div>
                    <div className="mt-1 opacity-85">{annotation.body}</div>
                  </div>
                </div>
              ))}
                </>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          {preview && (
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <MousePointerClick size={17} aria-hidden />
                {lang === "ja" ? "改善後プレビュー" : "After-state preview"}
              </div>
              <h3 className="mt-4 text-xl font-semibold leading-tight text-zinc-950">{preview.headline}</h3>
              <div className="mt-5 grid gap-3">
                <div className="rounded-lg border border-rose-100 bg-rose-50 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">Before</div>
                  <p className="mt-2 text-sm leading-6 text-rose-900">{preview.before}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">After</div>
                  <p className="mt-2 text-sm leading-6 text-emerald-900">{preview.after}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-3 text-sm font-semibold text-white">
                <CheckCircle2 size={16} aria-hidden />
                {preview.ctaLabel}
              </div>
            </div>
          )}

          {journey.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <Route size={17} aria-hidden />
                {lang === "ja" ? "30秒ユーザー導線" : "30-second visitor path"}
              </div>
              <ol className="mt-5 space-y-3">
                {journey.map((step, index) => (
                  <li key={step.id} className="grid grid-cols-[30px_minmax(0,1fr)] gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${STEP_CLASS[step.status]}`}>
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-zinc-950">{step.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-500">{step.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
