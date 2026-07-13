import type { DemoMultiPageData, DemoQualityReport } from "./demo-site-types"

const DRAFT_PATTERNS = [
  /掲載構成案/u,
  /代表事例\s*0?\d/u,
  /ヒアリング後に確定/u,
  /管理画面から追加/u,
  /料金は要確認/u,
  /現在、公開済みのお知らせはありません/u,
  /内容は確認後に確定/u,
  /pricing to be confirmed/iu,
]

const GENERIC_NAV_LABELS = new Set(["会社概要", "サービス", "実績"])

function collectStrings(value: unknown, output: string[] = []): string[] {
  if (typeof value === "string") {
    const normalized = value.replace(/\s+/gu, " ").trim()
    if (normalized) output.push(normalized)
    return output
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, output))
    return output
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectStrings(item, output))
  }
  return output
}

function duplicateLongCopy(page: DemoMultiPageData): boolean {
  const counts = new Map<string, number>()
  for (const text of collectStrings(page.pages)) {
    if (text.length < 42) continue
    counts.set(text, (counts.get(text) ?? 0) + 1)
  }
  return [...counts.values()].some((count) => count >= 3)
}

export function analyzeDemoQualitySignals(page: DemoMultiPageData): {
  blockers: string[]
  warnings: string[]
  dimensions: DemoQualityReport["dimensions"]
} {
  const blockers: string[] = []
  const warnings: string[] = []
  const copy = collectStrings({ meta: page.meta, pages: page.pages }).join("\n")
  const navLabels = Object.values(page.meta.navLabels ?? {})
  const sectionCount = Object.values(page.pages).reduce((total, item) => {
    if (!item || typeof item !== "object" || !("sections" in item)) return total
    return total + (Array.isArray(item.sections) ? item.sections.length : 0)
  }, 0)

  if (DRAFT_PATTERNS.some((pattern) => pattern.test(copy))) blockers.push("customer_facing_draft_copy")
  if (duplicateLongCopy(page)) blockers.push("repeated_customer_copy")
  if (!page.meta.proposalNotice || !page.meta.footerDescription || navLabels.length < 6) {
    blockers.push("presentation_metadata_incomplete")
  }
  if (page.pages.services.process.length > 0 && (!page.pages.services.processEyebrow?.trim() || !page.pages.services.processTitle?.trim())) {
    blockers.push("process_heading_missing")
  }
  if (page.industry === "restaurant") {
    if (navLabels.some((label) => GENERIC_NAV_LABELS.has(label)) || !navLabels.includes("メニュー") || !navLabels.includes("アクセス")) {
      blockers.push("industry_navigation_mismatch")
    }
  }
  if ((page.pages.works?.sections.length ?? 0) < 2) warnings.push("works_content_thin")
  if ((page.pages.news?.sections.length ?? 0) < 1) warnings.push("news_content_thin")
  if (sectionCount < 9) warnings.push("fixed_page_content_thin")

  const specificity = Math.max(0, 25
    - (blockers.includes("industry_navigation_mismatch") ? 12 : 0)
    - (blockers.includes("customer_facing_draft_copy") ? 10 : 0)
    - (navLabels.length < 6 ? 5 : 0))
  const contentDepth = Math.max(0, 25
    - (warnings.includes("works_content_thin") ? 5 : 0)
    - (warnings.includes("news_content_thin") ? 4 : 0)
    - (warnings.includes("fixed_page_content_thin") ? 7 : 0)
    - (blockers.includes("repeated_customer_copy") ? 10 : 0))
  const trustSafety = Math.max(0, 25
    - (blockers.includes("presentation_metadata_incomplete") ? 10 : 0)
    - (page.pages.contact.formEnabled === false ? 0 : 15))
  const visualReadiness = Math.max(0, 25
    - (!page.premium || page.premium.heroMedia.length < 3 ? 12 : 0)
    - (!page.premium || page.premium.gallery.length < 3 ? 8 : 0)
    - (blockers.includes("process_heading_missing") ? 5 : 0))

  return { blockers, warnings, dimensions: { specificity, contentDepth, trustSafety, visualReadiness } }
}
