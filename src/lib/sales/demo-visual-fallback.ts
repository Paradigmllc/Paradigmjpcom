import type { DemoMultiPageData, DemoPremiumMedia } from "./demo-site-types"
import { generatedDemoVisualUrl } from "./demo-generated-visual"

const GENERATED_VISUAL_LABELS = ["ファーストビュー", "店内・空間", "サービスの表情", "日々の風景", "細部のこだわり"] as const

/**
 * Keep public demos visually complete when no reviewed source photo is
 * available. These are deterministic, high-resolution, industry-specific
 * scenes—not empty gradients or internal proposal placeholders.
 */
export function ensureGeneratedVisualMedia(
  value: DemoMultiPageData,
  input: { origin: string; slug: string; industry: string },
): DemoMultiPageData {
  if (!value.premium) return value
  const createVisual = (index: number): DemoPremiumMedia => {
    const label = GENERATED_VISUAL_LABELS[index % GENERATED_VISUAL_LABELS.length] ?? "日々の風景"
    return {
      kind: "image",
      src: generatedDemoVisualUrl({ origin: input.origin, slug: input.slug, industry: input.industry, variant: (index % 6) + 1 }),
      width: 1600,
      height: 1000,
      alt: `${value.companyName}の${label}`,
      caption: label,
      title: label,
      eyebrow: "SCENE",
    }
  }
  const heroMedia = value.premium.heroMedia.length > 0 ? value.premium.heroMedia : [0, 1, 2].map(createVisual)
  const gallery = value.premium.gallery.length > 0 ? value.premium.gallery : [1, 2, 3, 4].map(createVisual)
  return { ...value, premium: { ...value.premium, heroMedia, gallery } }
}
