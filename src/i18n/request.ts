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

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale
  const localeMessages = (await import(`../../messages/${locale}.json`)).default as JsonObject
  const messages = locale === "en"
    ? localeMessages
    : mergeMessages((await import("../../messages/en.json")).default as JsonObject, localeMessages)

  return {
    locale,
    messages,
  }
})
