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
  error?: string
}

/* ───── Multi-page types (v2) ───── */

export interface DemoMultiPageData {
  slug: string
  companyId: string
  companyName: string
  locale: ReportLocale
  industry: Industry | null
  meta: DemoMeta
  pages: {
    home: DemoHomePage
    about: DemoAboutPage
    services: DemoServicesPage
    contact: DemoContactPage
  }
}

export interface DemoHomePage {
  hero: DemoHeroProps
  features: DemoFeatureItem[]
  stats: DemoStatsItem[]
  beforeAfter: DemoBeforeAfterItem[]
  totalLoss: string
  cta: DemoCtaProps
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
  formNote?: string
  accentColor: string
}
