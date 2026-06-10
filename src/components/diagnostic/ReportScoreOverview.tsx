"use client"

import { ReportScoreCard, ScoreCardGrid } from "./ReportScoreCard"
import { sourceCoverageDetail } from "./report-intelligence-copy"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { ReportLang } from "./report-copy"

export function ReportScoreOverview({
  data,
  lang,
  confidence,
  sourceScore,
}: {
  data: DiagnosticReportData
  lang: ReportLang
  confidence: number
  sourceScore: number
}) {
  return (
    <section className="px-5 pb-12">
      <div className="mx-auto max-w-6xl">
        <h3 className="text-lg font-semibold text-slate-800 mb-5">
          {lang === "ja" ? "スコア概要" : "Score Overview"}
        </h3>
        <ScoreCardGrid columns={3}>
          <ReportScoreCard
            score={data.source_coverage.score}
            maxScore={100}
            label={lang === "ja" ? "情報ソース網羅率" : "Source Coverage"}
            severity={data.source_coverage.score >= 70 ? "good" : data.source_coverage.score >= 40 ? "warning" : "critical"}
            benchmark={60}
            benchmarkLabel={lang === "ja" ? "業界平均" : "Industry Avg"}
            detail={sourceCoverageDetail(data.source_coverage.configured, data.source_coverage.missing, lang)}
          />
          <ReportScoreCard
            score={confidence}
            maxScore={100}
            label={lang === "ja" ? "診断確度" : "Confidence"}
            severity={confidence >= 70 ? "good" : confidence >= 40 ? "warning" : "critical"}
            benchmark={65}
            benchmarkLabel={lang === "ja" ? "標準診断" : "Standard"}
            detail={lang === "ja" ? `${data.source_coverage.configured}件のソースから算出` : `Calculated from ${data.source_coverage.configured} sources`}
          />
          <ReportScoreCard
            score={sourceScore}
            maxScore={100}
            label={lang === "ja" ? "シグナル品質" : "Signal Quality"}
            severity={sourceScore >= 70 ? "good" : sourceScore >= 40 ? "warning" : "critical"}
            benchmark={50}
            benchmarkLabel={lang === "ja" ? "平均" : "Avg"}
            detail={lang === "ja" ? `${data.source_coverage.collected}件のシグナルを検出` : `${data.source_coverage.collected} signals detected`}
          />
        </ScoreCardGrid>
      </div>
    </section>
  )
}
