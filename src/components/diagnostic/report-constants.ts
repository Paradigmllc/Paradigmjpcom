import type { ReportLang } from "./report-copy"

export const TONE_CLASS = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
} as const

export const SEVERITY_LABEL = {
  critical: { ja: "最優先", en: "Critical" },
  warning: { ja: "改善余地", en: "Action needed" },
  info: { ja: "機会", en: "Opportunity" },
} as const

export const CORRUPTED_TEXT_PATTERN = /縺|繝|譁|險|謾|蛻|邨|雋|蠖|荳|鬆|譛|蜿|髱|螟|莉|逶|ﾂ|�/

export const SOLUTION_COSTS: Record<string, number> = {
  website_diagnostic: 450000,
  meo: 450000,
  subsidy: 450000,
  japan_entry: 13000,
  video_subscription: 250000,
  outreach: 650000,
  security: 350000,
}

export type ReportBlogLink = { title: string; url: string }
export type ReportBlogLinks = Partial<Record<string, ReportBlogLink>>

export const ICON_TO_ISSUE_KEY: Record<string, string> = {
  SPEED: "speed_critical",
  TRUST: "ssl_expired",
  OPS: "wp_outdated",
  SNS: "no_ogp",
  REACH: "no_sns",
  FRESH: "copyright_old",
}

export function intlLocale(lang: ReportLang): string {
  const localeMap: Record<ReportLang, string> = {
    ja: "ja-JP",
    en: "en-US",
    ko: "ko-KR",
    zh: "zh-CN",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    pt: "pt-BR",
    ru: "ru-RU",
    ar: "ar-AE",
    vi: "vi-VN",
    id: "id-ID",
  }
  return localeMap[lang]
}
