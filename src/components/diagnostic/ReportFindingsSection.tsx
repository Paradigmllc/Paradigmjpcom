"use client"

import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { ReportCopy, ReportLang } from "./report-copy"
import { SlideInSection } from "./ReportAnimations"
import { Pill } from "./report-utils"
import ReportFindingCard from "./ReportFindingCard"
import ReportRoiCalculator from "./ReportRoiCalculator"

export default function ReportFindingsSection({
  data,
  copy,
  lang,
  businessImpact,
  loss,
}: {
  data: DiagnosticReportData
  copy: ReportCopy
  lang: ReportLang
  businessImpact: string
  loss: number
}) {
  return (
    <section className="px-5 py-14">
      <div className="mx-auto max-w-6xl">
        <SlideInSection direction="left">
          <div className="max-w-3xl">
            <Pill tone="neutral">{copy.priorityFindings}</Pill>
            <h2 className="mt-5 text-4xl font-semibold leading-tight text-zinc-950">
              {copy.businessImpact}
            </h2>
            <p className="mt-4 text-base leading-8 text-zinc-600">{businessImpact}</p>
          </div>
        </SlideInSection>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {data.acts.map((act, index) => (
            <ReportFindingCard
              key={`${act.headline}-${index}`}
              act={act}
              index={index}
              copy={copy}
              lang={lang}
            />
          ))}
        </div>
        <div className="mt-8">
          <ReportRoiCalculator
            variant={data.template_variant}
            monthlyLoss={loss}
            copy={copy}
            lang={lang}
          />
        </div>
      </div>
    </section>
  )
}
