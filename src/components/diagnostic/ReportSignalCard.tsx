"use client"

import type { IntelligenceSignal } from "@/lib/sales/company-intelligence"
import type { ReportCopy, ReportLang } from "./report-copy"
import { TONE_CLASS } from "./report-constants"
import { cleanText } from "./report-utils"
import { reportEvidenceText } from "./report-intelligence-copy"

export default function ReportSignalCard({
  signal,
  copy,
  lang,
}: {
  signal: IntelligenceSignal
  copy: ReportCopy
  lang: ReportLang
}) {
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
        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${TONE_CLASS[signal.tone]}`}>
          {signal.value}
        </span>
      </div>
      <p className="mt-3 text-xs leading-6 text-zinc-600">{whyItMatters}</p>
      {signal.missingConsequence && (
        <p className="mt-3 text-xs leading-6 text-zinc-500">{copy.sourceMissing}</p>
      )}
    </article>
  )
}
