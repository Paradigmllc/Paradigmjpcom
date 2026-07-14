/**
 * Data quality guard — validates search inputs and results.
 * Zero tolerance for garbage data.
 */

const TECH_KEYWORDS = [
  "shopify", "wordpress", "wix", "webflow", "magento", "woocommerce",
  "prestashop", "squarespace", "drupal", "joomla", "ghost cms",
  "google analytics", "gtm", "hubspot", "klaviyo", "stripe", "paypal",
  "aws", "azure", "gcp", "cloudflare", "nginx", "apache",
  "react", "vue", "angular", "next.js", "nuxt", "laravel", "django",
  "zendesk", "salesforce", "zoho", "mailchimp", "intercom", "hotjar",
  "calendly", "typeform", "klarna", "google pay",
]

const ENTERPRISE_INDICATORS = [
  "fortune 500", "fortune global", "multinational", "conglomerate",
  "headquarters", "stock exchange", "investor relations", "annual report",
  "press release", "media center", "corporate governance", "board of directors",
]

// Reject: domains that are clearly not SMBs
const REJECT_DOMAINS = new Set([
  // Big tech
  "shopify.com", "apps.shopify.com", "help.shopify.com",
  "wordpress.com", "wordpress.org",
  "google.com", "microsoft.com", "apple.com", "amazon.com",
  "facebook.com", "instagram.com", "youtube.com", "tiktok.com",
  "linkedin.com", "twitter.com", "reddit.com",
  "wikipedia.org", "wikimedia.org",
  "github.com", "gitlab.com", "bitbucket.org",
  // URL shorteners / redirects
  "goo.gl", "bit.ly", "t.co", "ow.ly", "buff.ly", "tinyurl.com", "is.gd", "cli.gs",
  // Hosting / platforms (not actual businesses)
  "shopify.jp", "wixsite.com", "web.app", "netlify.app", "vercel.app", "herokuapp.com",
  "github.io", "pages.dev", "workers.dev",
  // Search engines
  "search.yahoo.co.jp", "goo.ne.jp", "excite.co.jp",
  // Government / public
  "go.jp", "lg.jp", "meti.go.jp", "mhlw.go.jp", "moj.go.jp",
  // Common parked domain hosts
  "domainmarket.com", "hugedomains.com", "buydomains.com",
])

// Hosted preview/internal domains are useful as technology evidence, but they are
// not safe CRM identities. A Japan Entry lead must have a customer-facing domain
// that the company controls and can use in a form submission or report.
const HOSTED_PLATFORM_SUFFIXES = [
  "myshopify.com",
  "wixsite.com",
  "webflow.io",
  "square.site",
  "squarespace.com",
  "wordpress.com",
  "blogspot.com",
  "github.io",
  "pages.dev",
  "web.app",
  "netlify.app",
  "vercel.app",
  "herokuapp.com",
] as const

const GARBAGE_PATTERNS = [
  /captcha/i, /blocked/i, /access denied/i, /rate limit/i, /too many requests/i, /403/i,
]

const SAMPLE_KEYWORDS = [
  "test", "example", "sample", "demo", "サンプル", "テスト", "テスト用",
  "placeholder", "dummy", "test123", "test1234", "example.com",
]

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
  const lower = domain.replace(/^www\./, "").toLowerCase()
  return REJECT_DOMAINS.has(lower)
}

export function isCustomerFacingBusinessDomain(domain: string): boolean {
  const lower = domain.replace(/^www\./, "").replace(/\.$/, "").toLowerCase()
  if (!lower.includes(".") || isRejectedDomain(lower)) return false
  return !HOSTED_PLATFORM_SUFFIXES.some((suffix) => lower === suffix || lower.endsWith(`.${suffix}`))
}

export function isGarbageSearchResult(html: string): boolean {
  return GARBAGE_PATTERNS.some((pattern) => pattern.test(html))
}

export function validateCompanyName(name: string): { ok: boolean; reason?: string } {
  const lower = name.toLowerCase()
  for (const keyword of SAMPLE_KEYWORDS) {
    if (lower.includes(keyword)) {
      return { ok: false, reason: `Company name contains sample/test keyword: "${keyword}"` }
    }
  }
  if (name.length < 2) return { ok: false, reason: "Company name too short" }
  // IDN/Punycode domains are handled by normalizeDomain in dedicated module
  return { ok: true }
}

export function validateSearchResultsCount(count: number, pagesRequested: number): { ok: boolean; warning?: string } {
  if (count === 0 && pagesRequested > 0) {
    return { ok: false, warning: "Search returned 0 results. The query may be poorly formed or the engines are blocked. Try different keywords." }
  }
  return { ok: true }
}
