/**
 * Data quality guard — validates search inputs and results.
 * Zero tolerance for garbage data.
 */

const TECH_KEYWORDS = [
  "shopify", "wordpress", "wix", "webflow", "magento", "woocommerce",
  "google analytics", "gtm", "hubspot", "klaviyo", "stripe", "paypal",
  "aws", "azure", "gcp", "cloudflare", "nginx", "apache",
  "react", "vue", "angular", "next.js", "nuxt", "laravel", "django",
  "zendesk", "salesforce", "zoho",
]

const ENTERPRISE_INDICATORS = [
  "fortune 500", "fortune global", "multinational", "conglomerate",
  "headquarters", "stock exchange", "investor relations", "annual report",
  "press release", "media center", "corporate governance", "board of directors",
]

// Reject: domains that are clearly not SMBs
const REJECT_DOMAINS = new Set([
  "shopify.com", "apps.shopify.com", "help.shopify.com",
  "wordpress.com", "wordpress.org",
  "google.com", "microsoft.com", "apple.com", "amazon.com",
  "facebook.com", "instagram.com", "youtube.com", "tiktok.com",
  "linkedin.com", "twitter.com", "reddit.com",
  "wikipedia.org", "wikimedia.org",
  "github.com", "gitlab.com", "bitbucket.org",
])

export function validateSearchQuery(query: string): { ok: boolean; warning?: string } {
  const lower = query.toLowerCase()
  for (const tech of TECH_KEYWORDS) {
    if (lower.includes(tech)) {
      return {
        ok: false,
        warning: `Tech keyword "${tech}" in search query — use industry/location keywords instead. Tech detection is done by Wappalyzer AFTER enrichment. Remove "${tech}" from your search query.`,
      }
    }
  }
  for (const enterprise of ENTERPRISE_INDICATORS) {
    if (lower.includes(enterprise)) {
      return { ok: false, warning: `Enterprise indicator "${enterprise}" in search query. Focus on SMB keywords.` }
    }
  }
  return { ok: true }
}

export function isRejectedDomain(domain: string): boolean {
  const lower = domain.toLowerCase()
  return REJECT_DOMAINS.has(lower)
}

export function validateSearchResultsCount(count: number, pagesRequested: number): { ok: boolean; warning?: string } {
  if (count === 0 && pagesRequested > 0) {
    return { ok: false, warning: "Search returned 0 results. The query may be poorly formed or the engines are blocked. Try different keywords." }
  }
  return { ok: true }
}
