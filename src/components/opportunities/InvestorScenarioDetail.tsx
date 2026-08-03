import { AlertTriangle, ArrowRight, CheckCircle2, Database, ExternalLink, FileCheck2, ShieldCheck } from "lucide-react"
import { InvestorScenarioCalculator } from "@/components/opportunities/InvestorScenarioCalculator"
import { Link } from "@/i18n/routing"
import type { InvestorScenario, InvestorScenarioSummary } from "@/lib/investor-scenarios/repository"

interface Props {
  scenario: InvestorScenario
  related: InvestorScenarioSummary[]
}

export function InvestorScenarioDetail({ scenario, related }: Props) {
  const { payload } = scenario
  const sourcesById = new Map(payload.sources.map((source) => [source.id, source]))

  return (
    <main className="bg-paradigm-paper">
      <header className="relative overflow-hidden border-b border-paradigm-line px-6 pb-20 pt-32 md:px-10 md:pb-24 md:pt-40">
        <div className="absolute inset-0 paradigm-grid opacity-40" />
        <div className="absolute right-[-6rem] top-16 h-80 w-80 rounded-full bg-paradigm-accent/15 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="text-xs text-paradigm-ink-soft">
            <Link href="/japan-opportunities/invest" className="hover:text-paradigm-accent">Investor Briefs</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href="/japan-opportunities/invest/markets" className="hover:text-paradigm-accent">Greater Tokyo Scenarios</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href={`/japan-opportunities/invest/markets/${scenario.marketSlug}`} className="hover:text-paradigm-accent">{scenario.preview.marketLabel}</Link>
          </nav>
          <p className="mt-8 paradigm-eyebrow text-paradigm-accent">MARKET × STRATEGY × INVESTOR</p>
          <h1 className="mt-5 max-w-5xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-paradigm-ink sm:text-5xl lg:text-7xl">{scenario.title}</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-paradigm-ink-soft md:text-lg">{scenario.summary}</p>
          <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold text-paradigm-ink-soft">
            {[scenario.preview.marketLabel, scenario.preview.strategyLabel, scenario.preview.investorProfileLabel, scenario.preview.readTime].map((value) => (
              <span key={value} className="rounded-full border border-paradigm-line bg-paradigm-paper-card px-3 py-1.5">{value}</span>
            ))}
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-900">Quality gate {scenario.qualityScore}/100</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-24">
        <section aria-labelledby="scenario-answer" className="rounded-3xl border border-paradigm-accent/30 bg-paradigm-accent/10 p-7 md:p-10">
          <p className="paradigm-eyebrow text-paradigm-accent">DIRECT ANSWER</p>
          <h2 id="scenario-answer" className="mt-3 font-display text-2xl font-semibold tracking-[-0.025em] text-paradigm-ink md:text-3xl">{payload.decisionQuestion}</h2>
          <p className="mt-5 text-base leading-8 text-paradigm-ink">{payload.directAnswer}</p>
        </section>

        <section className="grid gap-5 py-16 md:grid-cols-2 md:py-20" aria-label="Strategy and investor mandate">
          <LensCard title={payload.strategy.label} eyebrow="STRATEGY LENS" description={payload.strategy.objective ?? ""} evidence={payload.strategy.requiredEvidence} />
          <LensCard title={payload.investorProfile.label} eyebrow="MANDATE LENS" description={payload.investorProfile.mandate ?? ""} evidence={payload.investorProfile.requiredEvidence} />
        </section>

        <section aria-labelledby="scenario-analysis" className="border-t border-paradigm-line py-16 md:py-20">
          <p className="paradigm-eyebrow text-paradigm-accent">SOURCE-BACKED ANALYSIS</p>
          <h2 id="scenario-analysis" className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">A decision record for this exact combination</h2>
          <div className="mt-10 space-y-14">
            {payload.analysisSections.map((section, index) => (
              <article key={section.id} className="grid gap-6 lg:grid-cols-[0.3fr_0.7fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-paradigm-accent">0{index + 1}</p>
                  <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em] text-paradigm-ink">{section.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{section.lede}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {section.sourceIds.map((sourceId) => {
                      const source = sourcesById.get(sourceId)
                      return source ? <a key={sourceId} href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-paradigm-accent underline-offset-4 hover:underline">{source.publisher}</a> : null
                    })}
                  </div>
                </div>
                <div className="space-y-5 text-[15px] leading-8 text-paradigm-ink-soft">
                  {section.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 96)}>{paragraph}</p>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="market-points" className="border-t border-paradigm-line py-16 md:py-20">
          <p className="paradigm-eyebrow text-paradigm-accent">DYNAMIC MARKET EVIDENCE</p>
          <h2 id="market-points" className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Published market anchors</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-paradigm-ink-soft">{payload.marketEvidence.scope} Values are context, not an asset valuation. As of {payload.marketEvidence.asOf}.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {payload.marketEvidence.points.map((point) => (
              <article key={point.market} className="rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5">
                <h3 className="font-display text-xl font-semibold text-paradigm-ink">{point.market}</h3>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-paradigm-ink-soft">Residential land</dt><dd className="mt-1 font-semibold tabular-nums text-paradigm-ink">JPY {point.averagePriceYenPerSqm.toLocaleString("en-US")}/m²</dd></div>
                  <div><dt className="text-paradigm-ink-soft">Annual change</dt><dd className="mt-1 font-semibold tabular-nums text-paradigm-ink">{point.annualChangePct.toFixed(1)}%</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <InvestorScenarioCalculator defaults={payload.underwritingDefaults} />

        <section className="grid gap-10 border-t border-paradigm-line py-16 lg:grid-cols-2 md:py-20">
          <DecisionList title="Downside and control" eyebrow="RISKS" icon="risk" items={payload.risks.map((risk) => ({ title: risk.title, body: risk.whyItMatters, action: risk.diligenceAction }))} />
          <DecisionList title="Pass conditions" eyebrow="DECISION GATES" icon="gate" items={payload.decisionGates.map((gate) => ({ title: gate.title, body: gate.evidence, action: gate.passCondition }))} />
        </section>

        <section aria-labelledby="scenario-faq" className="border-t border-paradigm-line py-16 md:py-20">
          <p className="paradigm-eyebrow text-paradigm-accent">QUESTIONS INVESTORS ASK</p>
          <h2 id="scenario-faq" className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Scope, fit and limitations</h2>
          <div className="mt-8 divide-y divide-paradigm-line rounded-3xl border border-paradigm-line bg-paradigm-paper-card px-6 md:px-8">
            {payload.faqs.map((faq) => <details key={faq.question} className="group py-5"><summary className="cursor-pointer list-none font-display text-xl font-semibold text-paradigm-ink">{faq.question}</summary><p className="mt-4 max-w-3xl text-sm leading-7 text-paradigm-ink-soft">{faq.answer}</p></details>)}
          </div>
        </section>

        <section aria-labelledby="scenario-sources" className="border-t border-paradigm-line py-16 md:py-20">
          <div className="flex items-center gap-3 text-paradigm-accent"><Database size={20} aria-hidden="true" /><p className="paradigm-eyebrow">SOURCE LEDGER & API</p></div>
          <h2 id="scenario-sources" className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Inspect the evidence and machine-readable record</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {payload.sources.map((source) => (
              <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-start justify-between gap-3 rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5 text-sm font-semibold text-paradigm-ink hover:border-paradigm-accent/50 hover:text-paradigm-accent">
                <span>{source.title}<span className="mt-1 block text-xs font-normal text-paradigm-ink-soft">{source.publisher} · accessed {source.accessedAt}</span></span><ExternalLink className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
              </a>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href={scenario.endpoint} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-paradigm-ink px-5 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-paper hover:bg-paradigm-accent"><Database size={15} aria-hidden="true" />JSON API</a>
            <a href={`${scenario.endpoint}?format=markdown`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-paradigm-ink px-5 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper"><FileCheck2 size={15} aria-hidden="true" />Markdown</a>
            <Link href={payload.marketPageUrl.replace("/en", "")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-paradigm-line px-5 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-ink hover:border-paradigm-accent">Full market brief<ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </section>

        {related.length > 0 ? (
          <section aria-labelledby="related-scenarios" className="border-t border-paradigm-line py-16 md:py-20">
            <p className="paradigm-eyebrow text-paradigm-accent">RELATED DECISIONS</p>
            <h2 id="related-scenarios" className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Change one assumption at a time</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {related.map((item) => <Link key={item.slug} href={item.pageUrl.replace("/en", "")} className="group rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5 hover:border-paradigm-accent/50"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-accent">{item.preview.strategyLabel} · {item.preview.investorProfileLabel}</p><h3 className="mt-2 font-display text-xl font-semibold text-paradigm-ink group-hover:text-paradigm-accent">{item.title}</h3></Link>)}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl bg-paradigm-ink p-8 text-paradigm-paper md:p-10">
          <div className="flex items-start gap-4"><ShieldCheck className="mt-1 shrink-0 text-paradigm-accent-soft" size={24} aria-hidden="true" /><div><p className="paradigm-eyebrow text-paradigm-accent-soft">METHOD AND LIMITS</p><h2 className="mt-3 font-display text-3xl font-semibold">Public evidence is the start of diligence</h2><p className="mt-4 text-sm leading-7 text-paradigm-paper/70">{payload.methodology.limitations}</p></div></div>
        </section>
      </div>
    </main>
  )
}

function LensCard({ title, eyebrow, description, evidence }: { title: string; eyebrow: string; description: string; evidence: readonly string[] }) {
  return <article className="rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-7"><p className="paradigm-eyebrow text-paradigm-accent">{eyebrow}</p><h2 className="mt-3 font-display text-2xl font-semibold text-paradigm-ink">{title}</h2><p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{description}</p><ul className="mt-5 space-y-2">{evidence.map((item) => <li key={item} className="flex items-start gap-2 text-sm leading-6 text-paradigm-ink"><CheckCircle2 className="mt-1 shrink-0 text-emerald-700" size={15} aria-hidden="true" />{item}</li>)}</ul></article>
}

function DecisionList({ title, eyebrow, icon, items }: { title: string; eyebrow: string; icon: "risk" | "gate"; items: Array<{ title: string; body: string; action: string }> }) {
  const Icon = icon === "risk" ? AlertTriangle : CheckCircle2
  return <section><p className="paradigm-eyebrow text-paradigm-accent">{eyebrow}</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink">{title}</h2><div className="mt-6 space-y-4">{items.map((item) => <article key={item.title} className="rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5"><h3 className="flex items-start gap-2 font-display text-xl font-semibold text-paradigm-ink"><Icon className={`mt-1 shrink-0 ${icon === "risk" ? "text-amber-700" : "text-emerald-700"}`} size={17} aria-hidden="true" />{item.title}</h3><p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{item.body}</p><p className="mt-3 rounded-xl bg-paradigm-paper-deep p-3 text-sm leading-7 text-paradigm-ink"><strong>{icon === "risk" ? "Resolve" : "Pass"}:</strong> {item.action}</p></article>)}</div></section>
}
