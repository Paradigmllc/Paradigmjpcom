"use client"

import type { SourceAcquisitionSummary } from "@/lib/sales/source-acquisition"
import { SourceAcquisitionHeader } from "./SourceAcquisitionHeader"
import { SourceAcquisitionTable } from "./SourceAcquisitionTable"
import { SourceAcquisitionTechTable } from "./SourceAcquisitionTechTable"

export function SalesSourceAcquisitionPanel({ summary }: { summary: SourceAcquisitionSummary }) {
  return (
    <div className="space-y-4">
      <SourceAcquisitionHeader summary={summary} />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SourceAcquisitionTable
          sourceMetrics={summary.sourceMetrics}
          latestMeasuredAt={summary.latestMeasuredAt}
        />
        <SourceAcquisitionTechTable
          topTechnologies={summary.topTechnologies}
          techCategories={summary.techCategories}
        />
      </div>
    </div>
  )
}
