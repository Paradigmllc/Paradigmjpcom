export interface DesignTokenPalette {
  primary: string
  primaryDark: string
  accent: string
  background: string
  surface: string
  text: string
  textMuted: string
  border: string
}

export interface DesignTokens {
  palette: DesignTokenPalette
  typography: { headingFont: string; bodyFont: string; scale: "compact" | "balanced" | "generous" }
  radius: "sharp" | "soft" | "pill"
}

export interface DesignPhilosophy {
  visual_language: string
  layout_rhythm: string
  navigation_style: string
  color_strategy: string
  typography_personality: string
  motion_character: string
  rationale: string
}

export interface ImageRef {
  url: string
  alt: string
  source: string
  index?: number
}

export interface SiteSpec {
  pages: string[]
  nav: { label: string; section: string; href: string }[]
  footer: {
    tagline: string
    address: string | null
    phone: string | null
    email: string | null
    social_links: { platform: string; url: string }[]
  }
}

export interface PageBlockBase {
  type: string
}

export interface HeroBlock extends PageBlockBase {
  type: "hero"
  variant: string
  image: ImageRef | null
  eyebrow: string
  headline: string
  subheadline: string
  primary_cta: { label: string; href: string }
  secondary_cta: { label: string; href: string } | null
}

export interface ProofBlock extends PageBlockBase {
  type: "proof"
  layout: string
  items: { value: string; label: string; prefix?: string; suffix?: string }[]
}

export interface CardsBlock extends PageBlockBase {
  type: "cards"
  title: string
  subtitle: string | null
  layout: string
  items: {
    title: string
    body: string
    icon_emoji: string | null
    image: ImageRef | null
    link: { label: string; href: string } | null
    bullets: string[] | null
  }[]
}

export interface MediaTextBlock extends PageBlockBase {
  type: "media-text"
  image_position: "left" | "right" | "background"
  image: ImageRef | null
  headline: string
  body: string
  ctas: { label: string; href: string }[] | null
}

export interface FAQBlock extends PageBlockBase {
  type: "faq"
  layout: string
  items: { question: string; answer: string }[]
}

export interface ContactBlock extends PageBlockBase {
  type: "contact"
  layout: string
  headline: string
  body: string
  fields: string[]
  success_message: string
}

export interface CompanyInfoBlock extends PageBlockBase {
  type: "company-info"
  layout: string
  items: { label: string; value: string }[]
}

export interface PlanBlock extends PageBlockBase {
  type: "plans"
  layout: string
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

export interface BeforeAfterBlock extends PageBlockBase {
  type: "before-after"
  headline: string
  before: { image: ImageRef | null; label: string; items: string[] }
  after: { label: string; items: string[] }
}

export interface TimelineBlock extends PageBlockBase {
  type: "timeline"
  headline: string
  items: { title: string; body: string; date_label: string }[]
}

export interface TestimonialBlock extends PageBlockBase {
  type: "testimonials"
  layout: string
  items: { quote: string; author: string; role: string | null; image: ImageRef | null }[]
}

export interface CTABlock extends PageBlockBase {
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

export interface PageSpec {
  title: string
  description: string
  hero?: HeroBlock
  blocks: PageBlock[]
}

export interface DemoDesignSpec {
  schema_version: number
  slug: string
  locale: string
  company: {
    name: string
    domain: string
    industry: string | null
    location: string | null
  }
  creative_brief: {
    company_essence: string
    transformation_story: string
  }
  design_philosophy: DesignPhilosophy
  design_tokens: DesignTokens
  site: SiteSpec
  pages: Record<string, PageSpec>
}

// ── CSS generation ──

export function tokensToCSS(tokens: DesignTokens, philosophy: DesignPhilosophy): string {
  const p = tokens.palette
  const t = tokens.typography

  const scaleMap: Record<string, string> = {
    compact: "clamp(2rem,5vw,3.2rem)",
    balanced: "clamp(2.4rem,6vw,4.2rem)",
    generous: "clamp(3rem,7vw,5.6rem)",
  }

  const radiusMap: Record<string, string> = {
    sharp: "4px",
    soft: "12px",
    pill: "9999px",
  }

  return `
    :root {
      --c-primary: ${p.primary};
      --c-primary-dark: ${p.primaryDark};
      --c-accent: ${p.accent};
      --c-bg: ${p.background};
      --c-surface: ${p.surface};
      --c-text: ${p.text};
      --c-text-muted: ${p.textMuted};
      --c-border: ${p.border};
      --font-heading: ${t.headingFont};
      --font-body: ${t.bodyFont};
      --font-scale-h1: ${scaleMap[t.scale]};
      --font-scale-h2: clamp(1.6rem,3.5vw,2.8rem);
      --font-scale-h3: clamp(1.3rem,2.5vw,2rem);
      --font-scale-body: clamp(0.95rem,1.5vw,1.1rem);
      --radius: ${radiusMap[tokens.radius]};
      --space-section: clamp(3rem,8vw,7rem);
      --transition: ${philosophy.motion_character === "still-dignified" ? "none" : "0.3s ease"};
    }
    .vh-visual-photographic { --hero-min-h:100vh; }
    .vh-visual-typographic { --hero-min-h:70vh; }
    .vh-visual-minimal-luxe { --hero-min-h:90vh; }
    .vh-visual-documentary { --hero-min-h:80vh; }
    .vh-visual-editorial { --hero-min-h:85vh; }
    .vh-visual-illustrative { --hero-min-h:75vh; }
    .vh-layout-modular-grid .page-grid { display:grid; gap:var(--space-section); }
    .vh-layout-asymmetric-fluid .page-grid { display:flex; flex-direction:column; gap:var(--space-section); }
    .vh-layout-single-column .page-grid { max-width:720px; margin:0 auto; }
    .fade-in { animation: fadeIn 0.6s ease both; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  `
}
