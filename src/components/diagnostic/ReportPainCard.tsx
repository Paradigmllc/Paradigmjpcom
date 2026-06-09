"use client"

import type { PainPoint } from "@/lib/sales/company-intelligence"
import type { ReportCopy, ReportLang } from "./report-copy"
import { cleanText } from "./report-utils"
import { Pill } from "./report-utils"
import { severityLabel } from "./report-intelligence-copy"

export default function ReportPainCard({
  pain,
  copy,
  lang,
}: {
  pain: PainPoint
  copy: ReportCopy
  lang: ReportLang
}) {
  const tone =
    pain.severity === "critical"
      ? "critical"
      : pain.severity === "warning"
        ? "warning"
        : "good"
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
