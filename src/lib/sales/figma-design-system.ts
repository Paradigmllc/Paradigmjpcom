/**
 * Design system extracted from Figma MCP — the single source of truth
 * for all design decisions. DeepSeek compiles this + company data into
 * unique Astro code per company.
 *
 * This JSON mirrors what `@hapins/figma-mcp` returns from a Figma file.
 */
export interface FigmaDesignSystem {
  colors: {
    /** All color tokens with light/dark variants */
    tokens: Record<string, {
      light: string
      dark: string
      /** Optional gradient: [startColor, endColor, angle] */
      gradient?: [string, string, number]
    }>
  }
  typography: {
    scale: {
      h1: { fontSize: string; fontWeight: number; letterSpacing: string; lineHeight: number }
      h2: { fontSize: string; fontWeight: number; letterSpacing: string; lineHeight: number }
      h3: { fontSize: string; fontWeight: number; letterSpacing: string; lineHeight: number }
      body: { fontSize: string; fontWeight: number; lineHeight: number }
      caption: { fontSize: string; fontWeight: number; letterSpacing: string }
    }
    families: { heading: string; body: string }
  }
  spacing: {
    sectionPadding: string       // clamp(4rem,8vw,8rem)
    sectionGap: string           // clamp(5rem,12vw,10rem)
    containerMax: string         // max-width:1200px
    cardGap: string
    cardPadding: string
  }
  radius: {
    sm: string; md: string; lg: string; pill: string
  }
  shadows: {
    sm: string; md: string; lg: string; glow: string
  }
  layout: {
    /** Section alternation pattern */
    sectionRhythm: Array<"dark" | "light" | "gradient" | "glass">
    /** Hero variants */
    heroVariants: Array<{
      name: string
      textAlign: string
      minHeight: string
      contentMaxWidth: string
      /** CSS for this variant */
      css: string
    }>
  }
  components: {
    /** Component-level design specifications */
    card: {
      background: string
      padding: string
      radius: string
      border: string
      hover: string
    }
    button: {
      primary: { background: string; color: string; padding: string; radius: string; hover: string }
      secondary: { background: string; color: string; padding: string; radius: string; hover: string }
    }
    nav: {
      height: string; background: string; blur: string
    }
  }
}

// ── Default Apple-grade design system ──

export const APPLE_DESIGN_SYSTEM: FigmaDesignSystem = {
  colors: {
    tokens: {
      "primary":   { light: "#b9ff66", dark: "#b9ff66", gradient: ["#b9ff66", "#191a23", 180] },
      "accent":    { light: "#4f46e5", dark: "#6d28d9", gradient: ["#4f46e5", "#6d28d9", 135] },
      "bg-dark":   { light: "#191a23", dark: "#0d0c22", gradient: ["#191a23", "#0d0c22", 180] },
      "bg-light":  { light: "#ffffff", dark: "#111827", gradient: ["#f8f8f8", "#f3f3f3", 180] },
      "bg-glass":  { light: "#f3f3f3", dark: "#292a32", gradient: ["#f3f3f3", "#ffffff", 160] },
      "text-dark": { light: "#ffffff", dark: "#f3f3f3" },
      "text-light":{ light: "#191a23", dark: "#f3f3f3" },
      "text-muted":{ light: "#898989", dark: "#898989" },
      "highlight": { light: "#b9ff66", dark: "#b9ff66" },
      "danger":    { light: "#d81f26", dark: "#ff7a59" },
    },
  },
  typography: {
    scale: {
      h1:    { fontSize: "clamp(2.5rem,5vw,4rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 },
      h2:    { fontSize: "clamp(1.5rem,3vw,2.5rem)", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.15 },
      h3:    { fontSize: "clamp(1.2rem,2vw,1.5rem)", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2 },
      body:  { fontSize: "clamp(0.9rem,1.2vw,1.05rem)", fontWeight: 400, lineHeight: 1.7 },
      caption: { fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.02em" },
    },
    families: { heading: "'Space Grotesk','Inter',sans-serif", body: "'Inter','Nunito',sans-serif" },
  },
  spacing: {
    sectionPadding: "clamp(3rem,6vw,5rem)",
    sectionGap: "0",
    containerMax: "max-width:1200px;margin:0 auto;padding:0 clamp(1rem,3vw,2rem)",
    cardGap: "1.5rem",
    cardPadding: "2rem 1.5rem",
  },
  radius: { sm: "7px", md: "14px", lg: "20px", pill: "45px" },
  shadows: {
    sm: "0 2px 8px rgba(0,0,0,.05)",
    md: "0 8px 30px rgba(0,0,0,.08)",
    lg: "0 20px 60px rgba(0,0,0,.12)",
    glow: "0 4px 24px rgba(185,255,102,.3)",
  },
  layout: {
    sectionRhythm: ["dark", "light", "light", "light", "dark"],
    heroVariants: [
      {
        name: "centered-dark",
        textAlign: "center",
        minHeight: "90vh",
        contentMaxWidth: "800px",
        css: "background:var(--c-bg-dark);display:flex;align-items:center;justify-content:center;text-align:center",
      },
      {
        name: "split-left",
        textAlign: "left",
        minHeight: "80vh",
        contentMaxWidth: "600px",
        css: "display:grid;grid-template-columns:1fr 1fr;align-items:center;background:var(--c-bg-light)",
      },
    ],
  },
  components: {
    card: {
      background: "#ffffff",
      padding: "2rem 1.5rem",
      radius: "14px",
      border: "1px solid #191a23",
      hover: "transform:translateY(-4px);box-shadow:0 10px 30px rgba(0,0,0,.1)",
    },
    button: {
      primary: {
        background: "#191a23",
        color: "#ffffff",
        padding: "1rem 2rem",
        radius: "14px",
        hover: "transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,.15)",
      },
      secondary: {
        background: "transparent",
        color: "#191a23",
        padding: "1rem 2rem",
        radius: "14px",
        hover: "background:rgba(0,0,0,.04)",
      },
    },
    nav: { height: "72px", background: "rgba(255,255,255,.95)", blur: "16px" },
  },
}
