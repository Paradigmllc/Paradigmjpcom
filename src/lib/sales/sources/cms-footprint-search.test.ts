import { describe, expect, it } from "vitest"
import { buildFootprintQueries } from "./cms-footprint-search"

describe("buildFootprintQueries", () => {
  it("uses Shopify implementation signatures instead of a generic vendor query", () => {
    const queries = buildFootprintQueries("US", ["Shopify"], 2)

    expect(queries).toHaveLength(2)
    expect(queries.every((query) => query.query.includes("site:myshopify.com"))).toBe(true)
    expect(queries.map((query) => query.city)).toEqual(["New York", "Miami"])
  })

  it.each(["CA", "NL", "AE"])("supports the target market %s", (countryCode) => {
    expect(buildFootprintQueries(countryCode, ["Shopify"], 2)).toHaveLength(2)
  })
})
