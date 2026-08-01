import { describe, expect, it } from "vitest"
import { buildGeneratedDemoVisualSvg, generatedDemoVisualUrl } from "./demo-generated-visual"

describe("generated demo visuals", () => {
  it("renders a substantial, escaped SVG for an industry variant", () => {
    const svg = buildGeneratedDemoVisualSvg({ slug: "sample", industry: "restaurant", variant: 2, label: "Cafe <sample>" })
    expect(svg).toContain('width="1600" height="1000"')
    expect(svg).toContain("飲食店")
    expect(svg).toContain("Cafe &lt;sample&gt;")
    expect(svg).toContain("一皿の時間")
    expect(svg).not.toContain("A place with")
    expect(svg).not.toContain("CRAFT / BUILD")
    expect(svg.length).toBeGreaterThan(2_000)
  })

  it("uses a stable HTTPS source URL", () => {
    expect(generatedDemoVisualUrl({ origin: "https://paradigmjp.com/", slug: "ほさか歯科", industry: "dental", variant: 3 }))
      .toBe("https://paradigmjp.com/api/sales/demo-visuals/%E3%81%BB%E3%81%95%E3%81%8B%E6%AD%AF%E7%A7%91/3?industry=dental&variant=3")
  })
})
