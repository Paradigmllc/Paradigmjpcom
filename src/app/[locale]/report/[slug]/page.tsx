/**
 * Private diagnostic report page — fully null-safe against hydration crashes.
 */
import type { Metadata } from "next"
import { cache } from "react"
import DiagnosticReport from "@/components/diagnostic/DiagnosticReport"
import { ArtifactInlineEditor } from "@/components/admin/ArtifactInlineEditor"
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth"
import { getReportOfferCopy } from "@/components/diagnostic/report-offer-copy"
import { REPORT_COPY, normalizeReportLang, type ReportCopy } from "@/components/diagnostic/report-copy"
import { fetchDiagnosticReport } from "@/lib/sales/diagnostic"
import { ensureSafeDiagnosticReport } from "@/lib/sales/diagnostic/safe-report"
import { localeToRegion } from "@/lib/sales/types"
import { getApprovedReportBlogLinks } from "@/components/diagnostic/report-blog-links"

export const dynamic = "force-dynamic"
export const revalidate = 60

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function generatedMessageReview(meta: Record<string, unknown> | undefined) {
  const message = typeof meta?.japan_entry_initial_message === "string" ? meta.japan_entry_initial_message : null
  const review = asRecord(meta?.japan_entry_message_review)
  if (!message) return null
  return {
    message,
    model: typeof review?.model === "string" ? review.model : "unknown",
    qualityScore: typeof review?.qualityScore === "number" ? review.qualityScore : null,
    wordCount: typeof review?.wordCount === "number" ? review.wordCount : null,
    attempts: typeof review?.attempts === "number" ? review.attempts : null,
  }
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
  const [isAdmin, approvedBlogLinks] = await Promise.all([
    isCurrentRequestAdmin(),
    getApprovedReportBlogLinks(locale),
  ])

  return (
    <>
      <DiagnosticReport
        data={safeData}
        trackingSlug={slug}
        locale={locale}
        approvedBlogLinks={approvedBlogLinks}
      />
      {isAdmin && (
        <ArtifactInlineEditor
          kind="report"
          slug={slug}
          locale={locale}
          title={safeData.company_name}
          salesOsHref="https://twenty.paradigmjp.com"
          generatedMessageReview={generatedMessageReview(safeData.meta)}
          initialFields={{
            hook: safeData.hook,
            pain: safeData.acts[0]?.body ?? "",
            fear: safeData.acts[1]?.body ?? "",
            loss: safeData.acts[2]?.body ?? "",
            cta: safeData.cta_text,
          }}
        />
      )}
    </>
  )
}
