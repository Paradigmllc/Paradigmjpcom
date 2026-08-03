import type { Metadata } from "next"
import { ArrowRight, Database, Filter, MapPinned } from "lucide-react"
import { permanentRedirect } from "next/navigation"
import JsonLd from "@/components/seo/JsonLd"
import { Link } from "@/i18n/routing"
import { listInvestorScenarios } from "@/lib/investor-scenarios/repository"
import { pageAlternates } from "@/lib/page-metadata"
import { buildBreadcrumbSchema, buildPageSchema } from "@/lib/seo/schemas"

interface Props { params: Promise<{ locale: string }> }

export const dynamic = "force-dynamic"

const PATH = "/japan-opportunities/invest/markets"
const URL = `https://paradigmjp.com/en${PATH}`

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: "Greater Tokyo Real Estate Investment Scenarios",
    description: "Compare 320 quality-gated Greater Tokyo real-estate decisions across 16 markets, four suitable strategies per market and five foreign-investor profiles.",
    alternates: pageAlternates(locale, PATH, ["en"]),
    robots: { index: locale === "en", follow: true },
    openGraph: { type: "website", locale: "en_US", url: URL, title: "Greater Tokyo Real Estate Investment Scenarios", description: "Market, strategy and investor-profile decision pages with official evidence and transparent underwriting." },
  }
}

export default async function InvestorScenarioCollectionPage({ params }: Props) {
  const { locale } = await params
  if (locale !== "en") permanentRedirect(`/en${PATH}`)
  const result = await listInvestorScenarios({ limit: 1_000 })
  const groups = Map.groupBy(result.items, (scenario) => scenario.marketSlug)
  const marketGroups = [...groups.entries()].map(([marketSlug, items]) => ({ marketSlug, items, label: items[0]?.preview.marketLabel ?? marketSlug }))

  const collectionSchema = {
    ...buildPageSchema({ type: "CollectionPage", title: "Greater Tokyo Real Estate Investment Scenarios", description: "Quality-gated market, strategy and investor-profile decision pages.", url: URL, locale: "en" }),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: result.total,
      itemListElement: result.items.map((scenario, index) => ({ "@type": "ListItem", position: index + 1, name: scenario.title, url: `https://paradigmjp.com${scenario.pageUrl}` })),
    },
  }

  return (
    <main className="overflow-hidden bg-paradigm-paper">
      <section className="relative px-6 pb-20 pt-36 md:px-10 md:pb-28 md:pt-44">
        <div className="absolute inset-0 paradigm-grid opacity-45" />
        <div className="absolute left-1/2 top-12 h-96 w-96 -translate-x-1/2 rounded-full bg-paradigm-accent/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl text-center">
          <p className="paradigm-eyebrow text-paradigm-accent">GREATER TOKYO DECISION ATLAS</p>
          <h1 className="mx-auto mt-6 max-w-5xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-paradigm-ink sm:text-6xl lg:text-8xl">One market is not<br /><span className="text-paradigm-accent">one investment decision.</span></h1>
          <p className="mx-auto mt-7 max-w-3xl text-sm leading-7 text-paradigm-ink-soft md:text-base">{result.total} published scenarios connect 16 Greater Tokyo market boundaries to four suitable strategies and five investor mandates. Every page carries official evidence, downside gates and an editable underwriting stress model.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#markets" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-paradigm-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-paradigm-paper hover:bg-paradigm-accent"><MapPinned size={16} aria-hidden="true" />Browse 16 markets</a>
            <a href="/api/v1/investor-scenarios" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-paradigm-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper"><Database size={16} aria-hidden="true" />Scenario API</a>
          </div>
        </div>
      </section>

      <section className="border-y border-paradigm-line bg-paradigm-paper-deep/40 px-6 py-12 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {[["16", "source-backed market boundaries"], ["4", "suitable strategies per market"], ["5", "investor mandates per strategy"]].map(([value, label]) => <article key={label} className="rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-6"><p className="font-display text-5xl font-semibold text-paradigm-accent">{value}</p><p className="mt-2 text-sm leading-7 text-paradigm-ink-soft">{label}</p></article>)}
        </div>
      </section>

      <section id="markets" className="scroll-mt-24 px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3 text-paradigm-accent"><Filter size={20} aria-hidden="true" /><p className="paradigm-eyebrow">CRAWLABLE MARKET HUBS</p></div>
          <h2 className="mt-3 max-w-4xl font-display text-4xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-5xl">Choose the market boundary before the strategy</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {marketGroups.map(({ marketSlug, items, label }) => (
              <article key={marketSlug} className="rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-7 transition hover:-translate-y-0.5 hover:border-paradigm-accent/50 hover:shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-accent">20 quality-gated scenarios</p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-paradigm-ink">{label}</h3>
                <p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{[...new Set(items.map((item) => item.preview.strategyLabel))].join(" · ")}</p>
                <Link href={`/japan-opportunities/invest/markets/${marketSlug}`} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-ink hover:text-paradigm-accent">Open market decisions<ArrowRight size={15} aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <JsonLd data={collectionSchema} />
      <JsonLd data={buildBreadcrumbSchema([{ name: "Investor Briefs", url: "https://paradigmjp.com/en/japan-opportunities/invest" }, { name: "Greater Tokyo Scenarios", url: URL }])} />
    </main>
  )
}
