/**
 * Lead scoring algorithm — scores companies 0-100 based on observable signals.
 * Higher score = higher likelihood of needing our services.
 */

import type { SalesCompany } from "./types"

type JsonRecord = Record<string, unknown>

const SCORE_WEIGHTS = {
  pagespeedCritical: 25,   // Mobile speed < 50 → urgent rebuild need
  pagespeedWarning: 15,    // Mobile speed < 75 → improvement opportunity
  sslExpired: 20,          // SSL expired → immediate security risk
  sslLowGrade: 10,         // SSL grade B or lower
  noOGP: 8,                // Missing social preview → SEO gap
  noForm: 10,              // No discoverable contact form
  wordpress: 5,            // WordPress site → maintenance + security risk
  securityHeaders: 12,     // Missing 2+ security headers
  copyrightOld: 7,         // Copyright > 3 years old
  techStackPoor: 5,        // Unknown or outdated tech stack
  dataFresh: 10,           // Data enriched within last 7 days
  hasPlace: 3,             // Google Places listing found
  hasEmail: 3,             // Decision maker email found
}

export interface LeadScore {
  score: number
  maxScore: number
  breakdown: { label: string; score: number; reason: string }[]
  tier: "hot" | "warm" | "cold"
}

function asRecord(v: unknown): JsonRecord | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as JsonRecord) : null
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null
}

export function scoreLead(company: SalesCompany): LeadScore {
  const breakdown: { label: string; score: number; reason: string }[] = []
  const meta = asRecord(company.meta) ?? {}
  const scan = asRecord(meta.scan)
  const ssl = asRecord(meta.ssl)
  const dns = asRecord(meta.dns)
  const wayback = asRecord(meta.wayback_machine)
  const place = asRecord(meta.place)
  const salesOs = asRecord(meta.sales_os)

  let total = 0

  // Pagespeed
  if (company.pagespeed_mobile != null && company.pagespeed_mobile < 50) {
    total += SCORE_WEIGHTS.pagespeedCritical
    breakdown.push({ label: "ページ速度 深刻", score: SCORE_WEIGHTS.pagespeedCritical, reason: `Mobile ${company.pagespeed_mobile}/100 — 再構築の緊急性高い` })
  } else if (company.pagespeed_mobile != null && company.pagespeed_mobile < 75) {
    total += SCORE_WEIGHTS.pagespeedWarning
    breakdown.push({ label: "ページ速度 改善余地", score: SCORE_WEIGHTS.pagespeedWarning, reason: `Mobile ${company.pagespeed_mobile}/100 — 改善提案可能` })
  }

  // SSL
  if (ssl) {
    const grade = asString(ssl.grade)
    const expired = ssl.daysUntilExpiry != null && (ssl.daysUntilExpiry as number) <= 0
    if (expired) {
      total += SCORE_WEIGHTS.sslExpired
      breakdown.push({ label: "SSL期限切れ", score: SCORE_WEIGHTS.sslExpired, reason: "SSL証明書が期限切れ — 緊急対応必要" })
    } else if (grade && !grade.startsWith("A")) {
      total += SCORE_WEIGHTS.sslLowGrade
      breakdown.push({ label: "SSLグレード低", score: SCORE_WEIGHTS.sslLowGrade, reason: `SSLグレード ${grade} — 改善提案可能` })
    }
  }

  // OGP
  if (company.detected_issues?.includes("no_ogp")) {
    total += SCORE_WEIGHTS.noOGP
    breakdown.push({ label: "OGP未設定", score: SCORE_WEIGHTS.noOGP, reason: "SNSシェア時のプレビュー欠落 → SNS集客に機会損失" })
  }

  // Contact form
  const contactFormUrl = asString(meta.contact_form_url)
  if (!contactFormUrl) {
    total += SCORE_WEIGHTS.noForm
    breakdown.push({ label: "問合せフォーム未検出", score: SCORE_WEIGHTS.noForm, reason: "自動検出できる問合せフォームがない — サイト改善が必要" })
  }

  // WordPress
  if (scan?.is_wordpress === true) {
    total += SCORE_WEIGHTS.wordpress
    breakdown.push({ label: "WordPressサイト", score: SCORE_WEIGHTS.wordpress, reason: "保守・セキュリティリスクあり → 静的サイト移行提案可" })
  }

  // Security headers
  const headerCount = [
    scan?.hasHsts, scan?.hasCsp, scan?.hasXFrameOptions, scan?.hasNoSniff,
  ].filter(Boolean).length
  if (headerCount < 2) {
    total += SCORE_WEIGHTS.securityHeaders
    breakdown.push({ label: "セキュリティヘッダー不足", score: SCORE_WEIGHTS.securityHeaders, reason: `${headerCount}/4 のヘッダーのみ — セキュリティ強化提案可` })
  }

  // Old copyright
  const copyrightYear = scan?.copyrightYear as number | undefined
  if (copyrightYear && copyrightYear < new Date().getFullYear() - 3) {
    total += SCORE_WEIGHTS.copyrightOld
    breakdown.push({ label: "古いCopyright年", score: SCORE_WEIGHTS.copyrightOld, reason: `Copyright ${copyrightYear} — サイト更新が滞っている可能性` })
  }

  // Tech stack
  const tech = asRecord(meta.tech)
  const stackCount = Array.isArray(tech?.stack) ? (tech.stack as unknown[]).length : 0
  if (stackCount <= 2) {
    total += SCORE_WEIGHTS.techStackPoor
    breakdown.push({ label: "技術スタック簡素", score: SCORE_WEIGHTS.techStackPoor, reason: "検出技術2つ以下 — モダン化提案の余地あり" })
  }

  // Data freshness
  const lastEnriched = asString(salesOs?.last_enriched_at)
  if (lastEnriched) {
    const age = Date.now() - new Date(lastEnriched).getTime()
    if (age < 7 * 24 * 60 * 60_000) {
      total += SCORE_WEIGHTS.dataFresh
      breakdown.push({ label: "データ新鮮", score: SCORE_WEIGHTS.dataFresh, reason: "直近1週間以内にエンリッチ済み" })
    }
  }

  // Google Places
  if (place?.name) {
    total += SCORE_WEIGHTS.hasPlace
    breakdown.push({ label: "店舗情報あり", score: SCORE_WEIGHTS.hasPlace, reason: "MEO診断・店舗ページ提案の余地あり" })
  }

  // Decision maker email
  const hunter = asRecord(meta.hunter)
  if (hunter && (hunter.count as number) > 0) {
    total += SCORE_WEIGHTS.hasEmail
    breakdown.push({ label: "担当者メール検出", score: SCORE_WEIGHTS.hasEmail, reason: "意思決定者への直接アプローチ可能" })
  }

  // Tier classification
  const maxScore = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0)
  const tier = total >= 60 ? "hot" : total >= 30 ? "warm" : "cold"

  return { score: Math.min(total, maxScore), maxScore, breakdown, tier }
}

/**
 * Compute industry benchmark: average scores for companies in the same industry.
 */
export function computeIndustryBenchmark(
  companies: SalesCompany[],
  targetIndustry: string,
): { avgPagespeedMobile: number | null; avgSslGood: number; count: number } {
  const peers = companies.filter((c) => c.industry === targetIndustry)
  if (peers.length === 0) return { avgPagespeedMobile: null, avgSslGood: 0, count: 0 }

  const speeds = peers.filter((c) => c.pagespeed_mobile != null).map((c) => c.pagespeed_mobile!)
  const avgSpeed = speeds.length > 0 ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : null

  const sslGood = peers.filter((c) => {
    const ssl = asRecord((c.meta as JsonRecord)?.ssl)
    const grade = asString(ssl?.grade)
    return grade?.startsWith("A")
  }).length

  return { avgPagespeedMobile: avgSpeed, avgSslGood: sslGood, count: peers.length }
}
