/**
 * lib/theme-tokens.test.ts — admin theme token 変換ユニットテスト
 *
 * 入力フォーマット (#hex / rgb() / R G B / R, G, B) の網羅性 + CSS 出力検証。
 */

import { describe, it, expect } from "vitest"
import { toRgbTriplet, themeTokensToCss } from "./theme-tokens"

describe("toRgbTriplet", () => {
  it("returns null for empty / null / undefined", () => {
    expect(toRgbTriplet("")).toBe(null)
    expect(toRgbTriplet(null)).toBe(null)
    expect(toRgbTriplet(undefined)).toBe(null)
    expect(toRgbTriplet("   ")).toBe(null)
  })

  it("parses #RRGGBB hex", () => {
    expect(toRgbTriplet("#FAFAF7")).toBe("250 250 247")
    expect(toRgbTriplet("#1C1C2E")).toBe("28 28 46")
    expect(toRgbTriplet("#8b5cf6")).toBe("139 92 246")
    // hex without #
    expect(toRgbTriplet("FAFAF7")).toBe("250 250 247")
    // lowercase
    expect(toRgbTriplet("#fafaf7")).toBe("250 250 247")
  })

  it("parses #RGB short hex", () => {
    expect(toRgbTriplet("#FFF")).toBe("255 255 255")
    expect(toRgbTriplet("#000")).toBe("0 0 0")
    expect(toRgbTriplet("#F0A")).toBe("255 0 170")
  })

  it("parses rgb(R, G, B) format", () => {
    expect(toRgbTriplet("rgb(250, 250, 247)")).toBe("250 250 247")
    expect(toRgbTriplet("rgb(0, 0, 0)")).toBe("0 0 0")
    // rgb() without commas (modern syntax)
    expect(toRgbTriplet("rgb(250 250 247)")).toBe("250 250 247")
  })

  it("parses raw 'R G B' triplet (Tailwind v4 native)", () => {
    expect(toRgbTriplet("250 250 247")).toBe("250 250 247")
    expect(toRgbTriplet("0 0 0")).toBe("0 0 0")
    // with commas
    expect(toRgbTriplet("250, 250, 247")).toBe("250 250 247")
  })

  it("returns null for invalid input", () => {
    expect(toRgbTriplet("not a color")).toBe(null)
    expect(toRgbTriplet("#GGGGGG")).toBe(null)
    expect(toRgbTriplet("rgb(300, 0, 0)")).toBe(null) // out of range
    expect(toRgbTriplet("250 250")).toBe(null) // missing component
  })
})

describe("themeTokensToCss", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(themeTokensToCss(null)).toBe("")
    expect(themeTokensToCss(undefined)).toBe("")
    expect(themeTokensToCss({})).toBe("")
    expect(themeTokensToCss({ colors: {}, fonts: {}, radius: {} })).toBe("")
  })

  it("emits :root with color vars", () => {
    const css = themeTokensToCss({
      colors: { paper: "#FAFAF7", accent: "#8b5cf6" },
    })
    expect(css).toContain(":root {")
    expect(css).toContain("--paradigm-paper: 250 250 247;")
    expect(css).toContain("--paradigm-accent: 139 92 246;")
  })

  it("skips invalid color values gracefully", () => {
    const css = themeTokensToCss({
      colors: { paper: "#FAFAF7", accent: "not-a-color" },
    })
    expect(css).toContain("--paradigm-paper: 250 250 247;")
    expect(css).not.toContain("not-a-color")
    expect(css).not.toContain("--paradigm-accent")
  })

  it("emits font vars passthrough", () => {
    const css = themeTokensToCss({
      fonts: { display: "'Noto Sans JP', sans-serif", body: "Inter, sans-serif" },
    })
    expect(css).toContain('--font-display: \'Noto Sans JP\', sans-serif;')
    expect(css).toContain("--font-body: Inter, sans-serif;")
  })

  it("emits radius vars passthrough", () => {
    const css = themeTokensToCss({
      radius: { sm: "8px", md: "12px", lg: "24px" },
    })
    expect(css).toContain("--radius-sm: 8px;")
    expect(css).toContain("--radius-md: 12px;")
    expect(css).toContain("--radius-lg: 24px;")
  })

  it("combines all categories in single :root block", () => {
    const css = themeTokensToCss({
      colors: { paper: "#FAFAF7" },
      fonts: { display: "Noto Sans JP" },
      radius: { md: "12px" },
    })
    expect((css.match(/:root \{/g) ?? []).length).toBe(1)
    expect(css).toContain("--paradigm-paper: 250 250 247;")
    expect(css).toContain("--font-display: Noto Sans JP;")
    expect(css).toContain("--radius-md: 12px;")
  })
})
