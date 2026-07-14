import type { Industry } from "../types"
import type { PortalSource, PortalSourceAdapter } from "./types"

export const PORTAL_ADAPTERS: Record<PortalSource, PortalSourceAdapter> = {
  houzz: {
    source: "houzz",
    label: "Houzz",
    allowedHosts: ["houzz.jp"],
    defaultIndustry: "construction",
  },
  ekiten: {
    source: "ekiten",
    label: "エキテン",
    allowedHosts: ["ekiten.jp"],
    defaultIndustry: "consulting",
  },
  jmty: {
    source: "jmty",
    label: "ジモティー",
    allowedHosts: ["jmty.jp"],
    defaultIndustry: "consulting",
  },
}

const INDUSTRY_RULES: Array<{ industry: Industry; pattern: RegExp }> = [
  { industry: "construction", pattern: /工務店|建築|建設|施工|リフォーム|塗装|外構|造園|内装|設計事務所|屋根|解体/iu },
  { industry: "cleaning", pattern: /清掃|クリーニング|片付け|不用品回収|害虫|ハウスクリーニング/iu },
  { industry: "dental", pattern: /歯科|歯医者|デンタル/iu },
  { industry: "beauty_salon", pattern: /美容|理容|サロン|ネイル|まつ毛|エステ/iu },
  { industry: "accounting", pattern: /税理士|会計|社労士|行政書士|司法書士/iu },
  { industry: "restaurant", pattern: /飲食|レストラン|カフェ|居酒屋|料理店/iu },
  { industry: "retail", pattern: /販売|小売|専門店|ショップ/iu },
]

export function inferPortalIndustry(source: PortalSource, text: string): Industry {
  for (const rule of INDUSTRY_RULES) {
    if (rule.pattern.test(text)) return rule.industry
  }
  return PORTAL_ADAPTERS[source].defaultIndustry
}

export function isAllowedPortalUrl(source: PortalSource, value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return false
    return PORTAL_ADAPTERS[source].allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
  } catch (error) {
    console.error("[portal-source] invalid URL:", error instanceof Error ? error.message : String(error))
    return false
  }
}
