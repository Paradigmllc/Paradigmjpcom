import type { Metadata } from "next"
import { ArrowRight, Database, MapPinned, Scale, ShieldCheck } from "lucide-react"
import { permanentRedirect } from "next/navigation"
import { InvestorBriefExplorer } from "@/components/opportunities/InvestorBriefExplorer"
import JsonLd from "@/components/seo/JsonLd"
import { Link } from "@/i18n/routing"
import { listInvestorBriefs } from "@/lib/investor-briefs/repository"
import { listInvestorScenarios } from "@/lib/investor-scenarios/repository"
import { pageAlternates } from "@/lib/page-metadata"
import { buildBreadcrumbSchema, buildPageSchema } from "@/lib/seo/schemas"

interface Props {
  params: Promise<{ locale: string }>
}

const PATH = "/japan-opportunities/invest"
const URL = `https://paradigmjp.com/en${PATH}`

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: "Japan Investment Briefs for Foreign Investors",
    description: "Decision-grade Japan investment briefs covering real estate, hospitality, infrastructure, M&A, startups and foreign-direct-investment execution—with official sources, risks and diligence gates.",
    alternates: pageAlternates(locale, PATH, ["en"]),
    robots: { index: locale === "en", follow: true },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: URL,
      title: "Japan Investment Briefs for Foreign Investors",
      description: "Official-source-backed decision briefs for allocating capital to Japan.",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Paradigm Japan Investment Briefs" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Japan Investment Briefs for Foreign Investors",
      description: "Official-source-backed decision briefs for allocating capital to Japan.",
    },
  }
}

export default async function InvestorBriefCollectionPage({ params }: Props) {
  const { locale } = await params
  if (locale !== "en") permanentRedirect(`/en${PATH}`)

  const [briefs, scenarios] = await Promise.all([
    listInvestorBriefs(),
    listInvestorScenarios({ limit: 1 }),
  ])
  const collectionSchema = {
    ...buildPageSchema({
      type: "CollectionPage",
      title: "Japan Investment Briefs for Foreign Investors",
      description: "Official-source-backed decision briefs for allocating capital to Japan.",
      url: URL,
      locale: "en",
    }),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: briefs.length,
      itemListElement: briefs.map((brief, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: brief.title,
        url: `https://paradigmjp.com${brief.pageUrl}`,
      })),
    },
  }

  return (
    <main className="overflow-hidden bg-paradigm-paper">
      <section className="relative px-6 pb-20 pt-36 md:px-10 md:pb-28 md:pt-44">
        <div className="absolute inset-0 paradigm-grid opacity-45" />
        <div className="absolute left-1/2 top-12 h-96 w-96 -translate-x-1/2 rounded-full bg-paradigm-accent/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl text-center">
          <p className="paradigm-eyebrow text-paradigm-accent">JAPAN INVESTOR INTELLIGENCE</p>
          <h1 className="mx-auto mt-6 max-w-5xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-paradigm-ink sm:text-6xl lg:text-8xl">
            Research a Japan investment<br /><span className="text-paradigm-accent">before pricing the deal.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-sm leading-7 text-paradigm-ink-soft md:text-base">
            A growing library of decision briefs for global investors. Each page separates official facts, underwriting questions, downside risks and evidence gates—then exposes the same model through a public API.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="#briefs" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-paradigm-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-paradigm-paper transition hover:bg-paradigm-accent">{`Browse ${briefs.length} briefs`}<ArrowRight size={16} aria-hidden="true" /></Link>
            <a href="/api/v1/investor-briefs" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-paradigm-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-paradigm-ink transition hover:bg-paradigm-ink hover:text-paradigm-paper"><Database size={16} aria-hidden="true" />Open the API</a>
          </div>
        </div>
      </section>

      <section className="border-y border-paradigm-line bg-paradigm-paper-deep/40 px-6 py-12 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {[
            ["Official-source first", "Every claim that can change the decision points to a government or public-sector source."],
            ["Downside before upside", "Regulatory, tax, operating, financing and exit risks are visible before the CTA."],
            ["Human and machine readable", "The website, JSON API, Markdown delivery and structured data use one versioned record."],
          ].map(([title, description]) => (
            <article key={title} className="rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-6">
              <ShieldCheck className="text-paradigm-accent" size={20} aria-hidden="true" />
              <h2 className="mt-4 font-display text-xl font-semibold text-paradigm-ink">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-paradigm-ink-soft">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="briefs" className="scroll-mt-24 px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="paradigm-eyebrow text-paradigm-accent">PUBLISHED BRIEFS</p>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-5xl">{briefs.length} distinct decisions, not keyword variants</h2>
            <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">The Greater Tokyo cluster covers all 23 wards through decision-specific submarkets, plus Yokohama, Kawasaki, Saitama and Chiba. Every URL requires a distinct source set, narrative, diligence workflow and decision gate.</p>
          </div>
          {briefs.length > 0 ? (
            <InvestorBriefExplorer briefs={briefs} />
          ) : (
            <div className="mt-12 rounded-3xl border border-dashed border-paradigm-line bg-paradigm-paper-card p-10 text-center">
              <h2 className="font-display text-2xl font-semibold text-paradigm-ink">No briefs are published yet</h2>
              <p className="mt-3 text-sm text-paradigm-ink-soft">The research desk is reviewing the first evidence set. Published briefs will appear here automatically.</p>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-paradigm-line px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-8 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-paradigm-accent"><MapPinned size={21} aria-hidden="true" /><p className="paradigm-eyebrow">GREATER TOKYO DECISION ATLAS</p></div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">{scenarios.total} market × strategy × investor decisions</h2>
            <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">Sixteen source-backed market boundaries are matched only to four locally suitable strategies, then tested against five foreign-investor mandates. Every page includes its own decision analysis, official evidence and editable stress model.</p>
          </div>
          <Link href="/japan-opportunities/invest/markets" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-paradigm-accent px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-paradigm-accent-soft">Browse scenarios<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="border-t border-paradigm-line bg-paradigm-paper-deep/40 px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-8 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-paradigm-accent"><Scale size={21} aria-hidden="true" /><p className="paradigm-eyebrow">A / B DECISIONS</p></div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Compare opportunity types on the same evidence frame</h2>
            <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">Curated comparison pages put official facts, high-priority risks, decision gates and source ledgers side by side. Arbitrary combinations remain available through the API but are not indexed.</p>
          </div>
          <Link href="/japan-opportunities/invest/compare" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-paradigm-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-paper hover:bg-paradigm-accent">Browse comparisons<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="border-t border-paradigm-line px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 rounded-3xl bg-paradigm-ink p-8 text-paradigm-paper md:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="paradigm-eyebrow text-paradigm-accent-soft">ASSET-SPECIFIC WORK</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Move from public research to a deal screen</h2>
            <p className="mt-4 text-sm leading-7 text-paradigm-paper/70">Provide the asset, price, operating assumptions and holding period. We return known facts, missing evidence, downside cases and a clear advance, reprice or decline recommendation.</p>
          </div>
          <Link href="/japan-opportunities/capital-in-japan#inquiry" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-paradigm-accent px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-paradigm-accent-soft">Request a scoped screen<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      <JsonLd data={collectionSchema} />
      <JsonLd data={buildBreadcrumbSchema([
        { name: "Japan Opportunities", url: "https://paradigmjp.com/en/japan-opportunities" },
        { name: "Investor Briefs", url: URL },
      ])} />
    </main>
  )
}
