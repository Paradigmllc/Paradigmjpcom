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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const region = localeToRegion(locale)
  const lang = normalizeReportLang(locale)
  const copy: ReportCopy = (REPORT_COPY as Record<string, ReportCopy>)[lang] ?? REPORT_COPY.ja
  const data = await getCachedReport(slug, region, locale)
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
  const data = await getCachedReport(slug, region, locale)
  if (!data) notFound()

  // Null-safe wrapper — guarantees every field the DiagnosticReport client component accesses
  const safeData: DiagnosticReportData = {
    ...data,
    localized_report_urls: data.localized_report_urls ?? [],
    content_template: data.content_template ?? {
      title: "", purpose: "", quality_bar: "", dify_selection_rule: "", prompt_template: "", offer_code: "", appeal_angle: "",
    },
    acts: data.acts ?? [],
    source_coverage: data.source_coverage ?? { score: 0, detail: "", items: [] },
    total_loss: data.total_loss ?? "0",
    hook: data.hook ?? "",
    cta_text: data.cta_text ?? "",
    intelligence: data.intelligence ?? { signals: [], summary: "" },
    visual_annotations: data.visual_annotations ?? [],
  }

  return <DiagnosticReport data={safeData} trackingSlug={slug} locale={locale} />
}
