/**
 * Private diagnostic report page — fully null-safe against hydration crashes.
 */
import type { Metadata } from "next"
import { cache } from "react"
import DiagnosticReport from "@/components/diagnostic/DiagnosticReport"
import { getReportOfferCopy } from "@/components/diagnostic/report-offer-copy"
import { REPORT_COPY, normalizeReportLang, type ReportCopy } from "@/components/diagnostic/report-copy"
import { fetchDiagnosticReport } from "@/lib/sales/diagnostic"
import { ensureSafeDiagnosticReport } from "@/lib/sales/diagnostic/safe-report"
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
  const copy: ReportCopy = (REPORT_COPY as Record<string, ReportCopy>)[lang] ?? REPORT_COPY.ja
  let data = null
  try {
    data = await getCachedReport(slug, region, locale)
  } catch (error) {
    console.error("[report-page] metadata report fetch failed:", error)
  }
  const safeData = ensureSafeDiagnosticReport(data, slug, locale)
  const offerCopy = getReportOfferCopy(lang, safeData.template_variant)
  const reportLabel = offerCopy?.reportLabel ?? copy.privateReport
  return {
    title: `Paradigm ${reportLabel}`,
    description: safeData.content_template?.purpose ?? offerCopy?.heroLead ?? copy.heroLead,
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    alternates: { canonical: `/${locale}/report/${slug}` },
  }
}

export default async function ReportPage({ params }: Props) {
  const { locale, slug } = await params
  const region = localeToRegion(locale)
  let data = null
  try {
    data = await getCachedReport(slug, region, locale)
  } catch (error) {
    console.error("[report-page] report fetch failed:", error)
  }
  const safeData = ensureSafeDiagnosticReport(data, slug, locale)

  return <DiagnosticReport data={safeData} trackingSlug={slug} locale={locale} />
}
