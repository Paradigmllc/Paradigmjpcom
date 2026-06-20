import type { SourceCoverageItem } from "./source-coverage"
import type { SalesCompany } from "./types"
import {
  companyContactFormUrl,
  companyJapanMarketAudit,
  companyPainDiagnosis,
  companyTechStack,
  mergedCompanyMeta,
} from "@/lib/sales/company-data-view"

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
  whyItMatters: string
  missingConsequence?: string
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

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
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

function sourceItem(sourceItems: SourceCoverageItem[], slug: string): SourceCoverageItem | undefined {
  return sourceItems.find((item) => item.slug === slug)
}

function meaningFor(sourceItems: SourceCoverageItem[], slug: string, fallback: string): string {
  return sourceItem(sourceItems, slug)?.meaning ?? fallback
}

function missingFor(sourceItems: SourceCoverageItem[], slug: string): string | undefined {
  return sourceItem(sourceItems, slug)?.missingConsequence
}

export function buildCompanyIntelligence(
  company: SalesCompany,
  sourceItems: SourceCoverageItem[],
): CompanyIntelligence {
  const meta = mergedCompanyMeta(company)
  const scan = asRecord(meta.scan)
  const tech = companyTechStack(company)
  const ssl = asRecord(meta.ssl)
  const headers = asRecord(meta.security_headers)
  const robots = asRecord(meta.robots_sitemap)
  const place = asRecord(meta.place)
  const diagnosis = companyPainDiagnosis(company)
  const formDiscovery = asRecord(meta.form_discovery)
  const japanMarketAudit = companyJapanMarketAudit(company)
  const japanMarketStatus = asRecord(japanMarketAudit?.status)
  const dns = asRecord(meta.dns)
  const w3c = asRecord(meta.w3c_validation)
  const hstsData = asRecord(meta.hsts_preload)
  const wayback = asRecord(meta.wayback_machine)
  const crtsh = asRecord(meta.crtsh)
  const radar = asRecord(meta.cloudflare_radar)
  const observatory = asRecord(meta.mozilla_observatory)
  const trends = asRecord(meta.google_trends)
  const japanMarketMissing = [
    asBoolean(japanMarketStatus?.tokushoho_missing),
    asBoolean(japanMarketStatus?.appi_missing),
    asBoolean(japanMarketStatus?.local_payments_missing),
  ].filter((value) => value === true).length

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
      whyItMatters: meaningFor(sourceItems, "pagespeed", "Speed influences whether visitors stay long enough to see the offer."),
      missingConsequence: company.pagespeed_mobile === null ? missingFor(sourceItems, "pagespeed") : undefined,
    },
    {
      id: "pagespeed-desktop",
      label: "Desktop speed",
      value: company.pagespeed_desktop === null ? "not collected" : `${company.pagespeed_desktop}/100`,
      source: "PageSpeed Insights",
      category: "website",
      tone: scoreTone(company.pagespeed_desktop),
      detail: "Useful for B2B comparison, office browsing, and post-click inquiry flow.",
      whyItMatters: "Desktop speed still matters for B2B review, comparison, and internal sharing after the first visit.",
      missingConsequence: company.pagespeed_desktop === null ? missingFor(sourceItems, "pagespeed") : undefined,
    },
    {
      id: "metadata",
      label: "Title / description",
      value: [asString(scan?.html_title), asString(scan?.html_description)].filter(Boolean).length > 0 ? "collected" : "missing",
      source: "HTML metadata scan",
      category: "seo",
      tone: asString(scan?.html_title) && asString(scan?.html_description) ? "good" : "warning",
      detail: "Metadata shapes the first impression in search, social previews, and browser sharing.",
      whyItMatters: meaningFor(sourceItems, "html_metadata", "Metadata shapes the first impression before a prospect clicks."),
      missingConsequence: !asString(scan?.html_title) || !asString(scan?.html_description)
        ? missingFor(sourceItems, "html_metadata")
        : undefined,
    },
    {
      id: "wordpress",
      label: "CMS / stack",
      value: stackValue(tech, scan),
      source: "Wappalyzer / HTML scan",
      category: "website",
      tone: scan?.is_wordpress === true ? "warning" : "neutral",
      detail: "Technology stack helps estimate rebuild risk, security posture, and performance constraints.",
      whyItMatters: meaningFor(sourceItems, "wappalyzer", "Technology stack explains rebuild effort and likely bottlenecks."),
      missingConsequence: !Array.isArray(tech?.stack) ? missingFor(sourceItems, "wappalyzer") : undefined,
    },
    {
      id: "security-headers",
      label: "Security headers",
      value: headers ? `${headerCount}/4` : "not collected",
      source: "HTTP security headers",
      category: "security",
      tone: headerCount >= 3 ? "good" : "warning",
      detail: "Checks HSTS, CSP, X-Frame-Options, and nosniff as trust and risk signals.",
      whyItMatters: meaningFor(sourceItems, "security_headers_free", "Security headers reduce avoidable trust and review risk."),
      missingConsequence: !headers ? missingFor(sourceItems, "security_headers_free") : undefined,
    },
    {
      id: "ssl",
      label: "SSL / TLS",
      value: asString(ssl?.grade) ?? (ssl ? "collected" : "not collected"),
      source: "SSL Labs",
      category: "security",
      tone: asString(ssl?.grade)?.startsWith("A") ? "good" : ssl ? "warning" : "neutral",
      detail: "Certificate and TLS quality influence trust, browser warnings, and B2B review.",
      whyItMatters: "SSL/TLS quality is a basic trust signal before booking, contact, and procurement review.",
      missingConsequence: !ssl ? missingFor(sourceItems, "ssllabs") : undefined,
    },
    {
      id: "robots-sitemap",
      label: "robots / sitemap",
      value: robots ? `robots: ${yesNo(robots.robotsTxt === true)} / sitemap: ${yesNo(robots.sitemapXml === true)}` : "not collected",
      source: "robots.txt / sitemap.xml",
      category: "seo",
      tone: robots?.sitemapXml === true ? "good" : "warning",
      detail: "Shows whether crawlers can understand the public URL inventory.",
      whyItMatters: meaningFor(sourceItems, "robots_sitemap", "Crawler visibility affects search and AI discovery."),
      missingConsequence: !robots ? missingFor(sourceItems, "robots_sitemap") : undefined,
    },
    {
      id: "places",
      label: "Google Places",
      value: asString(place?.name) ?? (place ? "candidate found" : "not collected"),
      source: "Google Places API",
      category: "company",
      tone: place ? "good" : "neutral",
      detail: "Useful for local proof, MEO facts, opening hours, reviews, and map context.",
      whyItMatters: meaningFor(sourceItems, "google_places", "Local proof affects trust before inquiry."),
      missingConsequence: !place ? missingFor(sourceItems, "google_places") : undefined,
    },
    {
      id: "form",
      label: "Form URL",
      value: companyContactFormUrl(company) ?? "not discovered",
      source: "Crawlee / Crawl4AI / form discovery",
      category: "outreach",
      tone: companyContactFormUrl(company) ? "good" : "warning",
      detail: `Discovery method: ${asString(formDiscovery?.method) ?? "not collected"}`,
      whyItMatters: meaningFor(sourceItems, "crawlee", "A discoverable inquiry path matters for both users and outreach automation."),
      missingConsequence: !companyContactFormUrl(company) ? missingFor(sourceItems, "crawlee") : undefined,
    },
    {
      id: "japan-market-audit",
      label: "Japan readiness",
      value: japanMarketAudit ? `${3 - japanMarketMissing}/3 signals confirmed` : "not collected",
      source: "Japan legal/payment readiness",
      category: "company",
      tone: !japanMarketAudit ? "neutral" : japanMarketMissing >= 2 ? "critical" : japanMarketMissing === 1 ? "warning" : "good",
      detail:
        asString(japanMarketAudit?.sales_pitch_context) ??
        "Checks public-page hints for Japanese commercial disclosure, privacy/APPI explanation, and local payment readiness.",
      whyItMatters: meaningFor(
        sourceItems,
        "japan_market_audit",
        "Japan-entry buyers need localized trust, privacy, and payment cues before they commit.",
      ),
      missingConsequence: !japanMarketAudit ? missingFor(sourceItems, "japan_market_audit") : undefined,
    },
    {
      id: "dify",
      label: "Dify diagnosis",
      value: asString(diagnosis?.primaryPain) ? "generated" : "fallback / pending",
      source: "Dify Cloud / DeepSeek V4",
      category: "automation",
      tone: asString(diagnosis?.primaryPain) ? "good" : "warning",
      detail: asString(diagnosis?.primaryPain) ?? "Local deterministic diagnosis is used until Dify returns a result.",
      whyItMatters: meaningFor(sourceItems, "dify", "Dify turns evidence into industry-specific language and offer selection."),
      missingConsequence: !asString(diagnosis?.primaryPain) ? missingFor(sourceItems, "dify") : undefined,
    },
    {
      id: "dns-email",
      label: "Email security",
      value: dns ? (dns.email_security_ok ? "SPF+DMARC configured" : "incomplete") : "not collected",
      source: "DNS-over-HTTPS",
      category: "security",
      tone: dns ? (dns.email_security_ok ? "good" : "warning") : "neutral",
      detail: `Email provider: ${asString(dns?.email_provider) ?? "unknown"}. SPF: ${yesNo(!!asString(dns?.spf))}. DMARC: ${yesNo(!!asString(dns?.dmarc))}. DKIM: ${(dns?.dkim_selectors as string[] | undefined)?.length ?? 0} selector(s).`,
      whyItMatters: "Email deliverability and spoofing protection affect domain reputation and cold-outreach trust.",
    },
    {
      id: "w3c-html",
      label: "HTML quality",
      value: w3c ? `${w3c.errors} errors / ${w3c.warnings} warnings` : "not collected",
      source: "W3C Validator",
      category: "website",
      tone: w3c ? (w3c.is_clean ? "good" : "warning") : "neutral",
      detail: "Valid HTML improves accessibility, cross-browser compatibility, and SEO crawl efficiency.",
      whyItMatters: "Clean HTML reduces rendering bugs and improves search engine understanding.",
    },
    {
      id: "hsts-preload",
      label: "HSTS Preload",
      value: hstsData ? (hstsData.preloaded ? "preloaded" : "not preloaded") : "not collected",
      source: "HSTS Preload",
      category: "security",
      tone: hstsData?.preloaded ? "good" : "neutral",
      detail: "HSTS preload forces HTTPS and prevents downgrade attacks for all visitors.",
      whyItMatters: "HSTS preload is a one-way security improvement that browsers enforce globally.",
    },
    {
      id: "wayback-history",
      label: "Site history",
      value: wayback ? `${wayback.total_snapshots} snapshots / ${wayback.years_active}y active` : "not collected",
      source: "Wayback Machine",
      category: "company",
      tone: wayback && (wayback.years_active as number) > 3 ? "good" : "neutral",
      detail: `First archived: ${asString(wayback?.first_snapshot) ?? "unknown"}. Last: ${asString(wayback?.last_snapshot) ?? "unknown"}.`,
      whyItMatters: "Historical snapshots reveal site age, redesign cadence, and long-term maintenance patterns.",
    },
    {
      id: "crtsh-certs",
      label: "SSL certificates",
      value: crtsh ? `${crtsh.total_certs} certs found` : "not collected",
      source: "crt.sh",
      category: "security",
      tone: crtsh ? ((crtsh.total_certs as number) > 0 ? "good" : "warning") : "neutral",
      detail: `Subdomains discovered: ${(crtsh?.subdomains as string[] | undefined)?.length ?? 0}.`,
      whyItMatters: "Certificate transparency reveals subdomains, infrastructure changes, and security history.",
    },
    {
      id: "radar-ranking",
      label: "Traffic rank",
      value: radar?.rank_bucket ? `${radar.rank_bucket}` : "unranked / not collected",
      source: "Cloudflare Radar",
      category: "seo",
      tone: radar?.rank_bucket ? "good" : "neutral",
      detail: `Global rank: ${radar?.rank ?? "N/A"}. Categories: ${(radar?.categories as string[] | undefined)?.join(", ") ?? "none"}.`,
      whyItMatters: "Traffic ranking helps size the opportunity and compare against industry benchmarks.",
    },
    {
      id: "observatory-score",
      label: "Security score",
      value: observatory?.score ? `${observatory.score as number}/100 (grade ${observatory.grade as string})` : "not collected",
      source: "Mozilla Observatory",
      category: "security",
      tone: observatory ? ((observatory.score as number) >= 80 ? "good" : (observatory.score as number) >= 50 ? "warning" : "critical") : "neutral",
      detail: `Tests passed: ${observatory?.tests_passed ?? "N/A"}/${observatory?.tests_total ?? "N/A"}.`,
      whyItMatters: "Observatory goes beyond header presence and scores actual security posture depth.",
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
  const contactFormUrl = companyContactFormUrl(company)
  if (!contactFormUrl) {
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
  if (japanMarketAudit && japanMarketMissing > 0) {
    painPoints.push({
      id: "japan-market-readiness",
      title: "Japan-entry trust and payment gaps need human review",
      severity: japanMarketMissing >= 2 ? "critical" : "warning",
      evidence: `${japanMarketMissing}/3 public-page readiness signals look incomplete.`,
      implication:
        asString(japanMarketAudit.sales_pitch_context) ??
        "Japanese buyers may hesitate if commercial disclosure, privacy handling, or local payment options are unclear.",
      recommendedAction:
        "Confirm the gaps manually, then generate a Japan-entry proposal with Dify. Do not assert legal violations, penalties, or compliance claims without primary-source review.",
    })
  }
  if (dns && !dns.email_security_ok) {
    painPoints.push({
      id: "email-security",
      title: "Email security configuration is incomplete",
      severity: "opportunity",
      evidence: !asString(dns.spf) ? "SPF record is missing." : "DMARC record is missing.",
      implication: "Without SPF+DMARC, cold-outreach emails from this domain may land in spam or risk spoofing.",
      recommendedAction: "Configure SPF and DMARC DNS records. Consider DKIM signing for transactional email.",
    })
  }
  if (w3c && !w3c.is_clean) {
    painPoints.push({
      id: "html-quality",
      title: "HTML validation issues detected on the homepage",
      severity: "opportunity",
      evidence: `${w3c.errors} errors, ${w3c.warnings} warnings from W3C Validator.`,
      implication: "Validation issues can cause rendering bugs across browsers and hurt accessibility.",
      recommendedAction: `Fix top issues: ${(w3c.top_issues as string[] | undefined)?.slice(0, 2).join("; ") ?? "see validator report"}.`,
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
    contactFormUrl
      ? "Run form outreach in dry-run mode first and verify the message, target form, and CAPTCHA risk."
      : "Confirm the form URL in Appsmith/NocoDB before any automated outreach.",
    japanMarketAudit
      ? "Use the Japan readiness audit as a human-reviewed sales hypothesis, not as legal advice."
      : "Run the Japan readiness audit before sending Japan-entry offers.",
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
