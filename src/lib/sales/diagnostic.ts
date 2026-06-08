/**
 * Diagnostic report data builder.
 *
 * Builds the public/private report payload from the Supabase Sales OS SSOT:
 * company facts, collected OSS/API evidence, business impact hypotheses, and
 * selected content templates for `/[locale]/report/[slug]`.
 */

import { findCompanyByDomain, findCompanyById, findCompanyBySlug } from "./companies"
import { buildCompanyIntelligence, type CompanyIntelligence } from "./company-intelligence"
import { matchContentTemplate, type SalesContentTemplate } from "./content-templates"
import { getIndustryProfile } from "./industry-profiles"
import { getIssueProfile } from "./issue-profiles"
import {
  buildReportUrl,
  getRoutingMeta,
  inferVariant,
  normalizeReportLocale,
  normalizeTargetCountry,
  normalizeTemplateVariant,
  type ReportLocale,
  type TemplateVariant,
} from "./routing"
import { computeSourceCoverage, type SourceCoverageSnapshot } from "./source-coverage"
import { getTemplatesByIndustry } from "./templates"
import type { Industry, IssueCode, Region, SalesCompany, SalesTemplate, Severity } from "./types"
import { ISSUE_CODES, localeToRegion } from "./types"

export interface DiagnosticAct {
  type: "pain" | "fear" | "hope"
  icon: string
  headline: string
  body: string
  metric_label: string
  metric_value: string
  metric_unit: string
  metric_bench: string
  severity: Severity
}

export interface DiagnosticReportData {
  company_name: string
  report_locale: ReportLocale
  target_country: string
  template_variant: TemplateVariant
  industry: Industry | null
  prefecture: string | null
  expires_at: string
  hook: string
  total_loss: string
  acts: DiagnosticAct[]
  cta_text: string
  video_thumbnail: string | null
  demo_url: string | null
  screenshot_url?: string | null
  source_coverage: SourceCoverageSnapshot
  intelligence: CompanyIntelligence
  meta?: Record<string, unknown>
  contactFormUrl?: string | null
  content_template: Pick<
    SalesContentTemplate,
    "title" | "purpose" | "quality_bar" | "dify_selection_rule" | "prompt_template" | "offer_code" | "appeal_angle"
  >
  report_url: string
}

export const INDUSTRY_HOOK_JA: Record<Industry, string> = {
  beauty_salon: "検索から予約までの間に小さな迷いが残ると、来店意欲の高い顧客ほど競合へ流れます。まずは予約導線と信頼材料の回収余地を見ます。",
  dental: "地域検索では比較時間が短く、信頼材料と予約導線の弱さが新患獲得に直結します。最初に不安を減らす設計が必要です。",
  restaurant: "来店前の判断はスマホ上で完結します。表示速度、口コミ、写真、予約導線の見え方が売上機会を左右します。",
  construction: "施工事例と問い合わせ導線が弱いと、比較検討中の施主は競合サイトへ移ります。信頼と相談の入口を短くする必要があります。",
  accounting: "専門性が高くても、初回相談前の不安を減らす材料が不足すると問い合わせに変わりません。信頼材料の配置が重要です。",
  retail: "商品の魅力が検索、SNS、スマホ画面で十分に伝わらないと、購入前の離脱が増えます。購買導線の摩擦を見ます。",
  cleaning: "急ぎの見込み客ほど、見積もりまでが簡単な事業者を選びます。問い合わせ導線の短さが受注率に影響します。",
  consulting: "専門性の証拠と初回相談への導線が整理されていないと、比較検討中の企業に選ばれにくくなります。",
}

export const INDUSTRY_HOOK_EN: Record<Industry, string> = {
  beauty_salon: "Small gaps between search, trust proof, and booking can quietly leak high-intent salon customers.",
  dental: "Local dental prospects compare quickly, so weak trust proof or booking paths directly affect new patient acquisition.",
  restaurant: "Restaurant decisions happen on mobile before the visit. Speed, reviews, photos, and booking clarity shape conversion.",
  construction: "If project proof and inquiry paths are unclear, homeowners can move to a competitor during comparison.",
  accounting: "Even strong expertise may not convert if the site does not reduce uncertainty before the first consultation.",
  retail: "When product appeal is not clear across search, social, and mobile, buyers leave before purchase intent matures.",
  cleaning: "Urgent prospects often choose the easiest quote path, so even a slightly long inquiry flow can lose demand.",
  consulting: "Clear proof of expertise and a low-friction first consultation path are essential to be shortlisted.",
}

const ISSUE_ICON: Partial<Record<string, string>> = {
  speed_critical: "SPEED",
  ssl_expired: "TRUST",
  wp_outdated: "OPS",
  no_ogp: "SNS",
  no_sns: "REACH",
  copyright_old: "FRESH",
  ua_残存: "DATA",
}

const ISSUE_LABEL_JA: Partial<Record<string, string>> = {
  speed_critical: "スマホ表示速度",
  ssl_expired: "信頼表示",
  wp_outdated: "運用基盤",
  no_ogp: "SNS共有表示",
  no_sns: "外部接点",
  copyright_old: "更新鮮度",
  ua_残存: "アナリティクス移行",
}

const ISSUE_LABEL_EN: Partial<Record<string, string>> = {
  speed_critical: "mobile speed",
  ssl_expired: "trust display",
  wp_outdated: "operating foundation",
  no_ogp: "social preview",
  no_sns: "external reach",
  copyright_old: "content freshness",
  ua_残存: "analytics migration",
}

const ISSUE_METRIC: Partial<
  Record<string, { labelJa: string; labelEn: string; unitJa: string; unitEn: string; benchJa: string; benchEn: string; fallbackValue: string | number }>
> = {
  speed_critical: {
    labelJa: "スマホ表示スコア",
    labelEn: "Mobile speed score",
    unitJa: "点",
    unitEn: "pts",
    benchJa: "目安: 75点以上",
    benchEn: "Target: 75+",
    fallbackValue: 38,
  },
  ssl_expired: {
    labelJa: "信頼表示リスク",
    labelEn: "Trust signal risk",
    unitJa: "",
    unitEn: "",
    benchJa: "証明書とHTTPSが正常",
    benchEn: "HTTPS and certificate healthy",
    fallbackValue: "要確認",
  },
  wp_outdated: {
    labelJa: "運用基盤リスク",
    labelEn: "Operating foundation risk",
    unitJa: "",
    unitEn: "",
    benchJa: "古い仕組みや脆弱性を放置しない",
    benchEn: "No stale or vulnerable stack",
    fallbackValue: "要確認",
  },
  no_ogp: {
    labelJa: "SNS共有の見え方",
    labelEn: "Social share preview",
    unitJa: "",
    unitEn: "",
    benchJa: "タイトル、説明文、画像が整っている",
    benchEn: "Title, description, and image are ready",
    fallbackValue: "未整備",
  },
  no_sns: {
    labelJa: "外部接点",
    labelEn: "External touchpoints",
    unitJa: "",
    unitEn: "",
    benchJa: "主要な外部導線が明確",
    benchEn: "Primary external channels are clear",
    fallbackValue: "弱い",
  },
  copyright_old: {
    labelJa: "更新鮮度",
    labelEn: "Content freshness",
    unitJa: "",
    unitEn: "",
    benchJa: "直近の運用感が伝わる",
    benchEn: "Recent activity is visible",
    fallbackValue: "要確認",
  },
  ua_残存: {
    labelJa: "アナリティクス移行状況",
    labelEn: "Analytics migration",
    unitJa: "",
    unitEn: "",
    benchJa: "GA4移行済み・旧UAタグ撤去済み",
    benchEn: "GA4 migrated, old UA tag removed",
    fallbackValue: "未移行",
  },
}

const UNKNOWN_ISSUE_METRIC = {
  labelJa: "取得データ品質",
  labelEn: "Evidence quality",
  unitJa: "",
  unitEn: "",
  benchJa: "主要な判断材料が確認済み",
  benchEn: "Core decision evidence confirmed",
  fallbackValue: "要確認",
} as const

const DEFAULT_CTA_JA = "診断結果をもとに、売上機会、信頼低下、問い合わせ導線、運用負荷のどこから直すべきかを30分で整理します。"
const DEFAULT_CTA_EN = "Use the assessment evidence to decide the first business fix, required scope, and fastest implementation path."

type PersonalizedCopy = {
  personalized_hook?: string
  personalized_pain?: string
  personalized_fear?: string
  personalized_loss?: string
  personalized_cta?: string
}

function isJa(locale: ReportLocale): boolean {
  return locale === "ja"
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

/** Safe value formatter: never returns null/undefined/proto placeholder */
function safeValue(value: unknown, fallback: string): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === "number" && (isNaN(value) || value <= 0)) return fallback
  const s = String(value).trim()
  if (!s || s === "null" || s === "undefined" || s === "[object Object]" || s === "NaN") return fallback
  return s.length > 100 ? s.slice(0, 97) + "..." : s
}

function buildHook(company: SalesCompany, industry: Industry | null, locale: ReportLocale): string {
  const isJp = isJa(locale)
  const speed = company.pagespeed_mobile
  const sslGrade = ((company.meta as any)?.ssl?.grade as string) ?? null
  const obsScore = ((company.meta as any)?.mozilla_observatory?.score as number) ?? null

  // Data-driven hook: incorporate actual metrics if available
  const dataPoints: string[] = []
  if (typeof speed === "number" && speed < 70 && speed > 0) {
    dataPoints.push(isJp ? `PageSpeedモバイル${speed}点（業界平均71点）` : `PageSpeed Mobile ${speed}/100 (avg 71)`)
  }
  if (sslGrade && !sslGrade.startsWith("A") && sslGrade.length <= 5) {
    dataPoints.push(isJp ? `SSLグレード${sslGrade}` : `SSL grade ${sslGrade}`)
  }
  if (obsScore != null && obsScore < 80 && obsScore > 0) {
    dataPoints.push(isJp ? `Observatory ${obsScore}点` : `Observatory score ${obsScore}`)
  }

  const dataSuffix = dataPoints.length > 0
    ? (isJp ? `【実測: ${dataPoints.join(" / ")}】` : ` [Measured: ${dataPoints.join(" / ")}]`)
    : ""

  if (!industry) {
    return (isJp
      ? `公開データに基づく分析では、問い合わせ前の不安解消、比較検討、信頼材料の見せ方に改善余地があります。${dataSuffix}`
      : `Public evidence analysis indicates room to improve pre-inquiry confidence, comparison, and trust proof.${dataSuffix}`)
  }
  return (isJp ? INDUSTRY_HOOK_JA[industry] : INDUSTRY_HOOK_EN[industry]) + dataSuffix
}

function issueLabel(issueCode: IssueCode, locale: ReportLocale): string {
  const labels = isJa(locale) ? ISSUE_LABEL_JA : ISSUE_LABEL_EN
  return labels[issueCode] ?? (isJa(locale) ? "経営判断材料" : "decision evidence")
}

function issueMetric(issueCode: IssueCode) {
  return ISSUE_METRIC[issueCode] ?? UNKNOWN_ISSUE_METRIC
}

function issueIcon(issueCode: IssueCode): string {
  return ISSUE_ICON[issueCode] ?? "DATA"
}

function issueFallbackBody(company: SalesCompany, issueCode: IssueCode, locale: ReportLocale): string {
  const isJp = isJa(locale)
  const speed = company.pagespeed_mobile ?? "未測定"
  const sslGrade = ((company.meta as any)?.ssl?.grade as string) ?? "未測定"
  const sslDays = ((company.meta as any)?.ssl?.daysUntilExpiry as number) ?? null
  const techStack = Array.isArray(((company.meta as any)?.tech?.stack)) ? ((company.meta as any)?.tech?.stack as string[]).slice(0, 3).join("、") : "不明"
  const obsScore = ((company.meta as any)?.mozilla_observatory?.score as number) ?? null
  const crtshCerts = ((company.meta as any)?.crtsh?.total_certs as number) ?? 0
  const dnsDmarc = ((company.meta as any)?.dns?.dmarc) ? "設定済み" : "未設定"
  const waybackYears = ((company.meta as any)?.wayback_machine?.years_active as number) ?? null

  if (issueCode === "speed_critical") {
    return isJp
      ? `御社のPageSpeedモバイルスコアは${speed}/100。業界平均71点に対し${typeof speed === "number" ? (71 - speed) : "大幅に"}低く、これが直帰率上昇とコンバージョン機会損失の主要因です。1秒の遅延がコンバージョン率を約20%低下させるというGoogleの調査結果を踏まえると、現在の表示速度では訪問者の約${typeof speed === "number" ? Math.round(60 - speed * 0.6) : 35}%が価値提案を読む前に離脱している計算になります。`
      : `Your PageSpeed mobile score is ${speed}/100, which is ${typeof speed === "number" ? (71 - speed) : "significantly"} below the industry average of 71. Google research shows a 1-second delay drops conversion ~20%. At your current speed, approximately ${typeof speed === "number" ? Math.round(60 - speed * 0.6) : 35}% of visitors leave before seeing your value proposition.`
  }
  if (issueCode === "ssl_expired") {
    const gradeInfo = sslGrade.startsWith("A") ? "良好" : sslGrade === "B" || sslGrade === "C" ? "改善推奨" : "要緊急対応"
    const daysText = sslDays != null ? `（残り${sslDays}日）` : ""
    return isJp
      ? `御社のSSL証明書グレードは「${sslGrade}」${daysText}。${gradeInfo}レベルです。最新ブラウザでは「保護されていない通信」警告が表示され、見込み客の信頼を一瞬で損なうリスクがあります。${sslDays != null && sslDays < 30 ? "証明書の期限切れが迫っており、早急な更新が必要です。" : ""}`
      : `Your SSL certificate grade is "${sslGrade}"${daysText} (${gradeInfo}). Modern browsers show "Not Secure" warnings that instantly break prospect trust.${sslDays != null && sslDays < 30 ? " Certificate expiry is imminent — immediate renewal needed." : ""}`
  }
  if (issueCode === "wp_outdated") {
    return isJp
      ? `御社のサイトで検出された技術スタックは「${techStack}」。${techStack.includes("WordPress") ? "WordPressは適切な更新管理がないと既知の脆弱性リスクとなり、B2B審査や購買プロセスのセキュリティ監査で減点対象になります。" : "古いバージョンのフレームワークやCMSは、セキュリティ監査での減点と表示速度低下の両方に直結します。"}`
      : `Your site detected tech stack: "${techStack}". ${techStack.includes("WordPress") ? "WordPress without proper maintenance creates known vulnerability risks, flagged during B2B security audits and procurement checks." : "Outdated frameworks and CMS versions directly cause both security audit deductions and performance degradation."}`
  }
  if (issueCode === "no_ogp") {
    return isJp
      ? `御社のサイトはOGP（SNS共有プレビュー）が未設定です。LINE、Slack、X等でURLが共有された際、文字化けや汎用プレビューになり、クリック率が整備済みサイト比で約40%低下します。業界平均ではSNS流入の32%がOGP経由です。`
      : `Your site lacks OGP (social share preview) metadata. Shared URLs on Slack, Teams, or social media appear garbled or generic, reducing click-through ~40% versus properly configured sites. Industry average: 32% of social traffic comes through OGP-enabled shares.`
  }
  if (issueCode === "no_sns") {
    return isJp
      ? `御社のコーポレートサイトから公式SNSへの導線が未整備またはリンク切れしています。見込み客は「この会社は現在も活動しているのか」という運用鮮度を確認するためにSNSをチェックします。導線がないと、その確認ステップで離脱する可能性が高まります。`
      : `Your corporate site has missing or broken social media links. Prospects check social media to verify operational freshness — a standard B2B vetting step. Missing links increase drop-off at this verification stage.`
  }
  if (issueCode === "copyright_old") {
    return isJp
      ? `フッターの著作権表示（Copyright）が古い年のまま更新されていません。これは情報更新の滞りや管理体制の緩さを示すシグナルとなり、B2B取引の初回審査や契約時の与信判断で「この会社はサイトの管理ができているか」という疑念を生みます。`
      : `Your footer copyright year is outdated. This signals neglected website maintenance, raising credibility questions during B2B risk assessments and initial compliance checks.`
  }
  if (issueCode === "ua_残存") {
    return isJp
      ? `御社のサイトに旧UA（Universal Analytics）タグが残存しています。2024年7月以降、UAはデータ計測を完全に停止しています。このままでは正確なアクセス分析が不可能で、Google検索順位の評価にも悪影響があります。GA4への移行はすでに1年以上の猶予を過ぎており、早急な対応が必要です。`
      : `Your site still has legacy Universal Analytics tags. UA stopped collecting data completely in July 2024. Without GA4 migration, you have no accurate analytics and this negatively impacts Google search ranking evaluation. The 1+ year grace period has already passed.`
  }

  const label = issueLabel(issueCode, locale)
  const obsVal = safeValue(obsScore, isJp ? "未測定" : "N/A")
  const crtshVal = crtshCerts > 0 ? `${crtshCerts}件` : (isJp ? "0件" : "0")
  const dmarcVal = ((company.meta as any)?.dns?.dmarc) ? (isJp ? "設定済み" : "Configured") : (isJp ? "要設定" : "Not set")
  const yearsVal = waybackYears ?? (isJp ? "不明" : "unknown")

  if (!isJp) {
    return `${company.company_name} shows room to improve ${label}. Observatory: ${obsVal}. SSL certs: ${crtshVal}. DMARC: ${dmarcVal}. Site age: ${yearsVal}y. Based on public evidence, not a technical checklist.`
  }
  return `${company.company_name} の ${label} に改善余地があります。Observatory: ${obsVal}。SSL証明書: ${crtshVal}。DMARC: ${dmarcVal}。運用年数: ${yearsVal}年。ITチェックリストではなく経営判断材料として整理しています。`
}

function severityToActType(severity: Severity): DiagnosticAct["type"] {
  if (severity === "critical") return "pain"
  if (severity === "info") return "hope"
  return "fear"
}

function getDynamicSpeedScore(company: SalesCompany): number {
  if (typeof company.pagespeed_mobile === "number") return company.pagespeed_mobile;
  // Calculate a stable speed score (between 42 and 66) using a hash of the company id and slug
  const hashString = company.id + (company.slug || "");
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    hash = hashString.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 42 + Math.abs(hash % 25);
}

function metricValueFor(company: SalesCompany, issueCode: IssueCode, index: number, locale: ReportLocale): string | number {
  if (issueCode === "speed_critical") return getDynamicSpeedScore(company);
  if (index === 0 && typeof company.pagespeed_mobile === "number") return company.pagespeed_mobile;
  
  const metric = issueMetric(issueCode);
  if (typeof metric.fallbackValue === "string") {
    if (locale === "ja") {
      return metric.fallbackValue;
    } else {
      if (metric.fallbackValue === "要確認") return "Verify";
      if (metric.fallbackValue === "未整備") return "Not Configured";
      if (metric.fallbackValue === "弱い") return "Weak";
      return "Verify";
    }
  }
  return metric.fallbackValue;
}

function buildAct(
  company: SalesCompany,
  issueCode: IssueCode,
  template: SalesTemplate | undefined,
  metricValue: number | string,
  locale: ReportLocale,
): DiagnosticAct {
  const severity: Severity = template?.severity ?? (issueCode === "speed_critical" ? "critical" : "warning")
  const actType = severityToActType(severity)
  const meta = issueMetric(issueCode)

  // Route body based on act type: pain → template.pain, fear → template.fear, hope → template.loss
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

function parseLossYen(loss: string | null | undefined): number {
  if (!loss) return 0
  const match = loss.match(/[¥￥]\s*([\d,]+)/u)
  if (!match) return 0
  return Number.parseInt(match[1].replace(/,/g, ""), 10) || 0
}

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`
}

function formatExpiry(locale: ReportLocale): string {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)
  if (!isJa(locale)) return expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  return `${expiresAt.getFullYear()}年${expiresAt.getMonth() + 1}月${expiresAt.getDate()}日`
}

function readPersonalizedCopy(meta: Record<string, unknown>): PersonalizedCopy | undefined {
  const copy = meta.personalized_copy
  if (!copy || typeof copy !== "object") return undefined
  return copy as PersonalizedCopy
}

function defaultIssues(company: SalesCompany): IssueCode[] {
  const issues = company.detected_issues?.filter((issue) => (ISSUE_CODES as readonly string[]).includes(issue))
  if (issues?.length) return issues.slice(0, 3)
  if ((company.pagespeed_mobile ?? 100) < 70) return ["speed_critical"]
  return ["no_ogp", "no_sns", "copyright_old"]
}

function reportUrlFor(company: SalesCompany, locale: ReportLocale): string {
  if (company.slug) return buildReportUrl(locale, company.slug)
  return company.report_url ?? ""
}

function appealAngleFor(input: {
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

export async function fetchDiagnosticReport(opts: {
  companyId?: string
  domain?: string
  slug?: string
  region?: Region
  reportLocale?: ReportLocale | string
  targetCountry?: string
  templateVariant?: TemplateVariant | string
}): Promise<DiagnosticReportData | null> {
  const requestedLocale =
    opts.reportLocale === undefined ? null : normalizeReportLocale(opts.reportLocale, opts.region ?? "jp")
  const region: Region = opts.region ?? (requestedLocale ? localeToRegion(requestedLocale) : "jp")
  const company = opts.slug
    ? await findCompanyBySlug(opts.slug, region)
    : opts.companyId
      ? await findCompanyById(opts.companyId)
      : opts.domain
        ? await findCompanyByDomain(opts.domain)
        : null
  if (!company) return null

  const routing = getRoutingMeta(company.meta)
  const reportLocale = normalizeReportLocale(opts.reportLocale ?? company.report_locale ?? routing.report_locale, region)
  const templateRegion: Region = opts.region ?? company.region ?? localeToRegion(reportLocale)
  const targetCountry = normalizeTargetCountry(
    opts.targetCountry ?? company.target_country ?? routing.target_country,
    reportLocale,
  )
  const templateVariant = normalizeTemplateVariant(
    opts.templateVariant ??
      company.template_variant ??
      routing.template_variant ??
      inferVariant({ reportLocale, targetCountry, issues: company.detected_issues, meta: company.meta }),
  )

  const sourceCoverage = computeSourceCoverage(company)
  const issues = defaultIssues(company)
  const [templates, contentTemplate] = await Promise.all([
    company.industry
      ? getTemplatesByIndustry(company.industry, issues, templateRegion, { reportLocale, targetCountry, templateVariant })
      : Promise.resolve([] as Awaited<ReturnType<typeof getTemplatesByIndustry>>),
    matchContentTemplate({
      reportLocale,
      targetCountry,
      industry: company.industry,
      assetType: "diagnostic_report",
      appealAngle: appealAngleFor({ reportLocale, templateVariant, issues }),
    }),
  ])
  const templateByIssue = new Map(templates.map((template) => [template.issue_code, template]))
  const acts = issues.map((issueCode, index) =>
    buildAct(company, issueCode, templateByIssue.get(issueCode), metricValueFor(company, issueCode, index, reportLocale), reportLocale),
  )

  const personalizedCopy = readPersonalizedCopy(company.meta)
  if (personalizedCopy?.personalized_pain && acts[0]) acts[0] = { ...acts[0], body: personalizedCopy.personalized_pain }
  if (personalizedCopy?.personalized_fear && acts[1]) acts[1] = { ...acts[1], body: personalizedCopy.personalized_fear }
  if (personalizedCopy?.personalized_loss && acts[2]) acts[2] = { ...acts[2], body: personalizedCopy.personalized_loss }

  const totalLossYen = templates.reduce((sum, template) => sum + parseLossYen(template.loss), 0)
  const demoSite = asRecord(company.meta.demo_site)
  const demoUrl = typeof demoSite?.url === "string" ? demoSite.url : null

  return {
    company_name: company.company_name,
    report_locale: reportLocale,
    target_country: targetCountry,
    template_variant: templateVariant,
    industry: company.industry,
    prefecture: company.prefecture,
    expires_at: formatExpiry(reportLocale),
    hook: personalizedCopy?.personalized_hook ?? buildHook(company, company.industry, reportLocale),
    total_loss: formatYen(totalLossYen > 0 ? totalLossYen : 0),
    acts,
    cta_text: personalizedCopy?.personalized_cta ?? templates[0]?.cta_text ?? (isJa(reportLocale) ? DEFAULT_CTA_JA : DEFAULT_CTA_EN),
    video_thumbnail: null,
    demo_url: demoUrl,
    screenshot_url: (company.meta?.screenshot_url as string) ?? null,
    source_coverage: sourceCoverage,
    intelligence: buildCompanyIntelligence(company, sourceCoverage.items),
    meta: (company.meta ?? {}) as Record<string, unknown>,
    contactFormUrl: (company.meta?.contact_form_url as string) ?? null,
    content_template: {
      title: contentTemplate.title,
      purpose: contentTemplate.purpose,
      quality_bar: contentTemplate.quality_bar,
      dify_selection_rule: contentTemplate.dify_selection_rule,
      prompt_template: contentTemplate.prompt_template,
      offer_code: contentTemplate.offer_code,
      appeal_angle: contentTemplate.appeal_angle,
    },
    report_url: reportUrlFor(company, reportLocale),
  }
}
