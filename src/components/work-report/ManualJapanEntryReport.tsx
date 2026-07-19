import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  CircleX,
  FileSearch,
  Globe2,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react"
import type {
  ManualJapanEntryReportData,
  ManualReportDecisionStatus,
} from "@/lib/sales/manual-japan-entry-report-types"

const decisionStyles: Record<ManualReportDecisionStatus, string> = {
  qualified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  review_required: "border-amber-200 bg-amber-50 text-amber-900",
  rejected: "border-red-200 bg-red-50 text-red-800",
}

const decisionLabels: Record<ManualReportDecisionStatus, string> = {
  qualified: "Qualified for human review",
  review_required: "Operator review required",
  rejected: "Out of scope",
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(date)
}

function humanize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function StatusIcon({ status }: { status: string }) {
  if (["qualified", "verified", "collected"].includes(status)) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
  }
  if (["rejected", "missing", "error"].includes(status)) {
    return <CircleX className="h-4 w-4 text-red-500" aria-hidden="true" />
  }
  return <CircleAlert className="h-4 w-4 text-amber-500" aria-hidden="true" />
}

function ConfidenceBar({ value }: { value: number }) {
  const bounded = Math.max(0, Math.min(100, value))
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={`Confidence ${bounded} percent`}>
      <div className="h-full rounded-full bg-slate-900" style={{ width: `${bounded}%` }} />
    </div>
  )
}

export default function ManualJapanEntryReport({ data }: { data: ManualJapanEntryReportData }) {
  return (
    <main className="min-h-dvh bg-[#f5f7fb] px-4 py-6 text-slate-950 sm:px-6 sm:py-10 lg:px-8 print:bg-white print:p-0">
      <article className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_42%)] px-6 py-8 sm:px-10 sm:py-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5">
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                  Private evidence brief
                </span>
                <span>Manual Japan Entry Workbench</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
                {data.company.name}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Evidence-led screening for a potential Japan Entry engagement. Findings are bounded to the checked public pages and require human review.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-sm text-slate-600">
                {[data.company.domain, data.company.countryCode ?? "Country unconfirmed", humanize(data.company.businessModel), data.company.industry].map((item) => (
                  <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1.5">{item}</span>
                ))}
              </div>
            </div>
            <div className="min-w-64 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${decisionStyles[data.decision.status]}`}>
                <StatusIcon status={data.decision.status} />
                {decisionLabels[data.decision.status]}
              </span>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4"><dt className="text-slate-500">Generated</dt><dd className="text-right font-medium">{formatDate(data.generatedAt)}</dd></div>
                <div className="flex items-center justify-between gap-4"><dt className="text-slate-500">Evidence</dt><dd className="font-medium">Public pages only</dd></div>
                <div className="flex items-center justify-between gap-4"><dt className="text-slate-500">Automatic send</dt><dd className="font-semibold text-red-600">Disabled</dd></div>
              </dl>
            </div>
          </div>
        </header>

        <div className="space-y-10 px-6 py-8 sm:px-10 sm:py-10">
          <section aria-labelledby="decision-heading">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <h2 id="decision-heading" className="text-xl font-semibold tracking-tight">Decision snapshot</h2>
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{data.decision.summary}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-600">Overseas SMB confidence</span><strong>{data.decision.smb.confidence}/100</strong></div>
                <ConfidenceBar value={data.decision.smb.confidence} />
                <p className="mt-3 text-sm text-slate-500">Status: {humanize(data.decision.smb.status)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-600">Japan Entry fit confidence</span><strong>{data.decision.japanEntryFit.confidence}/100</strong></div>
                <ConfidenceBar value={data.decision.japanEntryFit.confidence} />
                <p className="mt-3 text-sm text-slate-500">Status: {humanize(data.decision.japanEntryFit.status)}</p>
              </div>
            </div>
            <ul className="mt-5 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              {data.decision.reasons.map((reason) => <li key={reason} className="flex gap-2 rounded-xl bg-slate-50 px-4 py-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />{reason}</li>)}
            </ul>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]" aria-labelledby="market-heading">
            <div className="rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3"><Globe2 className="h-5 w-5 text-blue-600" aria-hidden="true" /><h2 id="market-heading" className="text-xl font-semibold tracking-tight">Market and company lens</h2></div>
              <p className="mt-5 text-lg font-medium">{data.market.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{data.market.rationale}</p>
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Public product context</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{data.company.productContext}</p>
              </div>
              {data.market.focusIndustries.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{data.market.focusIndustries.map((industry) => <span key={industry} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">{industry}</span>)}</div>}
            </div>
            <div className="rounded-2xl border border-slate-200 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Commercial evidence</p>
              <p className="mt-2 text-lg font-semibold">{humanize(data.market.commercialEvidenceStatus)}</p>
              <div className="mt-4 space-y-3">
                {data.market.commercialSignals.length > 0 ? data.market.commercialSignals.map((signal) => (
                  <div key={`${signal.kind}-${signal.sourcePhrase}`} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{humanize(signal.kind)}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">“{signal.sourcePhrase}”</p>
                  </div>
                )) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-500">No company-level foreign revenue, global customer, funding, or international-operation signal was verified in the bounded evidence.</p>}
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">Pricing policy: no automatic country adjustment. Payment capacity requires separate primary-source verification.</p>
            </div>
          </section>

          <section aria-labelledby="readiness-heading">
            <div className="flex items-center gap-3"><FileSearch className="h-5 w-5 text-blue-600" aria-hidden="true" /><h2 id="readiness-heading" className="text-xl font-semibold tracking-tight">Japan customer-path screen</h2></div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{data.japanReadiness.summary} Checked pages: {data.japanReadiness.checkedPageCount}.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.japanReadiness.gaps.length > 0 ? data.japanReadiness.gaps.map((gap) => (
                <div key={gap.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                  <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{gap.title}</h3><span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">{gap.confidence}%</span></div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{gap.observation}</p>
                  <p className="mt-3 text-xs leading-5 text-slate-500">{gap.source}</p>
                </div>
              )) : <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 md:col-span-2 lg:col-span-3"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden="true" /><p className="text-sm leading-6 text-slate-700">No missing signal was observed for this business model. Continue to commercial, market, and legal validation; this result is not a launch approval.</p></div></div>}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">{data.japanReadiness.disclaimer}</p>
          </section>

          <section className="grid gap-5 lg:grid-cols-2" aria-labelledby="outreach-heading">
            <div className="rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3"><MessageSquareText className="h-5 w-5 text-blue-600" aria-hidden="true" /><h2 id="outreach-heading" className="text-xl font-semibold tracking-tight">Human-reviewed first touch</h2></div>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
                <span className={`rounded-full px-3 py-1.5 ${data.outreach.qualityPassed ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>Quality {data.outreach.qualityPassed ? "passed" : "blocked"}</span>
                {data.outreach.score !== null && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">Editorial {data.outreach.score}/100</span>}
                {data.outreach.uniquenessScore !== null && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">Uniqueness {data.outreach.uniquenessScore}/100</span>}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{data.outreach.reviewSummary}</p>
              <div className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-800">
                {data.outreach.draft ?? "No first-touch draft passed the quality gate."}
              </div>
              <p className="mt-3 text-xs font-semibold text-red-600">Never sent automatically. A human must review and submit the final text.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Verified inquiry route</p>
              <div className="mt-3 flex items-center gap-2"><StatusIcon status={data.contactRoute.status} /><span className="font-semibold">{humanize(data.contactRoute.status)}</span></div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{data.contactRoute.reason}</p>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><dt className="text-slate-500">Discovery method</dt><dd className="font-medium">{humanize(data.contactRoute.method)}</dd></div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><dt className="text-slate-500">Confidence</dt><dd className="font-medium">{data.contactRoute.confidence}/100</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Route</dt><dd className="max-w-72 truncate text-right font-medium">{data.contactRoute.url ?? "Not verified"}</dd></div>
              </dl>
              {data.contactRoute.url && <a href={data.contactRoute.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Open verified form <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>}
            </div>
          </section>

          <section aria-labelledby="coverage-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="coverage-heading" className="text-xl font-semibold tracking-tight">Evidence coverage</h2><p className="mt-2 text-sm text-slate-600">Every missing source remains visible; no fallback is presented as verified evidence.</p></div><strong className="text-3xl tracking-tight">{data.sourceCoverage.score}%</strong></div>
            <ConfidenceBar value={data.sourceCoverage.score} />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {data.sourceCoverage.items.map((item) => (
                <div key={item.slug} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3"><StatusIcon status={item.status} /><div><h3 className="text-sm font-semibold">{item.label}</h3><p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{humanize(item.status)}</p></div></div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
                  {item.status !== "collected" && <p className="mt-2 text-xs leading-5 text-amber-800">Next: {item.nextStep}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2" aria-labelledby="actions-heading">
            <div className="rounded-2xl bg-slate-950 p-6 text-white">
              <h2 id="actions-heading" className="text-xl font-semibold tracking-tight">Operator next actions</h2>
              <ol className="mt-5 space-y-4">{data.nextActions.map((action, index) => <li key={action} className="flex gap-3 text-sm leading-6 text-slate-200"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">{index + 1}</span>{action}</li>)}</ol>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6">
              <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-blue-700" aria-hidden="true" /><h2 className="text-xl font-semibold tracking-tight">Evidence guardrails</h2></div>
              <ul className="mt-5 space-y-4">{data.guardrails.map((guardrail) => <li key={guardrail} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />{guardrail}</li>)}</ul>
            </div>
          </section>
        </div>

        <footer className="border-t border-slate-200 bg-slate-50 px-6 py-6 text-xs leading-5 text-slate-500 sm:px-10">
          <p><strong className="text-slate-700">Paradigm Japan Entry Workbench</strong> · schema {data.schemaVersion} · generated from {data.provenance.evidenceContract} evidence.</p>
          <p className="mt-1">Private, human-reviewed operating artifact. Not legal, financial, market-demand, or compliance advice.</p>
        </footer>
      </article>
    </main>
  )
}
