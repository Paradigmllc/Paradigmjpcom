"use client"

import { motion } from "framer-motion"
import { ExternalLink } from "lucide-react"
import type { DiagnosticAct } from "@/lib/sales/diagnostic"
import type { ReportCopy, ReportLang } from "./report-copy"
import { BLOG_LINKS, ICON_TO_ISSUE_KEY, SEVERITY_LABEL } from "./report-constants"
import { cleanText, formatMetric } from "./report-utils"
import { Pill } from "./report-utils"
import CompetitorBenchmarkBar from "./ReportCompetitorBenchmark"

export default function ReportFindingCard({
  act,
  index,
  copy,
  lang,
}: {
  act: DiagnosticAct
  index: number
  copy: ReportCopy
  lang: ReportLang
}) {
  const severity =
    SEVERITY_LABEL[act.severity][lang === "ja" ? "ja" : "en"]
  const headline = cleanText(
    act.headline,
    lang === "ja" ? `優先改善ポイント ${index + 1}` : `Priority improvement ${index + 1}`
  )
  const body = cleanText(act.body, copy.heroLead)
  const metricLabel = cleanText(act.metric_label, copy.evidence)
  const metricBench = cleanText(act.metric_bench, copy.qualityBar)

  const issueKey = ICON_TO_ISSUE_KEY[act.icon] || act.icon
  const blogLink = BLOG_LINKS[issueKey]?.[lang === "ja" ? "ja" : "en"]

  return (
    <motion.article
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm flex flex-col justify-between h-full"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
            {index + 1}
          </div>
          <Pill
            tone={
              act.severity === "critical"
                ? "critical"
                : act.severity === "warning"
                  ? "warning"
                  : "good"
            }
          >
            {severity}
          </Pill>
        </div>
        <h3 className="mt-5 text-xl font-semibold leading-7 text-zinc-950">{headline}</h3>
        <p className="mt-3 text-sm leading-7 text-zinc-600">{body}</p>

        <CompetitorBenchmarkBar
          value={act.metric_value}
          unit={act.metric_unit}
          icon={act.icon}
          copy={copy}
        />
      </div>

      <div>
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-t border-zinc-100 pt-4">
          <div>
            <div className="text-xs font-semibold text-zinc-500">{metricLabel}</div>
            <div className="mt-1 text-[11px] leading-5 text-zinc-500">{metricBench}</div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-semibold tabular-nums text-zinc-950">
              {formatMetric(act.metric_value, lang)}
            </span>
            <span className="ml-1 text-xs font-semibold text-zinc-500">{act.metric_unit}</span>
          </div>
        </div>
        {blogLink && (
          <div className="mt-3 border-t border-zinc-100 pt-2">
            <a
              href={blogLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 transition-colors hover:text-violet-700"
            >
              <span>
                {copy.readMore}: {blogLink.title}
              </span>
              <ExternalLink size={10} />
            </a>
          </div>
        )}
        <div className="mt-4 text-xs font-semibold text-zinc-500">{copy.priorityFindings}</div>
      </div>
    </motion.article>
  )
}
