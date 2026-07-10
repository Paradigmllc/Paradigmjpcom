/** Public marketing is actively maintained in Japanese and English. */
export const MARKETING_LOCALES = ["ja", "en"] as const
export const MARKETING_DEFAULT_LOCALE = "en" as const

/**
 * These locales remain available for personalised reports and demos. Public
 * marketing routes are consolidated into the maintained English funnel.
 */
export const INTERNATIONAL_REPORT_LOCALES = [
  "ko",
  "zh",
  "de",
  "fr",
  "es",
  "pt",
  "ru",
  "ar",
  "vi",
  "id",
] as const

export const ROUTING_LOCALES = [
  ...MARKETING_LOCALES,
  ...INTERNATIONAL_REPORT_LOCALES,
] as const

export type Locale = (typeof ROUTING_LOCALES)[number]
