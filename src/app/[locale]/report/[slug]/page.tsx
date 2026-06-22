/**
 * Private diagnostic report page — React.cache() deduplicates the fetch
 * between generateMetadata and the page component.
 */

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import DiagnosticReport from "@/components/diagnostic/DiagnosticReport"
import { getReportOfferCopy } from "@/components/diagnostic/report-offer-copy"
import { REPORT_COPY, normalizeReportLang } from "@/components/diagnostic/report-copy"
import { fetchDiagnosticReport } from "@/lib/sales/diagnostic"
import { localeToRegion } from "@/lib/sales/types"

export const dynamic = "force-dynamic"
export const revalidate = 60

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

const getCachedReport = cache(
  async (slug: string, region: ReturnType<typeof localeToRegion>, locale: string) =>
    fetchDiagnosticReport({ slug, region, reportLocale: locale }),
)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const region = localeToRegion(locale)
  const lang = normalizeReportLang(locale)
  const copy = REPORT_COPY[lang]
  const data = await getCachedReport(slug, region, locale)
  const offerCopy = data ? getReportOfferCopy(lang, data.template_variant) : null
  const reportLabel = offerCopy?.reportLabel ?? copy.privateReport
  return {
    title: `Paradigm ${reportLabel}`,
    description: data?.content_template.purpose ?? offerCopy?.heroLead ?? copy.heroLead,
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    alternates: { canonical: `/${locale}/report/${slug}` },
  }
}

export default async function ReportPage({ params }: Props) {
  const { locale, slug } = await params
  const region = localeToRegion(locale)
  const data = await getCachedReport(slug, region, locale)
  if (!data) notFound()
  // Safety: ensure localizedReportUrls is never undefined (prevents hydration crash)
  const safeData = { ...data, localized_report_urls: data.localized_report_urls ?? [] }
  return <DiagnosticReport data={safeData} trackingSlug={slug} locale={locale} />
}
