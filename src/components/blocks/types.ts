// ─── Block 型定義 ──────────────────────────────────────────────────
// Paradigm Sales OS v2 — Phase 1 (2026-05-01)
//
// 構造化 block JSON で AI 生成・i18n・出力 format 別 adapter の 3 層分離を実現。
// docs/refactor/builder-library-redesign.md 参照。

import type { SalesRegion } from "@/lib/stores/sales-region"

/**
 * Block の翻訳マップ。各 region で表示する props 値を切替。
 * 例: { ja: { title: "ようこそ" }, en: { title: "Welcome" } }
 */
export type BlockTranslations<T extends object = object> = Partial<
  Record<SalesRegion | "global", Partial<T>>
>

// ─── 各 Block の props 型 ──────────────────────────────────────────

export interface HeroProps {
  title: string
  subtitle?: string
  ctaLabel?: string
  ctaUrl?: string
  imageUrl?: string
  variant?: "centered" | "left" | "split"
}

export interface FeatureGridProps {
  heading?: string
  features: Array<{ icon?: string; title: string; description: string }>
  columns?: 2 | 3 | 4
}

export interface PricingProps {
  heading?: string
  plans: Array<{
    name: string
    price: string
    cycle?: string  // "/月" / "/year"
    features: string[]
    ctaLabel?: string
    ctaUrl?: string
    highlighted?: boolean
  }>
}

export interface CTAProps {
  heading: string
  description?: string
  buttonLabel: string
  buttonUrl: string
  variant?: "primary" | "ghost"
}

export interface TestimonialProps {
  quote: string
  author: string
  role?: string
  avatarUrl?: string
}

export interface FAQProps {
  heading?: string
  items: Array<{ question: string; answer: string }>
}

export interface FooterProps {
  copyright: string
  links?: Array<{ label: string; url: string }>
  social?: Array<{ platform: "twitter" | "linkedin" | "github"; url: string }>
}

export interface VideoEmbedProps {
  url: string                // YouTube / Vimeo URL
  caption?: string
  aspectRatio?: "16:9" | "4:3" | "1:1"
}

// ─── 統合 type — Block の discriminated union ──────────────────────

export type BlockType =
  | "hero"
  | "feature_grid"
  | "pricing"
  | "cta"
  | "testimonial"
  | "faq"
  | "footer"
  | "video"

export type BlockProps = {
  hero: HeroProps
  feature_grid: FeatureGridProps
  pricing: PricingProps
  cta: CTAProps
  testimonial: TestimonialProps
  faq: FAQProps
  footer: FooterProps
  video: VideoEmbedProps
}

export interface Block<T extends BlockType = BlockType> {
  id: string
  type: T
  props: BlockProps[T]
  translations?: BlockTranslations<BlockProps[T]>
}

// ─── ContentDoc — DB cms_content_blocks 行の構造 ────────────────────

export interface ContentDoc {
  id: string
  slug: string
  page_type: "demo" | "report" | "sales_material" | "email" | "landing"
  region: SalesRegion | null
  title: string | null
  blocks: Block[]
  meta: Record<string, unknown>
  is_published: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
