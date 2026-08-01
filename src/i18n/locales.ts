/** Public marketing is maintained in Japanese plus the international funnel locales. */
export const MARKETING_LOCALES = [
  "ja",
  "en",
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
export const MARKETING_DEFAULT_LOCALE = "en" as const

/** These locales are also available for reports and demos. */
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
] as const

export type Locale = (typeof ROUTING_LOCALES)[number]
