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
  REPORT_LOCALES,
  buildReportUrl,
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
import { buildVisualEvidenceStory } from "./diagnostic/visual-story"
import type { DiagnosticReportData } from "./diagnostic/types"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { sanitizeBlocks } from "@/lib/mvp/hallucination-guard"
import {
  companyContactFormUrl,
  companyDemoSite,
  companyVisualEvidence,
  mergedCompanyMeta,
} from "@/lib/sales/company-data-view"

export type {
  DiagnosticAct,
  DiagnosticReportData,
  CompanyMeta,
  ImprovementPreview,
  LocalizedReportLink,
  PersonalizedCopy,
  VisitorJourneyStep,
  VisualEvidenceAnnotation,
} from "./diagnostic/types"
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
  forceRegenerate?: boolean
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

  // Report freshness/regeneration is handled out-of-band (markReportGenerated +
  // webhook/admin-triggered event drains). This fetch always returns the latest persisted data so that
  // recently-generated reports never 404. REPORT_REGENERATE_MAX_AGE_DAYS and
  // opts.forceRegenerate are consumed by the regeneration job, not the display path.

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
  const unifiedMeta = mergedCompanyMeta(company)
  const demoSite = companyDemoSite(company)
  const demoUrl = typeof demoSite?.url === "string" ? demoSite.url : null
  const visualEvidence = companyVisualEvidence(company)
  const visualScreenshots = asRecord(visualEvidence?.screenshots)
  const desktopScreenshot = asRecord(visualScreenshots?.desktop)
  const mobileScreenshot = asRecord(visualScreenshots?.mobile)
  const socialScreenshot = asRecord(visualScreenshots?.social)
  const mapScreenshot = asRecord(visualScreenshots?.map)
  const formScreenshot = asRecord(visualScreenshots?.form)
  const variantScreenshot = asRecord(visualScreenshots?.variant)
  const screenshotUrl =
    typeof desktopScreenshot?.url === "string"
      ? desktopScreenshot.url
      : typeof unifiedMeta.screenshot_url === "string"
        ? unifiedMeta.screenshot_url
        : null
  const screenshotMobileUrl = typeof mobileScreenshot?.url === "string" ? mobileScreenshot.url : null
  const evidenceShotCandidates = [
    templateVariant === "video_subscription" ? socialScreenshot : null,
    templateVariant === "meo" ? mapScreenshot : null,
    templateVariant === "outreach" ? formScreenshot : null,
    variantScreenshot,
    socialScreenshot,
    mapScreenshot,
    formScreenshot,
  ]
  const evidenceScreenshot = evidenceShotCandidates.find((shot) => shot && typeof shot.url === "string") ?? null
  const evidenceScreenshotUrl = typeof evidenceScreenshot?.url === "string" ? evidenceScreenshot.url : screenshotUrl
  const evidenceScreenshotKind =
    typeof evidenceScreenshot?.viewport === "string" ? evidenceScreenshot.viewport : evidenceScreenshotUrl ? "desktop" : null
  const visualStory = buildVisualEvidenceStory({
    meta: unifiedMeta,
    acts,
    sourceCoverage,
    templateVariant,
    reportLocale,
  })

  const rawMeta = unifiedMeta
  const metaUnifiedProfile = rawMeta.unified_profile as Record<string, unknown> | undefined
  const metaBlocks = rawMeta.blocks
  const sanitized = sanitizeBlocks(metaBlocks, metaUnifiedProfile)
  if (sanitized.stripped_keys.length > 0) {
    console.warn(`[diagnostic] hallucination-guard stripped ${sanitized.stripped_keys.length} fields from meta blocks:`, sanitized.stripped_keys.slice(0, 5))
  }
  const safeMeta = metaBlocks != null ? { ...rawMeta, blocks: sanitized.blocks } : rawMeta

  const intelligence = buildCompanyIntelligence(company, sourceCoverage?.items ?? [])

  const reportResult: DiagnosticReportData = {
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
    screenshot_url: screenshotUrl,
    screenshot_mobile_url: screenshotMobileUrl,
    evidence_screenshot_url: evidenceScreenshotUrl,
    evidence_screenshot_kind: evidenceScreenshotKind,
    visual_annotations: visualStory.visualAnnotations,
    improvement_preview: visualStory.improvementPreview,
    visitor_journey: visualStory.visitorJourney,
    source_coverage: sourceCoverage ?? { score: 0, collected: 0, configured: 0, missing: 0, items: [] },
    intelligence: intelligence ?? { signals: [], painPoints: [], nextActions: [] },
    meta: safeMeta,
    contactFormUrl: companyContactFormUrl(company),
    content_template: contentTemplate
      ? {
          title: contentTemplate.title ?? "",
          purpose: contentTemplate.purpose ?? "",
          quality_bar: contentTemplate.quality_bar ?? "",
          dify_selection_rule: contentTemplate.dify_selection_rule ?? "",
          prompt_template: contentTemplate.prompt_template ?? "",
          offer_code: contentTemplate.offer_code ?? "",
          appeal_angle: contentTemplate.appeal_angle ?? "",
        }
      : {
          title: "",
          purpose: "",
          quality_bar: "",
          dify_selection_rule: "",
          prompt_template: "",
          offer_code: "",
          appeal_angle: "speed_conversion" as const,
        },
    report_url: reportUrlFor(company, reportLocale),
    video_url: typeof unifiedMeta.video_url === "string" ? unifiedMeta.video_url : null,
    localized_report_urls: company.slug
      ? REPORT_LOCALES.map((locale) => ({
          label: locale === reportLocale ? `${locale.toUpperCase()} (active)` : locale.toUpperCase(),
          url: buildReportUrl(locale, company.slug!),
        }))
      : [],
  }

  // Safe wrapper: guarantee all fields accessed by the DiagnosticReport
  // client component are non-null with sensible defaults.
  const safeReport: DiagnosticReportData = {
    ...reportResult,
    acts: reportResult.acts ?? [],
    localized_report_urls: reportResult.localized_report_urls ?? [],
    total_loss: reportResult.total_loss ?? "0",
  }

  return safeReport
}

/** Mark report as freshly generated so auto-regeneration can skip until data changes. */
export async function markReportGenerated(companyId: string): Promise<void> {
  const { getServiceSalesSupabase } = await import("@/lib/supabase")
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[diagnostic] markReportGenerated: Supabase not available for company", companyId)
    return
  }
  const { error } = await sb.from(DB_TABLES.SALES_COMPANIES).update({ report_generated_at: new Date().toISOString() }).eq("id", companyId)
  if (error) console.error("[diagnostic] markReportGenerated update failed:", error.message)
}
