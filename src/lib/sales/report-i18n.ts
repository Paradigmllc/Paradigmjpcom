/**
 * report-i18n.ts — 12-language diagnostic report internationalization
 *
 * Re-exports from locale sub-modules. See individual files for each language.
 * Locales: ja en ko zh de fr es pt ru ar vi id
 */

import type { Locale } from "@/i18n/routing"
import type { ReportLocaleData } from "./report-i18n-shared"

import { JA } from "./report-i18n-ja"
import { EN } from "./report-i18n-en"
import { KO, ZH } from "./report-i18n-ko-zh"
import { DE, FR } from "./report-i18n-de-fr"
import { ES, PT } from "./report-i18n-es-pt"
import { RU, AR } from "./report-i18n-ru-ar"
import { VI, ID } from "./report-i18n-vi-id"

/* ───── Re-exports ───── */

export type { FaqItem, CulturalNotes, ReportLocaleData } from "./report-i18n-shared"

export { JA, EN, KO, ZH, DE, FR, ES, PT, RU, AR, VI, ID }

export const REPORT_I18N: Record<Locale, ReportLocaleData> = {
  ja: JA,
  en: EN,
  ko: KO,
  zh: ZH,
  de: DE,
  fr: FR,
  es: ES,
  pt: PT,
  ru: RU,
  ar: AR,
  vi: VI,
  id: ID,
}
