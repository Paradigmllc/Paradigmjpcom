import type { FullSiteDemoTemplate } from "./fullsite-demo-templates"

export interface FullSiteDemoQualityResult {
  ok: boolean
  score: number
  errors: string[]
  warnings: string[]
}

const REQUIRED_SECTIONS = [
  "section-hero",
  "section-services",
  "section-operations",
  "section-pricing",
  "section-compliance",
] as const

const CORRUPT_TEXT = /邵ｺ|郢|隴|髫|陞|鬮|陟|闔|髯|陋|隲|陷|・ｽ/

function countMatches(html: string, pattern: RegExp): number {
  return html.match(pattern)?.length ?? 0
}

export function validateFullSiteDemoHtml(
  html: string,
  template: FullSiteDemoTemplate,
): FullSiteDemoQualityResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!html.includes("<!doctype html>")) errors.push("HTML document shell is missing")
  if (html.includes("paradigm-astro-demo.pages.dev")) errors.push("Legacy external demo host is still referenced")
  if (html.length < 12000) errors.push("Generated demo is too thin for a full-site deliverable")
  if (CORRUPT_TEXT.test(html)) errors.push("Generated demo contains mojibake/corrupt visible text")

  for (const section of REQUIRED_SECTIONS) {
    if (!html.includes(`data-section="${section}"`)) errors.push(`Required section is missing: ${section}`)
  }

  for (const page of template.pageMap.slice(0, 5)) {
    if (!html.includes(page)) warnings.push(`Page map label is not visible in demo: ${page}`)
  }

  for (const feature of template.featurePack.slice(0, 4)) {
    if (!html.includes(feature)) warnings.push(`Feature pack label is not visible in demo: ${feature}`)
  }

  for (const compliance of template.compliancePack.slice(0, 3)) {
    if (!html.includes(compliance)) warnings.push(`Compliance label is not visible in demo: ${compliance}`)
  }

  const navLinks = countMatches(html, /data-nav-link=/g)
  if (navLinks < 5) errors.push("Full-site navigation must expose at least five destinations")

  const dataFeatures = countMatches(html, /data-feature-card=/g)
  if (dataFeatures < 6) errors.push("Operational feature cards are insufficient")

  if (template.siteType === "commerce" && !html.includes("data-commerce-cart")) {
    errors.push("Commerce template is missing a cart/order interaction")
  }

  if (template.siteType === "booking" && !html.includes("data-booking-panel")) {
    errors.push("Booking template is missing a reservation interaction")
  }

  if ((template.siteType === "corporate" || template.siteType === "dx") && !html.includes("data-crm-panel")) {
    errors.push("Corporate template is missing a CRM/lead workflow panel")
  }

  const score = Math.max(0, 100 - errors.length * 25 - warnings.length * 4)

  return {
    ok: errors.length === 0 && score >= 80,
    score,
    errors,
    warnings,
  }
}
