import type { DiagnosticReportData } from "@/lib/sales/diagnostic"

export type EvidenceStatus = "pass" | "fail" | "unknown"
export type FirstImpressionSignalKind = "performance" | "ssl" | "social"
export type FirstImpressionSignalStatus = "pass" | "issue" | "unknown"

export interface EvidenceCheck {
  labelJa: string
  labelEn: string
  status: EvidenceStatus
  detailJa: string
  detailEn: string
}

export interface JapanMarketMetric {
  icon: string
  label: string
  value: string
  source: string
  tone: string
}

export interface FirstImpressionSignal {
  kind: FirstImpressionSignalKind
  label: string
  status: FirstImpressionSignalStatus
  detail: string
}

export interface PageSpeedComparison {
  measuredScore: number
  targetScore: number
  source: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function explicitBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

function statusFromMissingFlag(value: unknown): EvidenceStatus {
  const missing = explicitBoolean(value)
  if (missing === null) return "unknown"
  return missing ? "fail" : "pass"
}

function localizedUnknown(lang: string): string {
  return lang === "ja" ? "未測定" : "Not measured"
}

function formatUsdRange(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null
  if (min !== null && max !== null && min !== max) {
    return `$${min.toLocaleString("en-US")}–$${max.toLocaleString("en-US")}`
  }
  return `$${(min ?? max ?? 0).toLocaleString("en-US")}`
}

export function parseExplicitPositiveAmount(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const text = String(value).trim()
  if (!text) return null
  const match = text.match(/(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/)
  if (!match) return null
  const amount = Number(match[0].replaceAll(",", ""))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function buildPageSpeedComparison(
  data: DiagnosticReportData,
): PageSpeedComparison | null {
  const scan = asRecord(data.meta?.scan)
  const benchmarks = asRecord(data.meta?.report_benchmarks) ?? asRecord(data.meta?.benchmarks)
  const benchmark = asRecord(benchmarks?.pagespeed_mobile ?? benchmarks?.pageSpeedMobile)
  const measuredScore = finiteNumber(
    scan?.mobile_score ?? scan?.mobileScore ?? asRecord(scan?.mobile)?.performance,
  )
  const targetScore = finiteNumber(benchmark?.value ?? benchmark?.target)
  const source = typeof benchmark?.source === "string" ? benchmark.source.trim() : ""
  if (
    measuredScore === null ||
    targetScore === null ||
    measuredScore < 0 ||
    measuredScore > 100 ||
    targetScore < 0 ||
    targetScore > 100 ||
    !source
  ) {
    return null
  }
  return { measuredScore, targetScore, source }
}

export function buildSecurityChecks(data: DiagnosticReportData): EvidenceCheck[] {
  const meta = data.meta ?? {}
  const ssl = asRecord(meta.ssl)
  const observatory = asRecord(meta.mozilla_observatory)
  const dns = asRecord(meta.dns)
  const hsts = asRecord(meta.hsts_preload)
  const headers = asRecord(meta.security_headers)

  const sslGrade = typeof ssl?.grade === "string" && ssl.grade.trim()
    ? ssl.grade.trim()
    : null
  const hstsPreloaded = explicitBoolean(hsts?.preloaded)
  const dnssec = explicitBoolean(dns?.dnssec ?? dns?.hasDnssec)
  const observatoryScore = finiteNumber(observatory?.score)
  const hasCsp = explicitBoolean(headers?.hasCsp ?? headers?.has_csp)

  return [
    {
      labelJa: "SSL証明書",
      labelEn: "SSL Certificate",
      status: sslGrade === null ? "unknown" : /^A(?:[+-])?$/i.test(sslGrade) ? "pass" : "fail",
      detailJa: sslGrade === null ? "未測定" : `グレード ${sslGrade}`,
      detailEn: sslGrade === null ? "Not measured" : `Grade ${sslGrade}`,
    },
    {
      labelJa: "HSTS Preload",
      labelEn: "HSTS Preload",
      status: hstsPreloaded === null ? "unknown" : hstsPreloaded ? "pass" : "fail",
      detailJa: hstsPreloaded === null ? "未測定" : hstsPreloaded ? "登録を確認" : "未登録を確認",
      detailEn: hstsPreloaded === null ? "Not measured" : hstsPreloaded ? "Preload observed" : "Not preloaded",
    },
    {
      labelJa: "DNSSEC",
      labelEn: "DNSSEC",
      status: dnssec === null ? "unknown" : dnssec ? "pass" : "fail",
      detailJa: dnssec === null ? "未測定" : dnssec ? "有効を確認" : "無効を確認",
      detailEn: dnssec === null ? "Not measured" : dnssec ? "Enabled" : "Disabled",
    },
    {
      labelJa: "Observatory Score",
      labelEn: "Observatory Score",
      status: observatoryScore === null ? "unknown" : observatoryScore >= 80 ? "pass" : "fail",
      detailJa: observatoryScore === null ? "未測定" : `${observatoryScore}/100`,
      detailEn: observatoryScore === null ? "Not measured" : `${observatoryScore}/100`,
    },
    {
      labelJa: "CSP Header",
      labelEn: "CSP Header",
      status: hasCsp === null ? "unknown" : hasCsp ? "pass" : "fail",
      detailJa: hasCsp === null ? "未測定" : hasCsp ? "検出" : "未検出",
      detailEn: hasCsp === null ? "Not measured" : hasCsp ? "Observed" : "Not observed",
    },
  ]
}

export function buildJapanMarketMetrics(data: DiagnosticReportData, lang: string): JapanMarketMetric[] {
  const meta = data.meta ?? {}
  const similarweb = asRecord(meta.similarweb_free) ?? asRecord(meta.similarweb)
  const radar = asRecord(meta.cloudflare_radar)
  const smb = asRecord(meta.smb_signals)
  const readiness = asRecord(meta.japan_readiness_insight)
  const unknown = localizedUnknown(lang)

  const monthlyVisits = finiteNumber(similarweb?.estimatedMonthlyVisits ?? similarweb?.visits)
  const topCountries = Array.isArray(similarweb?.topCountries)
    ? similarweb.topCountries.filter((value): value is string => typeof value === "string")
    : Array.isArray(similarweb?.countries)
      ? similarweb.countries.filter((value): value is string => typeof value === "string")
      : []
  const japanVisits = finiteNumber(
    readiness?.japan_visits_estimate ?? readiness?.japanVisitsEstimate,
  )
  const radarRank = finiteNumber(radar?.rank)
  const radarBucket = typeof radar?.rank_bucket === "string" && radar.rank_bucket.trim()
    ? radar.rank_bucket.trim()
    : null
  const businessMaturity = typeof smb?.businessMaturity === "string"
    ? smb.businessMaturity
    : null
  const maturityLabel = businessMaturity === "established"
    ? (lang === "ja" ? "成熟企業" : "Established")
    : businessMaturity === "growing"
      ? (lang === "ja" ? "成長企業" : "Growing")
      : businessMaturity === "early"
        ? (lang === "ja" ? "初期段階" : "Early stage")
        : unknown
  const lossMin = finiteNumber(readiness?.loss_amount_usd_min)
  const lossMax = finiteNumber(readiness?.loss_amount_usd_max)
  const modeledLoss = formatUsdRange(lossMin, lossMax)
  const confidence = finiteNumber(readiness?.confidence)
  const globalValue = monthlyVisits !== null
    ? `${monthlyVisits.toLocaleString()} ${lang === "ja" ? "訪問/月" : "visits/mo"}`
    : radarBucket ?? (radarRank !== null ? `#${radarRank.toLocaleString()}` : unknown)
  const globalSource = monthlyVisits !== null
    ? "Similarweb"
    : radarBucket || radarRank !== null
      ? "Cloudflare Radar"
      : (lang === "ja" ? "出典データなし" : "No source data")
  const japanTrafficValue = japanVisits !== null
    ? `${japanVisits.toLocaleString()} ${lang === "ja" ? "訪問/月" : "visits/mo"}`
    : topCountries.includes("JP")
      ? (lang === "ja" ? "上位市場に日本を検出" : "Japan appears in top markets")
      : unknown

  return [
    {
      icon: "🌏",
      label: lang === "ja" ? "グローバル流入" : "Global traffic",
      value: globalValue,
      source: globalSource,
      tone: globalValue === unknown ? "zinc" : "blue",
    },
    {
      icon: "🇯🇵",
      label: lang === "ja" ? "日本流入" : "Japan traffic",
      value: japanTrafficValue,
      source: japanVisits !== null
        ? (lang === "ja" ? "Japan readiness 推計値" : "Japan readiness estimate")
        : topCountries.includes("JP")
          ? "Similarweb"
          : (lang === "ja" ? "出典データなし" : "No source data"),
      tone: japanTrafficValue === unknown ? "zinc" : "blue",
    },
    {
      icon: "📊",
      label: lang === "ja" ? "事業成熟度" : "Maturity",
      value: maturityLabel,
      source: businessMaturity && businessMaturity !== "unknown"
        ? (typeof smb?.emailProvider === "string" ? smb.emailProvider : "SMB signals")
        : (lang === "ja" ? "出典データなし" : "No source data"),
      tone: maturityLabel === unknown ? "zinc" : "blue",
    },
    {
      icon: "💰",
      label: lang === "ja" ? "推定機会損失レンジ" : "Modeled revenue gap",
      value: modeledLoss ?? unknown,
      source: modeledLoss
        ? `Japan readiness model${confidence === null ? "" : ` · ${confidence}/100 confidence`}`
        : (lang === "ja" ? "出典データなし" : "No source data"),
      tone: modeledLoss ? "rose" : "zinc",
    },
  ]
}

export function buildJapanRequirementChecks(data: DiagnosticReportData): EvidenceCheck[] {
  const audit = asRecord(data.meta?.japan_market_audit)
  const status = asRecord(audit?.status) ?? audit
  const check = (
    labelJa: string,
    labelEn: string,
    missingKey: string,
  ): EvidenceCheck => {
    const evidenceStatus = statusFromMissingFlag(status?.[missingKey])
    return {
      labelJa,
      labelEn,
      status: evidenceStatus,
      detailJa: evidenceStatus === "pass"
        ? "公開ページで関連シグナルを確認"
        : evidenceStatus === "fail"
          ? "公開ページで不足を検出"
          : "未測定",
      detailEn: evidenceStatus === "pass"
        ? "Related public-page signal observed"
        : evidenceStatus === "fail"
          ? "Public-page gap detected"
          : "Not measured",
    }
  }

  return [
    check("特定商取引法に基づく表記", "Commercial Law Disclosure", "tokushoho_missing"),
    check("個人情報保護法(APPI)対応", "Privacy Law (APPI)", "appi_missing"),
    check("国内決済手段の導入", "Local Payment Methods", "local_payments_missing"),
    check("日本語コンテンツ・サポート", "Japanese Content & Support", "japanese_content_missing"),
  ]
}

export function buildFirstImpressionSignals(
  data: DiagnosticReportData,
  lang: string,
): FirstImpressionSignal[] {
  const scan = asRecord(data.meta?.scan)
  const scanHtml = asRecord(scan?.html)
  const ssl = asRecord(data.meta?.ssl)
  const mobileScore = finiteNumber(
    scan?.mobile_score ?? scan?.mobileScore ?? asRecord(scan?.mobile)?.performance,
  )
  const sslGrade = typeof ssl?.grade === "string" && ssl.grade.trim()
    ? ssl.grade.trim()
    : null
  const hasOgp = explicitBoolean(
    scan?.hasOgp ?? scan?.has_ogp ?? scanHtml?.hasOgp ?? scanHtml?.has_ogp,
  )
  const unknown = localizedUnknown(lang)

  return [
    {
      kind: "performance",
      label: lang === "ja" ? "モバイル表示速度" : "Mobile performance",
      status: mobileScore === null ? "unknown" : mobileScore >= 70 ? "pass" : "issue",
      detail: mobileScore === null
        ? unknown
        : (lang === "ja" ? `PageSpeed 実測 ${mobileScore}/100` : `Measured PageSpeed ${mobileScore}/100`),
    },
    {
      kind: "ssl",
      label: lang === "ja" ? "SSL証明書" : "SSL certificate",
      status: sslGrade === null ? "unknown" : /^A(?:[+-])?$/i.test(sslGrade) ? "pass" : "issue",
      detail: sslGrade === null
        ? unknown
        : (lang === "ja" ? `SSL Labs 実測グレード ${sslGrade}` : `Measured SSL grade ${sslGrade}`),
    },
    {
      kind: "social",
      label: lang === "ja" ? "SNSプレビュー" : "Social preview",
      status: hasOgp === null ? "unknown" : hasOgp ? "pass" : "issue",
      detail: hasOgp === null
        ? unknown
        : hasOgp
          ? (lang === "ja" ? "OGPメタデータを検出" : "OGP metadata observed")
          : (lang === "ja" ? "OGPメタデータを未検出" : "OGP metadata not observed"),
    },
  ]
}
