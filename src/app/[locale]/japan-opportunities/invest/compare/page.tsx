import type { Metadata } from "next"
import { ArrowRight, Scale } from "lucide-react"
import { permanentRedirect } from "next/navigation"
import JsonLd from "@/components/seo/JsonLd"
import { Link } from "@/i18n/routing"
import { listCuratedComparisonSummaries } from "@/lib/investor-briefs/comparisons"
import { listInvestorBriefs } from "@/lib/investor-briefs/repository"
import { pageAlternates } from "@/lib/page-metadata"
import { buildBreadcrumbSchema, buildPageSchema } from "@/lib/seo/schemas"

interface Props {
  params: Promise<{ locale: string }>
}

const PATH = "/japan-opportunities/invest/compare"
const URL = `https://paradigmjp.com/en${PATH}`

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: "Compare Japan Investment Opportunities",
    description: "Compare Japan real estate, hospitality, infrastructure and company investment paths using sourced facts, downside risks and diligence gates.",
    alternates: pageAlternates(locale, PATH, ["en"]),
    robots: { index: locale === "en", follow: true },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: URL,
      title: "Compare Japan Investment Opportunities",
      description: "Sourced A/B comparisons for foreign investors evaluating Japan.",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Compare Japan investment opportunities" }],
    },
    twitter: { card: "summary_large_image", title: "Compare Japan Investment Opportunities", description: "Sourced A/B comparisons for foreign investors evaluating Japan." },
  }
}

export default async function InvestorComparisonCollectionPage({ params }: Props) {
  const { locale } = await params
  if (locale !== "en") permanentRedirect(`/en${PATH}`)

  const briefs = await listInvestorBriefs()
  const comparisons = listCuratedComparisonSummaries(briefs)
  const collectionSchema = {
    ...buildPageSchema({
      type: "CollectionPage",
      title: "Compare Japan Investment Opportunities",
      description: "Sourced A/B comparisons for foreign investors evaluating Japan.",
      url: URL,
      locale: "en",
    }),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: comparisons.length,
      itemListElement: comparisons.map((comparison, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: comparison.title,
        url: `https://paradigmjp.com${comparison.path}`,
      })),
    },
  }

  return (
    <main className="bg-paradigm-paper">
      <header className="relative overflow-hidden border-b border-paradigm-line px-6 pb-20 pt-36 md:px-10 md:pb-24 md:pt-44">
        <div className="absolute inset-0 paradigm-grid opacity-40" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center gap-3 text-paradigm-accent"><Scale size={22} aria-hidden="true" /><p className="paradigm-eyebrow">JAPAN INVESTMENT COMPARISONS</p></div>
          <h1 className="mt-5 max-w-5xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-paradigm-ink sm:text-6xl lg:text-8xl">Compare evidence,<br /><span className="text-paradigm-accent">not category labels.</span></h1>
          <p className="mt-7 max-w-3xl text-sm leading-7 text-paradigm-ink-soft md:text-base">Each A/B page combines the complete source ledger, key facts, downside risks and pass conditions from two decision briefs. Only comparisons with a distinct investor decision are indexed.</p>
        </div>
      </header>

      <section className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          {comparisons.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {comparisons.map((comparison) => (
                <article key={comparison.path} className="flex h-full flex-col rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-7 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-accent">{comparison.leftBrief.preview.category} / {comparison.rightBrief.preview.category}</p>
                  <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.025em] text-paradigm-ink">{comparison.title}</h2>
                  <p className="mt-4 flex-1 text-sm leading-7 text-paradigm-ink-soft">{comparison.summary}</p>
                  <Link href={comparison.path.replace(/^\/en/, "")} className="mt-6 inline-flex min-h-11 items-center justify-between rounded-xl bg-paradigm-ink px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-paper hover:bg-paradigm-accent" aria-label={`Compare ${comparison.leftBrief.preview.assetClass} and ${comparison.rightBrief.preview.assetClass}`}>
                    Open comparison<ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-paradigm-line bg-paradigm-paper-card p-10 text-center">
              <h2 className="font-display text-2xl font-semibold text-paradigm-ink">Comparisons are under evidence review</h2>
              <p className="mt-3 text-sm text-paradigm-ink-soft">A comparison appears only after both underlying source ledgers pass publication checks.</p>
            </div>
          )}
        </div>
      </section>

      <JsonLd data={collectionSchema} />
      <JsonLd data={buildBreadcrumbSchema([
        { name: "Japan Opportunities", url: "https://paradigmjp.com/en/japan-opportunities" },
        { name: "Investor Briefs", url: "https://paradigmjp.com/en/japan-opportunities/invest" },
        { name: "Comparisons", url: URL },
      ])} />
    </main>
  )
}
