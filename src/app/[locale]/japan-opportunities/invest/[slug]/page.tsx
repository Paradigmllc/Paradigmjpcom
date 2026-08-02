import type { Metadata } from "next"
import { cache } from "react"
import { notFound, permanentRedirect } from "next/navigation"
import { InvestorBriefDetail } from "@/components/opportunities/InvestorBriefDetail"
import JsonLd from "@/components/seo/JsonLd"
import { getInvestorBrief, listInvestorBriefs } from "@/lib/investor-briefs/repository"
import { pageAlternates } from "@/lib/page-metadata"
import { buildArticleSchema, buildBreadcrumbSchema } from "@/lib/seo/schemas"

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

const getCachedBrief = cache(getInvestorBrief)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const path = `/japan-opportunities/invest/${slug}`
  if (locale !== "en") {
    return { alternates: pageAlternates(locale, path, ["en"]), robots: { index: false, follow: true } }
  }
  const brief = await getCachedBrief(slug)
  if (!brief) return {}
  const canonical = `https://paradigmjp.com${brief.pageUrl}`
  return {
    title: brief.title,
    description: brief.summary,
    keywords: [brief.preview.assetClass, brief.preview.region, brief.preview.category, "invest in Japan", "Japan investment due diligence"],
    alternates: pageAlternates(locale, path, ["en"]),
    robots: { index: true, follow: true },
    authors: [{ name: brief.payload.methodology.reviewedBy }],
    openGraph: {
      type: "article",
      locale: "en_US",
      url: canonical,
      title: brief.title,
      description: brief.summary,
      publishedTime: brief.publishedAt,
      modifiedTime: brief.updatedAt,
      authors: [brief.payload.methodology.reviewedBy],
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: brief.title }],
    },
    twitter: { card: "summary_large_image", title: brief.title, description: brief.summary },
  }
}

export default async function InvestorBriefPage({ params }: Props) {
  const { locale, slug } = await params
  if (locale !== "en") permanentRedirect(`/en/japan-opportunities/invest/${slug}`)

  const [brief, summaries] = await Promise.all([getCachedBrief(slug), listInvestorBriefs()])
  if (!brief) notFound()
  const relatedSlugs = new Set(brief.payload.relatedSlugs)
  const related = summaries.filter((item) => relatedSlugs.has(item.slug))
  const canonical = `https://paradigmjp.com${brief.pageUrl}`
  const articleSchema = {
    ...buildArticleSchema({
      title: brief.title,
      description: brief.summary,
      url: canonical,
      locale: "en",
      datePublished: brief.publishedAt,
      dateModified: brief.updatedAt,
      authorName: brief.payload.methodology.reviewedBy,
    }),
    articleSection: brief.preview.category,
    about: [brief.preview.assetClass, brief.preview.region, "Foreign investment in Japan"],
    isAccessibleForFree: true,
    citation: brief.payload.sources.map((source) => source.url),
  }

  return (
    <>
      <InvestorBriefDetail brief={brief} related={related} />
      <JsonLd data={articleSchema} />
      <JsonLd data={buildBreadcrumbSchema([
        { name: "Japan Opportunities", url: "https://paradigmjp.com/en/japan-opportunities" },
        { name: "Investor Briefs", url: "https://paradigmjp.com/en/japan-opportunities/invest" },
        { name: brief.title, url: canonical },
      ])} />
    </>
  )
}
