/**
 * Diagnostic report data builder.
 *
 * Builds the public/private report payload from the Supabase Sales OS SSOT:
 * company facts, collected OSS/API evidence, diagnosis templates, and selected
 * content templates for `/[locale]/report/[slug]`.
 */

import { findCompanyByDomain, findCompanyById, findCompanyBySlug } from "./companies"
import { buildCompanyIntelligence, type CompanyIntelligence } from "./company-intelligence"
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
import { matchContentTemplate, type SalesContentTemplate } from "./content-templates"
import { getTemplatesByIndustry } from "./templates"
import type { Industry, IssueCode, Region, SalesCompany, SalesTemplate, Severity } from "./types"
import { ISSUE_CODES } from "./types"

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
  source_coverage: SourceCoverageSnapshot
  intelligence: CompanyIntelligence
  content_template: Pick<
    SalesContentTemplate,
    "title" | "purpose" | "quality_bar" | "dify_selection_rule" | "prompt_template"
  >
  report_url: string
}

const INDUSTRY_HOOK_JA: Record<Industry, string> = {
  beauty_salon: "検索から予約までの導線に小さな離脱が重なり、来店意欲の高い見込み客を取りこぼしている可能性があります。",
  dental: "地域検索で比較される時間は短く、信頼材料と予約導線の弱さが新患獲得に直結します。",
  restaurant: "来店前の比較はスマホ上で完結します。表示速度、口コミ導線、写真の見え方が予約率を左右します。",
  construction: "施工事例と問い合わせ導線が弱いと、比較検討中の施主が競合サイトへ流れやすくなります。",
  accounting: "専門性が伝わっていても、相談前の不安を解く導線が弱いと問い合わせ化しにくくなります。",
  retail: "商品や店舗の魅力が検索、SNS、スマホ表示で十分に伝わらないと、購入前の離脱が増えます。",
  cleaning: "見積もり依頼までの導線が少し長いだけで、急ぎの見込み客は別サービスへ移動します。",
  consulting: "専門性の証拠と初回相談への導線が整理されていないと、検討中の企業に選ばれにくくなります。",
}

const INDUSTRY_HOOK_EN: Record<Industry, string> = {
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
  speed_critical: "S",
  ssl_expired: "SSL",
  wp_outdated: "WP",
  no_ogp: "OGP",
  no_sns: "SNS",
  copyright_old: "COPY",
}

const ISSUE_METRIC: Partial<
  Record<string, { label: string; unit: string; bench: string; fallbackValue: string | number }>
> = {
  speed_critical: {
    label: "モバイル速度スコア",
    unit: "点",
    bench: "目安: 75点以上",
    fallbackValue: 38,
  },
  ssl_expired: {
    label: "SSL/HTTPSリスク",
    unit: "",
    bench: "HTTPSかつ証明書が正常",
    fallbackValue: "要確認",
  },
  wp_outdated: {
    label: "CMS/技術スタックリスク",
    unit: "",
    bench: "脆弱性のない状態を維持",
    fallbackValue: "要確認",
  },
  no_ogp: {
    label: "SNS共有最適化",
    unit: "",
    bench: "OGP/タイトル/説明文を整備",
    fallbackValue: "未整備",
  },
  no_sns: {
    label: "SNS/外部導線",
    unit: "",
    bench: "主要導線を明示",
    fallbackValue: "弱い",
  },
  copyright_old: {
    label: "更新鮮度",
    unit: "",
    bench: "半年以内の更新感を表示",
    fallbackValue: "要確認",
  },
}

const UNKNOWN_ISSUE_METRIC = {
  label: "取得データ品質",
  unit: "",
  bench: "主要ソースで確認済みの状態",
  fallbackValue: "要確認",
} as const

const DEFAULT_CTA_JA = "診断結果をもとに、改善優先度、概算費用、最短の実装順を15分で整理します。"
const DEFAULT_CTA_EN = "Use the diagnostic evidence to review priorities, effort, and the shortest implementation path."

type PersonalizedCopy = {
  personalized_hook?: string
  personalized_pain?: string
  personalized_fear?: string
  personalized_loss?: string
  personalized_cta?: string
}

function buildHook(industry: Industry | null, locale: ReportLocale): string {
  if (!industry) {
    return locale === "ja"
      ? "オンライン上の公開データを見る限り、問い合わせ前の不安解消と比較検討の導線に改善余地があります。"
      : "Public evidence suggests room to improve pre-inquiry confidence and the comparison journey."
  }
  return locale === "ja" ? INDUSTRY_HOOK_JA[industry] : INDUSTRY_HOOK_EN[industry]
}

function issueLabel(issueCode: IssueCode): string {
  const labels: Partial<Record<string, string>> = {
    speed_critical: "表示速度",
    ssl_expired: "HTTPS/SSL",
    wp_outdated: "CMS/技術スタック",
    no_ogp: "OGP/SNS表示",
    no_sns: "SNS導線",
    copyright_old: "更新鮮度",
  }
  return labels[issueCode] ?? "公開データ"
}

function issueMetric(issueCode: IssueCode) {
  return ISSUE_METRIC[issueCode] ?? UNKNOWN_ISSUE_METRIC
}

function issueIcon(issueCode: IssueCode): string {
  return ISSUE_ICON[issueCode] ?? "DATA"
}

function issueFallbackBody(company: SalesCompany, issueCode: IssueCode, locale: ReportLocale): string {
  const label = issueLabel(issueCode)
  if (locale !== "ja") {
    return `${company.company_name} shows room to improve ${label}. The finding is based on public data and OSS diagnostics, then translated into proposal-ready evidence.`
  }
  return `${company.company_name} の ${label} に改善余地があります。公開データとOSS診断の結果を組み合わせ、営業提案で使える根拠として整理しました。`
}

function severityToActType(severity: Severity): DiagnosticAct["type"] {
  if (severity === "critical") return "pain"
  if (severity === "info") return "hope"
  return "fear"
}

function metricValueFor(company: SalesCompany, issueCode: IssueCode, index: number): string | number {
  if (issueCode === "speed_critical") {
    return company.pagespeed_mobile ?? ISSUE_METRIC.speed_critical?.fallbackValue ?? 38
  }
  if (index === 0 && typeof company.pagespeed_mobile === "number") {
    return company.pagespeed_mobile
  }
  return issueMetric(issueCode).fallbackValue
}

function buildAct(
  company: SalesCompany,
  issueCode: IssueCode,
  template: SalesTemplate | undefined,
  metricValue: number | string,
  locale: ReportLocale,
): DiagnosticAct {
  const severity: Severity = template?.severity ?? (issueCode === "speed_critical" ? "critical" : "warning")
  const meta = issueMetric(issueCode)
  return {
    type: severityToActType(severity),
    icon: issueIcon(issueCode),
    headline: template?.headline ?? `${issueLabel(issueCode)}の改善余地`,
    body: template?.pain ?? template?.fear ?? template?.loss ?? issueFallbackBody(company, issueCode, locale),
    metric_label: meta.label,
    metric_value: String(metricValue),
    metric_unit: meta.unit,
    metric_bench: meta.bench,
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
  if (locale !== "ja") {
    return expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }
  return `${expiresAt.getFullYear()}年${expiresAt.getMonth() + 1}月${expiresAt.getDate()}日`
}

function readPersonalizedCopy(meta: Record<string, unknown>): PersonalizedCopy | undefined {
  const copy = meta.personalized_copy
  if (!copy || typeof copy !== "object") return undefined
  return copy as PersonalizedCopy
}

function defaultIssues(company: SalesCompany): IssueCode[] {
  const issues = company.detected_issues?.filter((issue) =>
    (ISSUE_CODES as readonly string[]).includes(issue),
  )
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
  const region: Region = opts.region ?? "jp"
  const company = opts.slug
    ? await findCompanyBySlug(opts.slug, region)
    : opts.companyId
      ? await findCompanyById(opts.companyId)
      : opts.domain
        ? await findCompanyByDomain(opts.domain)
        : null
  if (!company) return null

  const routing = getRoutingMeta(company.meta)
  const reportLocale = normalizeReportLocale(
    opts.reportLocale ?? company.report_locale ?? routing.report_locale,
    region,
  )
  const targetCountry = normalizeTargetCountry(
    opts.targetCountry ?? company.target_country ?? routing.target_country,
    reportLocale,
  )
  const templateVariant = normalizeTemplateVariant(
    opts.templateVariant ??
      company.template_variant ??
      routing.template_variant ??
      inferVariant({
        reportLocale,
        targetCountry,
        issues: company.detected_issues,
        meta: company.meta,
      }),
  )

  const sourceCoverage = computeSourceCoverage(company)
  const issues = defaultIssues(company)
  const templates = company.industry
    ? await getTemplatesByIndustry(company.industry, issues, region, {
        reportLocale,
        targetCountry,
        templateVariant,
      })
    : []
  const templateByIssue = new Map(templates.map((template) => [template.issue_code, template]))
  const acts = issues.map((issueCode, index) =>
    buildAct(
      company,
      issueCode,
      templateByIssue.get(issueCode),
      metricValueFor(company, issueCode, index),
      reportLocale,
    ),
  )
  const contentTemplate = await matchContentTemplate({
    reportLocale,
    targetCountry,
    industry: company.industry,
    assetType: "diagnostic_report",
    appealAngle: appealAngleFor({ reportLocale, templateVariant, issues }),
    templateVariant,
  })

  const personalizedCopy = readPersonalizedCopy(company.meta)
  if (personalizedCopy?.personalized_pain && acts[0]) acts[0] = { ...acts[0], body: personalizedCopy.personalized_pain }
  if (personalizedCopy?.personalized_fear && acts[1]) acts[1] = { ...acts[1], body: personalizedCopy.personalized_fear }
  if (personalizedCopy?.personalized_loss && acts[2]) acts[2] = { ...acts[2], body: personalizedCopy.personalized_loss }

  const totalLossYen = templates.reduce((sum, template) => sum + parseLossYen(template.loss), 0)
  const demoSite = company.meta.demo_site as { url?: string } | undefined

  return {
    company_name: company.company_name,
    report_locale: reportLocale,
    target_country: targetCountry,
    template_variant: templateVariant,
    industry: company.industry,
    prefecture: company.prefecture,
    expires_at: formatExpiry(reportLocale),
    hook: personalizedCopy?.personalized_hook ?? buildHook(company.industry, reportLocale),
    total_loss: formatYen(totalLossYen || 340_000),
    acts,
    cta_text: personalizedCopy?.personalized_cta ?? templates[0]?.cta_text ?? (reportLocale === "ja" ? DEFAULT_CTA_JA : DEFAULT_CTA_EN),
    video_thumbnail: null,
    demo_url: demoSite?.url ?? null,
    source_coverage: sourceCoverage,
    intelligence: buildCompanyIntelligence(company, sourceCoverage.items),
    content_template: {
      title: contentTemplate.title,
      purpose: contentTemplate.purpose,
      quality_bar: contentTemplate.quality_bar,
      dify_selection_rule: contentTemplate.dify_selection_rule,
      prompt_template: contentTemplate.prompt_template,
    },
    report_url: reportUrlFor(company, reportLocale),
  }
}
