/**
 * lib/sales/demo-site-types.ts — Full-stack demo site type definitions.
 *
 * These types bridge the diagnostic report data and the Next.js demo page,
 * providing a strongly-typed contract for the demo generation pipeline.
 *
 * v2 (2026-06-23): Added DemoMultiPageData and sub-page types for the
 * multi-page deliverable website upgrade (Home/About/Services/Contact).
 */
import type { Industry, ReportLocale } from "./types"
import type { DemoTemplate } from "./demo-templates/registry"

export interface DemoBlock {
  id: string
  type: "Hero" | "Features" | "Stats" | "BeforeAfter" | "CallToAction" | "Navigation"
  props: Record<string, unknown>
}

export interface DemoNavigationItem {
  label: string
  href: string
}

export interface DemoHeroProps {
  title: string
  subtitle: string
  tagline: string
  companyName: string
  industryLabel: string
  locationLabel: string
  primaryCta: { text: string; href: string }
  secondaryCta: { text: string; href: string }
  accentColor: string
  accentColorDark: string
}

export interface DemoFeatureItem {
  title: string
  description: string
  icon: string
  metricLabel: string
  metricValue: string
  metricBench: string
  severity: "critical" | "warning" | "info"
}

export interface DemoStatsItem {
  amount: string
  title: string
  icon: string
}

export interface DemoBeforeAfterItem {
  id: string
  label: string
  beforeDescription: string
  afterDescription: string
  beforeImageUrl: string | null
  afterImageUrl: string | null
  severity: "critical" | "warning" | "info"
}

export interface DemoCtaProps {
  title: string
  subtitle: string
  buttonText: string
  buttonHref: string
  accentColor: string
  accentColorDark: string
}

export interface DemoMeta {
  title: string
  description: string
  ogImage: string
  industry: Industry | null
  locale: ReportLocale
  companyName: string
  accentColor: string
  accentColorDark: string
  calBookingUrl: string
  generatedAt: string
  engine: string
  llmModel?: string
  llmUsage?: {
    promptTokens: number
    completionTokens: number
    cacheHitTokens: number
    cacheMissTokens: number
    cacheHitRatio: number
  }
  sourceEvidence?: string[]
  verifiedFacts?: string[]
  proposalNotice?: string
  primaryCtaLabel?: string
  primaryCtaHref?: string
  footerDescription?: string
  footerOwner?: string
  brandLogoUrl?: string
  navLabels?: Partial<Record<"home" | "about" | "services" | "works" | "faq" | "contact", string>>
}

export interface DemoPageData {
  slug: string
  companyId: string
  companyName: string
  locale: ReportLocale
  industry: Industry | null
  industryLabel: string
  locationLabel: string
  hero: DemoHeroProps
  navigation: DemoNavigationItem[]
  features: DemoFeatureItem[]
  stats: DemoStatsItem[]
  beforeAfter: DemoBeforeAfterItem[]
  cta: DemoCtaProps
  totalLoss: string
  meta: DemoMeta
  blocks: DemoBlock[]
}

export interface DemoGenerateInput {
  companyId: string
  locale?: ReportLocale
}

export interface DemoGenerateOutput {
  ok: boolean
  demoUrl: string | null
  slug: string | null
  qualityScore?: number
  publicationStatus?: DemoPublicationStatus
  candidates?: DemoCandidateSummary[]
  qualityReport?: DemoQualityReport
  error?: string
}

export type DemoPublicationStatus =
  | "draft"
  | "quality_review"
  | "approved"
  | "published"
  | "rejected"
  | "legacy_published"
  | "private_review"

export type DemoTypographyStyle =
  | "editorial-serif"
  | "humanist-sans"
  | "modern-grotesk"
  | "technical-sans"

export type DemoHeroComposition =
  | "cinematic"
  | "editorial-split"
  | "precision-split"
  | "mosaic"

export type DemoServiceLayout = "editorial-list" | "salon-catalogue" | "precision-grid"
export type DemoWorksLayout = "journal" | "salon-lookbook" | "case-grid"

/**
 * A bounded art direction that the renderer can actually execute. DeepSeek
 * chooses from these primitives in one shared request; it never emits CSS.
 */
export interface DemoCreativeDirection {
  source: "deepseek" | "deterministic"
  concept: string
  typographyStyle: DemoTypographyStyle
  heroComposition: DemoHeroComposition
  serviceLayout: DemoServiceLayout
  worksLayout: DemoWorksLayout
  paletteMood: "warm-neutral" | "cool-professional" | "earth" | "monochrome" | "soft-contrast"
  density: "airy" | "balanced" | "compact"
  motion: "restrained" | "editorial" | "expressive"
  signatureMotif: "hairline" | "numbered-index" | "framed-media" | "offset-grid" | "kinetic-rail"
}

export interface DemoDesignRecipe {
  templateId: string
  heroVariant: string
  featureLayout: string
  serviceCardStyle: string
  navStyle: string
  footerStyle: string
  sectionOrder: string[]
  palette: { accent: string; accentDark: string }
  density: string
  containerWidth: string
  compositionVariant: number
  rhythmVariant: number
  motionVariant: "restrained" | "editorial" | "expressive"
  typographyPreset?: string
  creativeDirection: DemoCreativeDirection
  pageCompositions?: Partial<Record<"home" | "about" | "services" | "works" | "news" | "faq" | "recruit" | "contact" | "legal", string>>
}

export interface DemoBrandSystem {
  id: string
  displayFont: string
  bodyFont: string
  headingWeight: 400 | 500 | 600 | 700
  surface: string
  surfaceAlt: string
  ink: string
  muted: string
  line: string
  heroTone: "cinematic" | "editorial" | "precision" | "welcoming"
  imageTreatment: "warm" | "natural" | "crisp" | "monochrome"
  shape: "square" | "soft" | "rounded"
}

export interface DemoRightsAsset {
  kind: "text" | "image" | "logo" | "font" | "map"
  source: string
  usage: "owned" | "licensed" | "public_fact" | "proposal_only" | "unknown"
  reference?: string
}

export interface DemoRightsManifest {
  status: "proposal_safe" | "verified" | "blocked"
  assets: DemoRightsAsset[]
}

export interface DemoQualityReport {
  version: string
  score: number
  passed: boolean
  hardBlockers: string[]
  warnings: string[]
  checks: Record<string, boolean>
  dimensions: {
    specificity: number
    contentDepth: number
    trustSafety: number
    visualReadiness: number
  }
  assessmentStage?: "structural_preflight" | "render_audit"
}

export interface DemoCandidateSummary {
  templateId: string
  score: number
  passed: boolean
  designFingerprint: string
  structuralFingerprint: string
  renderFingerprint: string
  hardBlockers: string[]
  visualVariant: string
  creativeConcept: string
}

/* ───── Multi-page types (v2) ───── */

export interface DemoMultiPageData {
  slug: string
  companyId: string
  companyName: string
  locale: ReportLocale
  industry: Industry | null
  meta: DemoMeta
  /** Template ID used to render this demo (e.g., "zenith", "aether") */
  templateId?: string
  /** Design tokens from the selected template */
  designTokens?: DemoTemplate["designTokens"]
  designRecipe?: DemoDesignRecipe
  quality?: DemoQualityReport
  rightsManifest?: DemoRightsManifest
  publicationStatus?: DemoPublicationStatus
  premium?: DemoPremiumExperience
  brandSystem?: DemoBrandSystem
  presentation?: {
    featureEyebrow: string
    featureHeading: string
    servicesEyebrow: string
    servicesHeading: string
    galleryEyebrow: string
    galleryHeading: string
    /** Deterministic industry profile used by every page renderer. */
    industryProfile?: string
    worksLead?: string
    worksDescription?: string
    aboutLead?: string
  }
  privatePreview?: {
    expiresAt: string
    assetStatus: "unreviewed" | "private_proposal" | "consented" | "blocked"
  }
  pages: {
    home: DemoHomePage
    about: DemoAboutPage
    services: DemoServicesPage
    contact: DemoContactPage
    works?: DemoContentPage
    news?: DemoContentPage
    faq?: DemoContentPage
    recruit?: DemoContentPage
    privacy?: DemoContentPage
    terms?: DemoContentPage
    commerce?: DemoContentPage
  }
}

export interface DemoPremiumMedia {
  src: string
  /** Self-hosted scene used when a reviewed source photo is too small or unavailable. */
  fallbackSrc?: string
  alt: string
  kind: "image" | "video"
  width?: number
  height?: number
  eyebrow?: string
  title?: string
  caption?: string
  objectPosition?: string
}

export interface DemoPremiumExperience {
  style: "editorial-cafe" | "craft" | "premium-v2" | "premium-v3" | "professional" | "wellness" | "retail"
  heroMedia: DemoPremiumMedia[]
  gallery: DemoPremiumMedia[]
  intro: {
    eyebrow: string
    title: string
    body: string
    note?: string
  }
  social: Array<{
    label: string
    href: string
    network: "instagram" | "facebook" | "x" | "line" | "youtube" | "tiktok"
  }>
}

export interface DemoContentPage {
  title: string
  subtitle: string
  eyebrow: string
  sections: Array<{
    id: string
    heading: string
    body: string
    note?: string
  }>
  accentColor: string
}

export interface DemoNarrativeModule {
  eyebrow: string
  title: string
  body: string
  points: string[]
}

export interface DemoHomePage {
  hero: DemoHeroProps
  features: DemoFeatureItem[]
  stats: DemoStatsItem[]
  beforeAfter: DemoBeforeAfterItem[]
  totalLoss: string
  cta: DemoCtaProps
  featureEyebrow?: string
  featureHeading?: string
  featureSubtitle?: string
  /** Metrics summary card displayed above Before/After (real diagnostic numbers) */
  metricsSummary?: DemoMetricsSummary
  /** Data-driven FAQ items generated from detected issues */
  faq?: DemoFAQItem[]
  /** Template-specific: testimonials (if template includes testimonials section) */
  testimonials?: DemoTestimonial[]
  /** Template-specific: trusted-by logos (if template includes trustedBy section) */
  trustedBy?: DemoTrustedByItem[]
  /** Grounded editorial depth beyond the hero, cards, and visual gallery. */
  narrativeModules?: DemoNarrativeModule[]
}

export interface DemoTestimonial {
  id: string
  quote: string
  author: string
  role: string
  avatarInitials: string
}

export interface DemoTrustedByItem {
  id: string
  name: string
  initials: string
}

export interface DemoMetricsSummary {
  currentPageSpeed: string | null
  targetPageSpeed: string
  currentSslGrade: string | null
  targetSslGrade: string
  currentSeoIssues: number
  targetSeoIssues: number
  monthlyLoss: string | null
  recoveryAmount: string | null
}

export interface DemoFAQItem {
  id: string
  question: string
  answer: string
}

export interface DemoAboutPage {
  title: string
  subtitle: string
  companyName: string
  industryLabel: string
  locationLabel: string
  story: string
  mission: string
  values: { title: string; description: string; icon: string }[]
  chapters?: DemoNarrativeModule[]
  teamNote: string
  accentColor: string
}

export interface DemoServicesPage {
  title: string
  subtitle: string
  processEyebrow?: string
  processTitle?: string
  services: {
    title: string
    description: string
    icon: string
    features: string[]
    priceNote?: string
  }[]
  process: {
    step: number
    title: string
    description: string
  }[]
  guidance?: DemoNarrativeModule[]
  ctaTitle?: string
  ctaSubtitle?: string
  ctaText?: string
  ctaHref?: string
  accentColor: string
}

export interface DemoContactPage {
  title: string
  subtitle: string
  companyName: string
  email: string
  phone?: string
  address: string
  calBookingUrl: string
  /** Direct link to Cal.com (non-embed) for fallback CTA button */
  calDirectUrl?: string
  formNote?: string
  formEnabled?: boolean
  externalProfileUrl?: string
  mapUrl?: string
  accentColor: string
}
