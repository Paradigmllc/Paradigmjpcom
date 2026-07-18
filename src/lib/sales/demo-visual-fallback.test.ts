import { describe, expect, it } from "vitest"
import type { DemoMultiPageData } from "./demo-site-types"
import { ensureGeneratedVisualMedia } from "./demo-visual-fallback"

describe("generated public demo visual fallback", () => {
  it("fills empty hero and gallery media with high-resolution industry scenes", () => {
    const data = {
      slug: "cafe-sosomu",
      companyId: "company-1",
      companyName: "Cafe SOSOMU",
      premium: { style: "premium-v3", heroMedia: [], gallery: [], intro: { eyebrow: "", title: "", body: "" }, social: [] },
    } as unknown as DemoMultiPageData

    const result = ensureGeneratedVisualMedia(data, { origin: "https://demo.paradigmjp.com", slug: data.slug, industry: "restaurant" })

    expect(result.premium?.heroMedia).toHaveLength(3)
    expect(result.premium?.gallery).toHaveLength(4)
    expect(result.premium?.heroMedia[0]?.src).toContain("/api/sales/demo-visuals/cafe-sosomu/")
    expect(result.premium?.heroMedia[0]?.width).toBe(1600)
    expect(result.premium?.heroMedia[0]?.height).toBe(1000)
    expect(result.premium?.heroMedia[0]?.alt).toContain("Cafe SOSOMU")
  })
})
