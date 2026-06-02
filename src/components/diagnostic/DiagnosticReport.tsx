"use client"

import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import type { DiagnosticAct, DiagnosticReportData } from "@/lib/sales/diagnostic"
import { signalScore, type IntelligenceSignal, type PainPoint } from "@/lib/sales/company-intelligence"
import type { SourceCoverageItem } from "@/lib/sales/source-coverage"
import { labelForIndustry, scoreTone, themeForIndustry } from "@/lib/sales/render-quality"
import { REPORT_COPY, normalizeReportLang, type ReportCopy, type ReportLang } from "./report-copy"
import { AuditConversionSections } from "./AuditConversionSections"

const SEVERITY = {
  critical: { ja: "最優先", en: "Critical", className: "border-rose-200 bg-rose-50 text-rose-700" },
  warning: { ja: "要改善", en: "Action needed", className: "border-amber-200 bg-amber-50 text-amber-800" },
  info: { ja: "機会", en: "Opportunity", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
} as const

const TONE_BADGE = {
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

function useInView(threshold = 0.14): [RefObject<HTMLDivElement | null>, boolean] {
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

function numericValue(value: string): number {
  return Number.parseInt(value.replace(/[^0-9]/g, ""), 10) || 0
}

function formatYen(value: number, lang: ReportLang): string {
  return new Intl.NumberFormat(lang === "ja" ? "ja-JP" : "en-US", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value)
}

function reportLocale(lang: ReportLang): string {
  return lang === "ja" ? "ja-JP" : lang
}

function ActCard({ act, index, lang }: { act: DiagnosticAct; index: number; lang: ReportLang }) {
  const [ref, inView] = useInView()
  const numeric = numericValue(act.metric_value)
  const counted = useCountUp(numeric, 1000, inView)
  const metricValue = numeric > 0 ? counted.toLocaleString(reportLocale(lang)) : act.metric_value
  const severityLabel = lang === "ja" ? SEVERITY[act.severity].ja : SEVERITY[act.severity].en

  return (
    <article
      ref={ref}
      className="grid gap-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_164px]"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(18px)",
        transition: `opacity 0.42s ease ${index * 0.06}s, transform 0.42s ease ${index * 0.06}s`,
      }}
    >
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${SEVERITY[act.severity].className}`}>
            {severityLabel}
          </span>
          <span className="text-xs text-zinc-500">{act.metric_label}</span>
        </div>
        <h3 className="text-lg font-semibold leading-7 text-zinc-950">{act.headline}</h3>
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

function SignalCard({ signal, copy }: { signal: IntelligenceSignal; copy: ReportCopy }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-950">{signal.label}</div>
          <div className="mt-1 text-xs text-zinc-500">{signal.source}</div>
        </div>
        <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${TONE_BADGE[signal.tone]}`}>
          {signal.value}
        </span>
      </div>
      <p className="mt-3 text-xs leading-6 text-zinc-600">{signal.detail}</p>
      <div className="mt-3 rounded-md bg-zinc-50 p-3 text-xs leading-6 text-zinc-700">
        <div className="font-semibold text-zinc-500">{copy.whyImportant}</div>
        <p className="mt-1">{signal.whyItMatters}</p>
        {signal.missingConsequence && (
          <>
            <div className="mt-3 font-semibold text-zinc-500">{copy.missingTreatment}</div>
            <p className="mt-1">{signal.missingConsequence}</p>
          </>
        )}
      </div>
    </div>
  )
}

function PainCard({ pain, copy }: { pain: PainPoint; copy: ReportCopy }) {
  const tone =
    pain.severity === "critical"
      ? "border-rose-200 bg-rose-50"
      : pain.severity === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-emerald-200 bg-emerald-50"
  return (
    <article className={`rounded-lg border p-4 ${tone}`}>
      <div className="text-sm font-semibold text-zinc-950">{pain.title}</div>
      <dl className="mt-3 space-y-3 text-xs leading-6 text-zinc-700">
        <div>
          <dt className="font-semibold text-zinc-500">{copy.assumption}</dt>
          <dd>{pain.evidence}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-500">{copy.implication}</dt>
          <dd>{pain.implication}</dd>
        </div>
        <div className="rounded-md bg-white/85 p-3">
          <dt className="font-semibold text-zinc-500">{copy.recommendation}</dt>
          <dd className="font-semibold text-zinc-900">{pain.recommendedAction}</dd>
        </div>
      </dl>
    </article>
  )
}

function SourceRow({ item, copy }: { item: SourceCoverageItem; copy: ReportCopy }) {
  const tone = scoreTone(item.score)
  return (
    <div className="border-t border-zinc-100 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-zinc-950">{item.label}</span>
        <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${TONE_BADGE[tone]}`}>
          {item.status}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-zinc-500">{item.detail}</p>
      <div className="mt-3 space-y-2 text-[11px] leading-5 text-zinc-700">
        <p><span className="font-semibold text-zinc-500">{copy.sourceMeaning}: </span>{item.meaning}</p>
        {item.status === "missing" ? (
          <p><span className="font-semibold text-rose-700">{copy.sourceMissingImpact}: </span>{item.missingConsequence}</p>
        ) : (
          <p><span className="font-semibold text-emerald-700">{copy.sourceUse}: </span>{copy.sourceUseBody}</p>
        )}
        <p><span className="font-semibold text-zinc-500">{copy.sourceNext}: </span>{item.nextStep}</p>
      </div>
    </div>
  )
}

function SourceCoveragePanel({ data, copy }: { data: DiagnosticReportData; copy: ReportCopy }) {
  const visible = [...data.source_coverage.items].sort((a, b) => b.score - a.score).slice(0, 16)
  const missingImportant = data.source_coverage.items
    .filter((item) => item.status === "missing")
    .sort((a, b) => (a.category === "analysis" ? -1 : 0) - (b.category === "analysis" ? -1 : 0))
    .slice(0, 4)

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold text-zinc-500">{copy.sourceLedger}</div>
          <h2 className="mt-2 text-xl font-semibold text-zinc-950">
            {data.source_coverage.score}% {copy.sourceConfidence}
          </h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            {copy.collected} {data.source_coverage.collected} / {copy.configured} {data.source_coverage.configured} /{" "}
            {copy.missing} {data.source_coverage.missing}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100 sm:w-56">
          <div className="h-full bg-zinc-950" style={{ width: `${data.source_coverage.score}%` }} />
        </div>
      </div>
      {missingImportant.length > 0 && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold text-amber-900">{copy.missingImportantData}</div>
          <p className="mt-2 text-xs leading-6 text-amber-900">{copy.missingImportantBody}</p>
          <ul className="mt-3 space-y-2 text-xs leading-6 text-amber-950">
            {missingImportant.map((item) => (
              <li key={item.slug}>
                <span className="font-semibold">{item.label}: </span>{item.missingConsequence}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-5">
        {visible.map((item) => (
          <SourceRow key={item.slug} item={item} copy={copy} />
        ))}
      </div>
    </section>
  )
}

function ExecutiveMemo({
  data,
  copy,
  confidence,
}: {
  data: DiagnosticReportData
  copy: ReportCopy
  confidence: number
}) {
  const topPain = data.intelligence.painPoints[0]
  const firstAction = data.intelligence.nextActions[0]

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="text-xs font-semibold text-zinc-500">{copy.expertRead}</div>
      <h2 className="mt-2 text-2xl font-semibold leading-tight text-zinc-950">{data.hook}</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-zinc-50 p-4">
          <div className="text-xs font-semibold text-zinc-500">{copy.whatWeSee}</div>
          <p className="mt-2 text-sm leading-7 text-zinc-700">{topPain?.evidence ?? data.content_template.purpose}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-4">
          <div className="text-xs font-semibold text-zinc-500">{copy.whyItMatters}</div>
          <p className="mt-2 text-sm leading-7 text-zinc-700">{topPain?.implication ?? data.cta_text}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-4">
          <div className="text-xs font-semibold text-zinc-500">{copy.firstMove}</div>
          <p className="mt-2 text-sm leading-7 text-zinc-700">{firstAction}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <span className="rounded-md border border-zinc-200 px-2 py-1">{copy.confidence}: {confidence}/100</span>
        <span className="rounded-md border border-zinc-200 px-2 py-1">{copy.priority}: {data.template_variant}</span>
        <span className="rounded-md border border-zinc-200 px-2 py-1">{data.target_country}</span>
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
  const lang = normalizeReportLang(locale ?? data.report_locale)
  const copy = REPORT_COPY[lang]
  const theme = themeForIndustry(data.industry)
  const [lossRef, lossInView] = useInView()
  const lossCount = useCountUp(numericValue(data.total_loss), 1300, lossInView)
  const activeLocale = locale ?? data.report_locale
  const videoHref = trackingSlug ? `/${activeLocale}/report/${trackingSlug}/video` : null
  const confidence = signalScore(data.intelligence.signals)

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
              <div className="text-xs font-semibold text-zinc-950">{copy.brand}</div>
              <div className="text-[11px] text-zinc-500">{copy.privateReport}</div>
            </div>
          </div>
          <span className="text-xs text-zinc-500">
            {copy.validUntil}: {data.expires_at}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <section className="grid gap-6 border-b border-zinc-200 pb-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs">
              <span className="text-zinc-500">{copy.diagnosed}</span>
              <span className="font-semibold text-zinc-950">{data.company_name}</span>
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-600">
                {labelForIndustry(data.industry, data.report_locale)}
              </span>
              {data.prefecture && <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-600">{data.prefecture}</span>}
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-zinc-950 sm:text-4xl">{data.hook}</h1>
            <div className="mt-5 flex flex-wrap gap-2">
              {data.demo_url && (
                <a
                  href={data.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white"
                >
                  {copy.demo}
                </a>
              )}
              {videoHref && (
                <a
                  href={videoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950"
                >
                  {copy.video}
                </a>
              )}
            </div>
          </div>
          <div ref={lossRef} className="rounded-lg p-5 text-white shadow-sm" style={{ background: theme.ink }}>
            <div className="text-xs font-semibold text-white/65">{copy.loss}</div>
            <div className="mt-3 text-4xl font-semibold tabular-nums">{formatYen(lossInView ? lossCount : 0, lang)}</div>
            <p className="mt-4 text-sm leading-7 text-white/75">{data.cta_text}</p>
          </div>
        </section>

        <section className="py-8">
          <ExecutiveMemo data={data} copy={copy} confidence={confidence} />
        </section>

        <AuditConversionSections data={data} lang={lang} confidence={confidence} videoHref={videoHref} />

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {data.acts.map((act, index) => (
            <ActCard key={`${act.headline}-${index}`} act={act} index={index} lang={lang} />
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section>
              <h2 className="mb-4 text-xl font-semibold text-zinc-950">{copy.pain}</h2>
              <div className="grid gap-3">
                {data.intelligence.painPoints.map((pain) => (
                  <PainCard key={pain.id} pain={pain} copy={copy} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-zinc-950">{copy.evidence}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.intelligence.signals.slice(0, 10).map((signal) => (
                  <SignalCard key={signal.id} signal={signal} copy={copy} />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-950">{copy.actions}</h2>
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
              <div className="text-xs font-semibold text-zinc-500">{copy.template}</div>
              <h2 className="mt-2 text-lg font-semibold text-zinc-950">{data.content_template.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-600">{data.content_template.purpose}</p>
              <div className="mt-4 rounded-lg p-4" style={{ background: theme.accentSoft }}>
                <div className="text-xs font-semibold text-zinc-500">{copy.quality}</div>
                <p className="mt-2 text-sm leading-7 text-zinc-800">{data.content_template.quality_bar}</p>
              </div>
            </section>
          </aside>
        </section>

        <div className="mt-5">
          <SourceCoveragePanel data={data} copy={copy} />
        </div>

        <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-7 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-zinc-950">{copy.ctaHeading}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-600">{copy.ctaBody}</p>
          <a
            href={`mailto:info@paradigmjp.com?subject=${encodeURIComponent(copy.subject)}&body=${encodeURIComponent(data.report_url)}`}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-semibold text-white"
            style={{ background: theme.accentDark }}
          >
            {copy.ctaButton}
          </a>
        </section>
      </main>
    </div>
  )
}
