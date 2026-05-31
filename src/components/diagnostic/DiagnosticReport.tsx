"use client"

import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import type { DiagnosticAct, DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { IntelligenceSignal, PainPoint } from "@/lib/sales/company-intelligence"
import { labelForIndustry, scoreTone, themeForIndustry } from "@/lib/sales/render-quality"

type Lang = "ja" | "en"

const COPY = {
  ja: {
    brand: "Paradigm Web診断",
    privateReport: "非公開診断レポート",
    validUntil: "有効期限",
    diagnosed: "診断対象",
    summary: "経営判断サマリー",
    loss: "推定される月間機会損失",
    evidence: "取得データと根拠",
    pain: "客観データから見える痛み",
    actions: "次に取るべき営業アクション",
    sources: "API / OSS 取得状況",
    template: "適用テンプレート",
    quality: "品質基準",
    demo: "差し替えデモを見る",
    video: "60秒動画を見る",
    ctaHeading: "30分だけ、優先順位を一緒に確認しましょう",
    ctaBody: "費用の話ではなく、どこから直すと成果につながりやすいかを診断データベースで確認します。",
    ctaButton: "相談する",
    subject: "診断レポートについて",
    collected: "取得",
    configured: "接続済み",
    missing: "未取得",
  },
  en: {
    brand: "Paradigm Web Diagnostics",
    privateReport: "Private diagnostic report",
    validUntil: "Valid until",
    diagnosed: "Diagnosed",
    summary: "Executive summary",
    loss: "Estimated monthly opportunity loss",
    evidence: "Collected evidence",
    pain: "Pain signals from objective data",
    actions: "Recommended next actions",
    sources: "API / OSS source coverage",
    template: "Selected template",
    quality: "Quality bar",
    demo: "Open replacement demo",
    video: "Watch 60-sec video",
    ctaHeading: "Start with a 30-minute prioritization call",
    ctaBody: "We will focus on the highest-impact fixes, not a generic sales pitch.",
    ctaButton: "Talk to us",
    subject: "About the diagnostic report",
    collected: "collected",
    configured: "configured",
    missing: "missing",
  },
} as const

const SEVERITY = {
  critical: {
    ja: "最優先",
    en: "Critical",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  warning: {
    ja: "要改善",
    en: "Action needed",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  info: {
    ja: "改善余地",
    en: "Opportunity",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
} as const

const SIGNAL = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
} as const

function useCountUp(target: number, duration = 1100, start = false): number {
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

function yenNumber(value: string): number {
  return Number.parseInt(value.replace(/[^0-9]/g, ""), 10) || 0
}

function ActCard({ act, index, lang }: { act: DiagnosticAct; index: number; lang: Lang }) {
  const [ref, inView] = useInView()
  const numeric = yenNumber(act.metric_value)
  const counted = useCountUp(numeric, 1000, inView)
  const metricValue = numeric > 0 ? counted.toLocaleString(lang === "ja" ? "ja-JP" : "en-US") : act.metric_value

  return (
    <article
      ref={ref}
      className="grid gap-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_150px]"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(18px)",
        transition: `opacity 0.42s ease ${index * 0.06}s, transform 0.42s ease ${index * 0.06}s`,
      }}
    >
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${SEVERITY[act.severity].className}`}>
            {SEVERITY[act.severity][lang]}
          </span>
          <span className="text-xs text-zinc-500">{act.metric_label}</span>
        </div>
        <h2 className="text-lg font-semibold leading-7 text-zinc-950">{act.headline}</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">{act.body}</p>
      </div>
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-center">
        <div className="text-xs text-zinc-500">{act.metric_label}</div>
        <div className="mt-2 text-3xl font-semibold tabular-nums text-zinc-950">
          {metricValue}
          <span className="ml-1 text-sm font-semibold">{act.metric_unit}</span>
        </div>
        <div className="mt-2 text-[11px] leading-5 text-zinc-500">{act.metric_bench}</div>
      </div>
    </article>
  )
}

function SignalCard({ signal }: { signal: IntelligenceSignal }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-950">{signal.label}</div>
          <div className="mt-1 text-xs text-zinc-500">{signal.source}</div>
        </div>
        <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${SIGNAL[signal.tone]}`}>
          {signal.value}
        </span>
      </div>
      <p className="mt-3 text-xs leading-6 text-zinc-600">{signal.detail}</p>
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
      <div className="text-sm font-semibold text-zinc-950">{pain.title}</div>
      <p className="mt-2 text-xs leading-6 text-zinc-700">{pain.evidence}</p>
      <p className="mt-2 text-xs leading-6 text-zinc-600">{pain.implication}</p>
      <div className="mt-3 rounded-md bg-white/80 p-3 text-xs font-semibold leading-6 text-zinc-900">
        {pain.recommendedAction}
      </div>
    </div>
  )
}

function SourceCoveragePanel({ data, lang }: { data: DiagnosticReportData; lang: Lang }) {
  const c = COPY[lang]
  const visible = data.source_coverage.items
    .sort((a, b) => b.score - a.score)
    .slice(0, 16)

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold text-zinc-500">{c.sources}</div>
          <h2 className="mt-2 text-xl font-semibold text-zinc-950">
            {data.source_coverage.score}% source confidence
          </h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            {c.collected} {data.source_coverage.collected} / {c.configured} {data.source_coverage.configured} /{" "}
            {c.missing} {data.source_coverage.missing}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100 sm:w-56">
          <div className="h-full bg-zinc-950" style={{ width: `${data.source_coverage.score}%` }} />
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {visible.map((item) => (
          <div key={item.slug} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold text-zinc-950">{item.label}</span>
              <span className={`text-xs font-semibold ${SIGNAL[scoreTone(item.score)]}`}>{item.status}</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-zinc-500">{item.detail}</p>
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
  const theme = themeForIndustry(data.industry)
  const [lossRef, lossInView] = useInView()
  const lossCount = useCountUp(yenNumber(data.total_loss), 1300, lossInView)
  const activeLocale = locale ?? data.report_locale
  const videoHref = trackingSlug ? `/${activeLocale}/report/${trackingSlug}/video` : null

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-950">
      {trackingSlug && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/sales/track-view?slug=${encodeURIComponent(trackingSlug)}&locale=${encodeURIComponent(activeLocale)}`}
          alt=""
          width={1}
          height={1}
          className="pointer-events-none absolute -left-[9999px] -top-[9999px] opacity-0"
          aria-hidden
        />
      )}

      <header className="border-b border-zinc-200 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold text-white" style={{ background: theme.ink }}>
              P
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-950">{c.brand}</div>
              <div className="text-[11px] text-zinc-500">{c.privateReport}</div>
            </div>
          </div>
          <span className="text-xs text-zinc-500">
            {c.validUntil}: {data.expires_at}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <section className="grid gap-6 border-b border-zinc-200 pb-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs">
              <span className="text-zinc-500">{c.diagnosed}</span>
              <span className="font-semibold text-zinc-950">{data.company_name}</span>
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-600">
                {labelForIndustry(data.industry, data.report_locale)}
              </span>
              {data.prefecture && <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-600">{data.prefecture}</span>}
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-zinc-950 sm:text-4xl">
              {data.hook}
            </h1>
            <div className="mt-5 flex flex-wrap gap-2">
              {data.demo_url && (
                <a
                  href={data.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white"
                >
                  {c.demo}
                </a>
              )}
              {videoHref && (
                <a
                  href={videoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950"
                >
                  {c.video}
                </a>
              )}
            </div>
          </div>
          <div ref={lossRef} className="rounded-lg p-5 text-white shadow-sm" style={{ background: theme.ink }}>
            <div className="text-xs font-semibold text-white/60">{c.loss}</div>
            <div className="mt-3 text-4xl font-semibold tabular-nums">
              {new Intl.NumberFormat(lang === "ja" ? "ja-JP" : "en-US", {
                style: "currency",
                currency: "JPY",
                maximumFractionDigits: 0,
              }).format(lossInView ? lossCount : 0)}
            </div>
            <p className="mt-4 text-sm leading-7 text-white/70">{data.cta_text}</p>
          </div>
        </section>

        <section className="grid gap-4 py-8 lg:grid-cols-3">
          {data.acts.map((act, index) => (
            <ActCard key={`${act.headline}-${index}`} act={act} index={index} lang={lang} />
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section>
              <h2 className="mb-4 text-xl font-semibold text-zinc-950">{c.pain}</h2>
              <div className="grid gap-3">
                {data.intelligence.painPoints.map((pain) => (
                  <PainCard key={pain.id} pain={pain} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-zinc-950">{c.evidence}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.intelligence.signals.slice(0, 10).map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-950">{c.actions}</h2>
              <ol className="mt-4 space-y-3">
                {data.intelligence.nextActions.map((action, index) => (
                  <li key={action} className="flex gap-3 text-sm leading-7 text-zinc-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold text-zinc-500">{c.template}</div>
              <h2 className="mt-2 text-lg font-semibold text-zinc-950">{data.content_template.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-600">{data.content_template.purpose}</p>
              <div className="mt-4 rounded-lg p-4" style={{ background: theme.accentSoft }}>
                <div className="text-xs font-semibold text-zinc-500">{c.quality}</div>
                <p className="mt-2 text-sm leading-7 text-zinc-800">{data.content_template.quality_bar}</p>
              </div>
            </section>
          </aside>
        </section>

        <div className="mt-5">
          <SourceCoveragePanel data={data} lang={lang} />
        </div>

        <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-7 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-zinc-950">{c.ctaHeading}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-600">{c.ctaBody}</p>
          <a
            href={`mailto:info@paradigmjp.com?subject=${encodeURIComponent(c.subject)}&body=${encodeURIComponent(data.report_url)}`}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-semibold text-white"
            style={{ background: theme.accentDark }}
          >
            {c.ctaButton}
          </a>
        </section>
      </main>
    </div>
  )
}
