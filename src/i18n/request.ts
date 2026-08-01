import { getRequestConfig } from "next-intl/server"
import { hasLocale } from "next-intl"
import { routing } from "./routing"

type JsonObject = Record<string, unknown>

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mergeMessages(base: JsonObject, override: JsonObject): JsonObject {
  const merged: JsonObject = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const baseValue = merged[key]
    merged[key] = isJsonObject(baseValue) && isJsonObject(value)
      ? mergeMessages(baseValue, value)
      : value
  }
  return merged
}

// The international marketing pages intentionally share the English Japan
// Entry offer as their commercial source of truth.  Older locale files still
// contain the retired $1,500/$2,500 offers, so merging them wholesale would
// reintroduce contradictory pricing and CTAs.  Keep the translated shell
// labels, while page content comes from messages/en.json until a reviewed
// translation replaces an entire namespace.
const INTERNATIONAL_SHELL_NAMESPACES = [
  "locale",
  "nav",
  "cta",
  "footer",
  "cookieConsent",
  "contactForm",
  "errorPage",
  "notFoundPage",
  "loadingPage",
] as const

function pickNamespaces(source: JsonObject, namespaces: readonly string[]): JsonObject {
  return Object.fromEntries(
    namespaces
      .filter((namespace) => namespace in source)
      .map((namespace) => [namespace, source[namespace]]),
  )
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale
  const localeMessages = (await import(`../../messages/${locale}.json`)).default as JsonObject
  const englishMessages = (await import("../../messages/en.json")).default as JsonObject
  const messages = locale === "ja"
    ? localeMessages
    : locale === "en"
      ? englishMessages
      : mergeMessages(englishMessages, pickNamespaces(localeMessages, INTERNATIONAL_SHELL_NAMESPACES))

  return {
    locale,
    messages,
  }
})
