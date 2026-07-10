"use client"

import type { SourceCoverageItem } from "@/lib/sales/source-coverage"
import type { ReportCopy, ReportLang } from "./report-copy"
import { sourceTone, cleanText, Pill } from "./report-utils"
import { reportEvidenceText, sourceCategoryLabel, sourceStatusLabel } from "./report-intelligence-copy"

export default function ReportSourceRow({
  item,
  copy,
  lang,
}: {
  item: SourceCoverageItem
  copy: ReportCopy
  lang: ReportLang
}) {
  const label = cleanText(reportEvidenceText(item.label, lang), copy.evidence)
  const meaning = cleanText(reportEvidenceText(item.meaning, lang), copy.sourceMeaning)
  return (
    <div className="border-t border-zinc-100 p-4 first:border-t-0 hover:bg-zinc-50 transition-colors">
      <div className="text-sm font-semibold text-zinc-950">{label}</div>
      <div className="mt-0.5 text-[10px] text-zinc-600">{sourceCategoryLabel(item.category, lang)}</div>
      <div className="mt-2 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">{meaning}</div>
      <div className="mt-2 flex items-center justify-between">
        <Pill tone={sourceTone(item.score)}>{sourceStatusLabel(item.status, lang)}</Pill>
        <span className="text-[10px] text-zinc-600">{item.score}%</span>
      </div>
    </div>
  )
}
