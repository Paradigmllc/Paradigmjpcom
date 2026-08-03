import type { Metadata } from "next"
import { cache } from "react"
import { notFound, permanentRedirect } from "next/navigation"
import { InvestorScenarioDetail } from "@/components/opportunities/InvestorScenarioDetail"
import JsonLd from "@/components/seo/JsonLd"
import { getInvestorScenarioByPath, investorScenarioReadableWordCount, listInvestorScenarios } from "@/lib/investor-scenarios/repository"
import { pageAlternates } from "@/lib/page-metadata"
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQSchema } from "@/lib/seo/schemas"

interface Props { params: Promise<{ locale: string; market: string; strategy: string; profile: string }> }

export const dynamic = "force-dynamic"

const getCachedScenario = cache(getInvestorScenarioByPath)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, market, strategy, profile } = await params
  const path = `/japan-opportunities/invest/markets/${market}/${strategy}/${profile}`
  if (locale !== "en") return { alternates: pageAlternates(locale, path, ["en"]), robots: { index: false, follow: true } }
  const scenario = await getCachedScenario(market, strategy, profile)
  if (!scenario) return {}
  const canonical = `https://paradigmjp.com${scenario.pageUrl}`
  return {
    title: scenario.title,
    description: scenario.summary,
    keywords: [scenario.preview.marketLabel, scenario.preview.strategyLabel, scenario.preview.investorProfileLabel, "Greater Tokyo real estate investment", "Japan property due diligence"],
    alternates: pageAlternates(locale, path, ["en"]),
    robots: { index: true, follow: true },
    authors: [{ name: scenario.payload.methodology.reviewedBy }],
    openGraph: { type: "article", locale: "en_US", url: canonical, title: scenario.title, description: scenario.summary, publishedTime: scenario.publishedAt, modifiedTime: scenario.updatedAt, authors: [scenario.payload.methodology.reviewedBy], images: [{ url: `${canonical}/opengraph-image`, width: 1200, height: 630, alt: scenario.title }] },
    twitter: { card: "summary_large_image", title: scenario.title, description: scenario.summary, images: [{ url: `${canonical}/opengraph-image`, alt: scenario.title }] },
  }
}

export default async function InvestorScenarioPage({ params }: Props) {
  const { locale, market, strategy, profile } = await params
  if (locale !== "en") permanentRedirect(`/en/japan-opportunities/invest/markets/${market}/${strategy}/${profile}`)
  const scenario = await getCachedScenario(market, strategy, profile)
  if (!scenario) notFound()
  const marketScenarios = await listInvestorScenarios({ marketSlug: market, limit: 100 })
  const related = marketScenarios.items.filter((item) => item.slug !== scenario.slug && (item.strategySlug === strategy || item.investorProfileSlug === profile)).slice(0, 6)
  const canonical = `https://paradigmjp.com${scenario.pageUrl}`
  const articleSchema = {
    ...buildArticleSchema({ title: scenario.title, description: scenario.summary, url: canonical, locale: "en", datePublished: scenario.publishedAt, dateModified: scenario.updatedAt, authorName: scenario.payload.methodology.reviewedBy }),
    articleSection: "Greater Tokyo real estate investment scenario",
    about: [scenario.preview.marketLabel, scenario.preview.strategyLabel, scenario.preview.investorProfileLabel],
    isAccessibleForFree: true,
    citation: scenario.payload.sources.map((source) => source.url),
    wordCount: investorScenarioReadableWordCount(scenario),
  }
  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${scenario.title} market evidence`,
    description: scenario.payload.marketEvidence.scope,
    identifier: `${canonical}#market-points`,
    url: canonical,
    creator: { "@type": "Organization", name: "Paradigm", url: "https://paradigmjp.com/en/about" },
    includedInDataCatalog: { "@type": "DataCatalog", name: "Paradigm Greater Tokyo Investment Scenarios", url: "https://paradigmjp.com/en/japan-opportunities/invest/markets" },
    datePublished: scenario.publishedAt,
    dateModified: scenario.updatedAt,
    temporalCoverage: scenario.payload.marketEvidence.asOf,
    spatialCoverage: scenario.payload.coveredMarkets.map((name) => ({ "@type": "Place", name })),
    variableMeasured: ["Average residential land price in JPY per square metre", "Annual average change in percent"],
    measurementTechnique: "Decision-oriented normalization of cited official Japanese land-price evidence; not an asset valuation.",
    isAccessibleForFree: true,
    distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `https://paradigmjp.com${scenario.endpoint}` }, { "@type": "DataDownload", encodingFormat: "text/markdown", contentUrl: `https://paradigmjp.com${scenario.endpoint}?format=markdown` }],
  }

  return <><InvestorScenarioDetail scenario={scenario} related={related} /><JsonLd data={articleSchema} /><JsonLd data={buildFAQSchema(scenario.payload.faqs)} /><JsonLd data={datasetSchema} /><JsonLd data={buildBreadcrumbSchema([{ name: "Investor Briefs", url: "https://paradigmjp.com/en/japan-opportunities/invest" }, { name: "Greater Tokyo Scenarios", url: "https://paradigmjp.com/en/japan-opportunities/invest/markets" }, { name: scenario.preview.marketLabel, url: `https://paradigmjp.com/en/japan-opportunities/invest/markets/${scenario.marketSlug}` }, { name: scenario.title, url: canonical }])} /></>
}
