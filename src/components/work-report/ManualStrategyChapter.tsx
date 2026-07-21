import { CheckCircle2, Gauge, ShieldCheck } from "lucide-react"
import type { ManualStrategyChapter as StrategyChapter } from "@/lib/sales/manual-japan-entry-report-types"

const evidenceStyles = {
  observed: "border-blue-200 bg-blue-50 text-blue-800",
  modeled: "border-violet-200 bg-violet-50 text-violet-800",
  hypothesis: "border-amber-200 bg-amber-50 text-amber-900",
  recommended_action: "border-emerald-200 bg-emerald-50 text-emerald-800",
} as const

const evidenceLabels = {
  observed: "Observed",
  modeled: "Modeled",
  hypothesis: "Hypothesis",
  recommended_action: "Recommended action",
} as const

export function ManualStrategyChapter({ chapter }: { chapter: StrategyChapter }) {
  return (
    <section
      aria-labelledby={`strategy-${chapter.id}`}
      className="print:break-before-page print:min-h-[260mm]"
    >
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Chapter {String(chapter.number).padStart(2, "0")} / 10</p>
          <h2 id={`strategy-${chapter.id}`} className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">{chapter.title}</h2>
        </div>
        <span className="font-mono text-5xl font-semibold tracking-[-0.08em] text-slate-200">{String(chapter.number).padStart(2, "0")}</span>
      </div>

      <div className="mt-7 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Executive takeaway</p>
        <p className="mt-3 text-lg font-medium leading-8 text-slate-900">{chapter.executiveTakeaway}</p>
      </div>

      <div className="mt-7 space-y-4">
        {chapter.narrative.map((paragraph) => <p key={paragraph} className="text-[15px] leading-8 text-slate-700">{paragraph}</p>)}
      </div>

      <div className="mt-8">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-slate-800"><ShieldCheck className="size-4 text-blue-700" aria-hidden="true" />Evidence ledger</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {chapter.evidence.map((item) => (
            <div key={`${item.classification}:${item.label}`} className="rounded-2xl border border-slate-200 p-4">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${evidenceStyles[item.classification]}`}>{evidenceLabels[item.classification]}</span>
              <p className="mt-3 text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="mt-2 text-xs leading-6 text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-emerald-300"><CheckCircle2 className="size-4" aria-hidden="true" />Recommended actions</h3>
          <ol className="mt-5 space-y-4">
            {chapter.actions.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-200"><span className="font-mono text-xs text-slate-500">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-slate-800"><Gauge className="size-4 text-blue-700" aria-hidden="true" />Management indicators</h3>
          <ul className="mt-5 space-y-3">
            {chapter.kpis.map((item) => <li key={item} className="border-l-2 border-blue-300 pl-3 text-xs leading-5 text-slate-600">{item}</li>)}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">Decision gate</p>
        <p className="mt-2 text-sm font-medium leading-6 text-amber-950">{chapter.decisionGate}</p>
      </div>
    </section>
  )
}
