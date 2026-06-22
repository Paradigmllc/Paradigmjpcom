/**
 * Private diagnostic report page — fully null-safe against hydration crashes.
 */
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import DiagnosticReport from "@/components/diagnostic/DiagnosticReport"
import { getReportOfferCopy } from "@/components/diagnostic/report-offer-copy"
import { REPORT_COPY, normalizeReportLang, type ReportCopy } from "@/components/diagnostic/report-copy"
import { fetchDiagnosticReport } from "@/lib/sales/diagnostic"
import { localeToRegion } from "@/lib/sales/types"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic/types"

export const dynamic = "force-dynamic"
export const revalidate = 60

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

const getCachedReport = cache(
  async (slug: string, region: ReturnType<typeof localeToRegion>, locale: string) =>
    fetchDiagnosticReport({ slug, region, reportLocale: locale }),
)

// 🔒 Safe fallback: guarantees DiagnosticReportData shape even on partial fetch failure
function safeReportData(data: DiagnosticReportData | null): DiagnosticReportData | null {
  if (!data) return null
  return {
    ...data,
    localized_report_urls: data.localized_report_urls ?? [],
    content_template: data.content_template ?? { purpose: "", variant: "website_diagnostic", html_content: "" },
    acts: data.acts ?? [],
    evidence_ready: data.evidence_ready ?? 0,
    source_coverage: data.source_coverage ?? 0,
    monthly_loss_estimate: data.monthly_loss_estimate ?? 0,
    roi: data.roi ?? { payback_months: 0, recovered_12m: 0 },
    competitor_benchmark: data.competitor_benchmark ?? [],
    faq: data.faq ?? [],
    visual_evidence: data.visual_evidence ?? [],
    template_variant: data.template_variant ?? "website_diagnostic",
    report_url: data.report_url ?? "",
    video_url: data.video_url ?? null,
    meta: data.meta ?? {},
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const region = localeToRegion(locale)
  const lang = normalizeReportLang(locale)
  const copy: ReportCopy = (REPORT_COPY as Record<string, ReportCopy>)[lang] ?? REPORT_COPY.ja
  const raw = await getCachedReport(slug, region, locale)
  const data = safeReportData(raw)
  const offerCopy = data ? getReportOfferCopy(lang, data.template_variant) : null
  const reportLabel = offerCopy?.reportLabel ?? copy.privateReport
  return {
    title: `Paradigm ${reportLabel}`,
    description: data?.content_template?.purpose ?? offerCopy?.heroLead ?? copy.heroLead,
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    alternates: { canonical: `/${locale}/report/${slug}` },
  }
}

export default async function ReportPage({ params }: Props) {
  const { locale, slug } = await params
  const region = localeToRegion(locale)
  const raw = await getCachedReport(slug, region, locale)
  const data = safeReportData(raw)
  if (!data) notFound()
  return <DiagnosticReport data={data} trackingSlug={slug} locale={locale} />
}
