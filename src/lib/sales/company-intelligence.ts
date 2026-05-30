import type { SourceCoverageItem } from "./source-coverage"
import type { SalesCompany } from "./types"

type JsonRecord = Record<string, unknown>

export type IntelligenceTone = "good" | "warning" | "critical" | "neutral"

export interface IntelligenceSignal {
  id: string
  label: string
  value: string
  source: string
  category: "website" | "seo" | "security" | "company" | "outreach" | "automation"
  tone: IntelligenceTone
  detail: string
}

export interface PainPoint {
  id: string
  title: string
  severity: "critical" | "warning" | "opportunity"
  evidence: string
  implication: string
  recommendedAction: string
}

export interface CompanyIntelligence {
  signals: IntelligenceSignal[]
  painPoints: PainPoint[]
  nextActions: string[]
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function scoreTone(score: number | null): IntelligenceTone {
  if (score === null) return "neutral"
  if (score < 50) return "critical"
  if (score < 75) return "warning"
  return "good"
}

function yesNo(value: boolean | null): string {
  if (value === null) return "unknown"
  return value ? "yes" : "no"
}

function sourceNames(items: SourceCoverageItem[], status: SourceCoverageItem["status"]): string[] {
  return items.filter((item) => item.status === status).map((item) => item.label)
}

function stackValue(tech: JsonRecord | null, scan: JsonRecord | null): string {
  const stack = tech?.stack
  if (Array.isArray(stack) && stack.length > 0) return stack.slice(0, 5).join(", ")
  return yesNo(scan?.is_wordpress === true)
}

export function buildCompanyIntelligence(
  company: SalesCompany,
  sourceItems: SourceCoverageItem[],
): CompanyIntelligence {
  const meta = (company.meta ?? {}) as JsonRecord
  const scan = asRecord(meta.scan)
  const tech = asRecord(meta.tech)
  const ssl = asRecord(meta.ssl)
  const headers = asRecord(meta.security_headers)
  const robots = asRecord(meta.robots_sitemap)
  const place = asRecord(meta.place)
  const diagnosis = asRecord(meta.pain_diagnosis)
  const formDiscovery = asRecord(meta.form_discovery)

  const headerCount = headers
    ? [headers.hasHsts, headers.hasCsp, headers.hasXFrameOptions, headers.hasNoSniff].filter(Boolean).length
    : 0

  const signals: IntelligenceSignal[] = [
    {
      id: "pagespeed-mobile",
      label: "Mobile speed",
      value: company.pagespeed_mobile === null ? "not collected" : `${company.pagespeed_mobile}/100`,
      source: "PageSpeed Insights",
      category: "website",
      tone: scoreTone(company.pagespeed_mobile),
      detail: "A primary proxy for first-view friction on mobile search and ad traffic.",
    },
    {
      id: "pagespeed-desktop",
      label: "Desktop speed",
      value: company.pagespeed_desktop === null ? "not collected" : `${company.pagespeed_desktop}/100`,
      source: "PageSpeed Insights",
      category: "website",
      tone: scoreTone(company.pagespeed_desktop),
      detail: "Useful for B2B comparison, office browsing, and post-click inquiry flow.",
    },
    {
      id: "metadata",
      label: "Title / description",
      value: [asString(scan?.html_title), asString(scan?.html_description)].filter(Boolean).length > 0 ? "collected" : "missing",
      source: "HTML metadata scan",
      category: "seo",
      tone: asString(scan?.html_title) && asString(scan?.html_description) ? "good" : "warning",
      detail: "Metadata shapes the first impression in search, social previews, and browser sharing.",
    },
    {
      id: "wordpress",
      label: "CMS / stack",
      value: stackValue(tech, scan),
      source: "Wappalyzer / HTML scan",
      category: "website",
      tone: scan?.is_wordpress === true ? "warning" : "neutral",
      detail: "Technology stack helps estimate rebuild risk, security posture, and performance constraints.",
    },
    {
      id: "security-headers",
      label: "Security headers",
      value: headers ? `${headerCount}/4` : "not collected",
      source: "HTTP security headers",
      category: "security",
      tone: headerCount >= 3 ? "good" : "warning",
      detail: "Checks HSTS, CSP, X-Frame-Options, and nosniff as trust and risk signals.",
    },
    {
      id: "ssl",
      label: "SSL / TLS",
      value: asString(ssl?.grade) ?? (ssl ? "collected" : "not collected"),
      source: "SSL Labs",
      category: "security",
      tone: asString(ssl?.grade)?.startsWith("A") ? "good" : ssl ? "warning" : "neutral",
      detail: "Certificate and TLS quality influence trust, browser warnings, and B2B review.",
    },
    {
      id: "robots-sitemap",
      label: "robots / sitemap",
      value: robots ? `robots: ${yesNo(robots.robotsTxt === true)} / sitemap: ${yesNo(robots.sitemapXml === true)}` : "not collected",
      source: "robots.txt / sitemap.xml",
      category: "seo",
      tone: robots?.sitemapXml === true ? "good" : "warning",
      detail: "Shows whether crawlers can understand the public URL inventory.",
    },
    {
      id: "places",
      label: "Google Places",
      value: asString(place?.name) ?? (place ? "candidate found" : "not collected"),
      source: "Google Places API",
      category: "company",
      tone: place ? "good" : "neutral",
      detail: "Useful for local proof, MEO facts, opening hours, reviews, and map context.",
    },
    {
      id: "form",
      label: "Form URL",
      value: asString(meta.contact_form_url) ?? "not discovered",
      source: "Crawlee / Crawl4AI / form discovery",
      category: "outreach",
      tone: asString(meta.contact_form_url) ? "good" : "warning",
      detail: `Discovery method: ${asString(formDiscovery?.method) ?? "not collected"}`,
    },
    {
      id: "dify",
      label: "Dify diagnosis",
      value: asString(diagnosis?.primaryPain) ? "generated" : "fallback / pending",
      source: "Dify Cloud / DeepSeek V4",
      category: "automation",
      tone: asString(diagnosis?.primaryPain) ? "good" : "warning",
      detail: asString(diagnosis?.primaryPain) ?? "Local deterministic diagnosis is used until Dify returns a result.",
    },
  ]

  const collected = sourceNames(sourceItems, "collected")
  const configured = sourceNames(sourceItems, "configured")
  const missing = sourceNames(sourceItems, "missing")

  const painPoints: PainPoint[] = []
  if (company.pagespeed_mobile !== null && company.pagespeed_mobile < 55) {
    painPoints.push({
      id: "slow-mobile",
      title: "Mobile speed may be leaking high-intent visitors before inquiry",
      severity: "critical",
      evidence: `PageSpeed Mobile ${company.pagespeed_mobile}/100`,
      implication: "Visitors from ads, search, or social may leave before the value proposition and CTA are visible.",
      recommendedAction: "Prioritize image optimization, unused JS reduction, and an Astro/Next.js rebuild path.",
    })
  }
  if (company.detected_issues?.includes("no_ogp")) {
    painPoints.push({
      id: "no-ogp",
      title: "Social and message previews are weaker than they should be",
      severity: "warning",
      evidence: "OGP metadata appears incomplete.",
      implication: "Shared links can look generic before a prospect decides whether to click.",
      recommendedAction: "Add offer-specific OGP, structured data, and proof-led preview copy.",
    })
  }
  if (!asString(meta.contact_form_url)) {
    painPoints.push({
      id: "form-missing",
      title: "Inquiry path is not machine-discoverable yet",
      severity: "warning",
      evidence: "No contact form URL has been confirmed by the crawler.",
      implication: "Outbound form automation and user navigation both become harder to operate reliably.",
      recommendedAction: "Confirm the form URL manually, then expose a stable contact, booking, or quote path.",
    })
  }
  if (!headers || headerCount < 3) {
    painPoints.push({
      id: "security-headers",
      title: "Security and trust headers can be improved",
      severity: "opportunity",
      evidence: headers ? "Some HTTP security headers are missing." : "Header evidence has not been collected.",
      implication: "This can become a weak point in B2B review, procurement, or technical due diligence.",
      recommendedAction: "Set CSP, HSTS, X-Frame-Options, and nosniff as standard launch hardening.",
    })
  }
  if (painPoints.length === 0) {
    painPoints.push({
      id: "growth-opportunity",
      title: "The biggest opportunity is clearer proof and a better conversion path",
      severity: "opportunity",
      evidence: collected.slice(0, 4).join(" / ") || "Primary source collection is still in progress.",
      implication: "For sales, a concise comparison and improvement roadmap is more useful than a long audit.",
      recommendedAction: "Use the report and demo site to align the first production changes quickly.",
    })
  }

  const nextActions = [
    "Review the company karte, sales material, and opportunity record on the Twenty company page.",
    asString(meta.contact_form_url)
      ? "Run form outreach in dry-run mode first and verify the message, target form, and CAPTCHA risk."
      : "Confirm the form URL in Appsmith/NocoDB before any automated outreach.",
    "Attach the diagnostic report URL and Astro replacement demo URL to the proposal message.",
    configured.length > 0
      ? `Turn configured sources into collected evidence: ${configured.slice(0, 3).join(" / ")}.`
      : "Connect the highest-priority missing API sources before scaling this segment.",
    missing.length > 0
      ? `Review missing sources: ${missing.slice(0, 3).join(" / ")}.`
      : "Monitor reply rate and opportunity conversion in Metabase.",
  ]

  return { signals, painPoints, nextActions }
}

export function signalScore(signals: IntelligenceSignal[]): number {
  if (signals.length === 0) return 0
  const score = signals.reduce((sum, signal) => {
    if (signal.tone === "good") return sum + 100
    if (signal.tone === "neutral") return sum + 65
    if (signal.tone === "warning") return sum + 35
    return sum + 10
  }, 0)
  return Math.round(score / signals.length)
}
