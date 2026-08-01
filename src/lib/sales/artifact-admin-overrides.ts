import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"

export type ReportAdminEditFields = {
  hook?: string | null
  pain?: string | null
  fear?: string | null
  loss?: string | null
  cta?: string | null
}

export type DemoAdminEditFields = {
  metaTitle?: string | null
  metaDescription?: string | null
  homeTitle?: string | null
  homeSubtitle?: string | null
  homeCtaTitle?: string | null
  homeCtaSubtitle?: string | null
  aboutTitle?: string | null
  aboutSubtitle?: string | null
  aboutStory?: string | null
  servicesTitle?: string | null
  servicesSubtitle?: string | null
  contactTitle?: string | null
  contactSubtitle?: string | null
  contactEmail?: string | null
  contactAddress?: string | null
}

const DEMO_FIELD_LIMITS: Record<keyof DemoAdminEditFields, number> = {
  metaTitle: 140,
  metaDescription: 320,
  homeTitle: 180,
  homeSubtitle: 420,
  homeCtaTitle: 180,
  homeCtaSubtitle: 420,
  aboutTitle: 160,
  aboutSubtitle: 320,
  aboutStory: 1400,
  servicesTitle: 160,
  servicesSubtitle: 420,
  contactTitle: 160,
  contactSubtitle: 420,
  contactEmail: 180,
  contactAddress: 320,
}

const REPORT_FIELD_LIMITS: Record<keyof ReportAdminEditFields, number> = {
  hook: 900,
  pain: 1200,
  fear: 1200,
  loss: 1200,
  cta: 900,
}

function cleanText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null
  if (typeof value !== "string") return undefined
  const trimmed = value.replace(/\s+/g, " ").trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

function cleanTextarea(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null
  if (typeof value !== "string") return undefined
  const normalized = value.replace(/\r\n/g, "\n").trim()
  if (!normalized) return null
  return normalized.slice(0, maxLength)
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined
}

export function sanitizeReportAdminFields(input: unknown): ReportAdminEditFields {
  const source = readRecord(input)
  return {
    hook: cleanTextarea(source.hook, REPORT_FIELD_LIMITS.hook),
    pain: cleanTextarea(source.pain, REPORT_FIELD_LIMITS.pain),
    fear: cleanTextarea(source.fear, REPORT_FIELD_LIMITS.fear),
    loss: cleanTextarea(source.loss, REPORT_FIELD_LIMITS.loss),
    cta: cleanTextarea(source.cta, REPORT_FIELD_LIMITS.cta),
  }
}

export function sanitizeDemoAdminFields(input: unknown): DemoAdminEditFields {
  const source = readRecord(input)
  return {
    metaTitle: cleanText(source.metaTitle, DEMO_FIELD_LIMITS.metaTitle),
    metaDescription: cleanTextarea(source.metaDescription, DEMO_FIELD_LIMITS.metaDescription),
    homeTitle: cleanTextarea(source.homeTitle, DEMO_FIELD_LIMITS.homeTitle),
    homeSubtitle: cleanTextarea(source.homeSubtitle, DEMO_FIELD_LIMITS.homeSubtitle),
    homeCtaTitle: cleanTextarea(source.homeCtaTitle, DEMO_FIELD_LIMITS.homeCtaTitle),
    homeCtaSubtitle: cleanTextarea(source.homeCtaSubtitle, DEMO_FIELD_LIMITS.homeCtaSubtitle),
    aboutTitle: cleanText(source.aboutTitle, DEMO_FIELD_LIMITS.aboutTitle),
    aboutSubtitle: cleanTextarea(source.aboutSubtitle, DEMO_FIELD_LIMITS.aboutSubtitle),
    aboutStory: cleanTextarea(source.aboutStory, DEMO_FIELD_LIMITS.aboutStory),
    servicesTitle: cleanText(source.servicesTitle, DEMO_FIELD_LIMITS.servicesTitle),
    servicesSubtitle: cleanTextarea(source.servicesSubtitle, DEMO_FIELD_LIMITS.servicesSubtitle),
    contactTitle: cleanText(source.contactTitle, DEMO_FIELD_LIMITS.contactTitle),
    contactSubtitle: cleanTextarea(source.contactSubtitle, DEMO_FIELD_LIMITS.contactSubtitle),
    contactEmail: cleanText(source.contactEmail, DEMO_FIELD_LIMITS.contactEmail),
    contactAddress: cleanTextarea(source.contactAddress, DEMO_FIELD_LIMITS.contactAddress),
  }
}

export function readDemoAdminOverrides(meta: unknown): DemoAdminEditFields {
  const root = readRecord(meta)
  const artifactAdmin = readRecord(root.artifact_admin)
  return sanitizeDemoAdminFields(artifactAdmin.demo_overrides)
}

export function applyDemoAdminOverrides(data: DemoMultiPageData): DemoMultiPageData {
  const overrides = readDemoAdminOverrides(data.meta)
  const home = data.pages.home
  const about = data.pages.about
  const services = data.pages.services
  const contact = data.pages.contact

  return {
    ...data,
    meta: {
      ...data.meta,
      title: readString(overrides.metaTitle) ?? data.meta.title,
      description: readString(overrides.metaDescription) ?? data.meta.description,
    },
    pages: {
      ...data.pages,
      home: {
        ...home,
        hero: {
          ...home.hero,
          title: readString(overrides.homeTitle) ?? home.hero.title,
          subtitle: readString(overrides.homeSubtitle) ?? home.hero.subtitle,
        },
        cta: {
          ...home.cta,
          title: readString(overrides.homeCtaTitle) ?? home.cta.title,
          subtitle: readString(overrides.homeCtaSubtitle) ?? home.cta.subtitle,
        },
      },
      about: {
        ...about,
        title: readString(overrides.aboutTitle) ?? about.title,
        subtitle: readString(overrides.aboutSubtitle) ?? about.subtitle,
        story: readString(overrides.aboutStory) ?? about.story,
      },
      services: {
        ...services,
        title: readString(overrides.servicesTitle) ?? services.title,
        subtitle: readString(overrides.servicesSubtitle) ?? services.subtitle,
      },
      contact: {
        ...contact,
        title: readString(overrides.contactTitle) ?? contact.title,
        subtitle: readString(overrides.contactSubtitle) ?? contact.subtitle,
        email: readString(overrides.contactEmail) ?? contact.email,
        address: readString(overrides.contactAddress) ?? contact.address,
      },
    },
  }
}
