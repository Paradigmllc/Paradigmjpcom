"use client"

import { motion } from "framer-motion"
import { Gauge } from "lucide-react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { ReportCopy, ReportLang } from "./report-copy"
import { cleanText, numericValue } from "./report-utils"
import { Pill } from "./report-utils"
import { CountUpMetric } from "./ReportAnimations"
import { PerformanceGauge } from "./ReportCharts"

export default function ReportDarkSurface({
  data,
  copy,
  confidence,
  lang,
  sourceScore,
}: {
  data: DiagnosticReportData
  copy: ReportCopy
  confidence: number
  lang: ReportLang
  sourceScore: number
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
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                <CountUpMetric value={loss} prefix="¥" duration={1.2} />
              </div>
            </div>
            <div className="border-t border-white/15 pt-4">
              <div className="text-xs font-semibold text-white/50">{copy.confidence}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                <CountUpMetric value={confidence} suffix="/100" duration={1} />
              </div>
            </div>
            <div className="border-t border-white/15 pt-4">
              <div className="text-xs font-semibold text-white/50">{copy.sourceCoverage}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                <CountUpMetric value={data.source_coverage.score} suffix="%" duration={1} />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <PerformanceGauge
              score={sourceScore}
              industryAvg={75}
              label={lang === "ja" ? "PSI総合スコア" : "Overall PSI Score"}
              lang={lang}
            />
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
              <motion.div
                className="h-full rounded-full bg-[#7c5cff]"
                initial={{ width: 0 }}
                whileInView={{ width: "72%" }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              />
            </div>
            <p className="mt-4 text-sm leading-7 text-white/75">{firstAction}</p>
          </div>
          <div className="mt-5 space-y-3">
            {data.intelligence.signals.slice(0, 4).map((signal) => (
              <div
                key={signal.id}
                className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0"
              >
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
