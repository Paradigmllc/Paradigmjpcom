import { describe, expect, it } from "vitest"
import { inferCompanyProductRecommendations, productFromFallback } from "./products"

describe("inferCompanyProductRecommendations", () => {
  it("prioritizes Web production for domestic website diagnostics", () => {
    const products = inferCompanyProductRecommendations({
      companyId: "company-1",
      region: "jp",
      reportLocale: "ja",
      targetCountry: "JP",
      templateVariant: "website_diagnostic",
    })

    expect(products.map((product) => product.code)).toEqual(["jp_web_production", "jp_dx_package"])
  })

  it("prioritizes DX package when domestic diagnosis signals automation", () => {
    const products = inferCompanyProductRecommendations({
      companyId: "company-1",
      region: "jp",
      reportLocale: "ja",
      targetCountry: "JP",
      templateVariant: "outreach",
      recommendedOffer: "AI automation and DX rollout",
    })

    expect(products[0]?.code).toBe("jp_dx_package")
  })

  it("keeps overseas Japan entry and video subscription separated from JP products", () => {
    const products = inferCompanyProductRecommendations({
      companyId: "company-2",
      region: "global",
      reportLocale: "en",
      targetCountry: "US",
      templateVariant: "video_subscription",
    })

    expect(products.map((product) => product.code)).toEqual(["global_video_subscription", "global_jaas"])
  })

  it("uses the fixed USD 12,000 Japan Entry setup price", () => {
    const product = productFromFallback("global_jaas")

    expect(product.default_currency).toBe("USD")
    expect(product.default_amount_yen).toBe(12_000)
    expect(product.meta).toMatchObject({
      setup_amount_usd: 12_000,
      monthly_free_months: 6,
      continuation_pricing: "agreed_separately_after_included_period",
    })
  })
})
