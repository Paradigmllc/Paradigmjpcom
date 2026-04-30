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
  analytics: {
    umamiWebsiteId?: string | null
    umamiWebsiteIdEn?: string | null
  }
  calendarUrl: {
    ja?: string | null
    en?: string | null
  }
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
    }
  } catch (e) {
    console.error("[settings] payload.findGlobal failed, using defaults:", e)
    return DEFAULTS
  }
})

/** Pick the right calendar URL for the current locale. */
export function calendarUrlFor(settings: SiteSettings, locale: string): string {
  return locale === "ja"
    ? settings.calendarUrl.ja ?? DEFAULTS.calendarUrl.ja!
    : settings.calendarUrl.en ?? DEFAULTS.calendarUrl.en!
}

/** Pick the right Umami site id for the current locale. */
export function umamiWebsiteIdFor(settings: SiteSettings, locale: string): string | null {
  return locale === "ja"
    ? settings.analytics.umamiWebsiteId ?? null
    : settings.analytics.umamiWebsiteIdEn ?? settings.analytics.umamiWebsiteId ?? null
}
