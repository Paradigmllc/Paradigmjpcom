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
      "primary":   { light: "#2563eb", dark: "#3b82f6", gradient: ["#2563eb", "#7c3aed", 135] },
      "accent":    { light: "#f59e0b", dark: "#fbbf24", gradient: ["#f59e0b", "#ef4444", 135] },
      "bg-dark":   { light: "#000000", dark: "#000000", gradient: ["#0f0c29", "#302b63", 135] },
      "bg-light":  { light: "#ffffff", dark: "#111827", gradient: ["#f8fafc", "#e2e8f0", 180] },
      "bg-glass":  { light: "#0f172a", dark: "#020617", gradient: ["#1e1b4b", "#312e81", 160] },
      "text-dark": { light: "#ffffff", dark: "#ffffff" },
      "text-light":{ light: "#0f172a", dark: "#f1f5f9" },
      "text-muted":{ light: "#64748b", dark: "#94a3b8" },
    },
  },
  typography: {
    scale: {
      h1:    { fontSize: "clamp(3rem,7vw,6rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05 },
      h2:    { fontSize: "clamp(2rem,4vw,3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.12 },
      h3:    { fontSize: "clamp(1.3rem,2.5vw,2rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 },
      body:  { fontSize: "clamp(1rem,1.5vw,1.15rem)", fontWeight: 400, lineHeight: 1.8 },
      caption: { fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.08em" },
    },
    families: { heading: "'Inter','Noto Sans JP',sans-serif", body: "'Inter','Noto Sans JP',sans-serif" },
  },
  spacing: {
    sectionPadding: "clamp(4rem,8vw,8rem)",
    sectionGap: "0",
    containerMax: "max-width:1100px;margin:0 auto;padding:0 clamp(1.5rem,4vw,3rem)",
    cardGap: "2rem",
    cardPadding: "2.5rem 2rem",
  },
  radius: { sm: "8px", md: "14px", lg: "20px", pill: "50px" },
  shadows: {
    sm: "0 2px 8px rgba(0,0,0,.06)",
    md: "0 8px 30px rgba(0,0,0,.1)",
    lg: "0 20px 60px rgba(0,0,0,.15)",
    glow: "0 4px 24px var(--glow, rgba(37,99,235,.4))",
  },
  layout: {
    sectionRhythm: ["dark", "light", "glass", "light", "dark"],
    heroVariants: [
      {
        name: "gradient-center",
        textAlign: "center",
        minHeight: "100vh",
        contentMaxWidth: "800px",
        css: "background:linear-gradient(var(--hero-angle,135deg),var(--hero-from),var(--hero-to));display:flex;align-items:center;justify-content:center;text-align:center",
      },
      {
        name: "split-left",
        textAlign: "left",
        minHeight: "90vh",
        contentMaxWidth: "600px",
        css: "display:flex;align-items:center;padding:0 clamp(2rem,6vw,6rem);background:var(--c-bg)",
      },
    ],
  },
  components: {
    card: {
      background: "rgba(255,255,255,.08)",
      padding: "2.5rem 2rem",
      radius: "20px",
      border: "1px solid rgba(255,255,255,.06)",
      hover: "transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,.2)",
    },
    button: {
      primary: {
        background: "linear-gradient(135deg,var(--c-primary),var(--c-accent))",
        color: "#fff",
        padding: "1rem 2.5rem",
        radius: "50px",
        hover: "transform:translateY(-2px);box-shadow:0 8px 30px var(--glow)",
      },
      secondary: {
        background: "transparent",
        color: "var(--c-text)",
        padding: "1rem 2.5rem",
        radius: "50px",
        hover: "background:rgba(255,255,255,.08)",
      },
    },
    nav: { height: "64px", background: "rgba(0,0,0,.85)", blur: "20px" },
  },
}
