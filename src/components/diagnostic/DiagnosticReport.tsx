import { ArrowRight, Check, ExternalLink, Gauge, LineChart, ShieldCheck, Sparkles } from "lucide-react"
import type { ReactNode } from "react"
import type { DiagnosticAct, DiagnosticReportData } from "@/lib/sales/diagnostic"
import { signalScore, type IntelligenceSignal, type PainPoint } from "@/lib/sales/company-intelligence"
import type { SourceCoverageItem } from "@/lib/sales/source-coverage"
import { labelForIndustry } from "@/lib/sales/render-quality"
import { ReportExecutiveBrief } from "./ReportExecutiveBrief"
import { localizeReportIntelligence, reportEvidenceText, severityLabel, sourceCategoryLabel, sourceCoverageDetail, sourceStatusLabel } from "./report-intelligence-copy"
import { REPORT_COPY, normalizeReportLang, type ReportCopy, type ReportLang } from "./report-copy"
import { getReportOfferCopy } from "./report-offer-copy"

const TONE_CLASS = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
} as const

const SEVERITY_LABEL = {
  critical: { ja: "最優先", en: "Critical" },
  warning: { ja: "改善余地", en: "Action needed" },
  info: { ja: "機会", en: "Opportunity" },
} as const

const CORRUPTED_TEXT_PATTERN = /縺|繝|譁|險|謾|蛻|邨|雋|蠖|荳|鬆|譛|蜿|髱|螟|莉|逶|ﾂ|�/

function cleanText(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  return CORRUPTED_TEXT_PATTERN.test(value) ? fallback : value
}

function numericValue(value: string): number {
  return Number.parseInt(value.replace(/[^0-9]/g, ""), 10) || 0
}

function formatMoney(amount: number, lang: ReportLang): string {
  return new Intl.NumberFormat(intlLocale(lang), {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount)
}

function intlLocale(lang: ReportLang): string {
  const localeMap: Record<ReportLang, string> = {
    ja: "ja-JP",
    en: "en-US",
    ko: "ko-KR",
    zh: "zh-CN",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    pt: "pt-BR",
    ru: "ru-RU",
    ar: "ar-AE",
    vi: "vi-VN",
    id: "id-ID",
  }
  return localeMap[lang]
}

function formatMetric(value: string, lang: ReportLang): string {
  const numeric = numericValue(value)
  return numeric > 0 ? numeric.toLocaleString(intlLocale(lang)) : value
}

function reportTitle(companyName: string, label: string, lang: ReportLang): ReactNode {
  if (lang === "ja") {
    return (
      <>
        {companyName}の<span className="text-[#7657ff]">{label}</span>
      </>
    )
  }
  return (
    <>
      <span className="text-[#7657ff]">{label}</span> for {companyName}
    </>
  )
}

function sourceTone(score: number): keyof typeof TONE_CLASS {
  if (score >= 75) return "good"
  if (score >= 45) return "warning"
  return "critical"
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONE_CLASS }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${TONE_CLASS[tone]}`}>{children}</span>
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-t border-zinc-200 py-5 first:border-t-0 md:border-l md:border-t-0 md:px-6 md:first:border-l-0">
      <div className="text-xs font-semibold text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums text-zinc-950">{value}</div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  )
}

function FindingCard({ act, index, copy, lang }: { act: DiagnosticAct; index: number; copy: ReportCopy; lang: ReportLang }) {
  const severity = SEVERITY_LABEL[act.severity][lang === "ja" ? "ja" : "en"]
  const headline = cleanText(act.headline, lang === "ja" ? `優先改善ポイント ${index + 1}` : `Priority improvement ${index + 1}`)
  const body = cleanText(act.body, copy.heroLead)
  const metricLabel = cleanText(act.metric_label, copy.evidence)
  const metricBench = cleanText(act.metric_bench, copy.qualityBar)
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
          {index + 1}
        </div>
        <Pill tone={act.severity === "critical" ? "critical" : act.severity === "warning" ? "warning" : "good"}>{severity}</Pill>
      </div>
      <h3 className="mt-5 text-xl font-semibold leading-7 text-zinc-950">{headline}</h3>
      <p className="mt-3 text-sm leading-7 text-zinc-600">{body}</p>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-t border-zinc-100 pt-4">
        <div>
          <div className="text-xs font-semibold text-zinc-500">{metricLabel}</div>
          <div className="mt-1 text-[11px] leading-5 text-zinc-500">{metricBench}</div>
        </div>
        <div className="text-right">
          <span className="text-3xl font-semibold tabular-nums text-zinc-950">{formatMetric(act.metric_value, lang)}</span>
          <span className="ml-1 text-xs font-semibold text-zinc-500">{act.metric_unit}</span>
        </div>
      </div>
      <div className="mt-4 text-xs font-semibold text-zinc-500">{copy.priorityFindings}</div>
    </article>
  )
}

function PainCard({ pain, copy, lang }: { pain: PainPoint; copy: ReportCopy; lang: ReportLang }) {
  const tone = pain.severity === "critical" ? "critical" : pain.severity === "warning" ? "warning" : "good"
  const title = cleanText(pain.title, copy.currentState)
  const evidence = cleanText(pain.evidence, copy.heroLead)
  const implication = cleanText(pain.implication, copy.businessImpact)
  const recommendedAction = cleanText(pain.recommendedAction, copy.finalBody)
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-7 text-zinc-950">{title}</h3>
        <Pill tone={tone}>{severityLabel(pain.severity, lang)}</Pill>
      </div>
      <dl className="mt-4 space-y-4 text-sm leading-7 text-zinc-600">
        <div>
          <dt className="text-xs font-semibold text-zinc-500">{copy.evidence}</dt>
          <dd>{evidence}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-zinc-500">{copy.businessImpact}</dt>
          <dd>{implication}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-zinc-500">{copy.recommendation}</dt>
          <dd className="font-semibold text-zinc-950">{recommendedAction}</dd>
        </div>
      </dl>
    </article>
  )
}

function SignalCard({ signal, copy, lang }: { signal: IntelligenceSignal; copy: ReportCopy; lang: ReportLang }) {
  const label = cleanText(reportEvidenceText(signal.label, lang), copy.evidence)
  const source = cleanText(reportEvidenceText(signal.source, lang), "Sales OS")
  const whyItMatters = cleanText(reportEvidenceText(signal.whyItMatters, lang), copy.whyItMatters)
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">{label}</h3>
          <p className="mt-1 text-xs text-zinc-500">{source}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${TONE_CLASS[signal.tone]}`}>{signal.value}</span>
      </div>
      <p className="mt-3 text-xs leading-6 text-zinc-600">{whyItMatters}</p>
      {signal.missingConsequence && <p className="mt-3 text-xs leading-6 text-zinc-500">{copy.sourceMissing}</p>}
    </article>
  )
}

function SourceRow({ item, copy, lang }: { item: SourceCoverageItem; copy: ReportCopy; lang: ReportLang }) {
  const label = cleanText(reportEvidenceText(item.label, lang), copy.evidence)
  const detail = cleanText(reportEvidenceText(item.detail, lang), copy.heroLead)
  const meaning = cleanText(reportEvidenceText(item.meaning, lang), copy.sourceMeaning)
  const nextStep = cleanText(reportEvidenceText(item.nextStep, lang), copy.sourceNext)
  return (
    <div className="grid gap-3 border-t border-zinc-200 py-4 first:border-t-0 md:grid-cols-[180px_minmax(0,1fr)_120px]">
      <div>
        <div className="text-sm font-semibold text-zinc-950">{label}</div>
        <div className="mt-1 text-xs text-zinc-500">{sourceCategoryLabel(item.category, lang)}</div>
      </div>
      <div>
        <p className="text-xs leading-6 text-zinc-600">{detail}</p>
        <p className="mt-2 text-xs leading-6 text-zinc-500">
          <span className="font-semibold text-zinc-700">{copy.sourceMeaning}: </span>
          {meaning}
        </p>
        <p className="mt-2 text-xs leading-6 text-zinc-500">
          <span className="font-semibold text-zinc-700">{copy.sourceNext}: </span>
          {nextStep}
        </p>
      </div>
      <div className="md:text-right">
        <Pill tone={sourceTone(item.score)}>{sourceStatusLabel(item.status, lang)}</Pill>
      </div>
    </div>
  )
}

function DarkDiagnosticSurface({
  data,
  copy,
  confidence,
  lang,
}: {
  data: DiagnosticReportData
  copy: ReportCopy
  confidence: number
  lang: ReportLang
}) {
  const loss = numericValue(data.total_loss)
  const ctaText = cleanText(data.cta_text, copy.finalBody)
  const firstAction = cleanText(data.intelligence.nextActions[0], ctaText)
  return (
    <section className="bg-[#0b1220] px-5 py-12 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col justify-between">
          <div>
            <Pill tone="good">{copy.diagnosticSurface}</Pill>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              {copy.currentState} <span className="text-[#8b6cff]">→</span> {copy.improvedState}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/70">{ctaText}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="border-t border-white/15 pt-4">
              <div className="text-xs font-semibold text-white/50">{copy.monthlyLoss}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{formatMoney(loss, lang)}</div>
            </div>
            <div className="border-t border-white/15 pt-4">
              <div className="text-xs font-semibold text-white/50">{copy.confidence}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{confidence}/100</div>
            </div>
            <div className="border-t border-white/15 pt-4">
              <div className="text-xs font-semibold text-white/50">{copy.sourceCoverage}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{data.source_coverage.score}%</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white p-5 text-zinc-950 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-zinc-500">{copy.firstMove}</div>
              <div className="mt-1 text-lg font-semibold">{data.company_name}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Gauge size={18} aria-hidden />
            </div>
          </div>
          <div className="mt-5 rounded-md bg-zinc-950 p-4 text-white">
            <div className="flex items-center justify-between text-xs text-white/55">
              <span>{copy.currentState}</span>
              <span>{copy.improvedState}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[72%] rounded-full bg-[#7c5cff]" />
            </div>
            <p className="mt-4 text-sm leading-7 text-white/75">{firstAction}</p>
          </div>
          <div className="mt-5 space-y-3">
            {data.intelligence.signals.slice(0, 4).map((signal) => (
              <div key={signal.id} className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0">
                <span className="truncate text-sm font-semibold text-zinc-800">{signal.label}</span>
                <span className="text-xs text-zinc-500">{signal.value}</span>
              </div>
            ))}
          </div>
        </div>
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
  const offerCopy = getReportOfferCopy(lang, data.template_variant)
  const intelligence = localizeReportIntelligence(data.intelligence, lang)
  const localizedData = { ...data, intelligence }
  const activeLocale = locale ?? data.report_locale
  const confidence = signalScore(intelligence.signals)
  const loss = numericValue(data.total_loss)
  const topPain = intelligence.painPoints[0]
  const videoHref = trackingSlug ? `/${activeLocale}/report/${trackingSlug}/video` : null
  const industryLabel = labelForIndustry(data.industry, lang)
  const visibleSources = [...data.source_coverage.items].sort((a, b) => b.score - a.score).slice(0, 14)
  const mailHref = `mailto:info@paradigmjp.com?subject=${encodeURIComponent(copy.emailSubject)}&body=${encodeURIComponent(data.report_url)}`
  const heroText = cleanText(reportEvidenceText(data.hook, lang), offerCopy.heroLead)
  const ctaText = cleanText(reportEvidenceText(data.cta_text, lang), offerCopy.finalBody)
  const qualityBar = cleanText(reportEvidenceText(data.content_template.quality_bar, lang), copy.qualityBar)
  const templateTitle = cleanText(reportEvidenceText(data.content_template.title, lang), copy.templateDirection)
  const templatePurpose = cleanText(reportEvidenceText(data.content_template.purpose, lang), copy.finalBody)
  const businessImpact = cleanText(topPain?.implication, ctaText)

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-zinc-950">
      {trackingSlug && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/sales/track-view?slug=${encodeURIComponent(trackingSlug)}&locale=${encodeURIComponent(activeLocale)}`} alt="" width={1} height={1} className="pointer-events-none absolute -left-[9999px] -top-[9999px] opacity-0" aria-hidden />
      )}

      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-[#fbfaf7]/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">P</div>
            <div>
              <div className="text-sm font-semibold">{copy.brand}</div>
              <div className="text-xs text-zinc-500">{offerCopy.reportLabel}</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
            <ShieldCheck size={16} aria-hidden />
            {copy.validity}: {data.expires_at}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 py-16 sm:py-24">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(24,24,27,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,27,0.07)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-80 bg-gradient-to-b from-transparent to-[#fbfaf7]" />
          <div className="mx-auto max-w-6xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
              <Sparkles size={15} aria-hidden />
              {offerCopy.badge}
            </div>
            <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-semibold leading-[1.04] text-zinc-950 sm:text-7xl">
              {reportTitle(data.company_name, offerCopy.reportLabel, lang)}
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-600">{heroText}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {data.demo_url && (
                <a href={data.demo_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white shadow-lg">
                  {offerCopy.primaryCta}
                  <ArrowRight size={16} aria-hidden />
                </a>
              )}
              <a href={mailHref} className="inline-flex h-12 items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 shadow-sm">
                {copy.secondaryCta}
                <ExternalLink size={15} aria-hidden />
              </a>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Pill tone="good"><Check size={14} aria-hidden /> {industryLabel}</Pill>
              <Pill>{data.target_country}</Pill>
              {data.prefecture && <Pill>{data.prefecture}</Pill>}
              <Pill>{offerCopy.reportLabel}</Pill>
            </div>
          </div>
        </section>

        <section className="px-5 pb-12">
          <div className="mx-auto grid max-w-6xl border-y border-zinc-200 md:grid-cols-4">
            <Stat label={copy.evidenceReady} value={`${data.source_coverage.collected}`} detail={sourceCoverageDetail(data.source_coverage.configured, data.source_coverage.missing, lang)} />
            <Stat label={copy.sourceCoverage} value={`${data.source_coverage.score}%`} detail={copy.sourceMissing} />
            <Stat label={copy.monthlyLoss} value={formatMoney(loss, lang)} detail={ctaText} />
            <Stat label={copy.confidence} value={`${confidence}/100`} detail={qualityBar} />
          </div>
        </section>

        <ReportExecutiveBrief lang={lang} companyName={data.company_name} reportLabel={offerCopy.reportLabel} businessImpact={businessImpact} firstAction={cleanText(intelligence.nextActions[0], ctaText)} topPain={topPain} />

        <DarkDiagnosticSurface data={localizedData} copy={copy} confidence={confidence} lang={lang} />

        <section className="px-5 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <Pill tone="neutral">{copy.priorityFindings}</Pill>
              <h2 className="mt-5 text-4xl font-semibold leading-tight text-zinc-950">{copy.businessImpact}</h2>
              <p className="mt-4 text-base leading-8 text-zinc-600">{businessImpact}</p>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {data.acts.map((act, index) => <FindingCard key={`${act.headline}-${index}`} act={act} index={index} copy={copy} lang={lang} />)}
            </div>
          </div>
        </section>

        {data.screenshot_url && (
          <section className="px-5 pb-14">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div>
                <Pill tone="neutral">{copy.diagnosticSurface}</Pill>
                <h2 className="mt-5 text-3xl font-semibold leading-tight text-zinc-950">{copy.currentState}</h2>
                <p className="mt-4 text-sm leading-7 text-zinc-600">{heroText}</p>
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.screenshot_url} alt={`${data.company_name} ${offerCopy.screenshotAlt}`} className="max-h-[620px] w-full object-cover object-top" />
              </div>
            </div>
          </section>
        )}

        <section className="bg-white px-5 py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <Pill tone="neutral">{copy.whyItMatters}</Pill>
              <h2 className="mt-5 text-3xl font-semibold leading-tight text-zinc-950">{copy.businessImpact}</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {intelligence.painPoints.map((pain) => <PainCard key={pain.id} pain={pain} copy={copy} lang={lang} />)}
              </div>
            </div>
            <aside className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-[#fbfaf7] p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                  <LineChart size={17} aria-hidden />
                  {copy.roadmap}
                </div>
                <ol className="mt-5 space-y-4">
                  {intelligence.nextActions.map((action, index) => (
                    <li key={action} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 text-sm leading-7 text-zinc-700">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">{index + 1}</span>
                  <span>{cleanText(action, copy.firstMove)}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-[#fbfaf7] p-5">
                <div className="text-xs font-semibold text-zinc-500">{copy.templateDirection}</div>
                <h3 className="mt-2 text-lg font-semibold text-zinc-950">{templateTitle}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-600">{templatePurpose}</p>
                <div className="mt-4 border-t border-zinc-200 pt-4 text-xs leading-6 text-zinc-500">
                  <span className="font-semibold text-zinc-800">{copy.qualityBar}: </span>
                  {qualityBar}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="px-5 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Pill tone="neutral">{copy.evidence}</Pill>
                <h2 className="mt-5 text-3xl font-semibold text-zinc-950">{copy.dataAppendix}</h2>
              </div>
              <div className="text-sm text-zinc-500">{data.source_coverage.collected} / {data.source_coverage.configured} / {data.source_coverage.missing}</div>
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {intelligence.signals.slice(0, 9).map((signal) => <SignalCard key={signal.id} signal={signal} copy={copy} lang={lang} />)}
            </div>
            <div className="mt-8 rounded-lg border border-zinc-200 bg-white px-5 shadow-sm">
              {visibleSources.map((item) => <SourceRow key={item.slug} item={item} copy={copy} lang={lang} />)}
            </div>
          </div>
        </section>

        <section className="px-5 pb-16">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-lg bg-zinc-950 text-white">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="p-8 sm:p-10">
                <h2 className="max-w-3xl text-4xl font-semibold leading-tight">{offerCopy.finalHeading}</h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-white/70">{offerCopy.finalBody}</p>
              </div>
              <div className="flex flex-col justify-center gap-3 border-t border-white/10 p-8 lg:border-l lg:border-t-0">
                {data.demo_url && (
                  <a href={data.demo_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-zinc-950">
                    {offerCopy.primaryCta}
                    <ArrowRight size={16} aria-hidden />
                  </a>
                )}
                {videoHref && (
                  <a href={videoHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white">
                    {copy.secondaryCta}
                  </a>
                )}
                <a href={mailHref} className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white">
                  {copy.secondaryCta}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
