import type {
  DemoCandidateSummary,
  DemoDesignRecipe,
  DemoMultiPageData,
  DemoQualityReport,
  DemoRightsManifest,
} from "./demo-site-types"
import type { DemoTemplate } from "./demo-templates/registry"

export const DEMO_QUALITY_GATE_VERSION = "2026-07-13.2"
export const DEMO_QUALITY_THRESHOLD = 90

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
): DemoDesignRecipe {
  const seed = Number.parseInt(fingerprint(`${page.companyId}:${template.id}`).slice(-6), 16)
  const safeSections = template.layout.home.sections.filter(
    (section) => !["loss", "testimonials", "trustedBy"].includes(section),
  )
  const fixedHero = safeSections.filter((section) => section === "hero")
  const flexibleSections = safeSections.filter((section) => section !== "hero")
  const shift = flexibleSections.length > 0 ? seed % flexibleSections.length : 0
  const rotatedSections = [...flexibleSections.slice(shift), ...flexibleSections.slice(0, shift)]
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
    density: template.designTokens.spacing,
    containerWidth: template.designTokens.containerWidth,
    compositionVariant: seed % 12,
    rhythmVariant: Math.floor(seed / 12) % 4,
    motionVariant: (["restrained", "editorial", "expressive"] as const)[Math.floor(seed / 48) % 3],
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
  const structuralFingerprint = fingerprint(recipe)

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
  if (/(?:19|20)\d{2}/u.test(customerFacingCopy) && !/(?:19|20)\d{2}/u.test(verifiedFacts)) {
    hardBlockers.push("unsupported_chronology_claim")
  }
  if (/(長年|創業|以来|歩んできた|信頼を築いて)/u.test(customerFacingCopy) && !/(創業|設立|沿革|(?:19|20)\d{2})/u.test(verifiedFacts)) {
    hardBlockers.push("unsupported_history_claim")
  }
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
  if (!page.premium?.social.length) {
    hardBlockers.push("social_brand_path_missing")
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
  if (page.pages.services.services.length < 2) warnings.push("service_detail_thin")
  if (page.pages.home.features.length < 3) warnings.push("home_evidence_thin")
  if (!page.pages.contact.formNote) warnings.push("contact_expectation_missing")

  const score = Math.max(0, 100 - hardBlockers.length * 30 - warnings.length * 3)
  return {
    version: DEMO_QUALITY_GATE_VERSION,
    score,
    passed: score >= DEMO_QUALITY_THRESHOLD && hardBlockers.length === 0,
    hardBlockers,
    warnings,
    checks: {
      requiredPages: !hardBlockers.includes("required_page_missing"),
      evidenceSafe: !hardBlockers.some((item) => item.includes("unverified") || item.includes("fabricated") || item.includes("source_coverage")),
      rightsSafe: !hardBlockers.includes("asset_rights_unverified"),
      structurallyUnique: !hardBlockers.includes("structural_collision"),
      contactReady: Boolean(page.pages.contact),
    },
  }
}

export function summarizeCandidate(
  page: DemoMultiPageData,
  recipe: DemoDesignRecipe,
  quality: DemoQualityReport,
): DemoCandidateSummary {
  return {
    templateId: recipe.templateId,
    score: quality.score,
    passed: quality.passed,
    designFingerprint: fingerprint({ companyId: page.companyId, recipe }),
    structuralFingerprint: fingerprint(recipe),
    hardBlockers: quality.hardBlockers,
  }
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
