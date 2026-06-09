"use client"

import { motion } from "framer-motion"
import type { ReportCopy } from "./report-copy"
import { numericValue } from "./report-utils"

export default function CompetitorBenchmarkBar({
  value,
  unit,
  icon,
  copy,
}: {
  value: string
  unit: string
  icon: string
  copy: ReportCopy
}) {
  const numericVal = Number.parseInt(value.replace(/[^0-9]/g, ""), 10) || 0
  if (numericVal <= 0 || isNaN(numericVal)) return null

  let industryAvg = 70
  let topCompetitors = 85
  let maxVal = 100
  let showAsPercent = false

  if (icon === "SPEED") {
    industryAvg = 70
    topCompetitors = 85
  } else if (icon === "TRUST") {
    industryAvg = 80
    topCompetitors = 100
    showAsPercent = true
  } else if (icon === "OPS") {
    industryAvg = 75
    topCompetitors = 95
    showAsPercent = true
  } else {
    industryAvg = 70
    topCompetitors = 90
  }

  const yourPct = Math.min(100, Math.max(5, (numericVal / maxVal) * 100))
  const avgPct = (industryAvg / maxVal) * 100
  const topPct = (topCompetitors / maxVal) * 100

  return (
    <motion.div
      className="mt-4 space-y-3 border-t border-zinc-100 pt-4 text-xs"
      initial={{ opacity: 0, height: 0 }}
      whileInView={{ opacity: 1, height: "auto" }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <div className="font-semibold text-zinc-700">{copy.competitorBenchmark}</div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[11px] font-medium text-zinc-900">
            <span>{copy.yourSite}</span>
            <span className="font-bold text-rose-600">
              {numericVal}
              {unit || (showAsPercent ? "%" : "")}
            </span>
          </div>
          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <motion.div
              className="h-full rounded-full bg-rose-500"
              initial={{ width: 0 }}
              whileInView={{ width: `${yourPct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] font-medium text-zinc-500">
            <span>{copy.industryAvg}</span>
            <span>
              {industryAvg}
              {unit || (showAsPercent ? "%" : "")}
            </span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-zinc-100">
            <motion.div
              className="h-full rounded-full bg-zinc-400"
              initial={{ width: 0 }}
              whileInView={{ width: `${avgPct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] font-medium text-zinc-500">
            <span>{copy.topCompetitors}</span>
            <span>
              {topCompetitors}
              {unit || (showAsPercent ? "%" : "")}
            </span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-zinc-100">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              whileInView={{ width: `${topPct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
