import type { Metadata } from "next"
import { ArrowRight, Database } from "lucide-react"
import { notFound, permanentRedirect } from "next/navigation"
import JsonLd from "@/components/seo/JsonLd"
import { Link } from "@/i18n/routing"
import { listInvestorScenarios } from "@/lib/investor-scenarios/repository"
import { pageAlternates } from "@/lib/page-metadata"
import { buildBreadcrumbSchema, buildPageSchema } from "@/lib/seo/schemas"

interface Props { params: Promise<{ locale: string; market: string }> }

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, market } = await params
  const path = `/japan-opportunities/invest/markets/${market}`
  if (locale !== "en") return { alternates: pageAlternates(locale, path, ["en"]), robots: { index: false, follow: true } }
  const result = await listInvestorScenarios({ marketSlug: market, limit: 100 })
  const first = result.items[0]
  if (!first) return {}
  return {
    title: `${first.preview.marketLabel} Real Estate Investment Scenarios`,
    description: `Compare ${result.total} source-backed ${first.preview.marketLabel} investment decisions across suitable property strategies and five foreign-investor profiles.`,
    alternates: pageAlternates(locale, path, ["en"]),
    robots: { index: true, follow: true },
  }
}

export default async function InvestorMarketScenarioHub({ params }: Props) {
  const { locale, market } = await params
  if (locale !== "en") permanentRedirect(`/en/japan-opportunities/invest/markets/${market}`)
  const result = await listInvestorScenarios({ marketSlug: market, limit: 100 })
  if (result.items.length === 0) notFound()
  const label = result.items[0]?.preview.marketLabel ?? market
  const strategies = Map.groupBy(result.items, (scenario) => scenario.strategySlug)
  const canonical = `https://paradigmjp.com/en/japan-opportunities/invest/markets/${market}`

  return (
    <main className="bg-paradigm-paper">
      <header className="relative overflow-hidden border-b border-paradigm-line px-6 pb-20 pt-32 md:px-10 md:pb-24 md:pt-40">
        <div className="absolute inset-0 paradigm-grid opacity-40" />
        <div className="relative mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="text-xs text-paradigm-ink-soft"><Link href="/japan-opportunities/invest">Investor Briefs</Link><span className="mx-2">/</span><Link href="/japan-opportunities/invest/markets">Greater Tokyo Scenarios</Link></nav>
          <p className="mt-8 paradigm-eyebrow text-paradigm-accent">MARKET DECISION HUB</p>
          <h1 className="mt-5 max-w-5xl font-display text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-paradigm-ink sm:text-6xl lg:text-7xl">{label} real estate investment scenarios</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-paradigm-ink-soft">{result.total} quality-gated decisions test four locally suitable strategies against five different foreign-investor mandates. Change one dimension at a time and keep the market evidence visible.</p>
          <a href={`/api/v1/investor-scenarios?market=${market}&limit=100`} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-paradigm-ink px-5 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper"><Database size={15} aria-hidden="true" />Market API</a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
        <div className="space-y-14">
          {[...strategies.entries()].map(([strategySlug, scenarios]) => (
            <section key={strategySlug} aria-labelledby={strategySlug}>
              <p className="paradigm-eyebrow text-paradigm-accent">STRATEGY</p>
              <h2 id={strategySlug} className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">{scenarios[0]?.preview.strategyLabel}</h2>
              <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {scenarios.map((scenario) => (
                  <Link key={scenario.slug} href={scenario.pageUrl.replace("/en", "")} className="group rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5 hover:border-paradigm-accent/50 hover:shadow-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-accent">{scenario.preview.investorProfileLabel}</p>
                    <h3 className="mt-3 font-display text-xl font-semibold text-paradigm-ink group-hover:text-paradigm-accent">{scenario.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{scenario.summary}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-ink">Open decision<ArrowRight size={14} aria-hidden="true" /></span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <JsonLd data={{ ...buildPageSchema({ type: "CollectionPage", title: `${label} Real Estate Investment Scenarios`, description: `${result.total} source-backed market, strategy and investor-profile decisions.`, url: canonical, locale: "en" }), mainEntity: { "@type": "ItemList", numberOfItems: result.total, itemListElement: result.items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.title, url: `https://paradigmjp.com${item.pageUrl}` })) } }} />
      <JsonLd data={buildBreadcrumbSchema([{ name: "Investor Briefs", url: "https://paradigmjp.com/en/japan-opportunities/invest" }, { name: "Greater Tokyo Scenarios", url: "https://paradigmjp.com/en/japan-opportunities/invest/markets" }, { name: label, url: canonical }])} />
    </main>
  )
}
