/**
 * /[locale]/report/[slug] — 診断レポート LP (Sprint 13 リニューアル・営業の顔)
 *
 * 役割:   sales_companies の 1 行を 3-Act 構造の LP として表示.
 *         slug = sales_companies.slug (URL-safe 事業者名・例 izakaya-en / hairsalon-lufre).
 * 入力:   params.locale, params.slug (事業者名 slug)
 * 出力:   DiagnosticReport component (Hero + 3 Acts + Loss + Video + CTA)
 *
 * Sprint 13 設計変更:
 *   - 旧 URL `/[locale]/diagnostic/[uuid|domain]` から `/[locale]/report/[slug]` に変更
 *   - 「事業者名」を URL に含めることで顧客に「専用に作られた」印象を与える
 *   - 余計な prefix (diagnostic) を排除し報告メールにシンプル URL を載せる
 *
 * SEO:
 *   - **noindex 強制** (個別生成・1 顧客 1 URL の private 設計)
 *   - middleware.ts NOINDEX_PATTERN `/report/*` で X-Robots-Tag 付与
 *
 * AE-PHP-4 準拠 (役割/入力/出力 明示).
 */

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import DiagnosticReport from "@/components/diagnostic/DiagnosticReport"
import { fetchDiagnosticReport } from "@/lib/sales/diagnostic"
import { localeToRegion } from "@/lib/sales/types"

export const dynamic = "force-dynamic"
export const revalidate = 60 // ISR 60s

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "Paradigm Web診断レポート" : "Paradigm Web Diagnostic Report",
    description: isJa
      ? "御社サイトの個別診断レポートです。"
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
  // Sprint 16: locale → region 1 純関数で判定 (ja=jp / others=global)
  const region = localeToRegion(locale)
  const data = await fetchDiagnosticReport({ slug, region, reportLocale: locale })
  if (!data) notFound()

  return <DiagnosticReport data={data} trackingSlug={slug} locale={locale} />
}
