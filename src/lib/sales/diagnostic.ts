/**
 * Diagnostic report data builder.
 *
 * Builds the public/private report payload from the Supabase Sales OS SSOT:
 * company facts, collected OSS/API evidence, business impact hypotheses, and
 * selected content templates for `/[locale]/report/[slug]`.
 */

import { findCompanyByDomain, findCompanyById, findCompanyBySlug } from "./companies"
import { buildCompanyIntelligence } from "./company-intelligence"
import { matchContentTemplate } from "./content-templates"
import {
  getRoutingMeta,
  inferVariant,
  normalizeReportLocale,
  normalizeTargetCountry,
  normalizeTemplateVariant,
  type ReportLocale,
  type TemplateVariant,
} from "./routing"
import { computeSourceCoverage } from "./source-coverage"
import { getTemplatesByIndustry } from "./templates"
import type { Region } from "./types"
import { localeToRegion } from "./types"
import {
  buildAct,
  asRecord,
  buildHook,
  readPersonalizedCopy,
  defaultIssues,
  reportUrlFor,
  appealAngleFor,
  formatExpiry,
  formatYen,
  parseLossYen,
  isJa,
  metricValueFor,
} from "./diagnostic/checks"
import type { DiagnosticReportData } from "./diagnostic/types"

export type { DiagnosticAct, DiagnosticReportData, CompanyMeta, PersonalizedCopy } from "./diagnostic/types"
export {
  INDUSTRY_HOOK_EN,
  INDUSTRY_HOOK_JA,
} from "./diagnostic/constants"

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
    cta_text: personalizedCopy?.personalized_cta ?? templates[0]?.cta_text ?? (isJa(reportLocale) ? "診断結果をもとに、売上機会、信頼低下、問い合わせ導線、運用負荷のどこから直すべきかを30分で整理します。" : "Use the assessment evidence to decide the first business fix, required scope, and fastest implementation path."),
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
