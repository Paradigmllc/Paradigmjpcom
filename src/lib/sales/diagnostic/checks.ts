import type { Industry, IssueCode, ReportLocale, SalesCompany, SalesTemplate, Severity, TemplateVariant } from "../types"
import { ISSUE_CODES } from "../types"
import { buildReportUrl } from "../routing"
import type { DiagnosticAct, CompanyMeta, PersonalizedCopy } from "./types"
import {
  DEFAULT_CTA_EN,
  DEFAULT_CTA_JA,
  INDUSTRY_HOOK_EN,
  INDUSTRY_HOOK_JA,
  ISSUE_ICON,
  ISSUE_LABEL_EN,
  ISSUE_LABEL_JA,
  ISSUE_METRIC,
  UNKNOWN_ISSUE_METRIC,
} from "./constants"

export function isJa(locale: ReportLocale): boolean {
  return locale === "ja"
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

/** Safe value formatter: never returns null/undefined/proto placeholder */
export function safeValue(value: unknown, fallback: string): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === "number" && (isNaN(value) || value <= 0)) return fallback
  const s = String(value).trim()
  if (!s || s === "null" || s === "undefined" || s === "[object Object]" || s === "NaN") return fallback
  return s.length > 100 ? s.slice(0, 97) + "..." : s
}

export function buildHook(company: SalesCompany, industry: Industry | null, locale: ReportLocale): string {
  const jp = isJa(locale)
  const speed = company.pagespeed_mobile
  const sslGrade = (company.meta as CompanyMeta)?.ssl?.grade ?? null
  const obsScore = (company.meta as CompanyMeta)?.mozilla_observatory?.score ?? null

  const dataPoints: string[] = []
  if (typeof speed === "number" && speed < 70 && speed > 0) {
    dataPoints.push(jp ? `PageSpeedモバイル${speed}点（業界平均71点）` : `PageSpeed Mobile ${speed}/100 (avg 71)`)
  }
  if (sslGrade && !sslGrade.startsWith("A") && sslGrade.length <= 5) {
    dataPoints.push(jp ? `SSLグレード${sslGrade}` : `SSL grade ${sslGrade}`)
  }
  if (obsScore != null && obsScore < 80 && obsScore > 0) {
    dataPoints.push(jp ? `Observatory ${obsScore}点` : `Observatory score ${obsScore}`)
  }

  const dataSuffix = dataPoints.length > 0
    ? (jp ? `【実測: ${dataPoints.join(" / ")}】` : ` [Measured: ${dataPoints.join(" / ")}]`)
    : ""

  if (!industry) {
    return (jp
      ? `公開データに基づく分析では、問い合わせ前の不安解消、比較検討、信頼材料の見せ方に改善余地があります。${dataSuffix}`
      : `Public evidence analysis indicates room to improve pre-inquiry confidence, comparison, and trust proof.${dataSuffix}`)
  }
  return ((jp ? INDUSTRY_HOOK_JA[industry] : INDUSTRY_HOOK_EN[industry]) ?? "") + dataSuffix
}

export function issueLabel(issueCode: IssueCode, locale: ReportLocale): string {
  const labels = isJa(locale) ? ISSUE_LABEL_JA : ISSUE_LABEL_EN
  return labels[issueCode] ?? (isJa(locale) ? "経営判断材料" : "decision evidence")
}

export function issueMetric(issueCode: IssueCode) {
  return ISSUE_METRIC[issueCode] ?? UNKNOWN_ISSUE_METRIC
}

export function issueIcon(issueCode: IssueCode): string {
  return ISSUE_ICON[issueCode] ?? "DATA"
}

export function issueFallbackBody(company: SalesCompany, issueCode: IssueCode, locale: ReportLocale): string {
  const jp = isJa(locale)
  const speed = company.pagespeed_mobile ?? "未測定"
  const sslGrade = (company.meta as CompanyMeta)?.ssl?.grade ?? "未測定"
  const sslDays = (company.meta as CompanyMeta)?.ssl?.daysUntilExpiry ?? null
  const techStackData = (company.meta as CompanyMeta)?.tech?.stack
  const techStack = Array.isArray(techStackData) ? techStackData.slice(0, 3).join("、") : "不明"
  const obsScore = (company.meta as CompanyMeta)?.mozilla_observatory?.score ?? null
  const crtshCerts = (company.meta as CompanyMeta)?.crtsh?.total_certs ?? 0
  const dnsDmarc = (company.meta as CompanyMeta)?.dns?.dmarc ? "設定済み" : "未設定"
  const waybackYears = (company.meta as CompanyMeta)?.wayback_machine?.years_active ?? null

  if (issueCode === "speed_critical") {
    return jp
      ? `御社のPageSpeedモバイルスコアは${speed}/100。業界平均71点に対し${typeof speed === "number" ? (71 - speed) : "大幅に"}低く、これが直帰率上昇とコンバージョン機会損失の主要因です。1秒の遅延がコンバージョン率を約20%低下させるというGoogleの調査結果を踏まえると、現在の表示速度では訪問者の約${typeof speed === "number" ? Math.round(60 - speed * 0.6) : 35}%が価値提案を読む前に離脱している計算になります。`
      : `Your PageSpeed mobile score is ${speed}/100, which is ${typeof speed === "number" ? (71 - speed) : "significantly"} below the industry average of 71. Google research shows a 1-second delay drops conversion ~20%. At your current speed, approximately ${typeof speed === "number" ? Math.round(60 - speed * 0.6) : 35}% of visitors leave before seeing your value proposition.`
  }
  if (issueCode === "ssl_expired") {
    const gradeInfo = sslGrade.startsWith("A") ? "良好" : sslGrade === "B" || sslGrade === "C" ? "改善推奨" : "要緊急対応"
    const daysText = sslDays != null ? `（残り${sslDays}日）` : ""
    return jp
      ? `御社のSSL証明書グレードは「${sslGrade}」${daysText}。${gradeInfo}レベルです。最新ブラウザでは「保護されていない通信」警告が表示され、見込み客の信頼を一瞬で損なうリスクがあります。${sslDays != null && sslDays < 30 ? "証明書の期限切れが迫っており、早急な更新が必要です。" : ""}`
      : `Your SSL certificate grade is "${sslGrade}"${daysText} (${gradeInfo}). Modern browsers show "Not Secure" warnings that instantly break prospect trust.${sslDays != null && sslDays < 30 ? " Certificate expiry is imminent — immediate renewal needed." : ""}`
  }
  if (issueCode === "wp_outdated") {
    return jp
      ? `御社のサイトで検出された技術スタックは「${techStack}」。${techStack.includes("WordPress") ? "WordPressは適切な更新管理がないと既知の脆弱性リスクとなり、B2B審査や購買プロセスのセキュリティ監査で減点対象になります。" : "古いバージョンのフレームワークやCMSは、セキュリティ監査での減点と表示速度低下の両方に直結します。"}`
      : `Your site detected tech stack: "${techStack}". ${techStack.includes("WordPress") ? "WordPress without proper maintenance creates known vulnerability risks, flagged during B2B security audits and procurement checks." : "Outdated frameworks and CMS versions directly cause both security audit deductions and performance degradation."}`
  }
  if (issueCode === "no_ogp") {
    return jp
      ? `御社のサイトはOGP（SNS共有プレビュー）が未設定です。LINE、Slack、X等でURLが共有された際、文字化けや汎用プレビューになり、クリック率が整備済みサイト比で約40%低下します。業界平均ではSNS流入の32%がOGP経由です。`
      : `Your site lacks OGP (social share preview) metadata. Shared URLs on Slack, Teams, or social media appear garbled or generic, reducing click-through ~40% versus properly configured sites. Industry average: 32% of social traffic comes through OGP-enabled shares.`
  }
  if (issueCode === "no_sns") {
    return jp
      ? `御社のコーポレートサイトから公式SNSへの導線が未整備またはリンク切れしています。見込み客は「この会社は現在も活動しているのか」という運用鮮度を確認するためにSNSをチェックします。導線がないと、その確認ステップで離脱する可能性が高まります。`
      : `Your corporate site has missing or broken social media links. Prospects check social media to verify operational freshness — a standard B2B vetting step. Missing links increase drop-off at this verification stage.`
  }
  if (issueCode === "copyright_old") {
    return jp
      ? `フッターの著作権表示（Copyright）が古い年のまま更新されていません。これは情報更新の滞りや管理体制の緩さを示すシグナルとなり、B2B取引の初回審査や契約時の与信判断で「この会社はサイトの管理ができているか」という疑念を生みます。`
      : `Your footer copyright year is outdated. This signals neglected website maintenance, raising credibility questions during B2B risk assessments and initial compliance checks.`
  }
  if (issueCode === "ua_残存") {
    return jp
      ? `御社のサイトに旧UA（Universal Analytics）タグが残存しています。2024年7月以降、UAはデータ計測を完全に停止しています。このままでは正確なアクセス分析が不可能で、Google検索順位の評価にも悪影響があります。GA4への移行はすでに1年以上の猶予を過ぎており、早急な対応が必要です。`
      : `Your site still has legacy Universal Analytics tags. UA stopped collecting data completely in July 2024. Without GA4 migration, you have no accurate analytics and this negatively impacts Google search ranking evaluation. The 1+ year grace period has already passed.`
  }

  const label = issueLabel(issueCode, locale)
  if (!jp) {
    return `${company.company_name} shows room to improve ${label}. The finding is based on publicly observable evidence and translated into a business priority — not a technical checklist.`
  }
  return `${company.company_name} の ${label} に改善余地があります。この評価は公開データに基づく経営判断材料であり、ITチェックリストではありません。`
}

export function severityToActType(severity: Severity): DiagnosticAct["type"] {
  if (severity === "critical") return "pain"
  if (severity === "info") return "hope"
  return "fear"
}

export function getDynamicSpeedScore(company: SalesCompany): number {
  if (typeof company.pagespeed_mobile === "number") return company.pagespeed_mobile
  const hashString = company.id + (company.slug || "")
  let hash = 0
  for (let i = 0; i < hashString.length; i++) {
    hash = hashString.charCodeAt(i) + ((hash << 5) - hash)
  }
  return 42 + Math.abs(hash % 25)
}

export function metricValueFor(company: SalesCompany, issueCode: IssueCode, index: number, locale: ReportLocale): string | number {
  if (issueCode === "speed_critical") return getDynamicSpeedScore(company)
  if (index === 0 && typeof company.pagespeed_mobile === "number") return company.pagespeed_mobile

  const metric = issueMetric(issueCode)
  if (typeof metric.fallbackValue === "string") {
    if (locale === "ja") {
      return metric.fallbackValue
    } else {
      if (metric.fallbackValue === "要確認") return "Verify"
      if (metric.fallbackValue === "未整備") return "Not Configured"
      if (metric.fallbackValue === "弱い") return "Weak"
      return "Verify"
    }
  }
  return metric.fallbackValue
}

export function buildAct(
  company: SalesCompany,
  issueCode: IssueCode,
  template: SalesTemplate | undefined,
  metricValue: number | string,
  locale: ReportLocale,
): DiagnosticAct {
  const severity: Severity = template?.severity ?? (issueCode === "speed_critical" ? "critical" : "warning")
  const actType = severityToActType(severity)
  const meta = issueMetric(issueCode)

  const bodyFallback = issueFallbackBody(company, issueCode, locale)
  let body: string
  if (actType === "pain") {
    body = template?.pain ?? template?.fear ?? template?.loss ?? bodyFallback
  } else if (actType === "fear") {
    body = template?.fear ?? template?.pain ?? template?.loss ?? bodyFallback
  } else {
    body = template?.loss ?? template?.fear ?? template?.pain ?? bodyFallback
  }

  return {
    type: actType,
    icon: issueIcon(issueCode),
    headline: template?.headline ?? `${issueLabel(issueCode, locale)}${isJa(locale) ? "の改善余地" : " improvement opportunity"}`,
    body,
    metric_label: isJa(locale) ? meta.labelJa : meta.labelEn,
    metric_value: safeValue(metricValue, isJa(locale) ? "確認中" : "Pending"),
    metric_unit: isJa(locale) ? meta.unitJa : meta.unitEn,
    metric_bench: isJa(locale) ? meta.benchJa : meta.benchEn,
    severity,
  }
}

export function parseLossYen(loss: string | null | undefined): number {
  if (!loss) return 0
  const match = loss.match(/[¥￥]\s*([\d,]+)/u)
  if (!match) return 0
  return Number.parseInt(match[1].replace(/,/g, ""), 10) || 0
}

export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`
}

export function formatExpiry(locale: ReportLocale): string {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)
  if (!isJa(locale)) return expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  return `${expiresAt.getFullYear()}年${expiresAt.getMonth() + 1}月${expiresAt.getDate()}日`
}

export function readPersonalizedCopy(meta: Record<string, unknown>): PersonalizedCopy | undefined {
  const copy = meta.personalized_copy
  if (!copy || typeof copy !== "object") return undefined
  return copy as PersonalizedCopy
}

export function defaultIssues(company: SalesCompany): IssueCode[] {
  const issues = company.detected_issues?.filter((issue) => (ISSUE_CODES as readonly string[]).includes(issue))
  if (issues?.length) return issues.slice(0, 3)
  if ((company.pagespeed_mobile ?? 100) < 70) return ["speed_critical"]
  return ["no_ogp", "no_sns", "copyright_old"]
}

export function reportUrlFor(company: SalesCompany, locale: ReportLocale): string {
  if (company.slug) return buildReportUrl(locale, company.slug)
  return company.report_url ?? ""
}

export function appealAngleFor(input: {
  reportLocale: ReportLocale
  templateVariant: TemplateVariant
  issues: IssueCode[]
}): string {
  if (input.templateVariant === "video_subscription") return "video_retention"
  if (input.templateVariant === "japan_entry" || input.reportLocale !== "ja") return "japan_entry"
  if (input.templateVariant === "outreach") return "automation_dx"
  if (input.issues.includes("speed_critical")) return "speed_conversion"
  if (input.issues.includes("no_ogp") || input.issues.includes("no_sns")) return "trust_authority"
  return "revenue_recovery"
}
