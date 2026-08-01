import type { DemoPremiumMedia } from "./demo-site-types"
import { generatedDemoVisualUrl } from "./demo-generated-visual"
import { siteUrl } from "./routing"
import type { Industry } from "./types"
import { canonicalDemoMediaSrc } from "./demo-public-surface"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

/**
 * Build media for operator-reviewed source photos on private proposal pages.
 * The caller must gate this helper with the preview access state so
 * proposal-only assets can never reach a public/published page.
 */
export function buildPrivateProposalMedia(
  manifest: unknown,
  companyName: string,
  slug: string,
  industry: Industry | string | null,
): DemoPremiumMedia[] {
  if (!isRecord(manifest) || manifest.status === "blocked" || !Array.isArray(manifest.assets)) return []

  return manifest.assets.flatMap((asset, index) => {
    if (!isRecord(asset) || asset.kind !== "image" || typeof asset.source !== "string") return []
    let source: URL
    try {
      source = new URL(asset.source)
    } catch (error) {
      console.error("[demo-generator] proposal image URL is invalid:", error)
      return []
    }
    if (source.protocol !== "https:") return []
    const variant = (index % 6) + 1
    return [{
      // Ekiten's `size=1to1_m` query selects a derivative even though the
      // canonical path serves the 1200px original. Normalize before the
      // quality gate so reviewed source photos are not discarded as thumbs.
      src: canonicalDemoMediaSrc(source.toString()),
      fallbackSrc: generatedDemoVisualUrl({
        origin: siteUrl(),
        slug,
        industry: industry ?? "consulting",
        variant,
      }),
      alt: `${companyName}の実績写真 ${index + 1}`,
      kind: "image" as const,
      width: 1200,
      height: 900,
      caption: "実績写真",
      title: "実績写真",
      eyebrow: "WORKS",
    }]
  }).slice(0, 6)
}

/**
 * Use only assets whose rights manifest says they are owned or licensed.
 * These assets may be shown in the customer-facing preview; proposal-only
 * portal material is intentionally excluded and remains fallback-only.
 */
export function buildOwnedLicensedMedia(
  manifest: unknown,
  companyName: string,
  slug: string,
  industry: Industry | string | null,
): DemoPremiumMedia[] {
  if (!isRecord(manifest) || manifest.status === "blocked" || !Array.isArray(manifest.assets)) return []

  const labels = ["ファーストビュー", "店内と空間", "サービスの風景", "日々の表情", "細部のこだわり"]
  return manifest.assets.flatMap((asset, index) => {
    if (!isRecord(asset) || asset.kind !== "image" || typeof asset.source !== "string") return []
    if (asset.usage !== "owned" && asset.usage !== "licensed") return []
    let source: URL
    try {
      source = new URL(asset.source)
    } catch (error) {
      console.error("[demo-generator] owned image URL is invalid:", error)
      return []
    }
    if (source.protocol !== "https:") return []
    const label = labels[index % labels.length] ?? "ビジュアル"
    const width = typeof asset.width === "number" && asset.width > 0 ? asset.width : 1600
    const height = typeof asset.height === "number" && asset.height > 0 ? asset.height : 1000
    return [{
      src: canonicalDemoMediaSrc(source.toString()),
      fallbackSrc: generatedDemoVisualUrl({ origin: siteUrl(), slug, industry: industry ?? "consulting", variant: (index % 6) + 1 }),
      alt: `${companyName}の${label}`,
      kind: "image" as const,
      width,
      height,
      caption: label,
      title: label,
      eyebrow: "SCENE",
    }]
  }).slice(0, 6)
}
