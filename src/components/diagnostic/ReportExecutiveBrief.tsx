import type { PainPoint } from "@/lib/sales/company-intelligence"
import type { ReportLang } from "./report-copy"

function shortText(value: string | undefined, fallback: string): string {
  const text = value?.trim()
  if (!text) return fallback
  return text.length > 150 ? `${text.slice(0, 150)}...` : text
}

export function ReportExecutiveBrief({
  lang,
  companyName,
  reportLabel,
  businessImpact,
  firstAction,
  topPain,
}: {
  lang: ReportLang
  companyName: string
  reportLabel: string
  businessImpact: string
  firstAction: string
  topPain?: PainPoint
}) {
  const isJa = lang === "ja"
  const title = isJa ? "今回の結論" : "Executive summary"
  const lead = isJa
    ? `${companyName}の${reportLabel}では、細かな技術項目の点数よりも、見込み客が判断する直前の不安と導線の詰まりを優先して確認します。`
    : `This ${reportLabel} prioritizes the buyer-facing friction and next action over a raw technical checklist.`
  const findingLabel = isJa ? "見込み客に起きていること" : "Buyer-facing friction"
  const impactLabel = isJa ? "事業上の意味" : "Business meaning"
  const actionLabel = isJa ? "最初の一手" : "First move"

  return (
    <section className="px-5 py-12">
      <div className="mx-auto max-w-6xl border-y border-zinc-200 py-10">
        <div className="grid gap-8 lg:grid-cols-[330px_minmax(0,1fr)]">
          <div>
            <div className="text-xs font-semibold text-violet-700">{title}</div>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-zinc-950">{reportLabel}</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-600">{lead}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs font-semibold text-zinc-500">{findingLabel}</div>
              <p className="mt-2 text-sm leading-7 text-zinc-800">{shortText(topPain?.title, reportLabel)}</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-500">{impactLabel}</div>
              <p className="mt-2 text-sm leading-7 text-zinc-800">{shortText(businessImpact, lead)}</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-500">{actionLabel}</div>
              <p className="mt-2 text-sm font-semibold leading-7 text-zinc-950">{shortText(topPain?.recommendedAction ?? firstAction, firstAction)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
