/**
 * Private diagnostic video preview.
 *
 * This page is the shareable HTML video fallback when a HyperFrames/Remotion
 * MP4 renderer is not configured yet.
 */

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import VideoPlayer from "@/components/diagnostic/VideoPlayer"
import { fetchDiagnosticReport } from "@/lib/sales/diagnostic"
import { fallbackScript, generateNarrationScript } from "@/lib/sales/video-generator"
import { localeToRegion } from "@/lib/sales/types"
import { buildDemoData } from "@/lib/sales/demo-data"

export const dynamic = "force-dynamic"
export const revalidate = 300

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "Paradigm Web診断動画" : "Paradigm Web Diagnostic Video",
    description: isJa
      ? "診断結果を60秒で確認できる動画プレビューです。"
      : "A 60-second diagnostic video preview from Paradigm.",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false },
    },
    alternates: { canonical: `/report/${slug}/video` },
  }
}

export default async function ReportVideoPage({ params }: Props) {
  const { locale, slug } = await params
  const region = localeToRegion(locale)

  // Demo slugs: use client-side demo data without DB lookup
  if (slug.startsWith("demo-")) {
    const variant = slug.replace("demo-", "")
    const data = buildDemoData(variant, locale)
    const script = fallbackScript(data)
    return <VideoPlayer data={data} script={script} trackingSlug={slug} />
  }

  const data = await fetchDiagnosticReport({ slug, region, reportLocale: locale })
  if (!data) notFound()

  const narration = await generateNarrationScript(data)
  if (narration.error) console.warn("[report-video] narration fallback/detail:", narration.error)
  const script = narration.script
  if (!script) notFound()

  return <VideoPlayer data={data} script={script} trackingSlug={slug} />
}
