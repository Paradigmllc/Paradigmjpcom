/**
 * lib/sales/demo-templates/registry.ts — Template Registry
 *
 * Defines 8+ distinct design templates, each with unique:
 * - Section ordering and visibility per page
 * - Layout variants (hero style, feature layout, card style)
 * - Visual design tokens (borderRadius, shadow, typography, spacing)
 * - Industry affinity and selection weight
 *
 * Each template produces a VISIBLY different website, not just color/text swaps.
 */

export type HeroVariant = "centered" | "split" | "minimal" | "fullscreen"
export type FeatureLayout = "grid3" | "grid2" | "list" | "cards" | "alternating"
export type ServiceCardStyle = "detailed" | "minimal" | "icon-led" | "image-led"
export type NavStyle = "sticky" | "transparent" | "bordered" | "minimal"
export type FooterStyle = "standard" | "minimal" | "expanded"

export interface DemoTemplate {
  id: string
  name: string
  description: string
  /** Which industries this template suits */
  industries: string[]
  /** Template selection weight (higher = preferred for matching industries) */
  weight: number
  /** Layout configuration */
  layout: {
    /** Section ordering and visibility per page */
    home: {
      sections: HomeSectionId[]
      heroVariant: HeroVariant
      featureLayout: FeatureLayout
    }
    about: {
      sections: AboutSectionId[]
    }
    services: {
      sections: ServiceSectionId[]
      cardStyle: ServiceCardStyle
    }
    contact: {
      sections: ContactSectionId[]
    }
  }
  /** Navigation style */
  nav: NavStyle
  /** Footer style */
  footer: FooterStyle
  /** Visual design tokens applied via CSS variables */
  designTokens: {
    borderRadius: "none" | "sm" | "md" | "lg" | "full"
    shadow: "none" | "sm" | "md" | "lg"
    typography: {
      headingFont: string
      bodyFont: string
      headingWeight: string
      scale: "compact" | "normal" | "generous"
    }
    spacing: "compact" | "normal" | "generous"
    containerWidth: "narrow" | "normal" | "wide" | "full"
  }
}

export type HomeSectionId =
  | "hero"
  | "stats"
  | "loss"
  | "beforeAfter"
  | "features"
  | "cta"
  | "testimonials"
  | "trustedBy"

export type AboutSectionId =
  | "hero"
  | "story"
  | "mission"
  | "values"
  | "team"
  | "timeline"

export type ServiceSectionId =
  | "hero"
  | "cards"
  | "process"
  | "pricing"
  | "cta"

export type ContactSectionId =
  | "info"
  | "form"
  | "booking"
  | "map"
  | "faq"

/* ───── Design token helpers ───── */

export function borderRadiusClass(tk: DemoTemplate["designTokens"]["borderRadius"]): string {
  const map: Record<string, string> = {
    none: "rounded-none",
    sm: "rounded-md",
    md: "rounded-xl",
    lg: "rounded-2xl",
    full: "rounded-3xl",
  }
  return map[tk] ?? "rounded-xl"
}

export function shadowClass(tk: DemoTemplate["designTokens"]["shadow"]): string {
  const map: Record<string, string> = {
    none: "shadow-none",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-xl",
  }
  return map[tk] ?? "shadow-sm"
}

export function spacingY(tk: DemoTemplate["designTokens"]["spacing"]): string {
  const map: Record<string, string> = {
    compact: "py-8 sm:py-12",
    normal: "py-16 sm:py-20",
    generous: "py-20 sm:py-28",
  }
  return map[tk] ?? "py-16 sm:py-20"
}

export function containerClass(tk: DemoTemplate["designTokens"]["containerWidth"]): string {
  const map: Record<string, string> = {
    narrow: "max-w-3xl",
    normal: "max-w-5xl",
    wide: "max-w-6xl",
    full: "max-w-7xl",
  }
  return map[tk] ?? "max-w-5xl"
}

export function headingSizeClass(tk: DemoTemplate["designTokens"]["typography"]["scale"]): {
  h1: string
  h2: string
  h3: string
  body: string
} {
  if (tk === "compact") return { h1: "text-3xl sm:text-4xl lg:text-5xl", h2: "text-2xl sm:text-3xl", h3: "text-lg sm:text-xl", body: "text-sm sm:text-base" }
  if (tk === "generous") return { h1: "text-5xl sm:text-6xl lg:text-7xl", h2: "text-3xl sm:text-4xl lg:text-5xl", h3: "text-xl sm:text-2xl", body: "text-base sm:text-lg" }
  return { h1: "text-4xl sm:text-5xl lg:text-6xl", h2: "text-2xl sm:text-3xl lg:text-4xl", h3: "text-lg sm:text-xl", body: "text-sm sm:text-base" }
}

export function getTemplateDesignCSS(template: DemoTemplate): Record<string, string> {
  const dt = template.designTokens
  const brMap: Record<string, string> = {
    none: "0px",
    sm: "0.375rem",
    md: "0.75rem",
    lg: "1rem",
    full: "1.5rem",
  }
  const shMap: Record<string, string> = {
    none: "none",
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
  }
  const spMap: Record<string, string> = { compact: "1rem", normal: "1.5rem", generous: "2.5rem" }

  return {
    "--tpl-radius": brMap[dt.borderRadius] ?? "0.75rem",
    "--tpl-shadow": shMap[dt.shadow] ?? "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    "--tpl-spacing": spMap[dt.spacing] ?? "1.5rem",
    "--tpl-heading-font": dt.typography.headingFont,
    "--tpl-body-font": dt.typography.bodyFont,
    "--tpl-heading-weight": dt.typography.headingWeight,
  }
}

/* ───── NAVIGATION STYLE CLASSES ───── */

export function navClasses(style: NavStyle): { wrapper: string; inner: string; height: string } {
  switch (style) {
    case "sticky":
      return {
        wrapper: "sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80",
        inner: "mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8",
        height: "h-16",
      }
    case "transparent":
      return {
        wrapper: "sticky top-0 z-50 bg-transparent transition-colors",
        inner: "mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8",
        height: "h-16",
      }
    case "bordered":
      return {
        wrapper: "sticky top-0 z-50 border-b-2 border-gray-200 bg-white",
        inner: "mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8",
        height: "h-20",
      }
    case "minimal":
      return {
        wrapper: "sticky top-0 z-50",
        inner: "mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8",
        height: "h-14",
      }
  }
}

/* ═══════ 8 DISTINCT TEMPLATES ═══════ */

export const DEMO_TEMPLATES: DemoTemplate[] = [
  /* ─── 1. ZENITH — Bold centered hero, fullscreen, big typography ─── */
  {
    id: "zenith",
    name: "Zenith",
    description: "Bold centered hero with fullscreen impact and commanding typography. Suited for consulting/finance where authority matters.",
    industries: ["consulting", "accounting"],
    weight: 10,
    layout: {
      home: {
        sections: ["hero", "stats", "loss", "features", "testimonials", "cta"],
        heroVariant: "fullscreen",
        featureLayout: "list",
      },
      about: { sections: ["hero", "story", "mission", "values"] },
      services: { sections: ["hero", "cards", "process", "cta"], cardStyle: "detailed" },
      contact: { sections: ["info", "form", "booking", "faq"] },
    },
    nav: "sticky",
    footer: "standard",
    designTokens: {
      borderRadius: "sm",
      shadow: "lg",
      typography: { headingFont: "font-display", bodyFont: "font-sans", headingWeight: "font-black", scale: "generous" },
      spacing: "generous",
      containerWidth: "wide",
    },
  },

  /* ─── 2. AETHER — Split hero with image, alternating features ─── */
  {
    id: "aether",
    name: "Aether",
    description: "Split hero with image, alternating feature rows, modern and balanced. Ideal for tech/SaaS.",
    industries: ["consulting"],
    weight: 8,
    layout: {
      home: {
        sections: ["hero", "features", "stats", "testimonials", "cta"],
        heroVariant: "split",
        featureLayout: "alternating",
      },
      about: { sections: ["hero", "story", "mission", "values", "team"] },
      services: { sections: ["hero", "cards", "process", "pricing", "cta"], cardStyle: "icon-led" },
      contact: { sections: ["info", "form", "booking", "map"] },
    },
    nav: "transparent",
    footer: "expanded",
    designTokens: {
      borderRadius: "md",
      shadow: "md",
      typography: { headingFont: "font-display", bodyFont: "font-sans", headingWeight: "font-bold", scale: "normal" },
      spacing: "normal",
      containerWidth: "normal",
    },
  },

  /* ─── 3. PRISM — Grid-heavy, card-based, modern minimal ─── */
  {
    id: "prism",
    name: "Prism",
    description: "Grid-heavy card layout with modern minimal aesthetic. Perfect for retail/e-commerce.",
    industries: ["retail", "beauty_salon"],
    weight: 9,
    layout: {
      home: {
        sections: ["hero", "trustedBy", "features", "beforeAfter", "cta"],
        heroVariant: "minimal",
        featureLayout: "grid3",
      },
      about: { sections: ["hero", "values", "team", "timeline"] },
      services: { sections: ["hero", "cards", "pricing", "cta"], cardStyle: "minimal" },
      contact: { sections: ["form", "info", "faq"] },
    },
    nav: "bordered",
    footer: "standard",
    designTokens: {
      borderRadius: "lg",
      shadow: "sm",
      typography: { headingFont: "font-display", bodyFont: "font-sans", headingWeight: "font-semibold", scale: "compact" },
      spacing: "compact",
      containerWidth: "wide",
    },
  },

  /* ─── 4. TERRA — Earthy, full-width images, horizontal scroll sections ─── */
  {
    id: "terra",
    name: "Terra",
    description: "Earthy, image-rich with wide layouts and strong visual presence. Suited for construction/real estate.",
    industries: ["construction"],
    weight: 10,
    layout: {
      home: {
        sections: ["hero", "stats", "features", "beforeAfter", "trustedBy", "cta"],
        heroVariant: "fullscreen",
        featureLayout: "cards",
      },
      about: { sections: ["hero", "story", "values", "team"] },
      services: { sections: ["hero", "cards", "process", "cta"], cardStyle: "image-led" },
      contact: { sections: ["info", "form", "map"] },
    },
    nav: "sticky",
    footer: "expanded",
    designTokens: {
      borderRadius: "none",
      shadow: "lg",
      typography: { headingFont: "font-display", bodyFont: "font-sans", headingWeight: "font-extrabold", scale: "generous" },
      spacing: "generous",
      containerWidth: "full",
    },
  },

  /* ─── 5. FLUX — Dark theme, animated, video-first ─── */
  {
    id: "flux",
    name: "Flux",
    description: "Dark theme with animated transitions and video-first approach. Suited for media/entertainment.",
    industries: ["consulting", "restaurant"],
    weight: 7,
    layout: {
      home: {
        sections: ["hero", "features", "stats", "testimonials", "cta"],
        heroVariant: "centered",
        featureLayout: "alternating",
      },
      about: { sections: ["hero", "story", "mission", "values"] },
      services: { sections: ["hero", "cards", "process", "cta"], cardStyle: "icon-led" },
      contact: { sections: ["form", "booking", "info"] },
    },
    nav: "transparent",
    footer: "minimal",
    designTokens: {
      borderRadius: "full",
      shadow: "none",
      typography: { headingFont: "font-display", bodyFont: "font-sans", headingWeight: "font-bold", scale: "normal" },
      spacing: "generous",
      containerWidth: "normal",
    },
  },

  /* ─── 6. VERTEX — Clinical, data-dense, metric-focused ─── */
  {
    id: "vertex",
    name: "Vertex",
    description: "Clinical and data-dense with heavy focus on metrics and evidence. Ideal for healthcare/dental.",
    industries: ["dental"],
    weight: 10,
    layout: {
      home: {
        sections: ["hero", "stats", "loss", "beforeAfter", "features", "cta"],
        heroVariant: "split",
        featureLayout: "grid2",
      },
      about: { sections: ["hero", "story", "mission", "values", "timeline"] },
      services: { sections: ["hero", "cards", "process", "pricing", "cta"], cardStyle: "detailed" },
      contact: { sections: ["info", "form", "booking", "faq", "map"] },
    },
    nav: "bordered",
    footer: "standard",
    designTokens: {
      borderRadius: "sm",
      shadow: "md",
      typography: { headingFont: "font-display", bodyFont: "font-sans", headingWeight: "font-bold", scale: "compact" },
      spacing: "normal",
      containerWidth: "narrow",
    },
  },

  /* ─── 7. NOMAD — Warm, story-driven, testimonial-heavy ─── */
  {
    id: "nomad",
    name: "Nomad",
    description: "Warm and inviting with story-driven layouts and prominent testimonials. Perfect for hospitality/food.",
    industries: ["restaurant"],
    weight: 10,
    layout: {
      home: {
        sections: ["hero", "testimonials", "features", "stats", "cta"],
        heroVariant: "centered",
        featureLayout: "cards",
      },
      about: { sections: ["hero", "story", "mission", "values", "team"] },
      services: { sections: ["hero", "cards", "process", "cta"], cardStyle: "image-led" },
      contact: { sections: ["info", "form", "booking", "faq"] },
    },
    nav: "minimal",
    footer: "expanded",
    designTokens: {
      borderRadius: "lg",
      shadow: "sm",
      typography: { headingFont: "font-display", bodyFont: "font-sans", headingWeight: "font-bold", scale: "normal" },
      spacing: "generous",
      containerWidth: "normal",
    },
  },

  /* ─── 8. APEX — Luxury, generous spacing, gold accents ─── */
  {
    id: "apex",
    name: "Apex",
    description: "Luxury aesthetic with generous whitespace and elegant typography. Suited for beauty/fashion.",
    industries: ["beauty_salon"],
    weight: 10,
    layout: {
      home: {
        sections: ["hero", "features", "testimonials", "stats", "cta"],
        heroVariant: "fullscreen",
        featureLayout: "alternating",
      },
      about: { sections: ["hero", "story", "mission", "values"] },
      services: { sections: ["hero", "cards", "pricing", "cta"], cardStyle: "detailed" },
      contact: { sections: ["info", "form", "booking"] },
    },
    nav: "transparent",
    footer: "minimal",
    designTokens: {
      borderRadius: "full",
      shadow: "none",
      typography: { headingFont: "font-display", bodyFont: "font-sans", headingWeight: "font-light", scale: "generous" },
      spacing: "generous",
      containerWidth: "narrow",
    },
  },
]

/** Default fallback template */
export const DEFAULT_TEMPLATE: DemoTemplate = DEMO_TEMPLATES[0] // zenith

/** Get template by ID */
export function getTemplateById(id: string): DemoTemplate | undefined {
  return DEMO_TEMPLATES.find((t) => t.id === id)
}
