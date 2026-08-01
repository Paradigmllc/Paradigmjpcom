import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { OpportunityBrief } from "@/components/opportunity/OpportunityBrief"
import { fetchOpportunityBrief } from "@/lib/sales/opportunity-brief"

export const dynamic = "force-dynamic"
export const revalidate = 60

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

const getCachedBrief = cache((slug: string, locale: string) => fetchOpportunityBrief(slug, locale))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  return {
    title: "Japan Entry Opportunity Brief | Paradigm",
    description: "Private Japan market opportunity and launch-readiness brief.",
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    alternates: { canonical: `/${locale}/opportunity/${encodeURIComponent(slug)}` },
  }
}

export default async function OpportunityPage({ params }: Props) {
  const { locale, slug } = await params
  let data = null
  try {
    data = await getCachedBrief(slug, locale)
  } catch (error) {
    console.error("[opportunity-page] brief fetch failed:", error)
  }
  if (!data) notFound()
  return <OpportunityBrief data={data} locale={locale} trackingSlug={slug} />
}
