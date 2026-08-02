import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, Scale } from "lucide-react"
import { Link } from "@/i18n/routing"
import type { InvestorBriefComparison } from "@/lib/investor-briefs/comparisons"

export function InvestorComparisonDetail({ comparison }: { comparison: InvestorBriefComparison }) {
  const columns = [comparison.left, comparison.right]

  return (
    <main className="bg-paradigm-paper">
      <header className="relative overflow-hidden border-b border-paradigm-line px-6 pb-20 pt-32 md:px-10 md:pb-24 md:pt-40">
        <div className="absolute inset-0 paradigm-grid opacity-40" />
        <div className="relative mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="text-xs text-paradigm-ink-soft">
            <Link href="/japan-opportunities/invest" className="hover:text-paradigm-accent">Investor Briefs</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            Comparisons
          </nav>
          <div className="mt-8 flex items-center gap-3 text-paradigm-accent"><Scale size={22} aria-hidden="true" /><p className="paradigm-eyebrow">A / B INVESTMENT COMPARISON</p></div>
          <h1 className="mt-5 max-w-5xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-paradigm-ink sm:text-5xl lg:text-7xl">
            {comparison.left.preview.assetClass} vs {comparison.right.preview.assetClass} in Japan
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-paradigm-ink-soft md:text-lg">
            {comparison.intent ?? "Compare two Japan investment paths using their evidence requirements, downside risks and execution gates."}
          </p>
          <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold text-paradigm-ink-soft">
            <span className="rounded-full border border-paradigm-line bg-paradigm-paper-card px-3 py-1.5">{comparison.sourceCount} distinct source URLs</span>
            <span className="rounded-full border border-paradigm-line bg-paradigm-paper-card px-3 py-1.5">{comparison.highPriorityRiskCount} high-priority risks</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
        <section aria-labelledby="direct-comparison">
          <p className="paradigm-eyebrow text-paradigm-accent">DECISION FRAME</p>
          <h2 id="direct-comparison" className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Start with the mandate, then compare the evidence burden</h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {columns.map((brief) => (
              <article key={brief.slug} className="rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-7 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-accent">{brief.preview.category} / {brief.preview.region}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-paradigm-ink">{brief.title}</h3>
                <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">{brief.payload.answer}</p>
                <Link href={`/japan-opportunities/invest/${brief.slug}`} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-ink hover:text-paradigm-accent">
                  Read full brief<ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <ComparisonSection title="Facts that drive underwriting" eyebrow="EVIDENCE" id="facts">
          {columns.map((brief) => (
            <ComparisonColumn key={brief.slug} title={brief.preview.assetClass}>
              {brief.payload.keyFacts.map((fact) => (
                <li key={fact.label} className="rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-ink-soft">{fact.label}</p>
                  <p className="mt-2 font-display text-xl font-semibold text-paradigm-ink">{fact.value}</p>
                  <p className="mt-2 text-sm leading-7 text-paradigm-ink-soft">{fact.meaning}</p>
                </li>
              ))}
            </ComparisonColumn>
          ))}
        </ComparisonSection>

        <ComparisonSection title="Downside and execution risk" eyebrow="DOWNSIDE" id="risks">
          {columns.map((brief) => (
            <ComparisonColumn key={brief.slug} title={brief.preview.assetClass}>
              {brief.payload.risks.map((risk) => (
                <li key={risk.title} className="rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700"><AlertTriangle size={14} aria-hidden="true" />{risk.level}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-paradigm-ink">{risk.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-paradigm-ink-soft">{risk.whyItMatters}</p>
                  <p className="mt-3 text-sm leading-7 text-paradigm-ink"><strong>Resolve:</strong> {risk.diligenceAction}</p>
                </li>
              ))}
            </ComparisonColumn>
          ))}
        </ComparisonSection>

        <ComparisonSection title="Pass conditions before capital moves" eyebrow="DECISION GATES" id="gates">
          {columns.map((brief) => (
            <ComparisonColumn key={brief.slug} title={brief.preview.assetClass}>
              {brief.payload.decisionGates.map((gate) => (
                <li key={gate.title} className="rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5">
                  <h3 className="flex items-start gap-2 font-display text-xl font-semibold text-paradigm-ink"><CheckCircle2 className="mt-1 shrink-0 text-emerald-700" size={17} aria-hidden="true" />{gate.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{gate.evidence}</p>
                  <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm leading-7 text-emerald-950"><strong>Pass:</strong> {gate.passCondition}</p>
                </li>
              ))}
            </ComparisonColumn>
          ))}
        </ComparisonSection>

        <section aria-labelledby="comparison-sources" className="border-t border-paradigm-line py-16 md:py-20">
          <h2 id="comparison-sources" className="font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Source ledgers</h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {columns.map((brief) => (
              <div key={brief.slug}>
                <h3 className="font-display text-xl font-semibold text-paradigm-ink">{brief.preview.assetClass}</h3>
                <ul className="mt-4 space-y-3">
                  {brief.payload.sources.map((source) => (
                    <li key={source.id}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-start justify-between gap-3 rounded-xl border border-paradigm-line bg-paradigm-paper-card p-4 text-sm font-semibold text-paradigm-ink hover:border-paradigm-accent/50 hover:text-paradigm-accent">
                        <span>{source.title}<span className="mt-1 block text-xs font-normal text-paradigm-ink-soft">{source.publisher} · accessed {source.accessedAt}</span></span>
                        <ExternalLink className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-paradigm-ink p-8 text-paradigm-paper md:p-10">
          <p className="paradigm-eyebrow text-paradigm-accent-soft">ASSET-SPECIFIC COMPARISON</p>
          <div className="mt-3 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold">Replace category assumptions with deal evidence</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-paradigm-paper/70">This comparison organizes public evidence; it does not rank a specific asset. A scoped screen can compare price, cash flow, execution owners and downside cases on the same basis.</p>
            </div>
            <Link href="/japan-opportunities/capital-in-japan#inquiry" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-paradigm-accent px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-paradigm-accent-soft">Request a deal comparison<ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </section>
      </div>
    </main>
  )
}

function ComparisonSection({ title, eyebrow, id, children }: { title: string; eyebrow: string; id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-paradigm-line py-16 md:py-20">
      <p className="paradigm-eyebrow text-paradigm-accent">{eyebrow}</p>
      <h2 id={id} className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">{title}</h2>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">{children}</div>
    </section>
  )
}

function ComparisonColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-xl font-semibold text-paradigm-ink">{title}</h3>
      <ul className="mt-4 space-y-4">{children}</ul>
    </div>
  )
}
