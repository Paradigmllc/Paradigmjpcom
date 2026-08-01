import type { Metadata } from "next"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import FadeIn from "@/components/aesop/FadeIn"
import { OpportunityBrandCard } from "@/components/opportunities/OpportunityBrandCard"
import { Link } from "@/i18n/routing"
import { getOpportunityBrands, getOpportunityHubCopy } from "@/lib/opportunities/brands"
import { pageAlternates } from "@/lib/page-metadata"

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const japanese = locale === "ja"
  return {
    title: japanese ? "Japan Opportunities | 海外投資・参入・調達支援" : "Japan Opportunities | Invest, Operate and Source in Japan",
    description: japanese
      ? "海外投資家・海外企業・海外調達責任者の日本での意思決定と実行を支援する3つの専門デスク。"
      : "Three focused desks for global investors, foreign companies and procurement teams completing transactions in Japan.",
    alternates: pageAlternates(locale, "/japan-opportunities"),
  }
}

export default async function JapanOpportunitiesPage({ params }: Props) {
  const { locale } = await params
  const copy = getOpportunityHubCopy(locale)
  const brands = getOpportunityBrands(locale)

  return (
    <main className="overflow-hidden bg-paradigm-paper">
      <section className="relative px-6 pb-24 pt-36 md:px-10 md:pb-32 md:pt-44">
        <div className="absolute inset-0 paradigm-grid opacity-45" />
        <div className="absolute left-1/2 top-16 h-80 w-80 -translate-x-1/2 rounded-full bg-paradigm-accent/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl text-center">
          <p className="paradigm-eyebrow text-paradigm-accent">{copy.eyebrow}</p>
          <h1 className="mx-auto mt-6 max-w-5xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-paradigm-ink sm:text-6xl lg:text-8xl">
            {copy.title}<br /><span className="text-paradigm-accent">{copy.highlight}</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-paradigm-ink-soft md:text-base">{copy.description}</p>
          <Link href="/japan-opportunities/enter-and-operate-japan#inquiry" className="mt-9 inline-flex min-h-12 items-center gap-2 rounded-xl bg-paradigm-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-paradigm-paper transition hover:bg-paradigm-accent">
            {copy.primaryCta}<ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="border-y border-paradigm-line bg-paradigm-paper-deep/40 px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <h2 className="font-display text-4xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-5xl">{copy.portfolioTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">{copy.portfolioDescription}</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {brands.map((brand, index) => <OpportunityBrandCard key={brand.slug} brand={brand} cta={copy.cardCta} index={index} />)}
          </div>
        </div>
      </section>

      <section className="paradigm-section px-6 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent">{copy.revenueEyebrow}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-5xl">{copy.revenueTitle}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-paradigm-ink-soft">{copy.revenueDescription}</p>
          </FadeIn>
          <FadeIn delay={0.1} className="overflow-hidden rounded-3xl border border-paradigm-line bg-paradigm-paper-card/70">
            {copy.revenueRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-5 border-b border-paradigm-line px-6 py-5 last:border-b-0 md:px-8">
                <span className="text-sm text-paradigm-ink-soft">{row.label}</span>
                <span className="text-right font-display text-lg font-semibold text-paradigm-ink">{row.value}</span>
              </div>
            ))}
          </FadeIn>
        </div>
      </section>

      <section className="border-t border-paradigm-line px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-paradigm-ink p-8 text-paradigm-paper md:p-12 lg:p-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-paradigm-accent-soft">OPERATING SYSTEM</p>
              <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-[-0.03em] md:text-5xl">{copy.operatingTitle}</h2>
            </div>
            <ul className="space-y-4">
              {copy.operatingPoints.map((point) => <li key={point} className="flex items-start gap-3 text-sm leading-6 text-paradigm-paper/75"><CheckCircle2 className="mt-0.5 shrink-0 text-paradigm-accent-soft" size={18} />{point}</li>)}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
