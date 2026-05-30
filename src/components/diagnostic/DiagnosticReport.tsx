"use client"

import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import type { DiagnosticAct, DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { IntelligenceSignal, PainPoint } from "@/lib/sales/company-intelligence"

type Lang = "ja" | "en"

const COPY = {
  ja: {
    brand: "Paradigm Web診断",
    validUntil: "有効期限",
    target: "診断対象",
    lossCaption: "推定される月間機会損失",
    dataTitle: "取得データと企業カルテ",
    painTitle: "客観データから見えた痛み",
    actionTitle: "次に取るべき営業アクション",
    sourceTitle: "API / OSS 取得状況",
    demo: "差し替えデモを見る",
    videoTitle: "改善後のイメージを動画で確認",
    videoComingSoon: "動画は準備中です。",
    ctaHeading: "30分だけ、優先順位を一緒に確認しましょう",
    ctaBody: "費用の話ではなく、どこから直すと成果につながりやすいかを診断データベースで確認します。",
    ctaButton: "相談する",
    mailSubject: "診断レポートについて",
    dataCoverage: "データ取得率",
    templateTitle: "提案テンプレート",
    qualityBar: "品質基準",
  },
  en: {
    brand: "Paradigm Web Diagnostics",
    validUntil: "Valid until",
    target: "Diagnosed",
    lossCaption: "Estimated monthly opportunity loss",
    dataTitle: "Collected data and company intelligence",
    painTitle: "Pain signals found from objective data",
    actionTitle: "Recommended next sales actions",
    sourceTitle: "API / OSS source coverage",
    demo: "Open replacement demo",
    videoTitle: "See the improvement direction in video",
    videoComingSoon: "Video is being prepared.",
    ctaHeading: "Start with a 30-minute prioritization call",
    ctaBody: "No pressure on pricing. We will walk through the diagnosis and the highest-impact improvements.",
    ctaButton: "Talk to us",
    mailSubject: "About the diagnostic report",
    dataCoverage: "Data coverage",
    templateTitle: "Proposal template",
    qualityBar: "Quality bar",
  },
} as const

const SEVERITY_LABELS = {
  ja: { critical: "緊急", warning: "要対応", info: "推奨" },
  en: { critical: "Critical", warning: "Action needed", info: "Recommended" },
} as const

const SEVERITY_STYLE = {
  critical: "bg-rose-50 text-rose-700 border-rose-100",
  warning: "bg-amber-50 text-amber-800 border-amber-100",
  info: "bg-emerald-50 text-emerald-700 border-emerald-100",
} as const

const SIGNAL_STYLE = {
  good: "bg-emerald-50 text-emerald-700 border-emerald-100",
  warning: "bg-amber-50 text-amber-800 border-amber-100",
  critical: "bg-rose-50 text-rose-700 border-rose-100",
  neutral: "bg-slate-50 text-slate-700 border-slate-100",
} as const

function useCountUp(target: number, duration = 1300, start = false): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    let startedAt: number | null = null
    const step = (timestamp: number) => {
      if (!startedAt) startedAt = timestamp
      const progress = Math.min((timestamp - startedAt) / duration, 1)
      setValue(Math.floor((1 - Math.pow(1 - progress, 3)) * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [duration, start, target])
  return value
}

function useInView(threshold = 0.16): [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true)
      },
      { threshold },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, inView]
}

function formatNumber(value: string, lang: Lang): string {
  const numeric = Number.parseInt(value.replace(/[^0-9]/g, ""), 10)
  if (!Number.isFinite(numeric) || numeric <= 0) return value
  return numeric.toLocaleString(lang === "ja" ? "ja-JP" : "en-US")
}

function ActCard({ act, index, lang }: { act: DiagnosticAct; index: number; lang: Lang }) {
  const [ref, inView] = useInView()
  const numeric = Number.parseInt(act.metric_value.replace(/[^0-9]/g, ""), 10)
  const count = useCountUp(Number.isFinite(numeric) ? numeric : 0, 1200, inView)
  const metricValue =
    Number.isFinite(numeric) && numeric > 0 ? count.toLocaleString(lang === "ja" ? "ja-JP" : "en-US") : act.metric_value

  return (
    <article
      ref={ref}
      className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_148px]"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.45s ease ${index * 0.08}s, transform 0.45s ease ${index * 0.08}s`,
      }}
    >
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${SEVERITY_STYLE[act.severity]}`}>
            {SEVERITY_LABELS[lang][act.severity]}
          </span>
          <span className="text-xs text-slate-400">{act.metric_label}</span>
        </div>
        <h2 className="text-lg font-bold tracking-normal text-slate-950">{act.headline}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{act.body}</p>
      </div>
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center">
        <div className="text-xs text-slate-500">{act.metric_label}</div>
        <div className="mt-2 text-3xl font-black tabular-nums text-slate-950">
          {metricValue}
          <span className="ml-1 text-sm font-semibold">{act.metric_unit}</span>
        </div>
        <div className="mt-2 text-[11px] leading-5 text-slate-500">{act.metric_bench}</div>
      </div>
    </article>
  )
}

function SignalCard({ signal }: { signal: IntelligenceSignal }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-950">{signal.label}</div>
          <div className="mt-1 text-xs text-slate-500">{signal.source}</div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SIGNAL_STYLE[signal.tone]}`}>
          {signal.value}
        </span>
      </div>
      <p className="mt-3 text-xs leading-6 text-slate-600">{signal.detail}</p>
    </div>
  )
}

function PainCard({ pain }: { pain: PainPoint }) {
  const tone =
    pain.severity === "critical"
      ? "border-rose-200 bg-rose-50"
      : pain.severity === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-emerald-200 bg-emerald-50"
  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="text-sm font-bold text-slate-950">{pain.title}</div>
      <p className="mt-2 text-xs leading-6 text-slate-700">{pain.evidence}</p>
      <p className="mt-2 text-xs leading-6 text-slate-600">{pain.implication}</p>
      <div className="mt-3 rounded-md bg-white/70 p-3 text-xs font-semibold leading-6 text-slate-900">
        {pain.recommendedAction}
      </div>
    </div>
  )
}

function SourceCoveragePanel({ data, lang }: { data: DiagnosticReportData; lang: Lang }) {
  const c = COPY[lang]
  const visible = data.source_coverage.items
    .filter((item) => item.status === "collected" || item.status === "configured")
    .slice(0, 12)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-slate-400">{c.sourceTitle}</div>
          <h2 className="mt-2 text-xl font-black tracking-normal text-slate-950">
            {c.dataCoverage} {data.source_coverage.score}%
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            collected {data.source_coverage.collected} / configured {data.source_coverage.configured} / missing{" "}
            {data.source_coverage.missing}
          </p>
        </div>
        {data.demo_url && (
          <a
            href={data.demo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-950 hover:bg-slate-50"
          >
            {c.demo}
          </a>
        )}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {visible.map((item) => (
          <div key={item.slug} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-bold text-slate-950">{item.label}</span>
              <span className={item.status === "collected" ? "text-xs font-bold text-emerald-700" : "text-xs font-bold text-amber-700"}>
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function DiagnosticReport({
  data,
  trackingSlug,
  locale,
}: {
  data: DiagnosticReportData
  trackingSlug?: string
  locale?: string
}) {
  const lang: Lang = locale === "ja" ? "ja" : "en"
  const c = COPY[lang]
  const [lossRef, lossInView] = useInView()
  const lossNumber = Number.parseInt(data.total_loss.replace(/[^0-9]/g, ""), 10) || 0
  const lossCount = useCountUp(lossNumber, 1800, lossInView)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-950">
      {trackingSlug && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/sales/track-view?slug=${encodeURIComponent(trackingSlug)}&locale=${encodeURIComponent(locale ?? "ja")}`}
          alt=""
          width={1}
          height={1}
          className="pointer-events-none absolute -left-[9999px] -top-[9999px] opacity-0"
          aria-hidden
        />
      )}

      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-sm font-black text-white">P</div>
            <span className="text-xs font-semibold tracking-widest text-slate-500">{c.brand}</span>
          </div>
          <span className="text-xs text-slate-500">
            {c.validUntil}: {data.expires_at}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <section className="mb-10">
          <div className="mb-5 inline-flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs shadow-sm ring-1 ring-slate-200">
            <span className="text-slate-500">{c.target}</span>
            <span className="font-bold text-slate-950">{data.company_name}</span>
            {data.prefecture && <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500">{data.prefecture}</span>}
          </div>
          <h1 className="whitespace-pre-line text-2xl font-black leading-[1.55] tracking-normal text-slate-950 md:text-3xl">
            {data.hook}
          </h1>
        </section>

        <section className="mb-10 flex flex-col gap-4">
          {data.acts.map((act, index) => (
            <ActCard key={`${act.headline}-${index}`} act={act} index={index} lang={lang} />
          ))}
        </section>

        <section ref={lossRef} className="mb-8 overflow-hidden rounded-lg bg-slate-950 p-7 text-white shadow-sm">
          <div className="text-xs font-semibold tracking-widest text-slate-400">{c.lossCaption}</div>
          <div className="mt-3 text-5xl font-black tabular-nums tracking-normal">
            {new Intl.NumberFormat(lang === "ja" ? "ja-JP" : "en-US", {
              style: "currency",
              currency: "JPY",
              maximumFractionDigits: 0,
            }).format(lossInView ? lossCount : 0)}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-black tracking-normal text-slate-950">{c.painTitle}</h2>
          <div className="grid gap-3">
            {data.intelligence.painPoints.map((pain) => (
              <PainCard key={pain.id} pain={pain} />
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-black tracking-normal text-slate-950">{c.dataTitle}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.intelligence.signals.slice(0, 10).map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black tracking-normal text-slate-950">{c.actionTitle}</h2>
          <ol className="mt-4 space-y-3">
            {data.intelligence.nextActions.map((action, index) => (
              <li key={action} className="flex gap-3 text-sm leading-7 text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </section>

        <SourceCoveragePanel data={data} lang={lang} />

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold tracking-widest text-slate-400">{c.templateTitle}</div>
          <h2 className="mt-2 text-lg font-black tracking-normal text-slate-950">{data.content_template.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{data.content_template.purpose}</p>
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">{c.qualityBar}</div>
            <p className="mt-2 text-sm leading-7 text-slate-700">{data.content_template.quality_bar}</p>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-7 text-center shadow-sm">
          <div className="text-xs font-semibold tracking-widest text-slate-400">{c.videoTitle}</div>
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
            {data.video_thumbnail ? "Video asset ready" : c.videoComingSoon}
          </div>
          <h2 className="mt-7 text-xl font-black tracking-normal text-slate-950">{c.ctaHeading}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">{c.ctaBody}</p>
          <a
            href={`mailto:info@paradigmjp.com?subject=${encodeURIComponent(c.mailSubject)}&body=${encodeURIComponent(data.report_url)}`}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-6 text-sm font-bold text-white hover:bg-slate-800"
          >
            {c.ctaButton}
          </a>
        </section>
      </main>
    </div>
  )
}
