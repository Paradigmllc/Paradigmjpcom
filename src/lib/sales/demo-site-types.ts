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
  sourceEvidence?: string[]
  proposalNotice?: string
  primaryCtaLabel?: string
  primaryCtaHref?: string
  footerDescription?: string
  footerOwner?: string
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
  error?: string
}

export type DemoPublicationStatus =
  | "draft"
  | "quality_review"
  | "approved"
  | "published"
  | "rejected"
  | "legacy_published"

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
}

export interface DemoCandidateSummary {
  templateId: string
  score: number
  passed: boolean
  designFingerprint: string
  structuralFingerprint: string
  hardBlockers: string[]
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
  alt: string
  kind: "image" | "video"
  eyebrow?: string
  title?: string
  caption?: string
  objectPosition?: string
}

export interface DemoPremiumExperience {
  style: "editorial-cafe" | "craft" | "professional" | "wellness" | "retail"
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
  teamNote: string
  accentColor: string
}

export interface DemoServicesPage {
  title: string
  subtitle: string
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
