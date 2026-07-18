import type { DemoPremiumMedia } from "./demo-site-types"
import { isPremiumMediaUsable, type DemoMediaQualityRole } from "./demo-media-quality"

/**
 * Internal asset-review notes must never leak into a customer-facing demo.
 * The preview toolbar communicates the private/demo state; the site itself
 * should read like a finished business website.
 */
const INTERNAL_SURFACE_COPY = /(エキテン掲載素材|掲載素材|権利確認|権利未確認|権利者|公開[・、/]?納品|非公開提案|提案用|レビュー用|素材確認|生成イメージ|AI生成|コンセプト素材|rights?[- ]?(?:check|review|clear)|proposal[- ]?(?:only|asset|image)|private[- ]?proposal|reviewed[- ]?asset)/iu
const SOURCE_METADATA_COPY = /(確認済みの公開情報では|登録公式URL|取得日|スクレイピング|公式公開アカウントから取得|PageSpeed|ページ速度)/iu

export function isInternalDemoCopy(value: string | null | undefined): boolean {
  return Boolean(value && INTERNAL_SURFACE_COPY.test(value))
}

export function sanitizeDemoCopy(value: string | undefined, fallback: string): string {
  const normalized = value?.replace(/\s+/gu, " ").trim() ?? ""
  if (!normalized || isInternalDemoCopy(normalized) || SOURCE_METADATA_COPY.test(normalized)) return fallback
  return normalized
}

export function canonicalDemoMediaSrc(source: string): string {
  try {
    const url = new URL(source)
    if (url.hostname === "image.ekiten.jp" && /^(?:\?\d+to\d+_[a-z]+|\?size=1to1_[a-z]+)$/iu.test(url.search)) {
      url.search = ""
    }
    return url.toString()
  } catch (error) {
    console.error("[demo-public-surface] invalid media URL:", error)
    return source.trim()
  }
}

function cleanText(value: string | undefined, fallback: string): string {
  return sanitizeDemoCopy(value, fallback)
}

/**
 * De-duplicates media by canonical source and replaces internal captions/alt
 * text with restrained editorial labels. This is intentionally deterministic
 * so existing demos improve at read time without another LLM call.
 */
export function sanitizeDemoMedia(
  media: DemoPremiumMedia[],
  companyName: string,
  labels: string[],
  role: DemoMediaQualityRole = "gallery",
): DemoPremiumMedia[] {
  const seen = new Set<string>()
  return media.flatMap((item, index) => {
    const source = canonicalDemoMediaSrc(item.src)
    const normalizedItem = { ...item, src: source }
    if (!isPremiumMediaUsable(normalizedItem, role)) return []
    if (!source || seen.has(source)) return []
    seen.add(source)
    const label = labels[index % Math.max(labels.length, 1)] ?? "風景"
    const fallback = `${companyName} ${label}`
    return [{
      ...normalizedItem,
      src: source,
      alt: cleanText(item.alt, fallback),
      caption: cleanText(item.caption, label),
      title: cleanText(item.title, label),
      eyebrow: cleanText(item.eyebrow, "SCENE"),
    }]
  })
}
