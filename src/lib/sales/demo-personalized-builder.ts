/**
 * Template-aware demo builder.
 *
 * Public cold demos may only contain verified company facts or clearly labelled
 * proposals. Synthetic testimonials, customer logos, revenue claims, and
 * fabricated histories are deliberately excluded.
 */
import { buildDemoMultiPageData } from "./demo-multi-page-builder"
import { enhanceDemoWithDeepSeek } from "./demo-deepseek-enhancer"
import { mergeDeepSeekOutput } from "./demo-deepseek-merge"
import type { DemoMultiPageData } from "./demo-site-types"
import type { DemoTemplate } from "./demo-templates/registry"
import type { DiagnosticReportData } from "./diagnostic"
import type { ReportLocale } from "./types"

export function buildPersonalizedDemoData(
  company: Parameters<typeof buildDemoMultiPageData>[0],
  report: DiagnosticReportData,
  template: DemoTemplate,
): DemoMultiPageData {
  const base = buildDemoMultiPageData(company, report)

  return {
    ...base,
    templateId: template.id,
    designTokens: template.designTokens,
    pages: {
      ...base.pages,
      home: {
        ...base.pages.home,
        testimonials: undefined,
        trustedBy: undefined,
        totalLoss: "",
        metricsSummary: base.pages.home.metricsSummary
          ? {
              ...base.pages.home.metricsSummary,
              monthlyLoss: null,
              recoveryAmount: null,
            }
          : undefined,
      },
    },
  }
}

export async function buildAIPersonalizedDemoData(
  company: Parameters<typeof buildDemoMultiPageData>[0],
  report: DiagnosticReportData,
  template: DemoTemplate,
): Promise<DemoMultiPageData> {
  const base = buildPersonalizedDemoData(company, report, template)
  const locale = (company.report_locale ?? report.report_locale ?? "ja") as ReportLocale

  try {
    const aiOutput = await enhanceDemoWithDeepSeek(company, report, template, locale)
    return aiOutput ? mergeDeepSeekOutput(base, aiOutput, locale) : base
  } catch (error) {
    console.error(
      "[demo-personalized-builder] AI enhancement failed:",
      error instanceof Error ? error.message : String(error),
    )
    return base
  }
}
