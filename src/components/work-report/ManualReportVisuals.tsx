import type { ManualJapanEntryReportData, ManualStrategyEvidenceClass } from "@/lib/sales/manual-japan-entry-report-types"

const evidenceMeta: Record<ManualStrategyEvidenceClass, { label: string; color: string }> = {
  observed: { label: "Observed", color: "#2563eb" },
  modeled: { label: "Modeled", color: "#7c3aed" },
  hypothesis: { label: "Hypothesis", color: "#d97706" },
  recommended_action: { label: "Recommended action", color: "#059669" },
}

function boundedScore(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : null
}

function decisionLabel(value: string): string {
  if (value === "qualified") return "Qualified for validation"
  if (value === "review_required") return "Human review required"
  if (value === "rejected") return "Not recommended"
  if (value === "verified") return "Verified"
  if (value === "missing") return "Not verified"
  return value.replaceAll("_", " ")
}

function scoreTone(score: number | null): string {
  if (score === null) return "bg-slate-300"
  if (score >= 85) return "bg-emerald-500"
  if (score >= 70) return "bg-blue-500"
  if (score >= 50) return "bg-amber-500"
  return "bg-rose-500"
}

export function ManualReportVisuals({ data }: { data: ManualJapanEntryReportData }) {
  const report = data.customerView
  const readiness = [
    { label: "Overseas SMB qualification", score: boundedScore(data.decision.smb.confidence), status: decisionLabel(data.decision.smb.status) },
    { label: "Japan-entry fit", score: boundedScore(data.decision.japanEntryFit.confidence), status: decisionLabel(data.decision.japanEntryFit.status) },
    { label: "Public-source coverage", score: boundedScore(data.sourceCoverage.score), status: `${data.sourceCoverage.collected} sources collected` },
    { label: "Initial-message quality", score: boundedScore(data.outreach.score), status: data.outreach.qualityPassed ? "Production gate passed" : "Not production-ready" },
  ]
  const evidenceCounts = report.strategyChapters
    .flatMap((chapter) => chapter.evidence)
    .reduce<Record<ManualStrategyEvidenceClass, number>>((counts, item) => {
      counts[item.classification] += 1
      return counts
    }, { observed: 0, modeled: 0, hypothesis: 0, recommended_action: 0 })
  const evidenceTotal = Math.max(1, Object.values(evidenceCounts).reduce((sum, count) => sum + count, 0))
  const evidenceSegments = Object.entries(evidenceCounts) as Array<[ManualStrategyEvidenceClass, number]>
  let gradientCursor = 0
  const evidenceGradient = evidenceSegments.map(([classification, count]) => {
    const start = gradientCursor
    gradientCursor += (count / evidenceTotal) * 100
    return `${evidenceMeta[classification].color} ${start.toFixed(1)}% ${gradientCursor.toFixed(1)}%`
  }).join(", ")

  return (
    <section aria-labelledby="decision-dashboard-heading" className="space-y-6 print:break-after-page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Executive visual dashboard</p>
          <h2 id="decision-dashboard-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Decision signals at a glance</h2>
        </div>
        <p className="max-w-lg text-xs leading-5 text-slate-500">Scores show workflow confidence from the evidence reviewed. They are not market-size, demand, revenue, or performance measurements.</p>
      </div>

      <figure aria-labelledby="readiness-scorecard-title" className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-300">Readiness scorecard</p><h3 id="readiness-scorecard-title" className="mt-2 text-xl font-semibold">Four evidence gates</h3></div>
          <p className="text-xs text-slate-400">0 = unverified · 100 = strongest workflow confidence</p>
        </div>
        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {readiness.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-white">{item.label}</p><p className="mt-1 text-xs text-slate-400">{item.status}</p></div><p className="font-mono text-2xl font-semibold">{item.score ?? "—"}</p></div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${item.label}: ${item.score ?? "not scored"} out of 100`}><div className={`h-full rounded-full ${scoreTone(item.score)}`} style={{ width: `${item.score ?? 0}%` }} /></div>
            </div>
          ))}
        </div>
        <figcaption className="mt-5 text-xs leading-5 text-slate-400">A low or missing score is a decision to gather evidence, not a negative claim about the company or its market.</figcaption>
      </figure>

      <div className="grid gap-6 lg:grid-cols-2">
        <figure aria-labelledby="evidence-mix-title" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">Evidence architecture</p>
          <h3 id="evidence-mix-title" className="mt-2 text-xl font-semibold">What supports the recommendation</h3>
          <div className="mt-6 grid grid-cols-[120px_minmax(0,1fr)] items-center gap-6">
            <div className="grid aspect-square place-items-center rounded-full" style={{ background: `conic-gradient(${evidenceGradient})` }} role="img" aria-label={`Evidence ledger with ${evidenceTotal} items`}><div className="grid size-[76px] place-items-center rounded-full bg-white text-center"><div><p className="font-mono text-2xl font-semibold text-slate-950">{evidenceTotal}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">items</p></div></div></div>
            <ul className="space-y-3">
              {evidenceSegments.map(([classification, count]) => <li key={classification} className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 text-slate-600"><span className="size-2.5 rounded-full" style={{ backgroundColor: evidenceMeta[classification].color }} />{evidenceMeta[classification].label}</span><strong className="font-mono text-slate-900">{count}</strong></li>)}
            </ul>
          </div>
          <figcaption className="mt-6 text-xs leading-5 text-slate-500">The ledger deliberately separates observed facts, modeled scenarios, hypotheses, and recommended actions.</figcaption>
        </figure>

        <figure aria-labelledby="opportunity-range-title" className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">Scenario visualization</p>
          <h3 id="opportunity-range-title" className="mt-2 text-xl font-semibold">Modeled range, not a forecast</h3>
          {report.projection ? (
            <div className="mt-7 space-y-7">
              <div><div className="flex items-end justify-between gap-3"><p className="text-xs font-semibold text-slate-600">Monthly public-site visits</p><p className="font-mono text-lg font-semibold text-slate-950">{report.projection.monthlyVisitRange}</p></div><div className="mt-3 h-3 rounded-full bg-blue-100 p-0.5"><div className="h-full w-full rounded-full bg-gradient-to-r from-blue-300 via-blue-500 to-indigo-600" /></div></div>
              <div><div className="flex items-end justify-between gap-3"><p className="text-xs font-semibold text-slate-600">First-year Japan opportunity</p><p className="font-mono text-lg font-semibold text-slate-950">{report.projection.firstYearOpportunityRange}</p></div><div className="mt-3 h-3 rounded-full bg-violet-100 p-0.5"><div className="h-full w-full rounded-full bg-gradient-to-r from-violet-300 via-violet-500 to-fuchsia-600" /></div></div>
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6"><p className="text-3xl font-semibold text-slate-300">No numeric range</p><p className="mt-3 text-sm leading-6 text-slate-600">Public visibility evidence was insufficient, so the report does not manufacture traffic, revenue, or opportunity-loss figures.</p></div>
          )}
          <figcaption className="mt-6 text-xs leading-5 text-slate-500">{report.projection?.disclaimer ?? "The absence of a number is an evidence-quality safeguard."}</figcaption>
        </figure>
      </div>

      <figure aria-labelledby="validation-sequence-title" className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">Management sequence</p>
        <h3 id="validation-sequence-title" className="mt-2 text-xl font-semibold">90/180-day evidence path</h3>
        <ol className="mt-7 grid gap-4 lg:grid-cols-3">
          {report.roadmap.map((step, index) => (
            <li key={step.phase} className="relative rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-blue-600 font-mono text-xs font-semibold text-white">{index + 1}</span><p className="text-xs font-bold uppercase tracking-wider text-blue-700">{step.phase}</p></div>
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-900">{step.objective}</p>
              <p className="mt-3 text-xs leading-5 text-slate-600">{step.deliverable}</p>
            </li>
          ))}
        </ol>
        <figcaption className="mt-5 text-xs leading-5 text-slate-500">Each phase releases the next investment only after its named decision evidence is captured.</figcaption>
      </figure>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <caption className="px-6 pb-4 pt-6 text-left text-xs font-bold uppercase tracking-[0.15em] text-blue-700">Decision matrix · current evidence state</caption>
          <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-3">Gate</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Evidence</th><th className="px-6 py-3">Management implication</th></tr></thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            <tr><th className="px-6 py-4 font-semibold text-slate-950">Company qualification</th><td className="px-6 py-4">{decisionLabel(data.decision.smb.status)}</td><td className="px-6 py-4">{data.decision.smb.confidence}/100</td><td className="px-6 py-4">Confirm size and operating ownership before scale.</td></tr>
            <tr><th className="px-6 py-4 font-semibold text-slate-950">Japan-entry fit</th><td className="px-6 py-4">{decisionLabel(data.decision.japanEntryFit.status)}</td><td className="px-6 py-4">{data.decision.japanEntryFit.confidence}/100</td><td className="px-6 py-4">Use a bounded validation, not a launch assumption.</td></tr>
            <tr><th className="px-6 py-4 font-semibold text-slate-950">Public inquiry route</th><td className="px-6 py-4">{decisionLabel(data.contactRoute.status)}</td><td className="px-6 py-4">{data.contactRoute.confidence}/100</td><td className="px-6 py-4">Route manually only when the public form is verified.</td></tr>
            <tr><th className="px-6 py-4 font-semibold text-slate-950">Customer-path audit</th><td className="px-6 py-4">{data.japanReadiness.gaps.length} open question{data.japanReadiness.gaps.length === 1 ? "" : "s"}</td><td className="px-6 py-4">{data.japanReadiness.checkedPageCount} pages checked</td><td className="px-6 py-4">Test the highest-value gap before broader localization.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
