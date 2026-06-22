/**
 * lib/sales/demo-site-types.ts — Full-stack demo site type definitions.
 *
 * These types bridge the diagnostic report data and the Next.js demo page,
 * providing a strongly-typed contract for the demo generation pipeline.
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
