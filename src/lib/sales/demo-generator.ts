import type { DiagnosticReportData } from "./diagnostic"
import { generateFullStackDemo } from "./demo-page-service"
import type { SalesCompany } from "./types"

export { buildDemoHtml } from "./demo-generator-html"
export { buildDemoPageData } from "./demo-page-builder"
export { buildDemoMultiPageData } from "./demo-multi-page-builder"
export { buildPersonalizedDemoData, buildAIPersonalizedDemoData } from "./demo-personalized-builder"
export { selectTemplate, selectTemplateCandidates } from "./demo-template-selector"
export { fetchDemoPageData, fetchDemoMultiPageData, generateFullStackDemo } from "./demo-page-service"
export { enhanceDemoWithDeepSeek } from "./demo-deepseek-enhancer"
export type { DeepSeekEnhancedOutput } from "./demo-deepseek-enhancer"

/** Legacy entry point now uses the same mandatory quality gate. */
export async function generateReplacementDemo(
  company: SalesCompany,
  report: DiagnosticReportData,
): Promise<{ ok: boolean; demoUrl: string | null; error?: string }> {
  const result = await generateFullStackDemo(company.id, company.report_locale ?? report.report_locale)
  return { ok: result.ok, demoUrl: result.demoUrl, error: result.error }
}
