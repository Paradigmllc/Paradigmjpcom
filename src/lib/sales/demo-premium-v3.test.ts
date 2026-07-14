import { describe, expect, it } from "vitest"
import type { DemoMultiPageData } from "./demo-site-types"
import { resolveDemoBrandSystem } from "./demo-premium-v3"

describe("premium v3 industry typography", () => {
  it("does not let a generic art direction replace a salon with corporate fonts", () => {
    const page = {
      companyId: "salon-1",
      industry: "beauty_salon",
      designRecipe: {
        templateId: "prism",
        creativeDirection: {
          concept: "静かな余白で店内の質感を伝える",
          typographyStyle: "modern-grotesk",
        },
      },
    } as unknown as DemoMultiPageData

    const brand = resolveDemoBrandSystem(page)

    expect(brand.displayFont).toMatch(/Serif|Mincho/u)
    expect(brand.bodyFont).toContain("Zen Kaku Gothic New")
    expect(brand.displayFont).not.toContain("Outfit")
  })
})
