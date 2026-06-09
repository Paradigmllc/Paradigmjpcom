"use client"

import { LineChart } from "lucide-react"
import { useState } from "react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import { signalScore } from "@/lib/sales/company-intelligence"
import { labelForIndustry } from "@/lib/sales/render-quality"
import { localizeReportIntelligence, reportEvidenceText, sourceCategoryLabel, sourceCoverageDetail } from "./report-intelligence-copy"
import { REPORT_COPY, normalizeReportLang, type ReportLang } from "./report-copy"
import { getReportOfferCopy } from "./report-offer-copy"
import { cleanText, formatMoney, numericValue, reportTitle, Pill, Stat } from "./report-utils"
import { SlideInSection, StaggeredFadeIn } from "./ReportAnimations"
import { ReportExecutiveSummary } from "./ReportExecutiveSummary"
import { LossImpactBar, SourceCoverageRadar, CompetitorBenchmarkChart, TimelineChart, type BenchmarkItem, type LossImpactItem, type TimelinePoint } from "./ReportCharts"
import { getVariantLayout } from "./report-section-config"
import { VariantSection } from "./report-variant-sections"
import { ReportFaqSection } from "./ReportFaqSection"
import { AnimatedBackground } from "./report-visual-effects"
import { ReadingProgress, BackToTop } from "./report-ui-enhancements"
import DifyChatbot from "@/components/DifyChatbot"
import { localeContentVariant } from "@/lib/locale-map"
import { ReportHeader } from "./ReportHeader"
import ReportHeroSection from "./ReportHeroSection"
import ReportDarkSurface from "./ReportDarkSurface"
import ReportFindingCard from "./ReportFindingCard"
import ReportPainCard from "./ReportPainCard"
import ReportSignalCard from "./ReportSignalCard"
import ReportSourceRow from "./ReportSourceRow"
import ReportRoiCalculator from "./ReportRoiCalculator"
import ReportFinalCta from "./ReportFinalCta"
import ReportRequestModal from "./ReportRequestModal"
import ReportFindingsSection from "./ReportFindingsSection"
import { TRACKING_SCRIPT, PRINT_CSS } from "./report-tracking"

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
  const videoHref = trackingSlug
    ? `/${activeLocale}/report/${trackingSlug}/video`
    : null
  const industryLabel = labelForIndustry(data.industry, lang)
  const visibleSources = [...data.source_coverage.items]
    .sort((a, b) => b.score - a.score)
    .slice(0, 14)
  const calHref = `https://cal.com/paradigm-jp/15min?name=${encodeURIComponent(data.company_name)}`

  const [isDark, setIsDark] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)

  const heroText = cleanText(reportEvidenceText(data.hook, lang), offerCopy.heroLead)
  const ctaText = cleanText(reportEvidenceText(data.cta_text, lang), offerCopy.finalBody)
  const qualityBar = cleanText(
    reportEvidenceText(data.content_template.quality_bar, lang),
    copy.qualityBar
  )
  const templateTitle = cleanText(
    reportEvidenceText(data.content_template.title, lang),
    copy.templateDirection
  )
  const templatePurpose = cleanText(
    reportEvidenceText(data.content_template.purpose, lang),
    copy.finalBody
  )
  const businessImpact = cleanText(topPain?.implication, ctaText)
  const sourceScore = data.source_coverage.score

  const benchmarkItems: BenchmarkItem[] = data.acts
    .filter((act) => {
      const n = numericValue(act.metric_value)
      return n > 0 && !isNaN(n)
    })
    .map((act) => {
      const n = numericValue(act.metric_value)
      const maxVal = 100
      const yourScore = Math.min(100, Math.max(0, (n / maxVal) * 100))
      return {
        label: cleanText(act.metric_label, copy.evidence).slice(0, 20),
        yourScore,
        industryAvg: 70,
      }
    })

  const lossItems: LossImpactItem[] = data.acts
    .filter((act) => {
      const n = numericValue(act.metric_value)
      return n > 0 && !isNaN(n)
    })
    .map((act, i) => ({
      label: cleanText(act.headline, act.metric_label).slice(0, 30),
      amount: Math.round((loss / data.acts.length) * (data.acts.length - i) * 0.8 + loss * 0.2),
    }))

  const radarItems = (() => {
    const categories: Record<string, { sum: number; count: number }> = {}
    for (const item of visibleSources) {
      const cat = sourceCategoryLabel(item.category, lang)
      if (!categories[cat]) categories[cat] = { sum: 0, count: 0 }
      categories[cat].sum += item.score
      categories[cat].count += 1
    }
    return Object.entries(categories)
      .map(([category, v]) => ({
        label: category,
        value: Math.round(v.sum / v.count),
      }))
      .slice(0, 8)
  })()

  const timelineItems: TimelinePoint[] = [
    { month: lang === "ja" ? "現在" : "Now", loss, competitorGap: loss * 0.5 },
    ...([1, 3, 6].map((m) => ({
      month: `${m}${lang === "ja" ? "ヶ月" : "mo"}`,
      loss: Math.round(loss * (1 + m * 0.05)),
      competitorGap: Math.round(Math.max(0, loss * (1 + m * 0.05) * 0.4)),
    }))),
  ]
  const isProjection = lang === "ja" ? "※改善しない場合の推定値" : "Projection if unaddressed"

  return (
    <div className={`min-h-screen relative ${isDark ? "bg-zinc-950 text-white" : "bg-[#fbfaf7] text-zinc-950"}`}>
      <ReadingProgress />
      <AnimatedBackground />
      <div className="relative z-10">
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

      <ReportHeader
        isDark={isDark}
        setIsDark={setIsDark}
        actionOpen={actionOpen}
        setActionOpen={setActionOpen}
        onRequestOpen={() => setRequestOpen(true)}
        copy={copy}
        offerCopy={offerCopy}
        lang={lang}
        calHref={calHref}
      />

      <main>
        {/* ── Hero ──────────────────────────────────────────── */}
        <ReportHeroSection
          offerCopy={offerCopy}
          reportTitleEl={reportTitle(data.company_name, offerCopy.reportLabel, lang)}
          heroText={heroText}
          demoUrl={data.demo_url ?? null}
          calHref={calHref}
          lang={lang}
          industryLabel={industryLabel}
          targetCountry={data.target_country}
          prefecture={data.prefecture ?? null}
        />

        {/* ── Diagnostic video ─────── */}
        {videoHref && (
          <section className="px-5 pb-10">
            <div className="mx-auto max-w-6xl">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-lg bg-zinc-900">
                <iframe
                  src={videoHref}
                  className="w-full aspect-video"
                  title={lang === "ja" ? "60秒診断動画" : "60-second diagnostic video"}
                />
              </div>
              {data.video_url && (
                <p className="mt-2 text-center text-xs text-zinc-400">
                  <a href={data.video_url} download className="hover:text-zinc-300 underline">
                    {lang === "ja" ? "MP4をダウンロード" : "Download MP4"}
                  </a>
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── Variant-specific sections ─────── */}
        {(() => {
          const layout = getVariantLayout(data.template_variant)
          return layout.sections
            .filter((s) => !["hero", "stats", "executive_summary", "dark_surface", "benchmark", "findings", "loss_chart", "screenshot", "pain_points", "source_coverage", "timeline", "evidence", "faq", "cta"].includes(s.id))
            .map((s) => <VariantSection key={s.id} sectionId={s.id} data={data} lang={lang} />)
        })()}

        {/* ── Stats Row ─────────────────────────────────────── */}
        <section className="px-5 pb-12">
          <div className="mx-auto grid max-w-6xl border-y border-zinc-200 md:grid-cols-4">
            <Stat
              label={copy.evidenceReady}
              value={`${data.source_coverage.collected}`}
              detail={sourceCoverageDetail(
                data.source_coverage.configured,
                data.source_coverage.missing,
                lang
              )}
            />
            <Stat
              label={copy.sourceCoverage}
              value={`${data.source_coverage.score}%`}
              detail={copy.sourceMissing}
            />
            <Stat
              label={copy.monthlyLoss}
              value={formatMoney(loss, lang)}
              detail={ctaText}
            />
            <Stat
              label={copy.confidence}
              value={`${confidence}/100`}
              detail={qualityBar}
            />
          </div>
        </section>

        {/* ── Executive Summary ──────────────────────────────── */}
        <ReportExecutiveSummary
          lang={lang}
          companyName={data.company_name}
          reportLabel={offerCopy.reportLabel}
          businessImpact={businessImpact}
          firstAction={cleanText(intelligence.nextActions[0], ctaText)}
          topPain={topPain}
          sourceScore={data.source_coverage.score}
          confidence={confidence}
          monthlyLoss={loss}
          findingsCount={data.acts.length}
        />

        {/* ── Dark Diagnostic Surface ───────────────────────── */}
        <ReportDarkSurface
          data={localizedData}
          copy={copy}
          confidence={confidence}
          lang={lang}
          sourceScore={sourceScore}
        />

        {/* ── Competitor Benchmark Chart ────────────────────── */}
        {benchmarkItems.length > 0 && (
          <SlideInSection direction="up" className="px-5 py-10">
            <div className="mx-auto max-w-6xl">
              <h3 className="text-lg font-semibold text-slate-800 mb-1">{copy.competitorBenchmark}</h3>
              <p className="text-sm text-slate-500 mb-4">
                {lang === "ja" ? "あなたのサイト vs 業界平均" : "Your site vs industry average"}
              </p>
               <CompetitorBenchmarkChart items={benchmarkItems} lang={lang} />
            </div>
          </SlideInSection>
        )}

        {/* ── Findings ──────────────────────────────────────── */}
        <ReportFindingsSection
          data={localizedData}
          copy={copy}
          lang={lang}
          businessImpact={businessImpact}
          loss={loss}
        />

        {/* ── Loss Impact Chart ─────────────────────────────── */}
        {lossItems.length > 0 && (
          <SlideInSection direction="up" className="px-5 pb-10">
            <div className="mx-auto max-w-6xl">
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                {lang === "ja" ? "月間損失インパクト（課題別）" : "Monthly Loss Impact by Issue"}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {lang === "ja" ? "各課題が月間損失に与える推定インパクト" : "Estimated monthly impact per issue"}
              </p>
               <LossImpactBar items={lossItems} lang={lang} />
            </div>
          </SlideInSection>
        )}

        {/* ── Screenshot ────────────────────────────────────── */}
        {data.screenshot_url && (
          <SlideInSection direction="right" className="px-5 pb-14">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div>
                <Pill tone="neutral">{copy.diagnosticSurface}</Pill>
                <h2 className="mt-5 text-3xl font-semibold leading-tight text-zinc-950">
                  {copy.currentState}
                </h2>
                <p className="mt-4 text-sm leading-7 text-zinc-600">{heroText}</p>
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.screenshot_url}
                  alt={`${data.company_name} ${offerCopy.screenshotAlt}`}
                  loading="lazy"
                  className="max-h-[620px] w-full object-cover object-top"
                />
              </div>
            </div>
          </SlideInSection>
        )}

        {/* ── Pain Points ───────────────────────────────────── */}
        <section className={`px-5 py-14 ${isDark ? "bg-zinc-900" : "bg-white"}`}>
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <SlideInSection direction="left">
              <div>
                <Pill tone="neutral">{copy.whyItMatters}</Pill>
                <h2 className="mt-5 text-3xl font-semibold leading-tight text-zinc-950">
                  {copy.businessImpact}
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {intelligence.painPoints.map((pain) => (
                    <ReportPainCard key={pain.id} pain={pain} copy={copy} lang={lang} />
                  ))}
                </div>
              </div>
            </SlideInSection>
            <SlideInSection direction="right">
              <aside className="space-y-4">
                <div className="rounded-lg border border-zinc-200 bg-[#fbfaf7] p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                    <LineChart size={17} aria-hidden />
                    {copy.roadmap}
                  </div>
                  <ol className="mt-5 space-y-4">
                    {intelligence.nextActions.map((action, index) => (
                      <li
                        key={action}
                        className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 text-sm leading-7 text-zinc-700"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <span>{cleanText(action, copy.firstMove)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-[#fbfaf7] p-5">
                  <div className="text-xs font-semibold text-zinc-500">
                    {copy.templateDirection}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-zinc-950">{templateTitle}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-600">{templatePurpose}</p>
                  <div className="mt-4 border-t border-zinc-200 pt-4 text-xs leading-6 text-zinc-500">
                    <span className="font-semibold text-zinc-800">{copy.qualityBar}: </span>
                    {qualityBar}
                  </div>
                </div>
              </aside>
            </SlideInSection>
          </div>
        </section>

        {/* ── Source Coverage Radar ─────────────────────────── */}
        {radarItems.length > 1 && (
          <SlideInSection direction="up" className="px-5 py-10">
            <div className="mx-auto max-w-6xl">
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                {lang === "ja" ? "ソースカバレッジ（カテゴリ別）" : "Source Coverage by Category"}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {lang === "ja" ? "各データカテゴリのカバレッジスコア分布" : "Coverage score distribution across data categories"}
              </p>
              <SourceCoverageRadar items={radarItems} />
            </div>
          </SlideInSection>
        )}

        {/* ── Timeline Forecast ─────────────────────────────── */}
        <SlideInSection direction="up" className="px-5 pb-10">
          <div className="mx-auto max-w-6xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              {lang === "ja" ? "損失予測" : "Loss Forecast"}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {lang === "ja" ? "現状維持の場合の月間損失推移と競合との差" : "Monthly loss trajectory and competitor gap"}
            </p>
            <TimelineChart points={timelineItems} lang={lang} />
            <p className="mt-2 text-[10px] text-slate-400 text-center">{isProjection}</p>
          </div>
        </SlideInSection>

        {/* ── Evidence / Data Appendix ──────────────────────── */}
        <section className="px-5 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <SlideInSection direction="left">
                <div>
                  <Pill tone="neutral">{copy.evidence}</Pill>
                  <h2 className="mt-5 text-3xl font-semibold text-zinc-950">
                    {copy.dataAppendix}
                  </h2>
                </div>
              </SlideInSection>
              <div className="text-sm text-zinc-500">
                {data.source_coverage.collected} / {data.source_coverage.configured} /{" "}
                {data.source_coverage.missing}
              </div>
            </div>
            <StaggeredFadeIn delay={0.1} stagger={0.05} className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {intelligence.signals
                .slice(0, 9)
                .map((signal) => (
                  <ReportSignalCard key={signal.id} signal={signal} copy={copy} lang={lang} />
                ))}
            </StaggeredFadeIn>
            <div className="mt-8 grid gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm md:grid-cols-2 lg:grid-cols-3">
              {visibleSources.map((item) => (
                <ReportSourceRow key={item.slug} item={item} copy={copy} lang={lang} />
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────── */}
        <ReportFaqSection
          variant={data.template_variant}
          lang={lang === "ja" ? "ja" : "en"}
          copy={copy}
          isDark={isDark}
        />

        {/* ── Final CTA ─────────────────────────────────────── */}
        <ReportFinalCta
          offerCopy={offerCopy}
          copy={copy}
          lang={lang}
          calHref={calHref}
          demoUrl={data.demo_url ?? null}
          videoHref={videoHref}
        />
      </main>
      </div>

      <script dangerouslySetInnerHTML={{ __html: TRACKING_SCRIPT(trackingSlug ?? "") }} />
      {/* A/B test tracking */}
      <img src={`/api/sales/track-view?slug=${encodeURIComponent(trackingSlug || "")}&event=ab_test&variant=${encodeURIComponent(data.template_variant)}&industry=${encodeURIComponent(data.industry || "")}`} alt="" width={1} height={1} className="hidden" />

      {/* ── Footer ── */}
      <footer className={`border-t px-5 py-8 mt-10 ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
        <div className="mx-auto max-w-6xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className={`text-xs ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            © {new Date().getFullYear()} Paradigm LLC. {lang === "ja" ? "無断転載禁止" : "All rights reserved."}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <a href="https://paradigmjp.com/ja" className={`hover:underline ${isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-700"}`}>Paradigm HP</a>
            <a href="https://paradigmjp.com/ja/agency" className={`hover:underline ${isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-700"}`}>{lang === "ja" ? "制作事例" : "Works"}</a>
            <a href="https://paradigmjp.com/ja/video" className={`hover:underline ${isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-700"}`}>{lang === "ja" ? "動画制作" : "Video"}</a>
            <a href={calHref} target="_blank" rel="noopener noreferrer" className={`hover:underline ${isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-700"}`}>{lang === "ja" ? "無料相談" : "Free Consult"}</a>
          </div>
        </div>
      </footer>
      <BackToTop />

      {/* ── 資料請求 Modal ── */}
      <ReportRequestModal
        isOpen={requestOpen}
        onClose={() => setRequestOpen(false)}
        lang={lang}
        data={data}
      />

      <style>{PRINT_CSS}</style>
      <DifyChatbot locale={localeContentVariant(locale ?? data.report_locale as string)} />
    </div>
  )
}
