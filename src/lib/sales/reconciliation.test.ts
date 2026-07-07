import { describe, expect, it } from "vitest"
import { reconcileTechDetections, computeReconciliationScoreAdjustment } from "./reconciliation"
import type { TechItem } from "./sources/wappalyzer"

describe("reconciliation engine", () => {
  const passiveTech: TechItem[] = [
    { name: "WordPress", category: "CMS", confidence: 92 },
    { name: "jQuery", category: "JavaScript Libraries", confidence: 88 },
    { name: "Google Analytics", category: "Analytics", confidence: 96 },
  ]

  it("confirms tech present in both passes", () => {
    const live = [
      { name: "WordPress", category: "CMS", confidence: 94 },
      { name: "jQuery", category: "JavaScript Libraries", confidence: 85 },
    ]
    const result = reconcileTechDetections(passiveTech, live)
    expect(result.confirmed).toHaveLength(2)
    expect(result.gone).toHaveLength(1)
    expect(result.gone[0].name).toBe("Google Analytics")
    expect(result.new).toHaveLength(0)
    expect(result.confirmationRate).toBeCloseTo(2 / 3, 1)
  })

  it("detects site updates when CMS disappears", () => {
    const live = [
      { name: "jQuery", category: "JavaScript Libraries", confidence: 85 },
    ]
    const result = reconcileTechDetections(passiveTech, live)
    expect(result.siteWasUpdated).toBe(true)
    expect(result.gone.find((t) => t.category === "CMS")).toBeDefined()
  })

  it("computes confidence delta weighted by category", () => {
    const live: TechItem[] = []
    const result = reconcileTechDetections(passiveTech, live)
    expect(result.confidenceDelta).toBeLessThan(0.5)
    expect(result.confirmationRate).toBe(0)
  })

  it("detects new tech in live not in passive", () => {
    const live = [
      { name: "WordPress", category: "CMS", confidence: 94 },
      { name: "WooCommerce", category: "Ecommerce", confidence: 90 },
    ]
    const result = reconcileTechDetections(passiveTech, live)
    expect(result.new).toHaveLength(1)
    expect(result.new[0].name).toBe("WooCommerce")
  })

  it("computes score adjustment for aging data", () => {
    const result = reconcileTechDetections(passiveTech, [
      { name: "WordPress", category: "CMS", confidence: 94 },
    ])
    const adjustment = computeReconciliationScoreAdjustment({
      ...result,
      snapshotAgeDays: 45,
    })
    expect(adjustment.freshnessScore).toBeLessThan(60)
    expect(adjustment.prioritizeReVerify).toBe(true)
  })
})
