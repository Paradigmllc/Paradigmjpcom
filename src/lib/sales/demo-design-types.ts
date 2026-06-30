/**
 * demo-design-types.ts — Complete design specification for hyper-personalized demo sites.
 *
 * This schema is the single source of truth that DeepSeek generates from:
 *  - Real company data (name, domain, industry, location)
 *  - Website assets (extracted images, colors, subpage content)
 *  - Diagnostic report (pain points, PageSpeed, tech stack, improvement actions)
 *
 * The Astro SSG renderer reads this JSON and assembles a complete multi-page site.
 * Nothing is hardcoded — every headline, CTA, image choice, and layout decision
 * comes from this spec.
 */

// ── Design Philosophy (6-axis differentiation) ──

export type VisualLanguage =
  | "photographic"       // 全画面写真、ビジュアル主導 (Apple風)
  | "illustrative"       // イラスト・図解中心
  | "typographic"        // 文字組・タイポグラフィ主導
  | "documentary"        // 施工写真・Before/After中心 (建設業向け)
  | "minimal-luxe"       // 余白多め・高級感 (Stripe風)
  | "editorial"          // 雑誌ライク・ストーリーテリング

export type LayoutRhythm =
  | "modular-grid"       // 整列されたグリッド (Stripe, Notion風)
  | "asymmetric-fluid"   // 非対称・流動的レイアウト (Apple風)
  | "editorial-narrative" // スクロールで物語が展開
  | "single-column"      // 1カラム・集中型
  | "z-pattern"          // Z型視線誘導

export type NavigationStyle =
  | "classic-top"        // 標準トップナビ
  | "floating-minimal"   // 浮遊ミニマル
  | "hidden-drawer"      // ハンバーガー抽屉
  | "sidebar"            // サイドバー固定
  | "mega-menu"          // メガメニュー

export type ColorStrategy =
  | "warm-earthy"        // 暖色・アースカラー
  | "cool-trust"         // 青系・信頼感
  | "neutral-luxury"     // モノトーン・高級
  | "vibrant-pop"        // ビビッド・ポップ
  | "dark-premium"       // ダークモード・プレミアム
  | "monochrome-crisp"   // 白黒・シャープ
  | "extracted"          // 実サイトから抽出した色をベースに展開

export type TypographyPersonality =
  | "classic-serif"      // 明朝体・格式
  | "modern-geometric"   // ジオメトリック・現代的
  | "humanist-warm"      // ヒューマニスト・温かみ
  | "mixed-display"      // 見出し=インパクト/本文=可読
  | "clean-sans"         // クリーン・無難

export type MotionCharacter =
  | "still-dignified"    // 静寂・品位
  | "scroll-reveal"      // スクロールで要素出現
  | "fluid-parallax"     // パララックス・奥行き
  | "bold-impact"        // 大胆な出現・変形
  | "subtle-micro"       // 微小なホバー・フェード

export interface DesignPhilosophy {
  visual_language: VisualLanguage
  layout_rhythm: LayoutRhythm
  navigation_style: NavigationStyle
  color_strategy: ColorStrategy
  typography_personality: TypographyPersonality
  motion_character: MotionCharacter
  /** 日本語での選択理由（20-40字） */
  rationale: string
}

export interface DesignTokens {
  palette: {
    primary: string        // #hex
    primaryDark: string
    accent: string
    background: string
    surface: string        // カード背景
    text: string
    textMuted: string
    border: string
  }
  typography: {
    headingFont: string    // CSS font-family
    bodyFont: string
    scale: "compact" | "balanced" | "generous"
  }
  radius: "sharp" | "soft" | "pill"
}

// ── Page Content Blocks ──

export interface ImageRef {
  /** R2 public URL or original URL */
  url: string
  /** alt text */
  alt: string
  /** which image from gallery or hero to use */
  source: "hero" | "logo" | "gallery"
  index?: number
}

export interface TextBlock {
  type: "headline" | "subheadline" | "body" | "eyebrow" | "quote" | "label"
  text: string
  /** optional: in Japanese */
  text_ja?: string
}

export interface HeroBlock {
  type: "hero"
  variant: "fullbleed" | "split" | "centered" | "type-marquee" | "before-after"
  /** hero image */
  image: ImageRef | null
  eyebrow: string
  headline: string
  subheadline: string
  primary_cta: { label: string; href: string }
  secondary_cta: { label: string; href: string } | null
}

export interface ProofBlock {
  type: "proof"
  layout: "row" | "grid" | "inline"
  items: { value: string; label: string; prefix?: string; suffix?: string }[]
}

export interface CardsBlock {
  type: "cards"
  title: string
  subtitle: string | null
  layout: "grid-3" | "grid-2" | "grid-4" | "horizontal-scroll"
  items: {
    title: string
    body: string
    icon_emoji: string | null
    image: ImageRef | null
    link: { label: string; href: string } | null
    bullets: string[] | null
  }[]
}

export interface MediaTextBlock {
  type: "media-text"
  /** "left" = image left, text right */
  image_position: "left" | "right" | "background"
  image: ImageRef | null
  headline: string
  body: string
  ctas: { label: string; href: string }[] | null
}

export interface FAQBlock {
  type: "faq"
  layout: "accordion" | "two-column" | "searchable"
  items: { question: string; answer: string }[]
}

export interface ContactBlock {
  type: "contact"
  layout: "split" | "card" | "minimal"
  headline: string
  body: string
  fields: ("name" | "email" | "phone" | "company" | "message")[]
  /** success message after form submit */
  success_message: string
}

export interface CompanyInfoBlock {
  type: "company-info"
  layout: "table" | "cards" | "timeline"
  items: { label: string; value: string }[]
}

export interface PlanBlock {
  type: "plans"
  layout: "cards-3" | "table" | "toggle-monthly-yearly"
  monthly_label: string
  yearly_label: string
  yearly_discount: string
  items: {
    name: string
    price_monthly: string
    price_yearly: string | null
    description: string
    features: string[]
    featured: boolean
    cta: { label: string; href: string }
  }[]
}

export interface BeforeAfterBlock {
  type: "before-after"
  headline: string
  before: { image: ImageRef | null; label: string; items: string[] }
  after: { label: string; items: string[] }
}

export interface TimelineBlock {
  type: "timeline"
  headline: string
  items: { title: string; body: string; date_label: string }[]
}

export interface TestimonialBlock {
  type: "testimonials"
  layout: "cards" | "marquee" | "single-spotlight"
  items: {
    quote: string
    author: string
    role: string | null
    image: ImageRef | null
  }[]
}

export interface CTABlock {
  type: "cta"
  title: string
  subtitle: string | null
  ctas: { label: string; href: string }[]
}

export type PageBlock =
  | HeroBlock
  | ProofBlock
  | CardsBlock
  | MediaTextBlock
  | FAQBlock
  | ContactBlock
  | CompanyInfoBlock
  | PlanBlock
  | BeforeAfterBlock
  | TimelineBlock
  | TestimonialBlock
  | CTABlock

// ── Page Specifications ──

export interface PageSpec {
  title: string
  description: string
  /** only include for home page */
  hero?: HeroBlock
  /** ordered blocks that make up the page content */
  blocks: PageBlock[]
}

// ── Complete Design Spec (output from DeepSeek) ──

export interface DemoDesignSpec {
  /** schema version for forward compatibility */
  schema_version: 1
  /** unique slug for URL */
  slug: string
  locale: "ja" | "en"
  generated_at: string
  engine: "deepseek-v4-pro"

  /** company identity (from real data — DeepSeek must NOT invent) */
  company: {
    name: string
    domain: string
    industry: string | null
    location: string | null
    /** real images available for placement */
    available_images: {
      hero: ImageRef | null
      logo: ImageRef | null
      gallery: ImageRef[]
    }
    /** extracted brand colors */
    extracted_colors: {
      primary: string | null
      background: string | null
      accent: string | null
      text: string | null
    } | null
    /** real subpage content snippets */
    real_content: {
      about_text: string | null
      services_text: string | null
      testimonials_text: string | null
      pricing_text: string | null
    }
    /** diagnostic findings */
    diagnosis: {
      pain_summary: string
      issues: string[]
      pagespeed_mobile: number | null
      pagespeed_desktop: number | null
      tech_stack: string[]
      improvement_actions: { headline: string; body: string; metrics: string[] }[]
    }
  }

  /** creative brief — narrative understanding of the company */
  creative_brief: {
    company_essence: string
    customer_psychology: string
    competitive_context: string
    transformation_story: string
  }

  /** design decisions */
  design_philosophy: DesignPhilosophy
  design_tokens: DesignTokens

  /** site structure */
  site: {
    /** which pages to include (all are optional) */
    pages: ("home" | "about" | "services" | "pricing" | "cases" | "faq" | "blog" | "contact" | "privacy" | "terms" | "tokushoho")[]
    nav: { label: string; section: string; href: string }[]
    /** footer company info */
    footer: {
      tagline: string
      address: string | null
      phone: string | null
      email: string | null
      social_links: { platform: string; url: string }[]
    }
  }

  /** all page content */
  pages: Record<string, PageSpec>
}
