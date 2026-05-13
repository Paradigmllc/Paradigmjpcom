/**
 * /[locale]/diagnostic/[slug] — 診断レポート LP (Sprint 9-D)
 *
 * 役割:   sales_companies の 1 行を 3-Act 構造の LP として表示。
 *         slug = sales_companies.id (uuid) or domain.
 * 入力:   params.locale, params.slug
 * 出力:   DiagnosticReport component (Hero + 3 Acts + Loss + Video + CTA)
 *
 * SEO:
 *   - **noindex 強制** (個別生成・1 顧客 1 URL の private 設計)
 *   - X-Robots-Tag header は middleware.ts には付けない (現在 /diagnostic/* は NOINDEX_PATTERN 対象外)
 *     → 本 page の generateMetadata で robots: noindex を返す
 *
 * AE-PHP-4 準拠 (役割/入力/出力 明示).
 * 旧 _archive_report は **unarchive 計画なし** ─ これが新診断レポートの後継.
 */

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import DiagnosticReport from "@/components/diagnostic/DiagnosticReport"
import { fetchDiagnosticReport } from "@/lib/sales/diagnostic"

export const dynamic = "force-dynamic"
export const revalidate = 60 // ISR 60s — Notion 逆流があっても 1 分で反映

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  // 個別生成 LP は SEO 完全禁止 (s10-5 永久ルール準拠)
  return {
    title: "Paradigm Web診断レポート",
    description: "御社サイトの個別診断レポートです。",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false },
    },
    alternates: { canonical: `/diagnostic/${slug}` },
  }
}

// slug が UUID 形式かどうか判定 (false なら domain として lookup)
function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export default async function DiagnosticReportPage({ params }: Props) {
  const { slug } = await params
  const data = isUuid(slug)
    ? await fetchDiagnosticReport({ companyId: slug })
    : await fetchDiagnosticReport({ domain: slug })

  if (!data) notFound()

  return <DiagnosticReport data={data} />
}
