import type { DemoPremiumMedia } from "./demo-site-types"
import { generatedDemoVisualUrl } from "./demo-generated-visual"
import { siteUrl } from "./routing"
import type { Industry } from "./types"

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
      src: source.toString(),
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
