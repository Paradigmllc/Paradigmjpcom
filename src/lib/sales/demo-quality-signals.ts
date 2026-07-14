import type { DemoMultiPageData, DemoQualityReport } from "./demo-site-types"
import { hasRepeatedHomeNarrative } from "./demo-art-direction"

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

const EDITORIAL_METADATA_PATTERNS = [
  /404/u,
  /business\.site/iu,
  /登録公式URL/u,
  /エキテン公式店舗.{0,48}(?:取得|確認|更新)/u,
  /現在確認できる情報の一つ/u,
  /正式公開前に事業者確認/u,
  /source\s*(?:url|updated|date)/iu,
]

const GENERIC_NAV_LABELS = new Set(["会社概要", "サービス", "実績"])

const PAGE_DEPTH_MINIMUMS = {
  home: 900,
  about: 1_050,
  services: 1_000,
  works: 800,
  news: 350,
  faq: 250,
  recruit: 380,
  privacy: 500,
  terms: 500,
  commerce: 500,
  contact: 80,
} as const

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
  const reusableMediaCopy = new Set(collectStrings({
    heroMedia: page.premium?.heroMedia ?? [],
    gallery: page.premium?.gallery ?? [],
  }))
  for (const text of collectStrings(page.pages)) {
    if (text.length < 42) continue
    // Reviewed images are intentionally reused across the hero, gallery, and
    // lower pages. Their URL, alt, and provenance caption are media metadata,
    // not duplicated customer-facing body copy.
    if (reusableMediaCopy.has(text)) continue
    counts.set(text, (counts.get(text) ?? 0) + 1)
  }
  return [...counts.values()].some((count) => count >= 3)
}

function hasRepeatedEditorialFragment(value: unknown): boolean {
  for (const text of collectStrings(value)) {
    const counts = new Map<string, number>()
    for (const fragment of text.split(/[。．.!！?？]+/u)) {
      const normalized = fragment.replace(/\s+/gu, " ").trim().toLocaleLowerCase()
      if (normalized.length < 24) continue
      const count = (counts.get(normalized) ?? 0) + 1
      if (count >= 2) return true
      counts.set(normalized, count)
    }
  }
  return false
}

export function analyzeDemoQualitySignals(page: DemoMultiPageData): {
  blockers: string[]
  warnings: string[]
  dimensions: DemoQualityReport["dimensions"]
} {
  const blockers: string[] = []
  const warnings: string[] = []
  const copy = collectStrings({ meta: page.meta, pages: page.pages }).join("\n")
  const editorialCopy = {
    home: {
      features: page.pages.home.features,
      narrativeModules: page.pages.home.narrativeModules,
    },
    about: {
      story: page.pages.about.story,
      mission: page.pages.about.mission,
      values: page.pages.about.values,
      chapters: page.pages.about.chapters,
    },
    services: {
      subtitle: page.pages.services.subtitle,
      services: page.pages.services.services,
      process: page.pages.services.process,
      guidance: page.pages.services.guidance,
    },
    works: page.pages.works,
  }
  const editorialText = collectStrings(editorialCopy).join("\n")
  const navLabels = Object.values(page.meta.navLabels ?? {})
  const sectionCount = Object.values(page.pages).reduce((total, item) => {
    if (!item || typeof item !== "object" || !("sections" in item)) return total
    return total + (Array.isArray(item.sections) ? item.sections.length : 0)
  }, 0)
  const pageDepth = Object.fromEntries(Object.entries(PAGE_DEPTH_MINIMUMS).map(([key]) => {
    const pageValue = page.pages[key as keyof DemoMultiPageData["pages"]]
    return [key, collectStrings(pageValue).join("").length]
  })) as Record<keyof typeof PAGE_DEPTH_MINIMUMS, number>

  if (DRAFT_PATTERNS.some((pattern) => pattern.test(copy))) blockers.push("customer_facing_draft_copy")
  if (EDITORIAL_METADATA_PATTERNS.some((pattern) => pattern.test(editorialText))) blockers.push("editorial_source_metadata_leak")
  if (hasRepeatedEditorialFragment(editorialCopy)) blockers.push("repeated_editorial_fragment")
  if (duplicateLongCopy(page)) blockers.push("repeated_customer_copy")
  if (hasRepeatedHomeNarrative(page)) blockers.push("repeated_home_narrative")
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
  const homeNarrative = page.pages.home.narrativeModules ?? []
  const aboutChapters = page.pages.about.chapters ?? []
  const serviceGuidance = page.pages.services.guidance ?? []
  if (homeNarrative.length < 3 || homeNarrative.some((item) => item.body.length < 120)) {
    blockers.push("home_narrative_depth_missing")
  }
  if (aboutChapters.length < 3 || aboutChapters.some((item) => item.body.length < 120)) {
    blockers.push("about_narrative_depth_missing")
  }
  if (serviceGuidance.length < 3 || serviceGuidance.some((item) => item.body.length < 120)) {
    blockers.push("service_guidance_depth_missing")
  }
  if ((page.pages.works?.sections.length ?? 0) < 4 || page.pages.works?.sections.some((item) => item.body.length < 120)) {
    blockers.push("works_content_architecture_missing")
  }
  for (const [key, minimum] of Object.entries(PAGE_DEPTH_MINIMUMS)) {
    const length = pageDepth[key as keyof typeof PAGE_DEPTH_MINIMUMS]
    if (length < minimum) blockers.push(`page_content_thin:${key}`)
    else if (length < minimum * 1.15) warnings.push(`page_content_near_minimum:${key}`)
  }
  if (page.premium?.style !== "premium-v3" || !page.brandSystem) blockers.push("premium_v3_brand_system_missing")
  if (!page.designRecipe?.pageCompositions || Object.keys(page.designRecipe.pageCompositions).length < 8) {
    blockers.push("page_composition_system_missing")
  } else if (new Set(Object.values(page.designRecipe.pageCompositions)).size < 6) {
    blockers.push("page_composition_repetition")
  }

  const specificity = Math.max(0, 25
    - (blockers.includes("industry_navigation_mismatch") ? 12 : 0)
    - (blockers.includes("customer_facing_draft_copy") ? 10 : 0)
    - (navLabels.length < 6 ? 5 : 0))
  const contentDepth = Math.max(0, 25
    - (warnings.includes("works_content_thin") ? 5 : 0)
    - (warnings.includes("news_content_thin") ? 4 : 0)
    - (warnings.includes("fixed_page_content_thin") ? 7 : 0)
    - (blockers.includes("repeated_customer_copy") ? 10 : 0)
    - (blockers.includes("repeated_home_narrative") ? 10 : 0)
    - (blockers.includes("editorial_source_metadata_leak") ? 12 : 0)
    - (blockers.includes("repeated_editorial_fragment") ? 10 : 0)
    - (blockers.filter((item) => item.endsWith("_depth_missing") || item === "works_content_architecture_missing").length * 5)
    - (blockers.filter((item) => item.startsWith("page_content_thin:")).length * 4)
    - (warnings.filter((item) => item.startsWith("page_content_near_minimum:")).length * 1))
  const trustSafety = Math.max(0, 25
    - (blockers.includes("presentation_metadata_incomplete") ? 10 : 0)
    - (page.pages.contact.formEnabled === false ? 0 : 15))
  const visualReadiness = Math.max(0, 25
    - (!page.premium || page.premium.heroMedia.length < 3 ? 12 : 0)
    - (!page.premium || page.premium.gallery.length < 3 ? 8 : 0)
    - (blockers.includes("process_heading_missing") ? 5 : 0)
    - (blockers.includes("premium_v3_brand_system_missing") ? 10 : 0)
    - (blockers.includes("page_composition_system_missing") ? 8 : 0)
    - (blockers.includes("page_composition_repetition") ? 8 : 0))

  return { blockers, warnings, dimensions: { specificity, contentDepth, trustSafety, visualReadiness } }
}
