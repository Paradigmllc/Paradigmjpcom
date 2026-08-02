import { AlertTriangle, ArrowRight, CheckCircle2, Database, ExternalLink, FileCheck2 } from "lucide-react"
import { InvestorReadinessTool } from "@/components/opportunities/InvestorReadinessTool"
import { InvestorBriefNarrative } from "@/components/opportunities/InvestorBriefNarrative"
import { InvestorMarketEvidence } from "@/components/opportunities/InvestorMarketEvidence"
import { Link } from "@/i18n/routing"
import type { InvestorBrief, InvestorBriefSummary } from "@/lib/investor-briefs/repository"

const RISK_LABELS = {
  high: "High priority",
  medium: "Material",
  context: "Context",
} as const

interface Props {
  brief: InvestorBrief
  related: InvestorBriefSummary[]
}

export function InvestorBriefDetail({ brief, related }: Props) {
  const sourcesById = new Map(brief.payload.sources.map((source) => [source.id, source]))

  return (
    <main className="bg-paradigm-paper">
      <header className="relative overflow-hidden border-b border-paradigm-line px-6 pb-20 pt-32 md:px-10 md:pb-24 md:pt-40">
        <div className="absolute inset-0 paradigm-grid opacity-40" />
        <div className="absolute right-[-6rem] top-16 h-80 w-80 rounded-full bg-paradigm-accent/15 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="text-xs text-paradigm-ink-soft">
            <Link href="/japan-opportunities" className="hover:text-paradigm-accent">Japan Opportunities</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href="/japan-opportunities/invest" className="hover:text-paradigm-accent">Investor Briefs</Link>
          </nav>
          <p className="mt-8 paradigm-eyebrow text-paradigm-accent">{brief.payload.kicker}</p>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-paradigm-ink sm:text-5xl lg:text-7xl">
            {brief.title}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-paradigm-ink-soft md:text-lg">{brief.summary}</p>
          <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold text-paradigm-ink-soft">
            {[brief.preview.region, brief.preview.assetClass, brief.preview.decisionStage, brief.preview.readTime].map((value) => (
              <span key={value} className="rounded-full border border-paradigm-line bg-paradigm-paper-card px-3 py-1.5">{value}</span>
            ))}
          </div>
          {brief.payload.coveredMarkets ? (
            <div className="mt-5 flex flex-wrap gap-2" aria-label="Covered markets">
              {brief.payload.coveredMarkets.map((market) => (
                <span key={market} className="rounded-full bg-paradigm-accent/10 px-3 py-1.5 text-xs font-semibold text-paradigm-accent">{market}</span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-24">
        <section aria-labelledby="direct-answer" className="rounded-3xl border border-paradigm-accent/30 bg-paradigm-accent/10 p-7 md:p-10">
          <p className="paradigm-eyebrow text-paradigm-accent">DIRECT ANSWER</p>
          <h2 id="direct-answer" className="mt-3 font-display text-2xl font-semibold tracking-[-0.025em] text-paradigm-ink md:text-3xl">
            {brief.payload.decisionQuestion}
          </h2>
          <p className="mt-5 text-base leading-8 text-paradigm-ink">{brief.payload.answer}</p>
        </section>

        <section aria-labelledby="facts" className="py-16 md:py-20">
          <p className="paradigm-eyebrow text-paradigm-accent">EVIDENCE SNAPSHOT</p>
          <h2 id="facts" className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Facts that change the decision</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {brief.payload.keyFacts.map((fact) => (
              <article key={fact.label} className="rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-ink-soft">{fact.label}</p>
                <p className="mt-3 font-display text-2xl font-semibold text-paradigm-ink">{fact.value}</p>
                <p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{fact.meaning}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {fact.sourceIds.map((sourceId) => {
                    const source = sourcesById.get(sourceId)
                    return source ? (
                      <a key={sourceId} href={`#source-${sourceId}`} className="text-xs font-semibold text-paradigm-accent underline-offset-4 hover:underline">
                        {source.publisher}
                      </a>
                    ) : null
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>

        {brief.payload.chapters ? <InvestorBriefNarrative chapters={brief.payload.chapters} /> : null}

        {brief.payload.marketEvidence ? <InvestorMarketEvidence evidence={brief.payload.marketEvidence} /> : null}

        <section aria-labelledby="gates" className="border-t border-paradigm-line py-16 md:py-20">
          <div className="flex items-center gap-3 text-paradigm-accent"><FileCheck2 size={22} aria-hidden="true" /><p className="paradigm-eyebrow">INVESTMENT GATES</p></div>
          <h2 id="gates" className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Evidence required before advancing</h2>
          <div className="mt-8 space-y-4">
            {brief.payload.decisionGates.map((gate, index) => (
              <article key={gate.title} className="grid gap-4 rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-6 md:grid-cols-[3rem_1fr_1fr] md:p-7">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paradigm-ink font-display text-lg font-semibold text-paradigm-paper">{index + 1}</div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-paradigm-ink">{gate.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-paradigm-ink-soft">{gate.evidence}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-950">
                  <span className="font-semibold">Pass condition: </span>{gate.passCondition}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="risks" className="border-t border-paradigm-line py-16 md:py-20">
          <div className="flex items-center gap-3 text-amber-700"><AlertTriangle size={22} aria-hidden="true" /><p className="paradigm-eyebrow">DOWNSIDE FIRST</p></div>
          <h2 id="risks" className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Risks to resolve, not hide</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {brief.payload.risks.map((risk) => (
              <article key={risk.title} className="rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">{RISK_LABELS[risk.level]}</p>
                <h3 className="mt-3 font-display text-xl font-semibold text-paradigm-ink">{risk.title}</h3>
                <p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{risk.whyItMatters}</p>
                <p className="mt-4 border-t border-paradigm-line pt-4 text-sm leading-7 text-paradigm-ink"><span className="font-semibold">Action:</span> {risk.diligenceAction}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="checklist" className="rounded-3xl bg-paradigm-ink p-7 text-paradigm-paper md:p-10">
          <p className="paradigm-eyebrow text-paradigm-accent-soft">DILIGENCE CHECKLIST</p>
          <h2 id="checklist" className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] md:text-4xl">What to obtain before commitment</h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {brief.payload.checklist.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-7 text-paradigm-paper/80">
                <CheckCircle2 className="mt-1 shrink-0 text-paradigm-accent-soft" size={17} aria-hidden="true" />{item}
              </li>
            ))}
          </ul>
        </section>

        <InvestorReadinessTool
          checklist={brief.payload.checklist}
          decisionGates={brief.payload.decisionGates}
          risks={brief.payload.risks}
        />

        <section aria-labelledby="questions" className="py-16 md:py-20">
          <h2 id="questions" className="font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Questions investors ask</h2>
          <div className="mt-7 space-y-3">
            {brief.payload.faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5 open:border-paradigm-accent/40">
                <summary className="cursor-pointer list-none pr-6 font-semibold text-paradigm-ink">{faq.question}</summary>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-paradigm-ink-soft">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="methodology" className="grid gap-8 border-y border-paradigm-line py-12 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="flex items-center gap-3 text-paradigm-accent"><Database size={21} aria-hidden="true" /><p className="paradigm-eyebrow">WHO / HOW / WHY</p></div>
            <h2 id="methodology" className="mt-3 font-display text-3xl font-semibold text-paradigm-ink">Methodology and limits</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-paradigm-ink-soft">
            <p><span className="font-semibold text-paradigm-ink">Purpose:</span> {brief.payload.methodology.purpose}</p>
            <p><span className="font-semibold text-paradigm-ink">Process:</span> {brief.payload.methodology.process}</p>
            <p><span className="font-semibold text-paradigm-ink">Limitations:</span> {brief.payload.methodology.limitations}</p>
            <p><span className="font-semibold text-paradigm-ink">Reviewed by:</span> {brief.payload.methodology.reviewedBy}</p>
            <p className="rounded-xl bg-amber-50 p-4 text-amber-950">Decision support only. This page is not investment, legal, tax, brokerage, valuation, accounting, or financial advice.</p>
          </div>
        </section>

        <section aria-labelledby="sources" className="py-16 md:py-20">
          <h2 id="sources" className="font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Primary sources</h2>
          <ol className="mt-7 space-y-4">
            {brief.payload.sources.map((source, index) => (
              <li id={`source-${source.id}`} key={source.id} className="scroll-mt-28 rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5">
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-start justify-between gap-4 text-sm font-semibold text-paradigm-ink hover:text-paradigm-accent">
                  <span>{index + 1}. {source.title}<span className="mt-1 block text-xs font-normal text-paradigm-ink-soft">{source.publisher} · accessed {source.accessedAt}</span></span>
                  <ExternalLink size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </section>

        {related.length > 0 ? (
          <section aria-labelledby="related" className="border-t border-paradigm-line py-16">
            <h2 id="related" className="font-display text-3xl font-semibold text-paradigm-ink">Related investor briefs</h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {related.map((item) => (
                <Link key={item.slug} href={`/japan-opportunities/invest/${item.slug}`} className="group rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5 transition hover:border-paradigm-accent/50">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-accent">{item.preview.category}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-paradigm-ink group-hover:text-paradigm-accent">{item.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-paradigm-line bg-paradigm-paper-deep/50 p-7 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="paradigm-eyebrow text-paradigm-accent">HUMAN + MACHINE DELIVERY</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-paradigm-ink">Use the brief in a deal team or an agent workflow</h2>
              <p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">The same sourced decision model is available as JSON or Markdown. For asset-specific work, request a scoped screen with assumptions and unresolved evidence clearly separated.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <a href={brief.endpoint} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-paradigm-ink px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper">Open JSON API<ExternalLink size={15} aria-hidden="true" /></a>
              <Link href="/japan-opportunities/capital-in-japan#inquiry" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-paradigm-ink px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-paper hover:bg-paradigm-accent">Request a deal screen<ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
