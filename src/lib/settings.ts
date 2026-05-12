/**
 * lib/settings.ts — PayloadCMS Settings global の type-safe reader
 *
 * 役割: admin UI で編集可能な Settings global (siteName / tagline / contact /
 *       social / analytics / calendarUrl / maintenance) を Server Component
 *       から取得する単一窓口。フェッチ失敗時は静的 default を返してクラッシュ防止。
 *
 * AE-PHP-7 鉄則: visible content は必ず Settings 経由で admin 編集可能にする。
 */

import { cache } from "react"
import type { ThemeTokens } from "./theme-tokens"

export interface SiteSettings {
  siteName: string
  tagline: string
  description: string
  contact: {
    email?: string | null
    phone?: string | null
    address?: string | null
    businessHours?: string | null
  }
  social: {
    twitter?: string | null
    instagram?: string | null
    facebook?: string | null
    linkedin?: string | null
    line?: string | null
  }
  maintenance: {
    maintenanceMode: boolean
    maintenanceMessage?: string | null
  }
  /** [legacy 2-locale 形式] 後方互換のため残置・新規は umamiByLocale を使用 */
  analytics: {
    umamiWebsiteId?: string | null
    umamiWebsiteIdEn?: string | null
  }
  /** [legacy 2-locale 形式] 後方互換のため残置・新規は calendarByLocale を使用 */
  calendarUrl: {
    ja?: string | null
    en?: string | null
  }
  /** 12-locale 対応 (2026-05-12 追加・admin で行を増やすだけで locale 拡張可能) */
  umamiByLocale?: Array<{ locale: string; websiteId: string }> | null
  /** 12-locale 対応 (2026-05-12 追加) */
  calendarByLocale?: Array<{ locale: string; url: string }> | null
  /** admin が編集可能な color / font / radius tokens (globals.css default を override) */
  theme?: ThemeTokens | null
}

const DEFAULTS: SiteSettings = {
  siteName: "Paradigm合同会社",
  tagline: "デジタルで事業を加速する",
  description: "",
  contact: { email: "info@paradigmjp.com", phone: null, address: null, businessHours: null },
  social: {
    twitter: "https://twitter.com/paradigm_jp",
    instagram: null,
    facebook: null,
    linkedin: null,
    line: null,
  },
  maintenance: { maintenanceMode: false, maintenanceMessage: null },
  analytics: { umamiWebsiteId: null, umamiWebsiteIdEn: null },
  calendarUrl: { ja: "https://cal.appexx.me", en: "https://cal.appexx.me" },
  umamiByLocale: null,
  calendarByLocale: null,
  theme: null, // null = globals.css default をそのまま使用
}

/**
 * Settings を取得 (locale-aware で localized field を解決)。
 * React cache() でリクエスト中の重複呼び出しを排除。
 */
export const getSiteSettings = cache(async (locale: string = "ja"): Promise<SiteSettings> => {
  try {
    const { getPayload } = await import("payload")
    const config = (await import("@payload-config")).default
    const payload = await getPayload({ config: config as Parameters<typeof getPayload>[0]["config"] })

    const settings = await payload.findGlobal({
      slug: "settings",
      locale: locale as Parameters<typeof payload.findGlobal>[0]["locale"],
      depth: 0,
    })

    const s = settings as unknown as Partial<SiteSettings> & {
      contact?: SiteSettings["contact"]
      social?: SiteSettings["social"]
      maintenance?: SiteSettings["maintenance"]
      analytics?: SiteSettings["analytics"]
      calendarUrl?: SiteSettings["calendarUrl"]
      umamiByLocale?: SiteSettings["umamiByLocale"]
      calendarByLocale?: SiteSettings["calendarByLocale"]
      theme?: ThemeTokens | null
    }

    return {
      siteName: s.siteName ?? DEFAULTS.siteName,
      tagline: s.tagline ?? DEFAULTS.tagline,
      description: s.description ?? DEFAULTS.description,
      contact: { ...DEFAULTS.contact, ...(s.contact ?? {}) },
      social: { ...DEFAULTS.social, ...(s.social ?? {}) },
      maintenance: { ...DEFAULTS.maintenance, ...(s.maintenance ?? {}) },
      analytics: { ...DEFAULTS.analytics, ...(s.analytics ?? {}) },
      calendarUrl: { ...DEFAULTS.calendarUrl, ...(s.calendarUrl ?? {}) },
      umamiByLocale: s.umamiByLocale ?? null,
      calendarByLocale: s.calendarByLocale ?? null,
      theme: (s as { theme?: ThemeTokens | null }).theme ?? null,
    }
  } catch (e) {
    console.error("[settings] payload.findGlobal failed, using defaults:", e)
    return DEFAULTS
  }
})

/**
 * Pick the right calendar URL for the current locale.
 *
 * Lookup priority (2026-05-12 12-locale 対応):
 *   1. calendarByLocale (new array form) — exact locale match
 *   2. calendarByLocale — ja fallback (defaultLocale)
 *   3. calendarUrl.ja (legacy) when locale=ja
 *   4. calendarUrl.en (legacy) for non-ja
 *   5. DEFAULTS.calendarUrl
 */
export function calendarUrlFor(settings: SiteSettings, locale: string): string {
  if (settings.calendarByLocale && settings.calendarByLocale.length > 0) {
    const exact = settings.calendarByLocale.find((r) => r.locale === locale)
    if (exact?.url) return exact.url
    const jaEntry = settings.calendarByLocale.find((r) => r.locale === "ja")
    if (jaEntry?.url) return jaEntry.url
  }
  if (locale === "ja") return settings.calendarUrl.ja ?? DEFAULTS.calendarUrl.ja!
  return settings.calendarUrl.en ?? DEFAULTS.calendarUrl.en!
}

/**
 * Pick the right Umami site id for the current locale.
 *
 * Lookup priority (2026-05-12 12-locale 対応):
 *   1. umamiByLocale (new array form) — exact locale match
 *   2. umamiByLocale — ja fallback
 *   3. analytics.umamiWebsiteId (legacy) when locale=ja
 *   4. analytics.umamiWebsiteIdEn (legacy) for non-ja
 *   5. analytics.umamiWebsiteId (legacy ja fallback) for non-ja
 *   6. null (Umami が無効化される)
 */
export function umamiWebsiteIdFor(settings: SiteSettings, locale: string): string | null {
  if (settings.umamiByLocale && settings.umamiByLocale.length > 0) {
    const exact = settings.umamiByLocale.find((r) => r.locale === locale)
    if (exact?.websiteId) return exact.websiteId
    const jaEntry = settings.umamiByLocale.find((r) => r.locale === "ja")
    if (jaEntry?.websiteId) return jaEntry.websiteId
  }
  if (locale === "ja") return settings.analytics.umamiWebsiteId ?? null
  return settings.analytics.umamiWebsiteIdEn ?? settings.analytics.umamiWebsiteId ?? null
}
