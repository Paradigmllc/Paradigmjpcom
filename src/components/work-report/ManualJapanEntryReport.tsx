import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  ExternalLink,
  Lightbulb,
  Route,
  SearchCheck,
  Target,
} from "lucide-react"
import type { ManualJapanEntryReportData } from "@/lib/sales/manual-japan-entry-report-types"
import { ManualReportVisuals } from "./ManualReportVisuals"
import { ManualStrategyChapter } from "./ManualStrategyChapter"

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(date)
}

function compactUrl(value: string): string {
  try {
    const url = new URL(value)
    return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`
  } catch (error) {
    console.warn("[manual-work-report] invalid evidence URL reached renderer:", error)
    return value
  }
}

export default function ManualJapanEntryReport({ data }: { data: ManualJapanEntryReportData }) {
  const report = data.customerView
  return (
    <main className="min-h-dvh bg-[#eef2f7] px-4 py-6 text-slate-950 sm:px-6 sm:py-10 lg:px-8 print:bg-white print:p-0">
      <article className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_32px_90px_-48px_rgba(15,23,42,0.45)] print:rounded-none print:border-0 print:shadow-none">
        <header className="relative overflow-hidden bg-slate-950 px-6 py-9 text-white sm:px-10 sm:py-14">
          <div className="absolute -right-24 -top-32 size-80 rounded-full bg-blue-500/20 blur-3xl" aria-hidden="true" />
          <div className="absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-blue-300/60 to-transparent" aria-hidden="true" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">Paradigm · Japan Entry</span>
                <span>Prepared for {data.company.name}</span>
              </div>
              <h1 className="mt-7 max-w-4xl text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">Japan Entry Strategy Report</h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                A focused view of where {data.company.name} may have a credible Japan opportunity, what remains unproven, and the smallest next test worth running.
              </p>
            </div>
            <dl className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-sm backdrop-blur">
              <div className="border-b border-white/10 pb-3"><dt className="text-slate-400">Prepared</dt><dd className="mt-1 font-medium text-white">{formatDate(data.generatedAt)}</dd></div>
              <div className="border-b border-white/10 py-3"><dt className="text-slate-400">Company</dt><dd className="mt-1 font-medium text-white">{data.company.name}</dd></div>
              <div className="pt-3"><dt className="text-slate-400">Focus</dt><dd className="mt-1 font-medium text-white">Japan market validation</dd></div>
            </dl>
          </div>
        </header>

        <div className="space-y-12 px-6 py-9 sm:px-10 sm:py-12">
          <section aria-labelledby="contents-heading" className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8 print:break-after-page">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Management edition</p><h2 id="contents-heading" className="mt-2 text-2xl font-semibold tracking-tight">Ten decision chapters</h2></div>
              <p className="text-xs text-slate-500">{report.reportWordCount.toLocaleString("en-US")} words · public-evidence boundary</p>
            </div>
            <ol className="mt-7 grid gap-3 md:grid-cols-2">
              {report.strategyChapters.map((chapter) => (
                <li key={chapter.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"><span className="font-mono text-xs font-semibold text-blue-700">{String(chapter.number).padStart(2, "0")}</span><span className="font-medium text-slate-800">{chapter.title}</span></li>
              ))}
            </ol>
          </section>
          <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]" aria-labelledby="executive-summary-heading">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3 text-blue-700"><Compass className="size-5" aria-hidden="true" /><p className="text-xs font-bold uppercase tracking-[0.16em]">Executive perspective</p></div>
              <h2 id="executive-summary-heading" className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">A testable opportunity, not a market-size claim</h2>
              <p className="mt-4 text-base leading-8 text-slate-700">{report.executiveSummary}</p>
            </div>
            <div className="rounded-3xl bg-blue-50 p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Public product snapshot</p>
              <p className="mt-4 text-base font-medium leading-8 text-slate-900">{report.productSnapshot}</p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                <span className="rounded-full bg-white px-3 py-1.5">{data.company.industry}</span>
                <span className="rounded-full bg-white px-3 py-1.5">{data.company.countryCode ?? "Country not confirmed"}</span>
              </div>
            </div>
          </section>

          <ManualReportVisuals data={data} />

          <section aria-labelledby="observations-heading">
            <div className="flex items-center gap-3"><SearchCheck className="size-5 text-blue-700" aria-hidden="true" /><h2 id="observations-heading" className="text-2xl font-semibold tracking-tight">What the public evidence says</h2></div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Only company-specific observations used to shape this opportunity hypothesis are shown here.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {report.observedSignals.map((signal, index) => (
                <div key={signal} className="flex gap-4 rounded-2xl border border-slate-200 p-5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-semibold text-white">{index + 1}</span>
                  <p className="text-sm leading-7 text-slate-700">{signal}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50" aria-labelledby="hypothesis-heading">
            <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="border-b border-blue-100 p-6 sm:p-8 lg:border-b-0 lg:border-r">
                <div className="flex items-center gap-3 text-blue-700"><Target className="size-5" aria-hidden="true" /><p className="text-xs font-bold uppercase tracking-[0.16em]">Opportunity hypothesis</p></div>
                <h2 id="hypothesis-heading" className="mt-5 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{report.opportunityHypothesis.headline}</h2>
                <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-slate-500">Priority segment to validate</p>
                <p className="mt-2 text-base font-medium leading-7 text-slate-900">{report.opportunityHypothesis.targetSegment}</p>
              </div>
              <div className="space-y-6 p-6 sm:p-8">
                <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Why this is worth testing</p><p className="mt-2 text-sm leading-7 text-slate-700">{report.opportunityHypothesis.rationale}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Why now</p><p className="mt-2 text-sm leading-7 text-slate-700">{report.opportunityHypothesis.whyNow}</p></div>
                <p className="rounded-xl border border-blue-100 bg-white/80 px-4 py-3 text-xs leading-5 text-slate-600">{report.opportunityHypothesis.evidenceBoundary}</p>
              </div>
            </div>
          </section>

          {report.projection && (
            <section aria-labelledby="projection-heading">
              <div className="flex items-center gap-3"><BarChart3 className="size-5 text-blue-700" aria-hidden="true" /><h2 id="projection-heading" className="text-2xl font-semibold tracking-tight">Indicative opportunity range</h2></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-6"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Estimated monthly public-site visits</p><p className="mt-3 text-3xl font-semibold tracking-tight">{report.projection.monthlyVisitRange}</p></div>
                <div className="rounded-2xl border border-slate-200 p-6"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Modeled first-year Japan opportunity</p><p className="mt-3 text-3xl font-semibold tracking-tight">{report.projection.firstYearOpportunityRange}</p></div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{report.projection.basis}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{report.projection.disclaimer}</p>
            </section>
          )}

          <section aria-labelledby="priorities-heading">
            <div className="flex items-center gap-3"><Lightbulb className="size-5 text-blue-700" aria-hidden="true" /><h2 id="priorities-heading" className="text-2xl font-semibold tracking-tight">Priority moves before a broader launch</h2></div>
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {report.priorities.map((priority, index) => (
                <article key={priority.title} className="rounded-2xl border border-slate-200 p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Priority {index + 1}</p>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight">{priority.title}</h3>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{priority.finding}</p>
                  <div className="mt-5 border-t border-slate-100 pt-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommended move</p><p className="mt-2 text-sm leading-6 text-slate-800">{priority.recommendation}</p></div>
                  <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600"><strong className="text-slate-800">Decision value:</strong> {priority.decisionValue}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="roadmap-heading">
            <div className="flex items-center gap-3"><Route className="size-5 text-blue-700" aria-hidden="true" /><h2 id="roadmap-heading" className="text-2xl font-semibold tracking-tight">A practical validation sequence</h2></div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {report.roadmap.map((step) => (
                <div key={step.phase} className="relative rounded-2xl bg-slate-950 p-6 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">{step.phase}</p>
                  <p className="mt-4 text-base font-semibold leading-7">{step.objective}</p>
                  <p className="mt-4 text-sm leading-6 text-slate-300">{step.deliverable}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8" aria-labelledby="decision-heading">
            <div className="flex items-start gap-4"><CheckCircle2 className="mt-1 size-6 shrink-0 text-emerald-700" aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Recommended decision</p><h2 id="decision-heading" className="mt-3 text-2xl font-semibold tracking-tight">Validate before scaling</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">{report.recommendedDecision}</p></div></div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5" aria-labelledby="method-heading">
            <h2 id="method-heading" className="text-sm font-semibold text-slate-900">Method and evidence boundary</h2>
            <p className="mt-2 text-xs leading-6 text-slate-600">{report.methodology}</p>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Public pages reviewed</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.evidenceSources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-800">
                    {source.label}: {compactUrl(source.url)} <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </section>

          <div className="space-y-16 print:space-y-0">
            {report.strategyChapters.map((chapter) => <ManualStrategyChapter key={chapter.id} chapter={chapter} />)}
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white px-6 py-7 sm:px-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold text-slate-950">Paradigm LLC</p><p className="mt-1 text-xs text-slate-500">Japan market-entry validation and execution</p></div>
            <a href="mailto:contact@paradigmjp.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">Discuss the next validation step <ArrowRight className="size-4" aria-hidden="true" /></a>
          </div>
          <p className="mt-5 text-[11px] leading-5 text-slate-400">Prepared by Tomohiro H · Paradigm LLC · contact@paradigmjp.com · {data.schemaVersion}</p>
        </footer>
      </article>
    </main>
  )
}
