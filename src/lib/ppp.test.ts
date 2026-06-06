import { describe, expect, it } from "vitest"
import { formatPricePPP } from "./ppp"

describe("formatPricePPP", () => {
  it("keeps USD package pricing in dollars", () => {
    expect(formatPricePPP(3000, "USD", "US", "en").display).toBe("$3,000")
    expect(formatPricePPP(5000, "USD", "ID", "en").display).toBe("$5,000")
    expect(formatPricePPP(8000, "USD", "JP", "en").display).toBe("$8,000")
  })
})
