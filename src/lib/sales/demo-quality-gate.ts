import type {
  DemoCandidateSummary,
  DemoCreativeDirection,
  DemoDesignRecipe,
  DemoMultiPageData,
  DemoQualityReport,
  DemoRightsManifest,
} from "./demo-site-types"
import type { DemoTemplate } from "./demo-templates/registry"
import { findUnsupportedDemoClaims } from "./demo-copy-grounding"
import { analyzeDemoQualitySignals } from "./demo-quality-signals"
import { visualGrammar } from "./demo-creative-direction"

export const DEMO_QUALITY_GATE_VERSION = "2026-07-14.6"
export const DEMO_QUALITY_THRESHOLD = 94
export const DEMO_VISUAL_SIMILARITY_THRESHOLD = 0.8

const FABRICATION_PATTERNS = [
  /問い合わせ.{0,8}(倍|増)/u,
  /予約.{0,8}(倍|増)/u,
  /売上.{0,8}(倍|増|アップ)/u,
  /新規患者.{0,8}(増|アップ)/u,
  /直帰率.{0,8}(下|改善)/u,
  /inquir(?:y|ies).{0,12}(doubled|increased)/iu,
  /(?:sales|revenue|reservations?).{0,12}(doubled|increased)/iu,
]

export function buildDesignRecipe(
  template: DemoTemplate,
  page: DemoMultiPageData,
  creativeDirection?: DemoCreativeDirection,
): DemoDesignRecipe {
  const seed = Number.parseInt(fingerprint(`${page.companyId}:${template.id}`).slice(-6), 16)
  const safeSections = template.layout.home.sections.filter(
    (section) => !["loss", "testimonials", "trustedBy"].includes(section),
  )
  const fixedHero = safeSections.filter((section) => section === "hero")
  const flexibleSections = safeSections.filter((section) => section !== "hero")
  const shift = flexibleSections.length > 0 ? seed % flexibleSections.length : 0
  const rotatedSections = [...flexibleSections.slice(shift), ...flexibleSections.slice(0, shift)]
  const direction = creativeDirection ?? {
    source: "deterministic" as const,
    concept: `${page.companyName} ${template.id}`,
    typographyStyle: "modern-grotesk" as const,
    heroComposition: template.layout.home.heroVariant === "fullscreen" ? "cinematic" as const : "precision-split" as const,
    serviceLayout: "precision-grid" as const,
    worksLayout: "case-grid" as const,
    paletteMood: "cool-professional" as const,
    density: "balanced" as const,
    motion: "editorial" as const,
    signatureMotif: "numbered-index" as const,
  }
  return {
    templateId: template.id,
    heroVariant: template.layout.home.heroVariant,
    featureLayout: template.layout.home.featureLayout,
    serviceCardStyle: template.layout.services.cardStyle,
    navStyle: template.nav,
    footerStyle: template.footer,
    sectionOrder: [...fixedHero, ...rotatedSections],
    palette: {
      accent: page.meta.accentColor,
      accentDark: page.meta.accentColorDark,
    },
    density: direction.density,
    containerWidth: template.designTokens.containerWidth,
    compositionVariant: seed % 12,
    rhythmVariant: Math.floor(seed / 12) % 4,
    motionVariant: direction.motion,
    creativeDirection: direction,
    pageCompositions: {
      home: direction.heroComposition,
      about: ["story-led", "profile-led", "values-led"][Math.floor(seed / 3) % 3],
      services: direction.serviceLayout,
      works: direction.worksLayout,
      news: ["journal-index", "social-desk", "notice-board"][Math.floor(seed / 81) % 3],
      recruit: ["culture-story", "role-guide", "principles-led"][Math.floor(seed / 243) % 3],
      contact: ["map-led", "details-led", "split-contact"][Math.floor(seed / 729) % 3],
      legal: "editorial-document",
    },
  }
}

export function buildProposalRightsManifest(demoMedia?: unknown): DemoRightsManifest {
  const mediaAssets = Array.isArray(demoMedia)
    ? demoMedia.flatMap((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return []
        const item = value as Record<string, unknown>
        const source = typeof item.src === "string" ? item.src : ""
        const usage = item.usage
        if (!source || !["owned", "licensed", "proposal_only"].includes(String(usage))) return []
        return [{ kind: "image" as const, source, usage: usage as "owned" | "licensed" | "proposal_only" }]
      })
    : []
  return {
    status: "proposal_safe",
    assets: [
      { kind: "text", source: "verified company and diagnostic data", usage: "public_fact" },
      { kind: "logo", source: "generated text monogram", usage: "proposal_only" },
      { kind: "font", source: "application bundled fonts", usage: "licensed" },
      ...mediaAssets,
    ],
  }
}

export function evaluateDemoQuality(
  page: DemoMultiPageData,
  recipe: DemoDesignRecipe,
  rights: DemoRightsManifest,
  existingStructuralFingerprints: ReadonlySet<string> = new Set(),
  existingCreativeDirections: readonly DemoCreativeDirection[] = [],
): DemoQualityReport {
  const hardBlockers: string[] = []
  const warnings: string[] = []
  const serialized = JSON.stringify(page)
  const customerFacingCopy = JSON.stringify({
    meta: {
      title: page.meta.title,
      description: page.meta.description,
      primaryCtaLabel: page.meta.primaryCtaLabel,
      primaryCtaHref: page.meta.primaryCtaHref,
      footerDescription: page.meta.footerDescription,
    },
    pages: page.pages,
    premium: page.premium ? {
      intro: page.premium.intro,
      heroMedia: page.premium.heroMedia.map(({ alt, eyebrow, title, caption }) => ({ alt, eyebrow, title, caption })),
      gallery: page.premium.gallery.map(({ alt, eyebrow, title, caption }) => ({ alt, eyebrow, title, caption })),
    } : null,
  })
  const verifiedFacts = (page.meta.verifiedFacts ?? []).join("\n")
  const structuralFingerprint = renderGrammarFingerprint(recipe)

  if (!page.companyName.trim() || !page.pages.home.hero.title.trim()) {
    hardBlockers.push("company_identity_or_hero_missing")
  }
  if (!page.meta.sourceEvidence?.length) {
    hardBlockers.push("verified_source_coverage_missing")
  }
  if (page.meta.engine !== "deepseek") {
    hardBlockers.push("quality_copy_generation_missing")
  }
  if (/paradigm|japan entry|paradigmjp\.com|cal\.com\/paradigm/iu.test(customerFacingCopy)) {
    hardBlockers.push("provider_brand_leak")
  }
  if (/web改善デモ|improvement demo|改善後のイメージ|公開データを分析|診断フック|inquiry path|security and trust headers/iu.test(customerFacingCopy)) {
    hardBlockers.push("sales_diagnostic_copy_leak")
  }
  const unsupportedClaims = findUnsupportedDemoClaims(customerFacingCopy, verifiedFacts)
  if (unsupportedClaims.includes("asset_provenance")) hardBlockers.push("unsupported_asset_provenance_claim")
  if (unsupportedClaims.includes("chronology")) hardBlockers.push("unsupported_chronology_claim")
  if (unsupportedClaims.includes("history")) hardBlockers.push("unsupported_history_claim")
  if (unsupportedClaims.includes("operations")) hardBlockers.push("unsupported_operational_claim")
  if (unsupportedClaims.includes("product_detail")) hardBlockers.push("unsupported_product_detail_claim")
  if (page.pages.contact.formEnabled !== false) {
    hardBlockers.push("private_demo_form_send_enabled")
  }
  const approvedExternalCtas = new Set(page.premium?.social.map((item) => item.href) ?? [])
  const ctaHrefs = [page.pages.home.hero.primaryCta.href, page.pages.home.cta.buttonHref, page.pages.services.ctaHref].filter((href): href is string => Boolean(href))
  if (ctaHrefs.some((href) => /^https?:\/\//u.test(href) && !approvedExternalCtas.has(href))) {
    hardBlockers.push("unreviewed_external_cta")
  }
  if (!page.pages.about || !page.pages.services || !page.pages.contact
    || !page.pages.works || !page.pages.news || !page.pages.faq
    || !page.pages.recruit || !page.pages.privacy || !page.pages.terms
    || !page.pages.commerce) {
    hardBlockers.push("required_page_missing")
  }
  if (!page.premium || page.premium.heroMedia.length < 3 || page.premium.gallery.length < 3) {
    hardBlockers.push("premium_visual_story_missing")
  }
  const hasVerifiedBrandPath = Boolean(page.premium?.social.length)
    || Boolean(page.meta.sourceEvidence?.some((source) => [
      "official_profile",
      "official_feed",
      "public_registry",
      "customer_provided",
      "operator_verified",
    ].includes(source)))
  if (!hasVerifiedBrandPath) {
    hardBlockers.push("verified_brand_path_missing")
  }
  if (page.premium && !rights.assets.some((asset) => asset.kind === "image" && asset.usage !== "unknown")) {
    hardBlockers.push("premium_media_rights_missing")
  }
  if (page.pages.home.testimonials?.length || page.pages.home.trustedBy?.length) {
    hardBlockers.push("unverified_social_proof")
  }
  if (page.pages.home.totalLoss || page.pages.home.metricsSummary?.recoveryAmount) {
    hardBlockers.push("unverified_financial_projection")
  }
  if (FABRICATION_PATTERNS.some((pattern) => pattern.test(serialized))) {
    hardBlockers.push("fabricated_outcome_claim")
  }
  if (rights.status === "blocked" || rights.assets.some((asset) => asset.usage === "unknown")) {
    hardBlockers.push("asset_rights_unverified")
  }
  if (existingStructuralFingerprints.has(structuralFingerprint)) {
    hardBlockers.push("structural_collision")
  }
  if (existingCreativeDirections.some((direction) => (
    visualGrammarSimilarity(recipe.creativeDirection, direction) >= DEMO_VISUAL_SIMILARITY_THRESHOLD
  ))) {
    hardBlockers.push("visual_similarity_collision")
  }
  if (recipe.creativeDirection.source !== "deepseek") warnings.push("deterministic_art_direction")
  if (recipe.creativeDirection.concept.trim().length < 8) hardBlockers.push("company_art_direction_missing")
  if (page.brandSystem && page.brandSystem.displayFont === page.brandSystem.bodyFont) {
    hardBlockers.push("unbalanced_typography_pairing")
  }
  const uniquePremiumMedia = new Set([
    ...(page.premium?.heroMedia ?? []),
    ...(page.premium?.gallery ?? []),
  ].map((item) => item.src)).size
  if (uniquePremiumMedia < 3) hardBlockers.push("visual_media_repetition")
  const primaryMedia = page.premium?.heroMedia[0]
  const missingOrLowResolution = primaryMedia?.kind === "image"
    && (typeof primaryMedia.width !== "number"
      || typeof primaryMedia.height !== "number"
      || primaryMedia.width < 1_200
      || primaryMedia.height < 720)
  if (recipe.creativeDirection.heroComposition !== "mosaic"
    && (missingOrLowResolution || isLikelyThumbnail(primaryMedia?.src ?? ""))) {
    hardBlockers.push("hero_media_resolution_risk")
  }
  if (page.pages.services.services.length < 2) warnings.push("service_detail_thin")
  if (page.pages.home.features.length < 3) warnings.push("home_evidence_thin")
  if (!page.pages.contact.formNote) warnings.push("contact_expectation_missing")

  const editorial = analyzeDemoQualitySignals(page)
  hardBlockers.push(...editorial.blockers)
  warnings.push(...editorial.warnings)

  const dimensionScore = Object.values(editorial.dimensions).reduce((total, value) => total + value, 0)
  const score = hardBlockers.length > 0
    ? Math.min(70, Math.max(0, dimensionScore - hardBlockers.length * 12 - warnings.length * 2))
    : Math.max(0, dimensionScore - warnings.length * 2)
  return {
    version: DEMO_QUALITY_GATE_VERSION,
    score,
    passed: score >= DEMO_QUALITY_THRESHOLD && hardBlockers.length === 0,
    hardBlockers,
    warnings,
    dimensions: editorial.dimensions,
    assessmentStage: "structural_preflight",
    checks: {
      requiredPages: !hardBlockers.includes("required_page_missing"),
      evidenceSafe: !hardBlockers.some((item) => item.includes("unverified") || item.includes("fabricated") || item.includes("source_coverage")),
      rightsSafe: !hardBlockers.includes("asset_rights_unverified"),
      structurallyUnique: !hardBlockers.some((item) => item === "structural_collision" || item === "visual_similarity_collision"),
      contactReady: Boolean(page.pages.contact),
    },
  }
}

export function summarizeCandidate(
  page: DemoMultiPageData,
  recipe: DemoDesignRecipe,
  quality: DemoQualityReport,
): DemoCandidateSummary {
  const renderFingerprint = renderGrammarFingerprint(recipe)
  return {
    templateId: recipe.templateId,
    score: quality.score,
    passed: quality.passed,
    designFingerprint: fingerprint({ companyId: page.companyId, recipe }),
    structuralFingerprint: renderFingerprint,
    renderFingerprint,
    hardBlockers: quality.hardBlockers,
    visualVariant: Object.values(visualGrammar(recipe.creativeDirection)).join(":"),
    creativeConcept: recipe.creativeDirection.concept,
  }
}

export function renderGrammarFingerprint(recipe: DemoDesignRecipe): string {
  return fingerprint(visualGrammar(recipe.creativeDirection))
}

export function collidingCandidateIndexes(recipes: readonly DemoDesignRecipe[]): Set<number> {
  const collisions = new Set<number>()
  recipes.forEach((recipe, index) => {
    for (let comparisonIndex = index + 1; comparisonIndex < recipes.length; comparisonIndex += 1) {
      const comparison = recipes[comparisonIndex]
      if (visualGrammarSimilarity(recipe.creativeDirection, comparison.creativeDirection) < DEMO_VISUAL_SIMILARITY_THRESHOLD) continue
      collisions.add(index)
      collisions.add(comparisonIndex)
    }
  })
  return collisions
}

export function visualGrammarSimilarity(
  left: DemoCreativeDirection,
  right: DemoCreativeDirection,
): number {
  const leftGrammar = visualGrammar(left)
  const rightGrammar = visualGrammar(right)
  const fields = Object.keys(leftGrammar)
  if (fields.length === 0) return 0
  const matches = fields.filter((field) => leftGrammar[field] === rightGrammar[field]).length
  return matches / fields.length
}

function isLikelyThumbnail(value: string): boolean {
  if (!value) return false
  if (/[?&](?:w|width|size|sz)=([1-3]?\d{1,2})(?:&|$)/iu.test(value)) return true
  return /(?:^|[/?&_.-])(?:thumb|thumbnail|small|1to1_[sm])(?:[/_.?&-]|$)/iu.test(value)
}

export function fingerprint(value: unknown): string {
  const input = stableStringify(value)
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `dq-${(hash >>> 0).toString(16).padStart(8, "0")}`
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}
