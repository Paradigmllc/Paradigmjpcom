// ─── BlockRenderer — 統合 Block 描画器 ─────────────────────────────
// Paradigm Sales OS v2 — Phase 1 (2026-05-01)
//
// blocks 配列を受け取り、各 block の type に応じた React コンポーネントを描画。
// translations が指定されていれば region を解決して localized props で描画。
// silently-JA-leak 防止規律準拠 (非 ja region で JA fallback 不可)。

import type { SalesRegion } from "@/lib/stores/sales-region"
import type { Block, BlockProps } from "./types"
import { HeroBlock } from "./Hero"
import { FeatureGridBlock } from "./FeatureGrid"
import { PricingBlock } from "./Pricing"
import { CTABlock } from "./CTA"
import { TestimonialBlock } from "./Testimonial"
import { FAQBlock } from "./FAQ"
import { FooterBlock } from "./Footer"
import { VideoEmbedBlock } from "./VideoEmbed"

interface BlockRendererProps {
  blocks: Block[]
  region: SalesRegion
}

/**
 * 各 block の props を region で解決する。
 * translations[region] があればそれで上書き、なければ en → 他非 ja → null。
 * region === "ja" のみ ja fallback OK。
 */
function resolveBlockProps<T extends keyof BlockProps>(
  block: Block<T>,
  region: SalesRegion,
): BlockProps[T] {
  const base = block.props
  if (!block.translations) return base

  // ja region: ja → global → en の順で fallback OK
  if (region === "ja") {
    for (const locale of ["ja", "global", "en"] as const) {
      const t = block.translations[locale]
      if (t) return { ...base, ...t } as BlockProps[T]
    }
    return base
  }

  // 非 ja region: JA は意図的に除外
  const exact = block.translations[region]
  if (exact) return { ...base, ...exact } as BlockProps[T]
  if (block.translations.en) return { ...base, ...block.translations.en } as BlockProps[T]
  if (block.translations.global) return { ...base, ...block.translations.global } as BlockProps[T]
  // 他の非 ja translation を探す
  for (const [loc, val] of Object.entries(block.translations)) {
    if (loc !== "ja" && val) return { ...base, ...val } as BlockProps[T]
  }
  // 最終手段: base props (英語混在の可能性 — JA leak 防止のため意図的に base)
  return base
}

export function BlockRenderer({ blocks, region }: BlockRendererProps) {
  return (
    <>
      {blocks.map((block) => {
        const props = resolveBlockProps(block, region)
        switch (block.type) {
          case "hero":          return <HeroBlock key={block.id} {...(props as BlockProps["hero"])} />
          case "feature_grid":  return <FeatureGridBlock key={block.id} {...(props as BlockProps["feature_grid"])} />
          case "pricing":       return <PricingBlock key={block.id} {...(props as BlockProps["pricing"])} />
          case "cta":           return <CTABlock key={block.id} {...(props as BlockProps["cta"])} />
          case "testimonial":   return <TestimonialBlock key={block.id} {...(props as BlockProps["testimonial"])} />
          case "faq":           return <FAQBlock key={block.id} {...(props as BlockProps["faq"])} />
          case "footer":        return <FooterBlock key={block.id} {...(props as BlockProps["footer"])} />
          case "video":         return <VideoEmbedBlock key={block.id} {...(props as BlockProps["video"])} />
          default:
            // 未知の type は無視 (将来追加 block への前方互換性)
            console.warn(`[BlockRenderer] unknown block type: ${(block as Block).type}`)
            return null
        }
      })}
    </>
  )
}
