import {
  INTERNATIONAL_REPORT_LOCALES,
  MARKETING_DEFAULT_LOCALE,
  MARKETING_LOCALES,
} from "@/i18n/locales"

const PUBLIC_MARKETING_ROOTS = new Set([
  "about",
  "agency",
  "blog",
  "contact",
  "faq",
  "legal",
  "lp",
  "pricing",
  "privacy",
  "services",
  "video",
  "works",
  "tools",
])

// The English services surface now explains the live Japan Entry modules.
// Agency/LP/video remain retired offer surfaces and continue to redirect.
const LEGACY_OFFER_ROOTS = new Set(["agency", "lp", "video"])
// Japanese services and pricing are now first-class Japan Entry pages. Only
// the retired agency/LP/video surfaces continue to redirect.
const JAPANESE_LEGACY_OFFER_ROOTS = new Set([...LEGACY_OFFER_ROOTS])
const NON_INDEXABLE_LOCALE_ROOTS = new Set([
  "admin",
  "cms",
  "d",
  "demo",
  "docs",
  "report",
  "sales",
  "studio",
  "themes-showcase",
])
const ALL_LOCALES = new Set<string>([
  ...MARKETING_LOCALES,
  ...INTERNATIONAL_REPORT_LOCALES,
])
const FALLBACK_LOCALES = new Set<string>(INTERNATIONAL_REPORT_LOCALES)

// Public blog editorial is currently maintained in one locale per article.
// Keep locale-switch links from landing on a valid slug with no translation.
const ENGLISH_BLOG_SLUGS = new Set([
  "enter-japan-without-hiring-local-team",
  "japan-entry-21-business-day-readiness",
  "localization-vs-translation-japan-buyers",
  "japanese-entity-bank-account-needed",
  "japan-entry-cost-hiring-agency-fixed-scope",
  "build-trust-with-japanese-buyers",
  "what-a-japan-entry-package-should-deliver",
  "japan-entry-package-vs-diy-hire-agency-stack",
  "first-30-days-after-japan-launch",
  "japan-entry-source-pack-and-approval",
  "japan-entry-payment-and-inquiry-routing",
  "japan-entry-public-signals-vs-first-party-data",
])
const JAPANESE_BLOG_SLUGS = new Set([
  "japan-entry-kickoff-checklist-ja",
  "japan-entry-translation-localization-ja",
  "japan-entry-public-data-limitations-ja",
  "japan-entry-first-30-days-ja",
  "japan-entry-application-after-ja",
  "japan-entry-payment-route-ja",
  "japan-entry-handover-operations-ja",
])

export type MarketingLocale = (typeof MARKETING_LOCALES)[number]

export function isMarketingLocale(locale: string): locale is MarketingLocale {
  return MARKETING_LOCALES.some((candidate) => candidate === locale)
}

function marketingPathSegments(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  if (segments[0] && ALL_LOCALES.has(segments[0])) {
    return segments.slice(1)
  }
  return segments
}

export function isPublicMarketingPath(pathname: string) {
  const segments = marketingPathSegments(pathname)
  return segments.length === 0 || PUBLIC_MARKETING_ROOTS.has(segments[0])
}

export function isJapaneseOnlyLegacyOfferPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  if (segments[0] === "ja" && segments[1] === "services") return segments.length > 2
  if (segments[0] === "ja") {
    return Boolean(segments[1] && JAPANESE_LEGACY_OFFER_ROOTS.has(segments[1]))
  }
  return Boolean(segments[0] && LEGACY_OFFER_ROOTS.has(segments[0]))
}

export function isNonIndexablePath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const root = segments[0]
  if (!root) return false
  if (
    root === "api" ||
    root === "admin" ||
    root === "demo" ||
    root === "keystatic" ||
    root.startsWith("_archive")
  ) {
    return true
  }
  if (!ALL_LOCALES.has(root)) return false
  const localeRoot = segments[1]
  return Boolean(localeRoot && NON_INDEXABLE_LOCALE_ROOTS.has(localeRoot))
}

/**
 * Locale-switching a blog article must never turn an existing article into a
 * not-found page. Move to the maintained locale at the proxy boundary so the
 * response is a real HTTP redirect, even when the route is streamed.
 */
export function getBlogLocaleRedirect(source: URL) {
  const segments = source.pathname.split("/").filter(Boolean)
  if (segments.length !== 3 || segments[1] !== "blog") return null

  const [locale, , slug] = segments
  const destination = new URL(source.toString())
  if (locale === "ja" && ENGLISH_BLOG_SLUGS.has(slug)) {
    destination.pathname = `/en/blog/${slug}`
    return destination
  }
  if (locale === "en" && JAPANESE_BLOG_SLUGS.has(slug)) {
    destination.pathname = `/ja/blog/${slug}`
    return destination
  }
  return null
}

/**
 * Consolidate unmaintained public translations into the current English funnel.
 * Report, demo and other personalised routes intentionally remain locale-aware.
 */
export function getInternationalMarketingRedirect(source: URL) {
  const segments = source.pathname.split("/").filter(Boolean)
  const locale = segments[0]
  if (!locale || !FALLBACK_LOCALES.has(locale)) return null

  const publicSegments = segments.slice(1)
  const publicPath = `/${publicSegments.join("/")}`
  if (!isPublicMarketingPath(publicPath)) return null

  const root = publicSegments[0]
  const destination = new URL(source.toString())
  destination.hash = ""

  if (root === "services" && publicSegments.length > 1) {
    destination.pathname = `/${MARKETING_DEFAULT_LOCALE}/services`
    destination.hash = "package-modules"
    return destination
  }

  if (root && LEGACY_OFFER_ROOTS.has(root)) {
    destination.pathname = `/${MARKETING_DEFAULT_LOCALE}/services`
    destination.hash = "#package-modules"
    return destination
  }

  if (root === "blog" && publicSegments.length > 1) {
    destination.pathname = `/${MARKETING_DEFAULT_LOCALE}/blog`
    return destination
  }

  destination.pathname = `/${MARKETING_DEFAULT_LOCALE}${publicPath === "/" ? "" : publicPath}`
  if (root === "contact" && !destination.searchParams.has("intent")) {
    destination.searchParams.set("intent", "japan-entry")
  }
  return destination
}

/**
 * Keep superseded English service and landing-page routes out of the active
 * funnel. Proxy-level handling guarantees a real HTTP redirect even when the
 * underlying page was emitted as static HTML during the production build.
 */
export function getEnglishLegacyOfferRedirect(source: URL) {
  const segments = source.pathname.split("/").filter(Boolean)
  const locale = segments[0]
  const root = segments[1]
  if (locale === MARKETING_DEFAULT_LOCALE && root === "services" && segments.length > 2) {
    const destination = new URL(source.toString())
    destination.pathname = `/${MARKETING_DEFAULT_LOCALE}/services`
    destination.hash = "package-modules"
    return destination
  }
  if (
    locale !== MARKETING_DEFAULT_LOCALE ||
    !root ||
    !LEGACY_OFFER_ROOTS.has(root)
  ) {
    return null
  }

  const destination = new URL(source.toString())
  destination.pathname = `/${MARKETING_DEFAULT_LOCALE}/services`
  destination.hash = "#package-modules"
  return destination
}

/**
 * Keep the Japanese public surface aligned with the same fixed Japan Entry
 * offer. Domestic-only legacy pages were still live and exposed stale plans,
 * free-consultation CTAs, and old video/agency prices.
 */
export function getJapaneseLegacyOfferRedirect(source: URL) {
  const segments = source.pathname.split("/").filter(Boolean)
  const locale = segments[0]
  const root = segments[1]
  if (locale === "ja" && root === "services" && segments.length > 2) {
    const destination = new URL(source.toString())
    destination.pathname = "/ja/services"
    destination.search = ""
    destination.hash = "package-modules"
    return destination
  }
  if (locale !== "ja" || !root || !JAPANESE_LEGACY_OFFER_ROOTS.has(root)) {
    return null
  }

  const destination = new URL(source.toString())
  destination.pathname = "/ja"
  destination.search = ""
  destination.hash = "japan-entry-pricing"
  return destination
}
