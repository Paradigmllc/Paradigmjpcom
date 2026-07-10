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
])

const LEGACY_OFFER_ROOTS = new Set(["agency", "lp", "services", "video"])
const NON_INDEXABLE_LOCALE_ROOTS = new Set([
  "_archive_diagnostic",
  "_archive_optout",
  "_archive_report",
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
  const segments = marketingPathSegments(pathname)
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

  if (root && LEGACY_OFFER_ROOTS.has(root)) {
    destination.pathname = `/${MARKETING_DEFAULT_LOCALE}`
    destination.hash = "#japan-entry-pricing"
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
  if (
    locale !== MARKETING_DEFAULT_LOCALE ||
    !root ||
    !LEGACY_OFFER_ROOTS.has(root)
  ) {
    return null
  }

  const destination = new URL(source.toString())
  destination.pathname = `/${MARKETING_DEFAULT_LOCALE}`
  destination.hash = "#japan-entry-pricing"
  return destination
}
