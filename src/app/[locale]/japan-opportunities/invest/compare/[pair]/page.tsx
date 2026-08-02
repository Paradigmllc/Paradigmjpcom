import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { InvestorComparisonDetail } from "@/components/opportunities/InvestorComparisonDetail"
import JsonLd from "@/components/seo/JsonLd"
import {
  buildInvestorBriefComparison,
  comparisonPath,
  findCuratedComparison,
  findReverseCuratedComparison,
  parseComparisonPair,
} from "@/lib/investor-briefs/comparisons"
import { getInvestorBrief } from "@/lib/investor-briefs/repository"
import { pageAlternates } from "@/lib/page-metadata"
import { buildArticleSchema, buildBreadcrumbSchema } from "@/lib/seo/schemas"

interface Props {
  params: Promise<{ locale: string; pair: string }>
}

async function loadPair(pair: string) {
  const parsed = parseComparisonPair(pair)
  if (!parsed || parsed.left === parsed.right) return null
  const [left, right] = await Promise.all([getInvestorBrief(parsed.left), getInvestorBrief(parsed.right)])
  if (!left || !right) return null
  return { parsed, comparison: buildInvestorBriefComparison(left, right) }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, pair } = await params
  const loaded = await loadPair(pair)
  if (!loaded) return {}
  const { comparison } = loaded
  const title = `${comparison.left.preview.assetClass} vs ${comparison.right.preview.assetClass} in Japan`
  const description = comparison.intent ?? `Compare ${comparison.left.title} and ${comparison.right.title} using sourced facts, downside risks and decision gates.`
  const path = `/japan-opportunities/invest/compare/${pair}`
  const canonical = comparisonPath(comparison.left.slug, comparison.right.slug)
  return {
    title,
    description,
    alternates: pageAlternates(locale, path, ["en"]),
    robots: { index: locale === "en" && comparison.isIndexable, follow: true },
    openGraph: {
      type: "article",
      locale: "en_US",
      url: `https://paradigmjp.com${canonical}`,
      title,
      description,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function InvestorComparisonPage({ params }: Props) {
  const { locale, pair } = await params
  if (locale !== "en") permanentRedirect(`/en/japan-opportunities/invest/compare/${pair}`)

  const parsed = parseComparisonPair(pair)
  if (!parsed || parsed.left === parsed.right) notFound()
  const reverse = findReverseCuratedComparison(parsed.left, parsed.right)
  if (reverse) permanentRedirect(comparisonPath(reverse.left, reverse.right))

  const loaded = await loadPair(pair)
  if (!loaded) notFound()
  const { comparison } = loaded
  const canonical = `https://paradigmjp.com${comparisonPath(comparison.left.slug, comparison.right.slug)}`
  const title = `${comparison.left.preview.assetClass} vs ${comparison.right.preview.assetClass} in Japan`
  const description = comparison.intent ?? `Compare ${comparison.left.title} and ${comparison.right.title} using sourced facts, downside risks and decision gates.`
  const curated = findCuratedComparison(comparison.left.slug, comparison.right.slug)

  return (
    <>
      <InvestorComparisonDetail comparison={comparison} />
      <JsonLd data={{
        ...buildArticleSchema({
          title,
          description,
          url: canonical,
          locale: "en",
          authorName: "Paradigm Japan Asset Intelligence Desk",
        }),
        about: [comparison.left.preview.assetClass, comparison.right.preview.assetClass, "Foreign investment in Japan"],
        isAccessibleForFree: true,
        citation: [...comparison.left.payload.sources, ...comparison.right.payload.sources].map((source) => source.url),
        ...(curated ? { keywords: curated.intent } : {}),
      }} />
      <JsonLd data={buildBreadcrumbSchema([
        { name: "Japan Opportunities", url: "https://paradigmjp.com/en/japan-opportunities" },
        { name: "Investor Briefs", url: "https://paradigmjp.com/en/japan-opportunities/invest" },
        { name: title, url: canonical },
      ])} />
    </>
  )
}
