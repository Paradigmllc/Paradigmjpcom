import type { DemoPremiumMedia } from "./demo-site-types"

export type DemoMediaQualityRole = "hero" | "gallery"

const MINIMUMS: Record<DemoMediaQualityRole, { width: number; height: number }> = {
  hero: { width: 1_200, height: 720 },
  gallery: { width: 900, height: 600 },
}

/**
 * Portal image URLs often advertise a small derivative even when the original
 * path is present. Those derivatives must never be stretched into a premium
 * demo; keeping them is worse than showing a restrained editorial fallback.
 */
export function isLikelyLowResolutionSource(source: string): boolean {
  if (!source) return true
  return /(?:^|[?&])(?:size|w|width|h|height|sz)=(?:1to1_[sm]|[1-9]\d?|\d{3})(?:&|$)/iu.test(source)
    || /(?:^|[/?&_.-])(?:thumb|thumbnail|small|low[-_]?res|1to1_[sm])(?:[/_.?&-]|$)/iu.test(source)
}

export function isPremiumMediaUsable(
  media: DemoPremiumMedia | undefined,
  role: DemoMediaQualityRole = "gallery",
): boolean {
  if (!media?.src?.trim()) return false
  if (media.kind === "video") return true
  if (isLikelyLowResolutionSource(media.src)) return false
  const minimum = MINIMUMS[role]
  return typeof media.width === "number"
    && typeof media.height === "number"
    && media.width >= minimum.width
    && media.height >= minimum.height
}

export function filterPremiumMedia(
  media: DemoPremiumMedia[],
  role: DemoMediaQualityRole = "gallery",
): DemoPremiumMedia[] {
  return media.filter((item) => isPremiumMediaUsable(item, role))
}
