"use client"

import Link from "next/link"
import type { IntelligenceSignal } from "@/lib/sales/company-intelligence"
import type { SourceCoverageItem as SourceItem } from "@/lib/sales/source-coverage"
import { SlideInSection, StaggeredFadeIn } from "./ReportAnimations"
import {
  SourceCoverageRadar,
  TimelineChart,
  type SourceCoverageItem as RadarItem,
  type TimelinePoint,
} from "./ReportCharts"
import type { ReportCopy, ReportLang } from "./report-copy"
import { Pill } from "./report-utils"
import ReportSignalCard from "./ReportSignalCard"
import ReportSourceRow from "./ReportSourceRow"

interface SourceSummary {
  collected: number
  configured: number
  missing: number
}

export function ReportAppendixSections({
  radarItems,
  timelineItems,
  isProjection,
  copy,
  lang,
  sourceSummary,
  signals,
  sources,
}: {
  radarItems: RadarItem[]
  timelineItems: TimelinePoint[]
  isProjection: string
  copy: ReportCopy
  lang: ReportLang
  sourceSummary: SourceSummary
  signals: IntelligenceSignal[]
  sources: SourceItem[]
}) {
  return (
    <>
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
              {sourceSummary.collected} / {sourceSummary.configured} / {sourceSummary.missing}
            </div>
          </div>
          <StaggeredFadeIn delay={0.1} stagger={0.05} className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {signals.slice(0, 9).map((signal) => (
              <ReportSignalCard key={signal.id} signal={signal} copy={copy} lang={lang} />
            ))}
          </StaggeredFadeIn>
          <div className="mt-8 grid gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm md:grid-cols-2 lg:grid-cols-3">
            {sources.map((item) => (
              <ReportSourceRow key={item.slug} item={item} copy={copy} lang={lang} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export function ReportFooter({
  isDark,
  lang,
  calHref,
}: {
  isDark: boolean
  lang: ReportLang
  calHref: string
}) {
  return (
    <footer className={`border-t px-5 py-8 mt-10 ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
      <div className="mx-auto max-w-6xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className={`text-xs ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
          © {new Date().getFullYear()} Paradigm LLC. {lang === "ja" ? "無断転載禁止" : "All rights reserved."}
        </div>
        <nav aria-label={lang === "ja" ? "フッターナビゲーション" : "Footer navigation"} className="flex items-center gap-4 text-xs">
          <Link href="/ja" className={`hover:underline ${isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-700"}`}>Paradigm HP</Link>
          <Link href="/ja/agency" className={`hover:underline ${isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-700"}`}>{lang === "ja" ? "制作事例" : "Works"}</Link>
          <Link href="/ja/video" className={`hover:underline ${isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-700"}`}>{lang === "ja" ? "動画制作" : "Video"}</Link>
          <a href={calHref} target="_blank" rel="noopener noreferrer" className={`hover:underline ${isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-700"}`}>{lang === "ja" ? "無料相談" : "Free Consult"}</a>
        </nav>
      </div>
    </footer>
  )
}
