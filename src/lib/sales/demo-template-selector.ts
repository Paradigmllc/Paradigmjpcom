/**
 * lib/sales/demo-template-selector.ts — Template Selector
 *
 * Selects the best template for a company based on:
 * - Industry match
 * - Company size indicators
 * - Diagnostic severity profile
 * - Locale preference
 */

import type { DiagnosticReportData } from "./diagnostic"
import { DEMO_TEMPLATES, DEFAULT_TEMPLATE, type DemoTemplate } from "./demo-templates/registry"

export interface CompanyProfile {
  industry: string | null
  company_name: string
  prefecture?: string | null
  pagespeed_mobile?: number | null
  pagespeed_desktop?: number | null
  meta?: Record<string, unknown> | null
  tech_stack?: Record<string, unknown> | null
  report_locale?: string | null
}

/**
 * Select a template for the given company and diagnostic report.
 * Returns the best-matching template, never null (falls back to DEFAULT_TEMPLATE).
 */
export function selectTemplate(
  company: CompanyProfile,
  report: DiagnosticReportData,
): DemoTemplate {
  return selectTemplateCandidates(company, report, 1)[0] ?? DEFAULT_TEMPLATE
}

/** Return genuinely different, ranked candidates for the quality tournament. */
export function selectTemplateCandidates(
  company: CompanyProfile,
  report: DiagnosticReportData,
  count = 3,
): DemoTemplate[] {
  const industry = company.industry ?? "consulting"
  const locale = company.report_locale ?? report.report_locale ?? "ja"
  const ranked = DEMO_TEMPLATES.map((template) => {
    let score = 0

    // Industry match (weight × 3)
    if (template.industries.includes(industry)) {
      score += template.weight * 3
    }

    // Diagnostic severity profile adjustments
    score += severityScore(template, report)

    // Company size (tech stack sophistication)
    const hasAdvancedStack = !!company.tech_stack && Object.keys(company.tech_stack as Record<string, unknown>).length > 2
    if (hasAdvancedStack) {
      // Tech companies prefer aether/prism
      if (template.id === "aether" || template.id === "prism") score += 15
    }

    // PageSpeed — if very slow, prefer data-dense templates
    const ps = company.pagespeed_mobile ?? 50
    if (ps < 40) {
      if (template.id === "vertex" || template.id === "zenith") score += 10
    } else if (ps > 70) {
      // Already fast — show off with luxe templates
      if (template.id === "apex" || template.id === "flux") score += 10
    }

    // Locale affiliation
    if (locale === "ja" && template.id === "zenith") score += 5

    // Stable tie-breaker without overriding semantic ranking.
    score += simpleHash(`${company.company_name}:${template.id}`) % 7
    return { template, score }
  }).sort((left, right) => right.score - left.score || left.template.id.localeCompare(right.template.id))

  const fallback = pickByIndustry(industry)
  const ordered = ranked[0]?.score > 0
    ? ranked.map(({ template }) => template)
    : [fallback, ...ranked.map(({ template }) => template).filter((template) => template.id !== fallback.id)]

  return ordered.slice(0, Math.max(1, Math.min(count, DEMO_TEMPLATES.length)))
}

function severityScore(template: DemoTemplate, report: DiagnosticReportData): number {
  let score = 0

  // Count critical and warning signals
  let criticalCount = 0
  let warningCount = 0
  for (const signal of report.intelligence?.signals ?? []) {
    if (signal.tone === "critical") criticalCount++
    else if (signal.tone === "warning") warningCount++
  }

  // Many critical issues → data-dense/clinical template
  if (criticalCount >= 3) {
    if (template.id === "vertex") score += 20
    if (template.id === "zenith") score += 10
  }

  // Moderate issues → balanced templates
  if (warningCount >= 2 && criticalCount < 3) {
    if (template.id === "aether" || template.id === "prism") score += 10
  }

  // Low severity → luxury/showcase
  if (criticalCount === 0 && warningCount <= 1) {
    if (template.id === "apex" || template.id === "flux") score += 15
  }

  return score
}

function pickByIndustry(industry: string): DemoTemplate {
  const map: Record<string, string> = {
    consulting: "zenith",
    accounting: "zenith",
    dental: "vertex",
    construction: "terra",
    restaurant: "nomad",
    retail: "prism",
    beauty_salon: "apex",
    cleaning: "prism",
  }
  const id = map[industry] ?? "zenith"
  return DEMO_TEMPLATES.find((t) => t.id === id) ?? DEFAULT_TEMPLATE
}

/** Simple string hash for deterministic but pseudo-random selection */
function simpleHash(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}
