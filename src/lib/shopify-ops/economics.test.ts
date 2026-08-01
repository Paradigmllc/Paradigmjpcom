import { describe, expect, it } from "vitest"
import { calculateProductEconomics, calculateStoreProfitJpy } from "./economics"

describe("calculateProductEconomics", () => {
  it("includes tracked international shipping at the free-shipping threshold", () => {
    const result = calculateProductEconomics({
      priceUsd: 139,
      procurementCostJpy: 4_000,
      domesticShippingJpy: 500,
    })

    expect(result.revenueJpy).toBe(22_240)
    expect(result.estimatedVariableCostJpy).toBe(9_442)
    expect(result.estimatedProfitJpy).toBe(12_798)
    expect(result.estimatedMarginPercent).toBe(57.5)
  })

  it("does not charge merchant-paid international shipping below 120 USD", () => {
    const result = calculateProductEconomics({
      priceUsd: 79,
      procurementCostJpy: 2_200,
      domesticShippingJpy: 400,
    })

    expect(result.estimatedProfitJpy).toBe(8_002)
    expect(result.estimatedMarginPercent).toBe(63.3)
  })

  it("calculates store profit from recorded revenue and variable cost", () => {
    expect(calculateStoreProfitJpy(1_000, 80_000)).toBe(80_000)
  })
})
