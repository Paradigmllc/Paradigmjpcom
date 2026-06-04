/**
 * Private diagnostic report page.
 *
 * The URL is intentionally noindex. It renders a company-specific report from
 * Supabase SSOT data and links to the generated demo/video assets.
 */

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import DiagnosticReport from "@/components/diagnostic/DiagnosticReport"
import { fetchDiagnosticReport } from "@/lib/sales/diagnostic"
import { localeToRegion } from "@/lib/sales/types"

export const dynamic = "force-dynamic"
export const revalidate = 60

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "Paradigm Web診断レポート" : "Paradigm Web Diagnostic Report",
    description: isJa
      ? "貴社サイトの個別診断レポートです。"
      : "Your individual website diagnostic report from Paradigm.",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false },
    },
    alternates: { canonical: `/report/${slug}` },
  }
}

export default async function ReportPage({ params }: Props) {
  const { locale, slug } = await params
  const region = localeToRegion(locale)
  const data = await fetchDiagnosticReport({ slug, region, reportLocale: locale })
  if (!data) notFound()

  return <DiagnosticReport data={data} trackingSlug={slug} locale={locale} />
}
