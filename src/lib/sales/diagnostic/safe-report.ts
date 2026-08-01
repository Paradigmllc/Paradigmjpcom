import type { CompanyIntelligence } from "@/lib/sales/company-intelligence"
import type { SourceCoverageSnapshot } from "@/lib/sales/source-coverage"
import { normalizeReportLocale, normalizeTemplateVariant } from "@/lib/sales/routing"
import { localeToRegion } from "@/lib/sales/types"
import type { DiagnosticReportData } from "./types"

const EMPTY_COVERAGE: SourceCoverageSnapshot = {
  score: 0,
  collected: 0,
  configured: 0,
  missing: 0,
  items: [],
}

function fallbackIntelligence(locale: string): CompanyIntelligence {
  const isJa = locale === "ja"
  return {
    signals: [],
    painPoints: [
      {
        id: "report-data-review",
        title: isJa ? "診断データの再確認が必要です" : "Diagnostic data needs review",
        severity: "warning",
        evidence: isJa ? "一部の診断データが未取得または不完全です。" : "Some diagnostic data is missing or incomplete.",
        implication: isJa ? "詳細な優先順位は再取得後に確定します。" : "Detailed prioritization will be finalized after refresh.",
        recommendedAction: isJa ? "Twenty Sales OSで再診断を実行してください。" : "Run a Twenty Sales OS diagnostic refresh.",
      },
    ],
    nextActions: [
      isJa
        ? "Twenty Sales OSで企業カルテと診断レポートを再生成する"
        : "Regenerate the company profile and diagnostic report in Twenty Sales OS",
    ],
  }
}

function fallbackTemplate() {
  return {
    title: "",
    purpose: "",
    quality_bar: "",
    dify_selection_rule: "",
    prompt_template: "",
    offer_code: "",
    appeal_angle: "speed_conversion" as const,
  }
}

export function fallbackDiagnosticReport(slug: string, locale: string): DiagnosticReportData {
  const reportLocale = normalizeReportLocale(locale, localeToRegion(locale))
  return {
    company_name: slug,
    report_locale: reportLocale,
    target_country: reportLocale === "ja" ? "JP" : "US",
    template_variant: normalizeTemplateVariant("website_diagnostic"),
    industry: null,
    prefecture: null,
    expires_at: "",
    hook: reportLocale === "ja" ? "診断レポートを準備中です。" : "Diagnostic report is being prepared.",
    total_loss: "0",
    acts: [],
    cta_text: reportLocale === "ja" ? "診断データを再確認する" : "Review diagnostic data",
    video_thumbnail: null,
    demo_url: null,
    visual_annotations: [],
    source_coverage: EMPTY_COVERAGE,
    intelligence: fallbackIntelligence(reportLocale),
    meta: { degraded_report: true, slug },
    content_template: fallbackTemplate(),
    report_url: `/${reportLocale}/report/${slug}`,
    localized_report_urls: [{ label: `${reportLocale.toUpperCase()} (active)`, url: `/${reportLocale}/report/${slug}` }],
  }
}

export function ensureSafeDiagnosticReport(
  data: DiagnosticReportData | null,
  slug: string,
  locale: string,
): DiagnosticReportData {
  const base = data ?? fallbackDiagnosticReport(slug, locale)
  const reportLocale = normalizeReportLocale(base.report_locale ?? locale, localeToRegion(locale))
  const intelligence = base.intelligence ?? fallbackIntelligence(reportLocale)
  const sourceCoverage = base.source_coverage ?? EMPTY_COVERAGE
  return {
    ...base,
    report_locale: reportLocale,
    template_variant: normalizeTemplateVariant(base.template_variant),
    company_name: base.company_name || slug,
    hook: base.hook ?? "",
    total_loss: base.total_loss ?? "0",
    cta_text: base.cta_text ?? "",
    acts: Array.isArray(base.acts) ? base.acts : [],
    localized_report_urls: Array.isArray(base.localized_report_urls) ? base.localized_report_urls : [],
    visual_annotations: Array.isArray(base.visual_annotations) ? base.visual_annotations : [],
    source_coverage: {
      score: Number.isFinite(sourceCoverage.score) ? sourceCoverage.score : 0,
      collected: Number.isFinite(sourceCoverage.collected) ? sourceCoverage.collected : 0,
      configured: Number.isFinite(sourceCoverage.configured) ? sourceCoverage.configured : 0,
      missing: Number.isFinite(sourceCoverage.missing) ? sourceCoverage.missing : 0,
      items: Array.isArray(sourceCoverage.items) ? sourceCoverage.items : [],
    },
    intelligence: {
      signals: Array.isArray(intelligence.signals) ? intelligence.signals : [],
      painPoints: Array.isArray(intelligence.painPoints) ? intelligence.painPoints : fallbackIntelligence(reportLocale).painPoints,
      nextActions: Array.isArray(intelligence.nextActions) && intelligence.nextActions.length > 0
        ? intelligence.nextActions
        : fallbackIntelligence(reportLocale).nextActions,
    },
    content_template: base.content_template ?? fallbackTemplate(),
  }
}
